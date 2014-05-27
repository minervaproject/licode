#include <cstdio>
#include <boost/cstdint.hpp>
#include <sys/time.h>
#include <arpa/inet.h>

#include "ExternalOutput.h"
#include "../WebRtcConnection.h"
#include "../rtp/RtpHeaders.h"

namespace erizo {
#define FIR_INTERVAL_MS 4000

  DEFINE_LOGGER(ExternalOutput, "media.ExternalOutput");

  ExternalOutput::ExternalOutput(const std::string& outputUrl) :
    url(outputUrl)
  {
    ELOG_DEBUG("Created ExternalOutput to %s", outputUrl.c_str());
    videoCodec_ = NULL;
    audioCodec_ = NULL;
    video_st = NULL;
    audio_st = NULL;
    audioCoder_ = NULL;
    hasVideo_ = true;
    prevEstimatedFps_ = 0;
    warmupfpsCount_ = 0;
    sequenceNumberFIR_ = 0;
    aviores_ = -1;
    writeheadres_=-1;
    unpackagedBufferpart_ = unpackagedBuffer_;
    initTime_ = 0;
    lastTime_ = 0;
    sinkfbSource_ = this;
    fbSink_ = NULL;
  }

  bool ExternalOutput::init(){
    av_register_all();
    avcodec_register_all();
    context_ = avformat_alloc_context();
    if (context_==NULL){
      ELOG_ERROR("Error allocating memory for IO context");
      return false;
    }
    oformat_ = av_guess_format(NULL,  url.c_str(), NULL);
    if (!oformat_){
      ELOG_ERROR("Error opening output file %s", url.c_str());
      return false;
    }
    url.copy(context_->filename, sizeof(context_->filename),0);
    video_st = NULL;
    audio_st = NULL;
    in_ = new InputProcessor();
    MediaInfo m;
    //    m.processorType = RTP_ONLY;
    m.hasVideo = false;
    m.hasAudio = false;

    gotUnpackagedFrame_ = 0;
    unpackagedSize_ = 0;
    in_->init(m, this);
    thread_ = boost::thread(&ExternalOutput::sendLoop, this);
    sending_ = true;
    ELOG_DEBUG("Initialized successfully");
    return true;
  }


  ExternalOutput::~ExternalOutput(){
    ELOG_DEBUG("Destructor");
    ELOG_DEBUG("Closing Sink");
    delete in_;
    in_ = NULL;
    
    
    if (context_!=NULL){
      if (writeheadres_>=0)
        av_write_trailer(context_);
      if (avio_close>=0)
        avio_close(context_->pb);
      avformat_free_context(context_);
      context_=NULL;
    }
    if (videoCodec_!=NULL){
      avcodec_close(videoCodecCtx_);
      videoCodec_=NULL;
    }
    if (audioCodec_!=NULL){
      avcodec_close(audioCodecCtx_);
      audioCodec_ = NULL;    
    }

    sending_ = false;
    cond_.notify_one();
    thread_.join();
    /* boost::unique_lock<boost::mutex> lock(queueMutex_); */
    ELOG_DEBUG("ExternalOutput closed Successfully");
  }

  void ExternalOutput::receiveRawData(RawDataPacket& packet){
    return;
  }


  int ExternalOutput::writeAudioData(char* buf, int len){
    if (in_!=NULL){
      if (audioCodec_ == NULL) {
        if (warmupfpsCount_>=100){
          hasVideo_ = false;
          if (!this->initContext()){
            ELOG_ERROR("Context cannot be initialized properly, closing...");
            return -1;
          }
        }
        return 0;
      }

      timeval time;
      gettimeofday(&time, NULL);
      RtpHeader *head = reinterpret_cast<RtpHeader*> (buf);
      //We dont need any other payload at this time
      if(head->payloadtype != PCMU_8000_PT){
        return 0;
      }
      
      unsigned long long millis = (time.tv_sec * 1000) + (time.tv_usec / 1000);
      int ret = in_->unpackageAudio(reinterpret_cast<unsigned char*>(buf), len,
          unpackagedAudioBuffer_);
      if (ret <= 0)
        return ret;
      if (ret > UNPACKAGE_BUFFER_SIZE){
        ELOG_ERROR("Unpackaged Audio size too big %d", ret);
      }
      AVPacket avpkt;
      av_init_packet(&avpkt);
      avpkt.data = unpackagedAudioBuffer_;
      avpkt.size = ret;
      avpkt.pts = millis - initTime_;
      avpkt.dts = avpkt.pts;
      avpkt.stream_index = hasVideo_?1:0;
      av_write_frame(context_, &avpkt);
      av_free_packet(&avpkt);
      return ret;

    }
    return 0;
  }

