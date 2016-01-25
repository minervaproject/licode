define(['socketio'], function(io) {
  var socket = io.connect(window.location);
  var callbacks = {};
  var getId = function() {
    return "" + Date.now() + "-" + (Math.floor(Math.random() * 100000));
  };

  var emit = function(call_type, method, args, callback) {
    var id = getId()
    callbacks[id] = callback;
    socket.emit(call_type, {type: method.split('.')[0], method: method.split('.')[1], id: id });
  };

  var handle = function(type, resp) {
    var id = resp.req.id;
    if (!(id in callbacks)) {
      // console.warn("UNMATCHED: ", resp);
    } else {
      if (resp.type == "timeout") {
        console.warn("TIMEOUT: ", resp);
      }
      delete resp['req'];
      callbacks[id](resp);
    }
    return id;
  };

  socket.on('result', function (resp) {
    var id = handle('result', resp);
    delete callbacks[id];
  });

  socket.on('subscription', function (resp) {
    var id = handle('result', resp);
  });
  
  return {

    call: function(method, args, callback) {
      emit('call', method, args, callback);
    },

    broadcast: function(method, args, callback) {
      emit('broadcast', method, args, callback);
    },

    subscribe: function(method, callback) {
      emit('subscribe', method, null, callback);
    }
  };
});