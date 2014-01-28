// Generated by CoffeeScript 1.6.3
(function() {
  var addPeer, args, broadcast, constants, details, dev, doPing, doPong, dummy, first, ifaces, knownPeers, knows, last, os, parseHello, printKnownPeers, same, self, server, xmlrpc, _i, _ref,
    __slice = [].slice;

  require('array-sugar');

  xmlrpc = require('xmlrpc');

  constants = require('./constants');

  os = require('os');

  args = process.argv.slice(2);

  self = {};

  self.port = parseInt(args[0]) || 8080;

  ifaces = os.networkInterfaces();

  self.host = (function() {
    var _results;
    _results = [];
    for (dev in ifaces) {
      _results.push((function() {
        var _i, _len, _ref, _results1;
        _ref = ifaces[dev];
        _results1 = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          details = _ref[_i];
          if (details.family === "IPv4" && details.address !== "127.0.0.1") {
            _results1.push(details.address);
          }
        }
        return _results1;
      })());
    }
    return _results;
  })()[0][0];

  _ref = self.host.split("."), first = 2 <= _ref.length ? __slice.call(_ref, 0, _i = _ref.length - 1) : (_i = 0, []), last = _ref[_i++];

  last = "255";

  broadcast = __slice.call(first).concat([last]).join(".");

  knownPeers = [];

  same = function(p1, p2) {
    return p1.host === p1.host && p1.port === p2.port;
  };

  knows = function(peer) {
    return (knownPeers.findOne(function(p) {
      return same(p, peer);
    })) != null;
  };

  addPeer = function(peer) {
    if (same(peer, self)) {
      return;
    }
    return knownPeers.push({
      host: peer.host,
      port: peer.port
    });
  };

  dummy = function(err) {};

  doPong = function(details) {
    var client;
    client = xmlrpc.createClient(details);
    return client.methodCall(constants.PONG, [self, knownPeers], dummy);
  };

  doPing = function(details) {
    var client;
    client = xmlrpc.createClient(details);
    return client.methodCall(constants.PING, [self], dummy);
  };

  printKnownPeers = function() {
    var peer, _j, _len, _results;
    console.log("Known peers");
    _results = [];
    for (_j = 0, _len = knownPeers.length; _j < _len; _j++) {
      peer = knownPeers[_j];
      _results.push(console.log(peer));
    }
    return _results;
  };

  server = xmlrpc.createServer(self);

  server.on(constants.PING, function(err, _arg, callback) {
    var peer;
    peer = _arg[0];
    callback();
    doPong(peer);
    if (!knows(peer)) {
      return addPeer(peer);
    }
  });

  server.on(constants.PONG, function(err, _arg, callback) {
    var peer, peers, sender, _j, _len, _results;
    sender = _arg[0], peers = _arg[1];
    callback();
    if (!knows(sender)) {
      addPeer(sender);
    }
    _results = [];
    for (_j = 0, _len = peers.length; _j < _len; _j++) {
      peer = peers[_j];
      if (!(!knows(peer))) {
        continue;
      }
      addPeer(peer);
      _results.push(doPing(peer));
    }
    return _results;
  });

  console.log("Listening on %s:%s", self.host, self.port);

  parseHello = function(address, done) {
    var host, port, _ref1;
    if (address == null) {
      address = "" + broadcast + ":2210";
    }
    _ref1 = address.trim().split(":"), host = _ref1[0], port = _ref1[1];
    return done({
      host: host,
      port: port
    });
  };

  process.stdout.write("> ");

  process.stdin.resume();

  process.stdin.setEncoding("utf8");

  process.stdin.on("data", function(data) {
    var address, command, _ref1;
    _ref1 = data.split(" "), command = _ref1[0], address = _ref1[1];
    command = command.trim();
    switch (command) {
      case constants.HELLO:
        parseHello(address, doPing);
        break;
      case constants.PLIST:
        printKnownPeers();
        break;
      default:
        console.log("unknown command: " + command);
    }
    return process.stdout.write("> ");
  });

}).call(this);