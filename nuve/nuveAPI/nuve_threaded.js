var cluster = require('cluster');
var numWorkers = 10;

if (cluster.isMaster) {

    for (var i = 0; i < numWorkers; i++) {
        cluster.fork();
    }

    cluster.on('exit', function(worker, code, signal) {
        console.log('worker %d died (%s). restarting...', worker.process.pid, signal || code);
        cluster.fork();
    });

} else {
    require('./nuve');
}

