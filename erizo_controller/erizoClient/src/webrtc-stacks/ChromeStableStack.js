/*global window, console, RTCSessionDescription, RoapConnection, webkitRTCPeerConnection*/

var Erizo = Erizo || {};

Erizo.ChromeStableStack = function (spec) {
    "use strict";

    var that = {},
        WebkitRTCPeerConnection = webkitRTCPeerConnection;

    that.pc_config = {
        "iceServers": []
    };
    that.maxVideoBW = spec.maxVideoBW;
    that.maxAudioBW = spec.maxAudioBW;
    that.audioCodec = spec.audioCodec;
    that.opusHz = spec.opusHz;
    that.opusBitrate = spec.opusBitrate;


    that.con = {'optional': [{'DtlsSrtpKeyAgreement': true}]};

    if (spec.stunServerUrl !== undefined) {
        that.pc_config.iceServers.push({"url": spec.stunServerUrl});
    }

    if ((spec.turnServer || {}).url) {
        that.pc_config.iceServers.push({"username": spec.turnServer.username, "credential": spec.turnServer.password, "url": spec.turnServer.url});
    }

    if (spec.audio === undefined) {
        spec.audio = true;
    }

    if (spec.video === undefined) {
        spec.video = true;
    }

    that.mediaConstraints = {
        mandatory : {
            'OfferToReceiveVideo': spec.video,
            'OfferToReceiveAudio': spec.audio
        }
    };

    var errorCallback = function(message){
      console.log("Error in Stack ", message);
    }

    that.peerConnection = new WebkitRTCPeerConnection(that.pc_config, that.con);

    that.peerConnection.onicecandidate = function (event) {
        L.Logger.debug("Have ice candidate for session: ", spec.session_id);
        // HACK (bf) If no new ice candidates for 0.5s, stop waiting
        clearTimeout(that.moreIceTimeout);
        that.moreIceTimeout = setTimeout(function() {
            if (that.moreIceComing) {
                that.moreIceComing = false;
                that.markActionNeeded();
            }
        }, 500);

        if (!event.candidate) {
            // At the moment, we do not renegotiate when new candidates
            // show up after the more flag has been false once.
            L.Logger.debug("State: " + that.peerConnection.iceGatheringState);

            if (that.ices === undefined) {
                that.ices = 0;
            }
            that.ices = that.ices + 1;
            if (that.ices >= 1 && that.moreIceComing) {
                that.moreIceComing = false;
                that.markActionNeeded();
                clearTimeout(that.moreIceTimeout);
            }
        } else {
            that.iceCandidateCount += 1;
        }
    };

    var setMaxBW = function (sdp) {
        var as = sdp.match(/b=AS:.*\r\n/g);
        if (as == null) {
          as = sdp.match(/b=AS:.*\n/g);
        }
        _.each(as, function(a) {
          sdp = sdp.replace(a, "");
        });

        if (spec.video && that.maxVideoBW) {
            var a = sdp.match(/m=video.*\r\n/);
            if (a == null){
              a = sdp.match(/m=video.*\n/);
            }
            var r = a[0] + "b=AS:" + that.maxVideoBW + "\r\n";
            sdp = sdp.replace(a[0], r);
        }

        if (spec.audio && that.maxAudioBW) {
            var a = sdp.match(/m=audio.*\r\n/);
            if (a == null){
              a = sdp.match(/m=audio.*\n/);
            }
            var r = a[0] + "b=AS:" + that.maxAudioBW + "\r\n";
            sdp = sdp.replace(a[0], r);
        }
        return sdp;
    };

    var removeRemb = function (sdp) {
        var a = sdp.match(/a=rtcp-fb:100 goog-remb\r\n/);
        if (a === null){
          a = sdp.match(/a=rtcp-fb:100 goog-remb\n/);
        }
        if (a) {
            sdp = sdp.replace(a[0], "");
        }
        return sdp;
    };

    var changeAudioConnectionType = function(sdp, makeActive) {
      var k1 = sdp.indexOf("m=audio");
      var k2 = sdp.indexOf("m=video");
      if (k2 === -1) {
        k2 = sdp.length;
      }
      if (k1 > k2) {
        var tmp = k2;
        k2 = k1;
        k1 = k2;
      }
      var p1 = sdp.slice(0,k1);
      var p2 = sdp.slice(k1,k2);
      var p3 = sdp.slice(k2);
      if (makeActive) {
        p2 = p2.replace("a=inactive", "a=sendrecv");
      } else {
        p2 = p2.replace("a=sendrecv", "a=inactive");
      }
      return p1 + p2 + p3;
    };

    var setAudioCodec = function(sdp) {
        var temp;
        if (that.audioCodec) {
            if (that.audioCodec !== "opus") {
                temp = sdp.match(".*opus.*\r\na=fmtp.*\r\n");
                sdp = sdp.replace(temp, "");
            } else {
                if (that.opusHz) {
                    temp = sdp.match(".*opus.*\r\na=fmtp.*");
                    sdp = sdp.replace(temp, temp +
                        "; maxplaybackrate=" + that.opusHz +
                        "; sprop-maxcapturerate=" + that.opusHz);
                }
                if (that.opusBitrate) {
                    temp = sdp.match(".*opus.*\r\na=fmtp.*");
                    sdp = sdp.replace(temp, temp +
                        "; maxaveragebitrate=" + that.opusBitrate);
                }
            }
            if (that.audioCodec !== "ISAC/32000") {
                temp = sdp.match(".*ISAC/32000\r\n");
                sdp = sdp.replace(temp, "");
            }
            if (that.audioCodec !== "ISAC/16000") {
                temp = sdp.match(".*ISAC/16000\r\n");
                sdp = sdp.replace(temp, "");
            }
        }
        return sdp;
    };

    var pruneIceCandidates = function(sdp) {

        /* Remove all TCP candidates.  Who needs em?! */
        var regExp = new RegExp(/a=candidate:\d+\s\d\stcp.+/g);
        sdp = sdp.replace(regExp,"");

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

    that.peerConnection.onicecandidate =  function (event) {
        if (event.candidate) {

            if (!event.candidate.candidate.match(/a=/)) {
                event.candidate.candidate ="a="+event.candidate.candidate;
            };

            if (spec.remoteDescriptionSet) {
                spec.callback({type:'candidate', candidate: event.candidate});
            } else {
                spec.localCandidates.push(event.candidate);
                console.log("Local Candidates stored: ", spec.localCandidates.length, spec.localCandidates);
            }

        } else {
            console.log("End of candidates.");
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

    var localDesc, remoteDesc;

    var setLocalDesc = function (sessionDescription) {
        sessionDescription.sdp = setMaxBW(sessionDescription.sdp);
        sessionDescription.sdp = setAudioCodec(sessionDescription.sdp);
        sessionDescription.sdp = removeRemb(sessionDescription.sdp);
        sessionDescription.sdp = sessionDescription.sdp.replace(/a=ice-options:google-ice\r\n/g, "");
        spec.callback(sessionDescription);
        localDesc = sessionDescription;
        //that.peerConnection.setLocalDescription(sessionDescription);
    }

    var setLocalDescp2p = function (sessionDescription) {
        sessionDescription.sdp = setMaxBW(sessionDescription.sdp);
        sessionDescription.sdp = setAudioCodec(sessionDescription.sdp);
        sessionDescription.sdp = sessionDescription.sdp.replace(/a=ice-options:google-ice\r\n/g, "");
        spec.callback(sessionDescription);
        localDesc = sessionDescription;
        that.peerConnection.setLocalDescription(sessionDescription);
    }

    that.createOffer = function (isSubscribe) {
      if (isSubscribe===true){
          that.peerConnection.createOffer(setLocalDesc, errorCallback, that.mediaConstraints);
      }else{
          that.peerConnection.createOffer(setLocalDesc, errorCallback);
      }
    };

    that.updateBandwidth = function() {
       var sessionDescription = localDesc;
       sessionDescription.sdp = setMaxBW(sessionDescription.sdp);
       sessionDescription.sdp = sessionDescription.sdp.replace(/a=ice-options:google-ice\r\n/g, "");
       that.peerConnection.setLocalDescription(sessionDescription, function() {
           var as = remoteDesc.sdp.match(/b=AS:.*\r\n/g);
           if (as == null) {
             as = remoteDesc.sdp.match(/b=AS:.*\n/g);
           }
           _.each(as, function(a) {
             remoteDesc.sdp = remoteDesc.sdp.replace(a, "");
           });
           remoteDesc.sdp = setMaxBW(remoteDesc.sdp);
           that.peerConnection.setRemoteDescription(remoteDesc);
       });
    };

    that.publishAudio = function(val) {
       localDesc.sdp = changeAudioConnectionType(localDesc.sdp, val);
       that.peerConnection.setLocalDescription(localDesc, function() {
           remoteDesc.sdp = changeAudioConnectionType(remoteDesc.sdp, val);
           that.peerConnection.setRemoteDescription(remoteDesc);
       });
       console.log("publishAudio", val);
       console.log(localDesc.sdp);
    };

    that.addStream = function (stream) {
        that.peerConnection.addStream(stream);
    };
    spec.remoteCandidates = [];

    spec.remoteDescriptionSet = false;

    that.processSignalingMessage = function (msg) {
        console.log("Process Signaling Message", msg);

        if (msg.type === 'offer') {
            msg.sdp = setMaxBW(msg.sdp);
            msg.sdp = setAudioCodec(sessionDescription.sdp);
            that.peerConnection.setRemoteDescription(new RTCSessionDescription(msg));
            that.peerConnection.createAnswer(setLocalDescp2p, null, that.mediaConstraints);
            spec.remoteDescriptionSet = true;

        } else if (msg.type === 'answer') {


            // // For compatibility with only audio in Firefox Revisar
            // if (answer.match(/a=ssrc:55543/)) {
            //     answer = answer.replace(/a=sendrecv\\r\\na=mid:video/, 'a=recvonly\\r\\na=mid:video');
            //     answer = answer.split('a=ssrc:55543')[0] + '"}';
            // }

            console.log("Set remote and local description", msg.sdp);

            msg.sdp = setMaxBW(msg.sdp);
            msg.sdp = setAudioCodec(msg.sdp);

            that.peerConnection.setLocalDescription(localDesc, function(){
              remoteDesc = new RTCSessionDescription(msg);
              that.peerConnection.setRemoteDescription(remoteDesc, function() {
                spec.remoteDescriptionSet = true;
                console.log("Candidates to be added: ", spec.remoteCandidates.length, spec.remoteCandidates);
                while (spec.remoteCandidates.length > 0) {
                // IMPORTANT: preserve ordering of candidates
                  that.peerConnection.addIceCandidate(spec.remoteCandidates.shift());
                }
                console.log("Local candidates to send:" , spec.localCandidates.length);
                while(spec.localCandidates.length > 0) {
                // IMPORTANT: preserve ordering of candidates
                  spec.callback({type:'candidate', candidate: spec.localCandidates.shift()});
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
                obj.candidate = obj.candidate.replace(/a=/g, "");
                obj.sdpMLineIndex = parseInt(obj.sdpMLineIndex);
                var candidate = new RTCIceCandidate(obj);
                if (spec.remoteDescriptionSet) {
                    that.peerConnection.addIceCandidate(candidate);
                } else {
                    spec.remoteCandidates.push(candidate);
//                    console.log("Candidates stored: ", spec.remoteCandidates.length, spec.remoteCandidates);
                }
            } catch(e) {
                L.Logger.error("Error parsing candidate", msg.candidate);
            }
        }
    }

    return that;
};
