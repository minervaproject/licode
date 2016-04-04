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
    that.shouldRemoveREMB = spec.shouldRemoveREMB;


    that.con = {'optional': [{'DtlsSrtpKeyAgreement': true}]};

    if (spec.iceServers !== undefined) {
        that.pc_config.iceServers = spec.iceServers;
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
        L.Logger.error("Error in Stack ", message);
    }

    that.peerConnection = new WebkitRTCPeerConnection(that.pc_config, that.con);

    var setMaxBW = function (sdp, maxVideoBW, maxAudioBW) {
        console.log("Setting maxVideoBW", maxVideoBW, "maxAudioBW", maxAudioBW);
        var as = sdp.match(/b=AS:.*\r\n/g);
        if (as === null) {
          as = sdp.match(/b=AS:.*\n/g);
        }

        if (as) {
          for (var i=0; i<as.length; i++) {
            sdp = sdp.replace(as[i], "");
          }
        }

        if (spec.video && maxVideoBW) {

            var a = sdp.match(/m=video.*\r\n/);
            if (a === null) {
                a = sdp.match(/m=video.*\n/);
            }
            if (a) {
                var r = a[0] + "b=AS:" + maxVideoBW + "\r\n";
                sdp = sdp.replace(a[0], r);
            }
        }

        if (spec.audio && maxAudioBW) {
            var a = sdp.match(/m=audio.*\r\n/);
            if (a === null) {
                a = sdp.match(/m=audio.*\n/);
            }
            if (a) {
                var r = a[0] + "b=AS:" + maxAudioBW + "\r\n";
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

    that.peerConnection.onicecandidate = function (event) {
        if (event.candidate) {

            if (!event.candidate.candidate.match(/a=/)) {
                event.candidate.candidate = "a=" + event.candidate.candidate;
            }
            ;

            var candidateObject = {
                sdpMLineIndex: event.candidate.sdpMLineIndex,
                sdpMid: event.candidate.sdpMid,
                candidate: event.candidate.candidate
            };

            if (spec.remoteDescriptionSet) {
                spec.callback({type: 'candidate', candidate: candidateObject});
            } else {
                spec.localCandidates.push(candidateObject);
                L.Logger.info("Storing candidate: ", spec.localCandidates.length, candidateObject);
            }

        } else {
           L.Logger.info("Gathered all candidates.");
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
            that.oniceconnectionstatechange(ev);
        }
    }

    var localDesc, remoteDesc;

    var setLocalDesc = function (sessionDescription) {
        sessionDescription.sdp = setMaxBW(sessionDescription.sdp);
        sessionDescription.sdp = setAudioCodec(sessionDescription.sdp);
        if (that.shouldRemoveREMB) {
            sessionDescription.sdp = removeRemb(sessionDescription.sdp);
        }
        sessionDescription.sdp = sessionDescription.sdp.replace(/a=ice-options:google-ice\r\n/g, "");
        spec.callback({
            type: sessionDescription.type,
            sdp: sessionDescription.sdp
        });
        localDesc = sessionDescription;
        //that.peerConnection.setLocalDescription(sessionDescription);
    }

    var setLocalDescp2p = function (sessionDescription) {
        sessionDescription.sdp = setMaxBW(sessionDescription.sdp);
        sessionDescription.sdp = setAudioCodec(sessionDescription.sdp);
        sessionDescription.sdp = sessionDescription.sdp.replace(/a=ice-options:google-ice\r\n/g, "");
        spec.callback({
            type: sessionDescription.type,
            sdp: sessionDescription.sdp
        });
        localDesc = sessionDescription;
        that.peerConnection.setLocalDescription(sessionDescription);
    }

    that.updateSpec = function (config, callback){
        if (config.maxVideoBW || config.maxAudioBW ){
            if (config.maxVideoBW){
                L.Logger.debug ("Maxvideo Requested", config.maxVideoBW, "limit", spec.limitMaxVideoBW);
                if (config.maxVideoBW > spec.limitMaxVideoBW) {
                    config.maxVideoBW = spec.limitMaxVideoBW;
                }
                spec.maxVideoBW = config.maxVideoBW;
                L.Logger.debug ("Result", spec.maxVideoBW);
            }
            if (config.maxAudioBW) {
                if (config.maxAudioBW > spec.limitMaxAudioBW) {
                    config.maxAudioBW = spec.limitMaxAudioBW;
                }
                spec.maxAudioBW = config.maxAudioBW;
            }

            localDesc.sdp = setMaxBW(localDesc.sdp);
            that.peerConnection.setLocalDescription(localDesc, function () {
                remoteDesc.sdp = setMaxBW(remoteDesc.sdp, spec.maxVideoBW, spec.maxAudioBW);
                that.peerConnection.setRemoteDescription(new RTCSessionDescription(remoteDesc), function () {
                    spec.remoteDescriptionSet = true;
                    spec.callback({type:'updatestream', sdp: localDesc.sdp});
                });
            }, function (error){
                L.Logger.error("Error updating configuration", error);
                callback('error');
            });
        }
        if (config.minVideoBW || (config.slideShowMode!==undefined)){
            L.Logger.debug ("MinVideo Changed to ", config.minVideoBW);
            L.Logger.debug ("SlideShowMode Changed to ", config.slideShowMode);
            spec.callback({type:'updatestream', config:config});
        }
    };

    that.createOffer = function (isSubscribe) {
        if (isSubscribe === true) {
            that.peerConnection.createOffer(setLocalDesc, errorCallback, that.mediaConstraints);
        } else {
            that.peerConnection.createOffer(setLocalDesc, errorCallback);
        }
    };

    that.updateBandwidth = function() {
       if (!remoteDesc || !localDesc) {
         console.warn("[erizo] Skipping publishAudio");
         return;
       }
       var sessionDescription = localDesc;
       sessionDescription.sdp = setMaxBW(sessionDescription.sdp, that.maxVideoBW, that.maxAudioBW);
       sessionDescription.sdp = sessionDescription.sdp.replace(/a=ice-options:google-ice\r\n/g, "");
       that.peerConnection.setLocalDescription(sessionDescription, function() {
         var as = remoteDesc.sdp.match(/b=AS:.*\r\n/g);
         if (as === null) {
           as = remoteDesc.sdp.match(/b=AS:.*\n/g);
         }
         if (as) {
           for (var i=0; i<as.length; i++) {
              remoteDesc.sdp = remoteDesc.sdp.replace(as[i], "");
           }
         }
         remoteDesc.sdp = setMaxBW(remoteDesc.sdp, that.maxVideoBW, that.maxAudioBW);
         that.peerConnection.setRemoteDescription(remoteDesc);
       });
    };

    that.publishAudio = function(val) {
       if (!remoteDesc || !localDesc) {
         console.warn("[erizo] Skipping publishAudio");
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
            msg.sdp = setAudioCodec(sessionDescription.sdp);
            that.peerConnection.setRemoteDescription(new RTCSessionDescription(msg), function () {
                that.peerConnection.createAnswer(setLocalDescp2p, function (error) {
                    L.Logger.error("Error: ", error);
                }, that.mediaConstraints);
                spec.remoteDescriptionSet = true;
            }, function (error) {
                L.Logger.error("Error setting Remote Description", error)
            });

        } else if (msg.type === 'answer') {


            // // For compatibility with only audio in Firefox Revisar
            // if (answer.match(/a=ssrc:55543/)) {
            //     answer = answer.replace(/a=sendrecv\\r\\na=mid:video/, 'a=recvonly\\r\\na=mid:video');
            //     answer = answer.split('a=ssrc:55543')[0] + '"}';
            // }

            L.Logger.info("Set remote and local description");
            L.Logger.debug("Remote Description", msg.sdp);
            L.Logger.debug("Local Description", localDesc.sdp);

            msg.sdp = setMaxBW(msg.sdp, spec.maxVideoBW, spec.maxAudioBW);
            msg.sdp = setAudioCodec(msg.sdp);

            remoteDesc = new RTCSessionDescription(msg);
            that.peerConnection.setLocalDescription(localDesc, function () {
                that.peerConnection.setRemoteDescription(remoteDesc, function () {
                    spec.remoteDescriptionSet = true;
                    L.Logger.info("Candidates to be added: ", spec.remoteCandidates.length, spec.remoteCandidates);
                    while (spec.remoteCandidates.length > 0) {
                        // IMPORTANT: preserve ordering of candidates
                        that.peerConnection.addIceCandidate(spec.remoteCandidates.shift());
                    }
                    L.Logger.info("Local candidates to send:", spec.localCandidates.length);
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
                obj.candidate = obj.candidate.replace(/a=/g, "");
                obj.sdpMLineIndex = parseInt(obj.sdpMLineIndex);
                var candidate = new RTCIceCandidate(obj);
                if (spec.remoteDescriptionSet) {
                    that.peerConnection.addIceCandidate(candidate);
                } else {
                    spec.remoteCandidates.push(candidate);
                }
            } catch (e) {
                L.Logger.error("Error parsing candidate", msg.candidate);
            }
        }
    }

    return that;
};