  int ExternalOutput::writeVideoData(char* buf, int len){
    if (in_!=NULL){
      RtpHeader *head = reinterpret_cast<RtpHeader*> (buf);
      if (head->payloadtype == RED_90000_PT) {
        int totalLength = 12;

        if (head->extension) {
          totalLength += ntohs(head->extensionlength)*4 + 4; // RTP Extension header
        }
        int rtpHeaderLength = totalLength;
        RedHeader *redhead = reinterpret_cast<RedHeader*> ((buf + totalLength));

        //redhead->payloadtype = remoteSdp_.inOutPTMap[redhead->payloadtype];
        if (redhead->payloadtype == VP8_90000_PT) {
          while (redhead->follow) {
            totalLength += redhead->getLength() + 4; // RED header
            redhead = reinterpret_cast<RedHeader*> ((buf + totalLength));
          }
          // Parse RED packet to VP8 packet.
          // Copy RTP header
          memcpy(deliverMediaBuffer_, buf, rtpHeaderLength);
          // Copy payload data
          memcpy(deliverMediaBuffer_ + totalLength, buf + totalLength + 1, len - totalLength - 1);
          // Copy payload type
          RtpHeader *mediahead = reinterpret_cast<RtpHeader*> (deliverMediaBuffer_);
          mediahead->payloadtype = redhead->payloadtype;
          buf = reinterpret_cast<char*> (deliverMediaBuffer_);
          len = len - 1 - totalLength + rtpHeaderLength;
        }
      }
      int estimatedFps=0;
      int ret = in_->unpackageVideo(reinterpret_cast<unsigned char*>(buf), len,
          unpackagedBufferpart_, &gotUnpackagedFrame_, &estimatedFps);

      if (ret < 0)
        return 0;
      
      if (videoCodec_ == NULL) {
        if ((estimatedFps!=0)&&((estimatedFps < prevEstimatedFps_*(1-0.2))||(estimatedFps > prevEstimatedFps_*(1+0.2)))){
          prevEstimatedFps_ = estimatedFps;
        }
        if (warmupfpsCount_ >= 50){
          if (prevEstimatedFps_==0){
            warmupfpsCount_ = 0;
            return 0;
          }
          hasVideo_=true;
          if (!this->initContext()){
            ELOG_ERROR("Context cannot be initialized properly, closing...");
            return -1;
          }
        }
        return 0;
      }

      unpackagedSize_ += ret;
      unpackagedBufferpart_ += ret;
      if (unpackagedSize_ > UNPACKAGE_BUFFER_SIZE){
        ELOG_ERROR("Unpackaged size bigget than buffer %d", unpackagedSize_);
      }
      if (gotUnpackagedFrame_ && videoCodec_!=NULL) {
        timeval time;
        gettimeofday(&time, NULL);
        unsigned long long millis = (time.tv_sec * 1000) + (time.tv_usec / 1000);
        if (initTime_ == 0) {
          initTime_ = millis;
        }
        if (millis < initTime_)
        {
          ELOG_WARN("initTime is smaller than currentTime, possible problems when recording ");
        }
        unpackagedBufferpart_ -= unpackagedSize_;

        AVPacket avpkt;
        av_init_packet(&avpkt);
        avpkt.data = unpackagedBufferpart_;
        avpkt.size = unpackagedSize_;
        avpkt.pts = millis - initTime_;
        avpkt.stream_index = 0;
        av_write_frame(context_, &avpkt);
        av_free_packet(&avpkt);
        gotUnpackagedFrame_ = 0;
        unpackagedSize_ = 0;
        unpackagedBufferpart_ = unpackagedBuffer_;

      }
    }
    return 0;
  }

  int ExternalOutput::deliverAudioData_(char* buf, int len) {
    RtcpHeader *head = reinterpret_cast<RtcpHeader*> (buf);
    warmupfpsCount_++;
    if (head->isRtcp()){
      return 0;
    }
    this->queueData(buf,len,AUDIO_PACKET);
    return 0;
  }

  int ExternalOutput::deliverVideoData_(char* buf, int len) {
    RtcpHeader *head = reinterpret_cast<RtcpHeader*> (buf);
    warmupfpsCount_++;
    if (head->isRtcp()){
      return 0;
    }
    this->queueData(buf,len,VIDEO_PACKET);
    return 0;
  }


