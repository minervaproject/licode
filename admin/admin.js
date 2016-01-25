/*global require, logger. setInterval, clearInterval, Buffer, exports*/
var PORT = 2999;
var config = require('./../licode_config');
GLOBAL.config = config || {};

var amqper = require('./../erizo_controller/common/amqper.js')
var express = require('express');
var app = express();
// var http = require('http');
var server = require('http').Server(app);
var io = require('socket.io').listen(server);
var latestStats = {};

// app.set('view options', { layout: "layout" });

app.use('/public', express.static('public'));

app.get('/', function (req, res) {
  res.render('index.ejs');
});

app.get('/test', function (req, res) {
  res.render('test.ejs');
});

// app.get('/admin.js', function(req, res) {
//   res.sendFile(__dirname + '/client/src/admin.js');
// });

io.on('connection', function (socket) {

  socket.on('broadcast', function (req) {
    console.log("broadcast - req:", req);
    amqper.broadcast(req.type, {method: req.method, args: req.args || []}, function (resp) {
      console.log("broadcast - resp:", arguments);
      resp.req = req;
      socket.emit('result', resp);
    });
  });

  socket.on('call', function (req) {
    console.log("call - req:", req.type);
    amqper.callRpc(req.type, req.method, (req.args || []), {"callback": function (resp) {
      console.log("call - resp:", arguments);
      if (resp == "timeout") {
        resp = {type: "timeout"};
      }
      resp.req = req;
      socket.emit('result', resp);
    }});
  });

  socket.on('subscribe', function (req) {
    console.log("subscribe - req:", req.type);
    amqper.bind_broadcast(req.type, function(resp, err) {
      console.log("subscribe - resp:", resp);
      resp.req = req;
      socket.emit('subscription', resp);
    });
  });
});

amqper.connect(function() {
  server.listen(PORT);
});
