// Generated by CoffeeScript 1.6.3
(function() {
  var DELETE_TOKEN, EventEmitter, FILE, FORCE_FRIEND, FOUND, FRIEND, GRAPH, KQUERY, Network, PING, PONG, QUERY, QUERY_RESULT, REPORT, UNFRIEND, xmlrpc,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  require('array-sugar');

  xmlrpc = require('xmlrpc');

  EventEmitter = (require('events')).EventEmitter;

  PONG = "pong";

  PING = "ping";

  FORCE_FRIEND = "force_friend";

  FRIEND = "friend";

  UNFRIEND = "unfriend";

  DELETE_TOKEN = "delete_token";

  GRAPH = "graph";

  QUERY = "query";

  QUERY_RESULT = "query_result";

  KQUERY = "kquery";

  FILE = "file";

  FOUND = "found";

  REPORT = "report";

  Network = (function(_super) {
    __extends(Network, _super);

    function Network(peer, log) {
      var createClient, createServer, received, sent, server, updateData,
        _this = this;
      if (log == null) {
        log = function() {};
      }
      server = null;
      createServer = function(port) {
        server = xmlrpc.createServer({
          port: port
        });
        server.httpServer.on('listening', function() {
          server.on(PING, function(err, _arg, callback) {
            var peer;
            peer = _arg[0];
            callback(null);
            updateData(received, PING);
            return _this.emit(PING, peer);
          });
          server.on(PONG, function(err, _arg, callback) {
            var peers, sender;
            sender = _arg[0], peers = _arg[1];
            callback(null);
            updateData(received, PONG);
            return _this.emit(PONG, sender, peers);
          });
          server.on(FORCE_FRIEND, function(err, _arg, callback) {
            var peer, token;
            peer = _arg[0], token = _arg[1];
            updateData(received, FORCE_FRIEND);
            return _this.emit(FORCE_FRIEND, peer, token, function(kicked) {
              return callback(null, kicked);
            });
          });
          server.on(UNFRIEND, function(err, _arg, callback) {
            var oldFriend, peer, token;
            oldFriend = _arg[0], peer = _arg[1], token = _arg[2];
            callback(null);
            updateData(received, UNFRIEND);
            return _this.emit(UNFRIEND, oldFriend, peer, token);
          });
          server.on(FRIEND, function(err, _arg, callback) {
            var peer, token;
            peer = _arg[0], token = _arg[1];
            updateData(received, FRIEND);
            return _this.emit(FRIEND, peer, token, function(err) {
              return callback(null, err);
            });
          });
          server.on(GRAPH, function(err, _arg, callback) {
            _arg;
            updateData(received, GRAPH);
            return _this.emit(GRAPH, function(graph) {
              return callback(null, graph);
            });
          });
          server.on(DELETE_TOKEN, function(err, _arg, callback) {
            var token;
            token = _arg[0];
            callback(null);
            updateData(received, DELETE_TOKEN);
            return _this.emit(DELETE_TOKEN, token);
          });
          server.on(QUERY, function(err, _arg, callback) {
            var details, origin, query;
            origin = _arg[0], query = _arg[1], details = _arg[2];
            callback(null);
            updateData(received, QUERY);
            return _this.emit(QUERY, origin, query, details);
          });
          server.on(KQUERY, function(err, _arg, callback) {
            var details, origin, query;
            origin = _arg[0], query = _arg[1], details = _arg[2];
            callback(null);
            updateData(received, KQUERY);
            return _this.emit(KQUERY, origin, query, details);
          });
          server.on(QUERY_RESULT, function(err, _arg, callback) {
            var details, result;
            result = _arg[0], details = _arg[1];
            callback(null);
            updateData(received, QUERY_RESULT);
            return _this.emit(QUERY_RESULT, result, details);
          });
          server.on(FILE, function(err, _arg, callback) {
            var file;
            file = _arg[0];
            updateData(received, FILE);
            return _this.emit(FILE, file, callback);
          });
          server.on(FOUND, function(err, _arg, callback) {
            var id, sender;
            sender = _arg[0], id = _arg[1];
            updateData(received, FOUND);
            return _this.emit(FOUND, sender, id, function(found) {
              return callback(null, found);
            });
          });
          server.on(REPORT, function(err, _arg, callback) {
            var buffer, key, keys, r, s, _i, _len;
            keys = _arg[0];
            buffer = "";
            for (_i = 0, _len = keys.length; _i < _len; _i++) {
              key = keys[_i];
              s = sent[key];
              r = received[key];
              if (s == null) {
                s = {
                  count: 0
                };
              }
              if (r == null) {
                r = {
                  count: 0
                };
              }
              buffer += ", " + s.count + ", " + r.count;
            }
            return callback(null, "" + peer.id + buffer);
          });
          log("Listening on port " + port);
          return _this.emit('ready');
        });
        return server.httpServer.on('error', function(e) {
          console.error("" + peer.id + ": " + e.message + " (port: " + port);
          peer.port += 500;
          return createServer(peer.port);
        });
      };
      createServer(peer.port);
      createClient = function(receiver) {
        return xmlrpc.createClient({
          port: receiver.port,
          host: receiver.host
        });
      };
      sent = {};
      received = {};
      updateData = function(records, key, data) {
        if (records[key] == null) {
          records[key] = {
            count: 0,
            data: 0
          };
        }
        records[key].count++;
        if (data == null) {
          data = 0;
        }
        if (typeof data !== "number") {
          data = parseInt(data.options.headers['Content-Length']);
        }
        return records[key].data += data;
      };
      this.pong = function(receiver, sender, knownPeers, done) {
        var client;
        client = createClient(receiver);
        client.methodCall(PONG, [sender, knownPeers], done);
        return updateData(sent, PONG, client);
      };
      this.ping = function(receiver, sender, done) {
        var client;
        client = createClient(receiver);
        client.methodCall(PING, [sender], done);
        return updateData(sent, PING, client);
      };
      this.forceFriend = function(receiver, sender, token, done) {
        var client;
        client = createClient(receiver);
        client.methodCall(FORCE_FRIEND, [sender, token], done);
        return updateData(sent, FORCE_FRIEND, client);
      };
      this.friend = function(receiver, sender, token, done) {
        var client;
        client = createClient(receiver);
        client.methodCall(FRIEND, [sender, token], done);
        return updateData(sent, FRIEND, client);
      };
      this.unfriend = function(receiver, sender, newPeer, token, done) {
        var client;
        client = createClient(receiver);
        client.methodCall(UNFRIEND, [sender, newPeer, token], done);
        return updateData(sent, UNFRIEND, client);
      };
      this.deleteToken = function(receiver, token, done) {
        var client;
        client = createClient(receiver);
        client.methodCall(DELETE_TOKEN, [token], done);
        return updateData(sent, DELETE_TOKEN, client);
      };
      this.createGraph = function(receiver, done) {
        var client;
        client = createClient(receiver);
        client.methodCall(GRAPH, [], done);
        return updateData(sent, GRAPH, client);
      };
      this.query = function(receiver, origin, query, details, done) {
        var client;
        client = createClient(receiver);
        client.methodCall(QUERY, [origin, query, details], done);
        return updateData(sent, QUERY, client);
      };
      this.kquery = function(receiver, origin, query, details, done) {
        var client;
        client = createClient(receiver);
        client.methodCall(KQUERY, [origin, query, details], done);
        return updateData(sent, KQUERY, client);
      };
      this.queryResult = function(receiver, result, details, done) {
        var client;
        client = createClient(receiver);
        client.methodCall(QUERY_RESULT, [result, details], done);
        return updateData(sent, QUERY_RESULT, client);
      };
      this.fetchFile = function(receiver, file, done) {
        var client;
        client = createClient(receiver);
        client.methodCall(FILE, [file], done);
        return updateData(sent, FILE, client);
      };
      this.found = function(receiver, sender, id, done) {
        var client;
        client = createClient(receiver);
        client.methodCall(FOUND, [sender, id], done);
        return updateData(sent, FOUND, client);
      };
      this.getData = function(peer, keys, done) {
        var client;
        client = createClient(peer);
        return client.methodCall(REPORT, [keys], function(err, str) {
          return done(str);
        });
      };
    }

    return Network;

  })(EventEmitter);

  module.exports = Network;

}).call(this);