  bool ExternalOutput::initContext() {
    ELOG_DEBUG("Init Context");
    context_->oformat = oformat_;
    if (hasVideo_){
      context_->oformat->video_codec = AV_CODEC_ID_VP8;
    }
    context_->oformat->audio_codec = AV_CODEC_ID_PCM_MULAW;
    if (oformat_->video_codec != AV_CODEC_ID_NONE && videoCodec_ == NULL) {
      if (hasVideo_){
        videoCodec_ = avcodec_find_encoder(oformat_->video_codec);
        ELOG_DEBUG("Found Codec %s", videoCodec_->name);
        ELOG_DEBUG("Initing context with fps: %d", (int)prevEstimatedFps_);
        if (videoCodec_==NULL){
          ELOG_ERROR("Could not find codec");
          return false;
        }
        video_st = avformat_new_stream (context_, videoCodec_);
        video_st->id = 0;
        videoCodecCtx_ = video_st->codec;
        videoCodecCtx_->codec_id = oformat_->video_codec;
        videoCodecCtx_->width = 640;
        videoCodecCtx_->height = 480;
        videoCodecCtx_->time_base = (AVRational){1,(int)prevEstimatedFps_};
        videoCodecCtx_->pix_fmt = PIX_FMT_YUV420P;
        if (oformat_->flags & AVFMT_GLOBALHEADER){
          videoCodecCtx_->flags|=CODEC_FLAG_GLOBAL_HEADER;
        }
        oformat_->flags |= AVFMT_VARIABLE_FPS;
      }
      ELOG_DEBUG("Init audio context");
      
      audioCodec_ = avcodec_find_encoder(oformat_->audio_codec);
      if (audioCodec_==NULL){
        ELOG_ERROR("Could not find audio codec");
        return false;
      }
      ELOG_DEBUG("Found Audio Codec %s", audioCodec_->name);
      audio_st = avformat_new_stream (context_, audioCodec_);
      audio_st->id = 1;
      audioCodecCtx_ = audio_st->codec;
      audioCodecCtx_->codec_id = oformat_->audio_codec;
      audioCodecCtx_->sample_rate = 8000;
      audioCodecCtx_->channels = 1;
      //      audioCodecCtx_->sample_fmt = AV_SAMPLE_FMT_S8;
      if (oformat_->flags & AVFMT_GLOBALHEADER){
        audioCodecCtx_->flags|=CODEC_FLAG_GLOBAL_HEADER;
      }
      if(hasVideo_){
        context_->streams[0] = video_st;
        context_->streams[1] = audio_st;
      } else{
        ELOG_ERROR("No Video");        
        context_->streams[0] = audio_st;
      }
      aviores_ = avio_open(&context_->pb, url.c_str(), AVIO_FLAG_WRITE);
      if (aviores_<0){
        ELOG_ERROR("Error opening output file");
        return false;
      }
      writeheadres_ = avformat_write_header(context_, NULL);
      if (writeheadres_<0){
        ELOG_ERROR("Error writing header");
        return false;
      }
      ELOG_DEBUG("AVFORMAT CONFIGURED");
    }
    return true;
  }

  void ExternalOutput::queueData(char* buffer, int length, packetType type){
    if (in_==NULL) {
      return;
    }
    boost::mutex::scoped_lock lock(queueMutex_);
    if (type == VIDEO_PACKET){
      videoQueue_.pushPacket(buffer, length);
    }else{
      audioQueue_.pushPacket(buffer, length);
    }
    cond_.notify_one();
    
  }

  int ExternalOutput::sendFirPacket() {
    if (fbSink_ != NULL) {
      sequenceNumberFIR_++; // do not increase if repetition
      int pos = 0;
      uint8_t rtcpPacket[50];
      // add full intra request indicator
      uint8_t FMT = 4;
      rtcpPacket[pos++] = (uint8_t) 0x80 + FMT;
      rtcpPacket[pos++] = (uint8_t) 206;
      pos = 12;
      fbSink_->deliverFeedback((char*)rtcpPacket, pos);
      return pos;
    }

    return -1;
  }

  void ExternalOutput::sendLoop() {
    while (sending_ == true) {
      boost::unique_lock<boost::mutex> lock(queueMutex_);
      while ((!audioQueue_.getSize())&&(!videoQueue_.getSize())) {
        cond_.wait(lock);
        if (sending_ == false) {
          lock.unlock();
          return;
        }
      }
      timeval time;
      gettimeofday(&time, NULL);
      unsigned long long millis = (time.tv_sec * 1000) + (time.tv_usec / 1000);
      if (millis -lastTime_ >FIR_INTERVAL_MS && (hasVideo_)){
        ELOG_DEBUG("SendingFIR");
        this->sendFirPacket();
        lastTime_ = millis;
      }
      if (initTime_ == 0) {
        initTime_ = millis;      
      }
      if (millis < initTime_){
        ELOG_WARN("initTime is smaller than currentTime, possible problems when recording ");
      }
      if (audioQueue_.getSize()){
        boost::shared_ptr<dataPacket> audioP = audioQueue_.popPacket();
        this->writeAudioData(audioP->data, audioP->length);
      }
      if (videoQueue_.getSize()) {
        boost::shared_ptr<dataPacket> videoP = videoQueue_.popPacket();
        this->writeVideoData(videoP->data, videoP->length);

      }
      lock.unlock();
    }
  }

}

