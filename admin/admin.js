/*global require, logger. setInterval, clearInterval, Buffer, exports*/
var PORT = 2999;
var config = require('./../licode_config');
GLOBAL.config = config || {};

var amqper = require('./../erizo_controller/common/amqper.js')
var app = require('express')();
// var http = require('http');
var server = require('http').Server(app);
var io = require('socket.io').listen(server);

amqper.connect(function() {
  server.listen(PORT);  
});

app.get('/', function (req, res) {
  res.sendFile(__dirname + '/index.html');
});

app.get('/test', function (req, res) {
  res.sendFile(__dirname + '/test.html');
});

app.get('/admin.js', function(req, res) {
  res.sendFile(__dirname + '/client/src/admin.js');
});

io.on('connection', function (socket) {

  socket.on('call', function (req) {
    amqper.broadcast(req.type, {method: req.method, args: req.args || []}, function (resp) {
      console.log(arguments);
      resp.req = req;
      socket.emit('result', resp);
    });
  });

});

