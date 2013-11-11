/*global describe, beforeEach, it, XMLHttpRequest, jasmine, expect, waitsFor, runs, Erizo*/
describe('server', function () {
    "use strict";
    var room, createToken, token, localStream, remoteStream;

    var TIMEOUT=10000;

    createToken = function (userName, role, callback) {

        var req = new XMLHttpRequest(),
            serverUrl = "http://localhost:3001/",
            url = serverUrl + 'createToken/',
            body = {username: userName, role: role};

        req.onreadystatechange = function () {
            if (req.readyState === 4) {
                callback(req.responseText);
            }
        };

        req.open('POST', url, true);
        req.setRequestHeader('Content-Type', 'application/json');
        req.send(JSON.stringify(body));
    };

    beforeEach(function () {
        L.Logger.setLogLevel(L.Logger.ALL);
    });

    it('should get token', function () {
        var callback = jasmine.createSpy("token");

        createToken("user", "role", function(_token) {
            callback();
            token = _token;
        });

        waitsFor(function () {
            return callback.callCount > 0;
        }, "The token shoud have been creaded", TIMEOUT);

        runs(function () {
            expect(callback).toHaveBeenCalled();
        });
    });

    it('should get access to user media', function () {
        var callback = jasmine.createSpy("getusermedia");

        localStream = Erizo.Stream({audio: true, video: true, fake: true, data: true});

        localStream.addEventListener("access-accepted", callback);

        localStream.init();

        waitsFor(function () {
            return callback.callCount > 0;
        }, "User media should have been accepted", TIMEOUT);

        runs(function () {

            expect(callback).toHaveBeenCalled();
        });
    });

    it('should connect to room', function () {
        var callback = jasmine.createSpy("connectroom");

        room = Erizo.Room({token: token});

        room.addEventListener("room-connected", callback);

        room.connect();

        waitsFor(function () {
            return callback.callCount > 0;
        }, "Client should be connected to room", TIMEOUT);

        runs(function () {
            expect(callback).toHaveBeenCalled();
        });
    });

    it('should publish stream in room', function () {
        var callback = jasmine.createSpy("publishroom");

        room.addEventListener("stream-added", function(msg) {
            callback();
        });
        room.publish(localStream);
        waitsFor(function () {
            return callback.callCount > 0;
        }, "Stream should be published in room", TIMEOUT);

        runs(function () {
            expect(callback).toHaveBeenCalled();
        });
    });

    it('should subscribe to stream in room', function () {
        var callback = jasmine.createSpy("publishroom");

        room.addEventListener("stream-subscribed", function() {
            callback();
        });
        
        for (var index in remoteStream) {
            var stream = remoteStream[index];
            room.subscribe(stream);
        }
        waitsFor(function () {
            return callback.callCount > 0;
        }, "Stream should be subscribed to stream", 20000);

        runs(function () {
            expect(callback).toHaveBeenCalled();
        });
    });

    it('should allow showing a subscribed stream', function () {
        var divg = document.createElement("div");
        divg.setAttribute("id", "myDiv");
        document.body.appendChild(divg);

        localStream.show('myDiv');

        waits(500);

        runs(function () {
            var video = document.getElementById('stream' + localStream.getID());
            expect(video.getAttribute("url")).toBeDefined();
        });
    });

    it('should disconnect from room', function () {
        var callback = jasmine.createSpy("connectroom");

        room.addEventListener("room-disconnected", callback);

        room.disconnect();

        waitsFor(function () {
            return callback.callCount > 0;
        }, "Client should be disconnected from room", TIMEOUT);

        runs(function () {
            expect(callback).toHaveBeenCalled();
        });
    });
});
