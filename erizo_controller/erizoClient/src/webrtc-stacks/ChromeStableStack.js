/*global L, RTCSessionDescription, webkitRTCPeerConnection, RTCIceCandidate*/
'use strict';

var Erizo = Erizo || {};

Erizo.ChromeStableStack = function (spec) {
    var that = {},
        WebkitRTCPeerConnection = webkitRTCPeerConnection,
        defaultSimulcastSpatialLayers = 2;

    that.pcConfig = {
        'iceServers': []
    };
    that.maxVideoBW = spec.maxVideoBW;
    that.maxAudioBW = spec.maxAudioBW;
    that.audioCodec = spec.audioCodec;
    that.opusHz = spec.opusHz;
    that.opusBitrate = spec.opusBitrate;
    that.shouldRemoveREMB = spec.shouldRemoveREMB;


    that.con = {'optional': [{'DtlsSrtpKeyAgreement': true}]};

    if (spec.iceServers !== undefined) {
        that.pcConfig.iceServers = spec.iceServers;
    }

    if (spec.audio === undefined) {
        spec.audio = true;
    }

    if (spec.video === undefined) {
        spec.video = true;
    }

    that.mediaConstraints = {
        mandatory: {
            'OfferToReceiveVideo': spec.video,
            'OfferToReceiveAudio': spec.audio
        }
    };

    var errorCallback = function (message) {
        L.Logger.error('Error in Stack ', message);
    };

    that.peerConnection = new WebkitRTCPeerConnection(that.pcConfig, that.con);

    var addSim = function (spatialLayers) {
      var line = 'a=ssrc-group:SIM';
      spatialLayers.forEach(function(spatialLayerId) {
        line += ' ' + spatialLayerId;
      });
      return line + '\r\n';
    };

    var addGroup = function(spatialLayerId, spatialLayerIdRtx) {
      return 'a=ssrc-group:FID ' + spatialLayerId + ' ' + spatialLayerIdRtx + '\r\n';
    };

    var addSpatialLayer = function (cname, msid, mslabel, label, spatialLayerId, 
        spatialLayerIdRtx) {
      return  'a=ssrc:' + spatialLayerId + ' cname:' + cname +'\r\n' +
              'a=ssrc:' + spatialLayerId + ' msid:' + msid + '\r\n' +
              'a=ssrc:' + spatialLayerId + ' mslabel:' + mslabel + '\r\n' +
              'a=ssrc:' + spatialLayerId + ' label:' + label + '\r\n' +
              'a=ssrc:' + spatialLayerIdRtx + ' cname:' + cname +'\r\n' +
              'a=ssrc:' + spatialLayerIdRtx + ' msid:' + msid + '\r\n' +
              'a=ssrc:' + spatialLayerIdRtx + ' mslabel:' + mslabel + '\r\n' +
              'a=ssrc:' + spatialLayerIdRtx + ' label:' + label + '\r\n';
    };

    var enableSimulcast = function (sdp) {
      var result, matchGroup;
      if (!spec.video) {
        return sdp;
      }
      if (!spec.simulcast) {
        return sdp;
      }

      // TODO(javier): Remove this message once Simulcast is complete
      L.Logger.warning('Simulcast is still WIP, please don\'t use it in production');

      // TODO(javier): Improve the way we check for current video ssrcs
      matchGroup = sdp.match(/a=ssrc-group:FID ([0-9]*) ([0-9]*)\r?\n/);
      if (!matchGroup || (matchGroup.length <= 0)) {
        return sdp;
      }

      var numSpatialLayers = spec.simulcast.numSpatialLayers || defaultSimulcastSpatialLayers;
      var baseSsrc = parseInt(matchGroup[1]);
      var baseSsrcRtx = parseInt(matchGroup[2]);
      var cname = sdp.match(new RegExp('a=ssrc:' + matchGroup[1] + ' cname:(.*)\r?\n'))[1];
      var msid = sdp.match(new RegExp('a=ssrc:' + matchGroup[1] + ' msid:(.*)\r?\n'))[1];
      var mslabel = sdp.match(new RegExp('a=ssrc:' + matchGroup[1] + ' mslabel:(.*)\r?\n'))[1];
      var label = sdp.match(new RegExp('a=ssrc:' + matchGroup[1] + ' label:(.*)\r?\n'))[1];

      sdp.match(new RegExp('a=ssrc:' + matchGroup[1] + '.*\r?\n', 'g')).forEach(function(line) {
        sdp = sdp.replace(line, '');
      });
      sdp.match(new RegExp('a=ssrc:' + matchGroup[2] + '.*\r?\n', 'g')).forEach(function(line) {
        sdp = sdp.replace(line, '');
      });

      var spatialLayers = [baseSsrc];
      var spatialLayersRtx = [baseSsrcRtx];

      for (var i = 1; i < numSpatialLayers; i++) {
        spatialLayers.push(baseSsrc + i * 1000);
        spatialLayersRtx.push(baseSsrcRtx + i * 1000);
      }

      result = addSim(spatialLayers);
      var spatialLayerId;
      var spatialLayerIdRtx;
      for (let spatialLayerIndex in spatialLayers) {
        spatialLayerId = spatialLayers[spatialLayerIndex];
        spatialLayerIdRtx = spatialLayersRtx[spatialLayerIndex];
        result += addGroup(spatialLayerId, spatialLayerIdRtx);
      }

      for (let spatialLayerIndex in spatialLayers) {
        spatialLayerId = spatialLayers[spatialLayerIndex];
        spatialLayerIdRtx = spatialLayersRtx[spatialLayerIndex];
        result += addSpatialLayer(cname, msid, mslabel, label, spatialLayerId, spatialLayerIdRtx);
      }
      result += 'a=x-google-flag:conference\r\n';
      return sdp.replace(matchGroup[0], result);
    };

    var setMaxBW = function (sdp, maxVideoBW, maxAudioBW) {
        var a, r, as = sdp.match(/b=AS:.*\r\n/g);
        if (as === null) {
          as = sdp.match(/b=AS:.*\n/g);
        }

        if (as) {
          for (var i=0; i<as.length; i++) {
            sdp = sdp.replace(as[i], '');
          }
        }

        if (spec.video && maxVideoBW) {
            a = sdp.match(/m=video.*\r\n/);
            if (a === null) {
                a = sdp.match(/m=video.*\n/);
            }
            if (a) {
                r = a[0] + 'b=AS:' + maxVideoBW + '\r\n';
                sdp = sdp.replace(a[0], r);
            }
        }

        if (spec.audio && maxAudioBW) {
            a = sdp.match(/m=audio.*\r\n/);
            if (a === null) {
                a = sdp.match(/m=audio.*\n/);
            }
            if (a) {
                r = a[0] + 'b=AS:' + maxAudioBW + '\r\n';
                sdp = sdp.replace(a[0], r);
            }
        }
        return sdp;
    };

    var removeRemb = function (sdp) {
        var a = sdp.match(/a=rtcp-fb:100 goog-remb\r\n/);
        if (a === null){
          a = sdp.match(/a=rtcp-fb:100 goog-remb\n/);
        }
        if (a) {
            sdp = sdp.replace(a[0], '');
        }
        return sdp;
    };

    var changeAudioConnectionType = function(sdp, makeActive) {
      var k1 = sdp.indexOf('m=audio');
      var k2 = sdp.indexOf('m=video');
      if (k2 === -1) {
        k2 = sdp.length;
      }
      if (k1 > k2) {
        var tmp = k2;
        k2 = k1;
        k1 = tmp;
      }
      var p1 = sdp.slice(0,k1);
      var p2 = sdp.slice(k1,k2);
      var p3 = sdp.slice(k2);
      if (makeActive) {
        p2 = p2.replace('a=inactive', 'a=sendrecv');
      } else {
        p2 = p2.replace('a=sendrecv', 'a=inactive');
      }
      return p1 + p2 + p3;
    };

    var setAudioCodec = function(sdp) {
        var temp;
        if (that.audioCodec) {
            if (that.audioCodec !== 'opus') {
                temp = sdp.match('.*opus.*\r\na=fmtp.*\r\n');
                sdp = sdp.replace(temp, '');
            } else {
                if (that.opusHz) {
                    temp = sdp.match('.*opus.*\r\na=fmtp.*');
                    sdp = sdp.replace(temp, temp +
                        '; maxplaybackrate=' + that.opusHz +
                        '; sprop-maxcapturerate=' + that.opusHz);
                }
                if (that.opusBitrate) {
                    temp = sdp.match('.*opus.*\r\na=fmtp.*');
                    sdp = sdp.replace(temp, temp +
                        '; maxaveragebitrate=' + that.opusBitrate);
                }
            }
            if (that.audioCodec !== 'ISAC/32000') {
                temp = sdp.match('.*ISAC/32000\r\n');
                sdp = sdp.replace(temp, '');
            }
            if (that.audioCodec !== 'ISAC/16000') {
                temp = sdp.match('.*ISAC/16000\r\n');
                sdp = sdp.replace(temp, '');
            }
        }
        return sdp;
    };

    var enableOpusNacks = function (sdp) {
        var sdpMatch;
        sdpMatch = sdp.match(/a=rtpmap:(.*)opus.*\r\n/);
        if (sdpMatch !== null){
           var theLine = sdpMatch[0] + 'a=rtcp-fb:' + sdpMatch[1] + 'nack' + '\r\n';
           sdp = sdp.replace(sdpMatch[0], theLine);
        }

        return sdp;
    };

    /**
     * Closes the connection.
     */
    that.close = function () {
        that.state = 'closed';
        that.peerConnection.close();
    };

    spec.localCandidates = [];

    that.peerConnection.onicecandidate = function (event) {
        var candidateObject = {};
        if (!event.candidate) {
            L.Logger.info('Gathered all candidates. Sending END candidate');
            candidateObject = {
                sdpMLineIndex: -1 ,
                sdpMid: 'end',
                candidate: 'end'
            };
        }else{

            if (!event.candidate.candidate.match(/a=/)) {
                event.candidate.candidate = 'a=' + event.candidate.candidate;
            }

            candidateObject = {
                sdpMLineIndex: event.candidate.sdpMLineIndex,
                sdpMid: event.candidate.sdpMid,
                candidate: event.candidate.candidate
            };
        }

        if (spec.remoteDescriptionSet) {
            spec.callback({type: 'candidate', candidate: candidateObject});
        } else {
            spec.localCandidates.push(candidateObject);
            L.Logger.info('Storing candidate: ', spec.localCandidates.length, candidateObject);
        }

    };

    that.peerConnection.onaddstream = function (stream) {
        if (that.onaddstream) {
            that.onaddstream(stream);
        }
    };

    that.peerConnection.onremovestream = function (stream) {
        if (that.onremovestream) {
            that.onremovestream(stream);
        }
    };

    that.peerConnection.oniceconnectionstatechange = function (ev) {
        if (that.oniceconnectionstatechange){
            that.oniceconnectionstatechange(ev.target.iceConnectionState);
        }
    };

    var localDesc, remoteDesc;

    var setLocalDesc = function (isSubscribe, sessionDescription) {
        if (!isSubscribe) {
          sessionDescription.sdp = enableSimulcast(sessionDescription.sdp);
        }
        sessionDescription.sdp = setMaxBW(sessionDescription.sdp, that.maxVideoBW, that.maxAudioBW);
        sessionDescription.sdp = setAudioCodec(sessionDescription.sdp);
        if (that.shouldRemoveREMB) {
            sessionDescription.sdp = removeRemb(sessionDescription.sdp);
        }
        sessionDescription.sdp = enableOpusNacks(sessionDescription.sdp);
        sessionDescription.sdp = sessionDescription.sdp.replace(/a=ice-options:google-ice\r\n/g,
                                                                '');
        spec.callback({
            type: sessionDescription.type,
            sdp: sessionDescription.sdp
        });
        localDesc = sessionDescription;
        //that.peerConnection.setLocalDescription(sessionDescription);
    };

    var setLocalDescp2p = function (sessionDescription) {
        sessionDescription.sdp = setMaxBW(sessionDescription.sdp, that.maxVideoBW, that.maxAudioBW);
        sessionDescription.sdp = setAudioCodec(sessionDescription.sdp);
        sessionDescription.sdp = sessionDescription.sdp.replace(/a=ice-options:google-ice\r\n/g,
                                                                '');
        spec.callback({
            type: sessionDescription.type,
            sdp: sessionDescription.sdp
        });
        localDesc = sessionDescription;
        that.peerConnection.setLocalDescription(sessionDescription);
    };

    that.updateSpec = function (config, callback){
        if (config.maxVideoBW || config.maxAudioBW ){
            if (config.maxVideoBW){
                L.Logger.debug ('Maxvideo Requested:', config.maxVideoBW,
                                'limit:', spec.limitMaxVideoBW);
                if (config.maxVideoBW > spec.limitMaxVideoBW) {
                    config.maxVideoBW = spec.limitMaxVideoBW;
                }
                spec.maxVideoBW = config.maxVideoBW;
                L.Logger.debug ('Result', spec.maxVideoBW);
            }
            if (config.maxAudioBW) {
                if (config.maxAudioBW > spec.limitMaxAudioBW) {
                    config.maxAudioBW = spec.limitMaxAudioBW;
                }
                spec.maxAudioBW = config.maxAudioBW;
            }

            localDesc.sdp = setMaxBW(localDesc.sdp, spec.maxVideoBW, spec.maxAudioBW);
            if (config.Sdp || config.maxAudioBW){
                L.Logger.debug ('Updating with SDP renegotiation', spec.maxVideoBW);
                that.peerConnection.setLocalDescription(localDesc, function () {
                    remoteDesc.sdp = setMaxBW(remoteDesc.sdp, spec.maxVideoBW, spec.maxVideoBW);
                    that.peerConnection.setRemoteDescription(
                      new RTCSessionDescription(remoteDesc), function () {
                        spec.remoteDescriptionSet = true;
                        spec.callback({type:'updatestream', sdp: localDesc.sdp});
                      });
                }, function (error){
                    L.Logger.error('Error updating configuration', error);
                    callback('error');
                });

            } else {
                L.Logger.debug ('Updating without SDP renegotiation, ' +
                                'newVideoBW:', spec.maxVideoBW,
                                'newAudioBW:', spec.maxAudioBW);
                spec.callback({type:'updatestream', sdp: localDesc.sdp});
            }
        }
        if (config.minVideoBW || (config.slideShowMode!==undefined) ||
            (config.muteStream !== undefined) || (config.qualityLayer !== undefined)){
            L.Logger.debug ('MinVideo Changed to ', config.minVideoBW);
            L.Logger.debug ('SlideShowMode Changed to ', config.slideShowMode);
            L.Logger.debug ('muteStream changed to ', config.muteStream);
            spec.callback({type: 'updatestream', config:config});
        }
    };

    that.createOffer = function (isSubscribe) {
        if (isSubscribe === true) {
            that.peerConnection.createOffer(setLocalDesc.bind(null, isSubscribe), errorCallback, 
                that.mediaConstraints);
        } else {
            that.mediaConstraints = {
                mandatory: {
                    'OfferToReceiveVideo': false,
                    'OfferToReceiveAudio': false
                }
            };
            that.peerConnection.createOffer(setLocalDesc.bind(null, isSubscribe), errorCallback, 
                that.mediaConstraints);
        }
    };

    that.updateBandwidth = function() {
       if (!remoteDesc || !localDesc) {
         L.Logger.warning('[erizo] Skipping publishAudio');
         return;
       }
       var sessionDescription = localDesc;
       sessionDescription.sdp = setMaxBW(sessionDescription.sdp, that.maxVideoBW, that.maxAudioBW);
       sessionDescription.sdp = sessionDescription.sdp.replace(/a=ice-options:google-ice\r\n/g, '');
       that.peerConnection.setLocalDescription(sessionDescription, function() {
         var as = remoteDesc.sdp.match(/b=AS:.*\r\n/g);
         if (as === null) {
           as = remoteDesc.sdp.match(/b=AS:.*\n/g);
         }
         if (as) {
           for (var i=0; i<as.length; i++) {
              remoteDesc.sdp = remoteDesc.sdp.replace(as[i], '');
           }
         }
         remoteDesc.sdp = setMaxBW(remoteDesc.sdp, that.maxVideoBW, that.maxAudioBW);
         that.peerConnection.setRemoteDescription(remoteDesc);
       });
    };

    that.publishAudio = function(val) {
       if (!remoteDesc || !localDesc) {
         L.Logger.warning('[erizo] Skipping publishAudio');
         return;
       }
       localDesc.sdp = changeAudioConnectionType(localDesc.sdp, val);
       that.peerConnection.setLocalDescription(localDesc, function() {
           remoteDesc.sdp = changeAudioConnectionType(remoteDesc.sdp, val);
           that.peerConnection.setRemoteDescription(remoteDesc);
       });
    };

    that.addStream = function (stream) {
        that.peerConnection.addStream(stream);
    };
    spec.remoteCandidates = [];

    spec.remoteDescriptionSet = false;

    that.processSignalingMessage = function (msg) {
        //L.Logger.info("Process Signaling Message", msg);

        if (msg.type === 'offer') {
            msg.sdp = setMaxBW(msg.sdp, spec.maxVideoBW, spec.maxAudioBW);
            msg.sdp = setAudioCodec(msg.sdp);
            that.peerConnection.setRemoteDescription(new RTCSessionDescription(msg), function () {
                that.peerConnection.createAnswer(setLocalDescp2p, function (error) {
                    L.Logger.error('Error: ', error);
                }, that.mediaConstraints);
                spec.remoteDescriptionSet = true;
            }, function (error) {
                L.Logger.error('Error setting Remote Description', error);
            });

        } else if (msg.type === 'answer') {
            L.Logger.info('Set remote and local description');
            L.Logger.debug('Remote Description', msg.sdp);
            L.Logger.debug('Local Description', localDesc.sdp);

            msg.sdp = setMaxBW(msg.sdp, spec.maxVideoBW, spec.maxAudioBW);
            msg.sdp = setAudioCodec(msg.sdp);

            that.peerConnection.setLocalDescription(localDesc, function () {
                that.peerConnection.setRemoteDescription(
                  new RTCSessionDescription(msg), function () {
                    spec.remoteDescriptionSet = true;
                    L.Logger.info('Candidates to be added: ', spec.remoteCandidates.length,
                                  spec.remoteCandidates);
                    while (spec.remoteCandidates.length > 0) {
                        // IMPORTANT: preserve ordering of candidates
                        that.peerConnection.addIceCandidate(spec.remoteCandidates.shift());
                    }
                    L.Logger.info('Local candidates to send:', spec.localCandidates.length);
                    while (spec.localCandidates.length > 0) {
                        // IMPORTANT: preserve ordering of candidates
                        spec.callback({type: 'candidate', candidate: spec.localCandidates.shift()});
                    }
                  });
            });

        } else if (msg.type === 'candidate') {
            try {
                var obj;
                if (typeof(msg.candidate) === 'object') {
                    obj = msg.candidate;
                } else {
                    obj = JSON.parse(msg.candidate);
                }
                if (obj.candidate === 'end') {
                    // ignore the end candidate for chrome
                    return;
                }
                obj.candidate = obj.candidate.replace(/a=/g, '');
                obj.sdpMLineIndex = parseInt(obj.sdpMLineIndex);
                var candidate = new RTCIceCandidate(obj);
                if (spec.remoteDescriptionSet) {
                    that.peerConnection.addIceCandidate(candidate);
                } else {
                    spec.remoteCandidates.push(candidate);
                }
            } catch (e) {
                L.Logger.error('Error parsing candidate', msg.candidate);
            }
        }
    };

    return that;
};
