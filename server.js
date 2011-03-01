var sys    = require('sys'),
    http   = require('http'),
    ws     = require("./vendor/ws"),
    base64 = require('./vendor/base64'),
    arrays = require('./vendor/arrays');

// Command line args
var USERNAME = process.ARGV[2];
var PASSWORD = process.ARGV[3];

if (!USERNAME || !PASSWORD)
  return sys.puts("Usage: node server.js <twitter_username> <twitter_password>");

// Authentication Headers for Twitter
var auth = base64.encode(USERNAME + ':' + PASSWORD);
var headers = {
  'Authorization' : "Basic " + auth,
  'Host'          : "stream.twitter.com"
};

var clients = [];

// Connection to Twitter's streaming API
var twitter;
var request;

var tweets = "";
var tweetsResponse;

//var request = twitter.request("GET", "/1/statuses/sample.json");

responseListener = function(chunk) {
  // Send response to all connected clients
  tweets += chunk;
  
  if((tweets.split(/{/g).length - 1) == (tweets.split(/}/g).length - 1)) {
    console.log(tweets.substring(0, 50));
    
    clients.each(function(c) {
      c.write(tweets);
    });
    
    tweets = "";
  }
}

responseFunction = function (response) {
  response.setEncoding("utf8");
  response.addListener("data", responseListener);
  tweetsResponse = response;
}

// Websocket TCP server
ws.createServer(function (websocket) {
  clients.push(websocket);
  
  websocket.addListener("data", function(message){
    if(tweetsResponse) {
      tweetsResponse.removeListener("data", responseListener);
    }

    twitter = http.createClient(80, "stream.twitter.com");
    request = twitter.request("GET", "/1/statuses/filter.json?track=" + message, headers);
    request.addListener('response', responseFunction);
    request.end();
    console.log("Now searching for: " + message);

  });

  websocket.addListener("connect", function (resource) {
    // emitted after handshake
    sys.debug("connect: " + resource);
        
  }).addListener("close", function () {
    // emitted when server or client closes connection
    clients.remove(websocket);
    sys.debug("close");
  });
}).listen(8081);
