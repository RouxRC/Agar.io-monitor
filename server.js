var http = require("http"),
    DEBUG = true;

getAgarServer = function(region, cb) {
    var req = http.request({
      host: 'm.agar.io',
      port: 80,
      path: '/',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': region.length,
        'Origin': 'http://agar.io',
        'Referer': 'http://agar.io/'
      }
    }, function(res) {
        var server = '';
        if(res.statusCode != 200) {
            console.log('HTTP request status code: ' + res.statusCode);
            return cb();
        }
        res.setEncoding('utf8');

        res.on('data', function (chunk) {
            server += chunk;
        });
        res.on('end', function() {
            var data = server.split('\n');
            cb('ws://' + data[0], data[1]);
        });
    });

    req.on('error', function(e) {
        console.log('HTTP request error: ' + e.message);
        return cb();
    });

    req.write(region);
    req.end();
};

function getAgarServerKey(ip, leader, region, timeout, callback){
    realtimeout = timeout * (0.8 + 0.4 * Math.random());
    callback = callback || function(key){
        console.log("Found key", key, "for server", ip);
    };
    getAgarServer(region, function(server, key){
        if (server === ip) return callback(key);
        else if (!server) realtimeout *= 3;
        else if (DEBUG) console.log(server.replace("ws://", ""));
        setTimeout(function(){
            getAgarServerKey(ip, leader, region, timeout, callback);
        }, realtimeout);
    });
}

function farmServerKeys(args){
    server = args[2] || "ws://151.80.96.56:443";
    if (/^\d+\./.test(server)) server = "ws://" + server;
    if(server && !/^ws:\/\/(\d{1,3}\.){3}\d{1,3}:\d\d+$/.test(server))
        return console.log('Wrong server IP:', server);
    leader = args[3] || "";
    timeout = args[4] || 350;
    region = args[5] || "EU-London";
    this.keys = {};
    var _self = this;
    function callback(key){
        _self.keys[key] = {status: 0};
        console.log(Object.keys(_self.keys).length, key);
        setTimeout(function(){
            getAgarServerKey(server, leader, region, timeout, callback);
        }, timeout);
    }
    getAgarServerKey(server, leader, region, timeout, callback);
}

//module.exports = farmServerKeys;
var farm = new farmServerKeys(process.argv);
