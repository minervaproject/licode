var serverUrl = "/";
var localStream, room, recording, recordingId;

function getParameterByName(name) {
  name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
  var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
      results = regex.exec(location.search);
  return results == null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
}

function startRecording () {
  if (room !== undefined){
    if (!recording){
      room.startRecording(localStream, function(id) {
        recording = true;
        recordingId = id;
      });

    } else {
      room.stopRecording(recordingId);
      recording = false;
    }
  }
}

window.onload = function () {

  var createToken = function(userName, role, callback) {

    var req = new XMLHttpRequest();
    var url = serverUrl + 'createToken/';
    var body = {username: userName, role: role};

    req.onreadystatechange = function () {
      if (req.readyState === 4) {
        callback(req.responseText);
      }
    };

    req.open('POST', url, true);
    req.setRequestHeader('Content-Type', 'application/json');
    req.send(JSON.stringify(body));
  };

  var connect = function(localStream) {
    createToken("user", "presenter", function (response) {
      var token = response;
      console.log(token);
      room = Erizo.Room({token: token});

      localStream.addEventListener("access-accepted", function () {
        var subscribeToStreams = function (streams) {
          for (var index in streams) {
            var stream = streams[index];
            if (localStream.getID() !== stream.getID()) {
              room.subscribe(stream);
            }
          }
        };

        room.addEventListener("room-connected", function (roomEvent) {

          room.publish(localStream, {maxVideoBW: 300});
          subscribeToStreams(roomEvent.streams);
        });

        room.addEventListener("stream-subscribed", function(streamEvent) {
          var stream = streamEvent.stream;
          var div = document.createElement('div');
          div.setAttribute("style", "width: 320px; height: 240px;");
          div.setAttribute("id", "test" + stream.getID());

          document.body.appendChild(div);
          stream.show("test" + stream.getID());

        });

      room.addEventListener("stream-added", function (streamEvent) {
        var streams = [];
        streams.push(streamEvent.stream);
        subscribeToStreams(streams);
        document.getElementById("recordButton").disabled = false;
      });

      room.addEventListener("stream-removed", function (streamEvent) {
        // Remove stream from DOM
        var stream = streamEvent.stream;
        if (stream.elementID !== undefined) {
          var element = document.getElementById(stream.elementID);
          document.body.removeChild(element);
        }
      });

      room.addEventListener("stream-failed", function (streamEvent){
          console.log("STREAM FAILED, DISCONNECTION");
          room.disconnect();

      });

        room.connect();

        localStream.show("myVideo");

      });
      localStream.init();
    });
  };

  recording = false;
  var screen = getParameterByName("screen");

  if (screen) {
    ScreenshareChromeExtension.getDesktopMedia(function(streamId) {
      localStream = Erizo.Stream({audio: false, screen: true, desktopStreamId: streamId});
      connect(localStream);
    }, function() {
      console.log("Error getting desktop media", arguments);
    }, ["screen"]);
  } else {
    localStream = Erizo.Stream({audio: true, video: true, data: true, screen: false, videoSize: [640, 480, 640, 480]});
    connect(localStream);
  }

};
