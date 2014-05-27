var config = {}

config.rabbit = {};
config.nuve = {};
config.erizoController = {};
config.erizoAgent = {};
config.cloudProvider = {};
config.erizo = {};

config.rabbit.host = 'localhost';
config.rabbit.port = 5672;

config.nuve.dataBaseURL = "localhost/nuvedb";
config.nuve.superserviceID = '_auto_generated_ID_';
config.nuve.superserviceKey = '_auto_generated_KEY_';
config.nuve.testErizoController = 'localhost:8080';

//Use undefined to run clients without Stun 
var network_config  = require("./licode_config/network")

config.erizoController.stunServerUrl = network_config.stunServerUrl;

config.erizoController.defaultVideoBW = 300;
config.erizoController.maxVideoBW = 300;

//Public erizoController IP for websockets (useful when behind NATs)
//Use '' to automatically get IP from the interface
config.erizoController.publicIP = network_config.publicIP;
//Use '' to use the public IP address instead of a hostname
config.erizoController.hostname = '';
config.erizoController.port = 8080;
//Use true if clients communicate with erizoController over SSL
config.erizoController.ssl = false;

// Use the name of the inferface you want to bind to for websockets
// config.erizoController.networkInterface = 'eth1'

//Use undefined to run clients without Turn
if(network_config.turnServerUrl) {
  var turnServer = {};
  config.erizoController.turnServer = turnServer;
  turnServer.url = network_config.turnServerUrl;
  turnServer.username = 'licode';
  turnServer.password = 'licode';  
}

config.erizoController.warning_n_rooms = 15;
config.erizoController.limit_n_rooms = 20;
config.erizoController.interval_time_keepAlive = 1000;

// If true, erizoController sends stats to rabbitMQ queue "stats_handler" 
config.erizoController.sendStats = false; 

// If undefined, the path will be /tmp/
config.erizoController.recording_path = undefined; 

// Max processes that ErizoAgent can run
config.erizoAgent.maxProcesses 	  = 1;
// Number of precesses that ErizoAgent runs when it starts. Always lower than or equals to maxProcesses.
config.erizoAgent.prerunProcesses = 1;

//STUN server IP address and port to be used by the server.
//if '' is used, the address is discovered locally
config.erizo.stunserver = '';
config.erizo.stunport = 0;

//note, this won't work with all versions of libnice. With 0 all the available ports are used
config.erizo.minport = 63000;
config.erizo.maxport = 63999;

//In Amazon Ec2 instances you can specify the zone host. By default is 'ec2.us-east-1a.amazonaws.com' 
config.cloudProvider.host = '';
config.cloudProvider.accessKey = '';
config.cloudProvider.secretAccessKey = '';

config.minervaHost = network_config.minervaHost;
config.cloudProvider.publicIP = network_config.publicIP;

config.cloudProvider.name = network_config.cloudProviderName;

// Roles to be used by services
config.roles = {"presenter":["publish", "subscribe", "record"], "viewer":["subscribe"]};

var module = module || {};
module.exports = config;
