// Generated by CoffeeScript 1.6.3
(function() {
  var EventEmitter, Network, constants, xmlrpc,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  require('array-sugar');

  xmlrpc = require('xmlrpc');

  constants = require('./constants');

  EventEmitter = (require('events')).EventEmitter;

  Network = (function(_super) {
    __extends(Network, _super);

    function Network(port, log) {
      var createClient, server,
        _this = this;
      if (log == null) {
        log = function() {};
      }
      server = xmlrpc.createServer({
        port: port
      });
      createClient = function(receiver) {
        return xmlrpc.createClient({
          port: receiver.port,
          host: receiver.host
        });
      };
      this.pong = function(receiver, sender, knownPeers, done) {
        var client;
        client = createClient(receiver);
        return client.methodCall(constants.PONG, [sender, knownPeers], done);
      };
      this.ping = function(receiver, sender, done) {
        var client;
        client = createClient(receiver);
        return client.methodCall(constants.PING, [sender], done);
      };
      this.forceFriend = function(receiver, sender, token, done) {
        var client;
        client = createClient(receiver);
        return client.methodCall(constants.FORCE_FRIEND, [sender, token], done);
      };
      this.friend = function(receiver, sender, token, done) {
        var client;
        client = createClient(receiver);
        return client.methodCall(constants.FRIEND, [sender, token], done);
      };
      this.unfriend = function(receiver, sender, newPeer, token, done) {
        var client;
        client = createClient(receiver);
        return client.methodCall(constants.UNFRIEND, [sender, newPeer, token], done);
      };
      this.deleteToken = function(receiver, token, done) {
        var client;
        client = createClient(receiver);
        return client.methodCall(constants.DELETE_TOKEN, [token], done);
      };
      this.createGraph = function(receiver, done) {
        var client;
        client = createClient(receiver);
        return client.methodCall(constants.GRAPH, [], done);
      };
      this.query = function(receiver, origin, query, details, done) {
        var client;
        client = createClient(receiver);
        return client.methodCall(constants.QUERY, [origin, query, details], done);
      };
      this.queryResult = function(receiver, result, details, done) {
        var client;
        client = createClient(receiver);
        return client.methodCall(constants.QUERY_RESULT, [result, details], done);
      };
      server.on(constants.PING, function(err, _arg, callback) {
        var peer;
        peer = _arg[0];
        callback(null);
        return _this.emit(constants.PING, peer);
      });
      server.on(constants.PONG, function(err, _arg, callback) {
        var peers, sender;
        sender = _arg[0], peers = _arg[1];
        callback(null);
        return _this.emit(constants.PONG, sender, peers);
      });
      server.on(constants.FORCE_FRIEND, function(err, _arg, callback) {
        var peer, token;
        peer = _arg[0], token = _arg[1];
        return _this.emit(constants.FORCE_FRIEND, peer, token, function(kicked) {
          return callback(null, kicked);
        });
      });
      server.on(constants.UNFRIEND, function(err, _arg, callback) {
        var oldFriend, peer, token;
        oldFriend = _arg[0], peer = _arg[1], token = _arg[2];
        callback(null);
        return _this.emit(constants.UNFRIEND, oldFriend, peer, token);
      });
      server.on(constants.FRIEND, function(err, _arg, callback) {
        var peer, token;
        peer = _arg[0], token = _arg[1];
        return _this.emit(constants.FRIEND, peer, token, function(err) {
          return callback(null, err);
        });
      });
      server.on(constants.GRAPH, function(err, _arg, callback) {
        _arg;
        return _this.emit(constants.GRAPH, function(graph) {
          return callback(null, graph);
        });
      });
      server.on(constants.DELETE_TOKEN, function(err, _arg, callback) {
        var token;
        token = _arg[0];
        callback(null);
        return _this.emit(constants.DELETE_TOKEN, token);
      });
      server.on(constants.QUERY, function(err, _arg, callback) {
        var details, origin, query;
        origin = _arg[0], query = _arg[1], details = _arg[2];
        callback(null);
        return _this.emit(constants.QUERY, origin, query, details);
      });
      server.on(constants.QUERY_RESULT, function(err, _arg, callback) {
        var details, result;
        result = _arg[0], details = _arg[1];
        callback(null);
        return _this.emit(constants.QUERY_RESULT, result, details);
      });
      log("Listening on " + this.port);
    }

    return Network;

  })(EventEmitter);

  module.exports = Network;

}).call(this);
