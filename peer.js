// Generated by CoffeeScript 1.6.3
(function() {
  var Edge, Graph, Network, Node, Peer, async, constants, count, debug, fs, os, same,
    _this = this;

  require('array-sugar');

  constants = require('./constants');

  os = require('os');

  async = require('async');

  fs = require('fs');

  Graph = require('./graph').Graph;

  Node = require('./graph').Node;

  Edge = require('./graph').Edge;

  Network = require('./network');

  debug = true;

  same = function(p1, p2) {
    return p1.host === p2.host && p1.port === p2.port;
  };

  count = 0;

  Peer = (function() {
    function Peer(port, id, capacity, loggers) {
      var addFriend, addPeer, addPendingFriend, createToken, details, dev, doDeleteToken, doForceFriend, doFriend, doPing, doPong, doUnfriend, friends, ifaces, isFriend, isPendingFriend, joinEvery30Second, knownPeers, knows, log, network, nextId, pendingFriends, remCap, removeOnError, removePeer, removePendingFriend, reserved, seenQueries, sentQueries, unFriend, _i, _len, _ref,
        _this = this;
      this.port = port;
      this.id = id;
      this.capacity = capacity != null ? capacity : 5;
      if (loggers == null) {
        loggers = [];
      }
      remCap = this.capacity;
      reserved = 0;
      knownPeers = [];
      friends = [];
      pendingFriends = [];
      network = new Network(this.port);
      log = function(msg) {
        var logger, _i, _len, _results;
        _results = [];
        for (_i = 0, _len = loggers.length; _i < _len; _i++) {
          logger = loggers[_i];
          _results.push(logger.log(msg));
        }
        return _results;
      };
      this.addLogger = function(logger) {
        return loggers.push(logger);
      };
      ifaces = os.networkInterfaces();
      for (dev in ifaces) {
        _ref = ifaces[dev];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          details = _ref[_i];
          if (details.family === "IPv4" && !details.internal) {
            this.host = details.address;
          }
        }
      }
      addFriend = function(p) {
        if (isFriend(p)) {
          log("is friends already");
        }
        if (remCap <= 0) {
          throw "Add friends sucks";
        }
        friends.push(p);
        return remCap--;
      };
      addPendingFriend = function(p) {
        if (remCap <= 0) {
          throw "Add pending friends sucks";
        }
        pendingFriends.push(p);
        return remCap--;
      };
      unFriend = function(p) {
        var oldFriend;
        oldFriend = friends.findOne(function(p1) {
          return same(p, p1);
        });
        if (oldFriend != null) {
          remCap++;
          return friends.remove(oldFriend);
        } else {
          throw 'unfriend sucks';
        }
      };
      removePendingFriend = function(p) {
        var oldFriend;
        oldFriend = pendingFriends.findOne(function(p1) {
          return same(p, p1);
        });
        if (oldFriend != null) {
          remCap++;
          return pendingFriends.remove(oldFriend);
        } else {
          throw 'remove pending friend sucks';
        }
      };
      createToken = function() {
        return _this.id;
      };
      knows = function(peer) {
        return (knownPeers.findOne(function(p) {
          return same(p, peer);
        })) != null;
      };
      isFriend = function(peer) {
        return (friends.findOne(function(p) {
          return same(p, peer);
        })) != null;
      };
      isPendingFriend = function(peer) {
        return (pendingFriends.findOne(function(p) {
          return same(p, peer);
        })) != null;
      };
      addPeer = function(peer) {
        if ((same(peer, _this)) || (knows(peer))) {
          return;
        }
        return knownPeers.push({
          host: peer.host,
          port: peer.port,
          id: peer.id,
          capacity: peer.capacity
        });
      };
      removePeer = function(peer) {
        try {
          unfriend(peer);
        } catch (_error) {

        }
        return knownPeers.remove(peer);
      };
      removeOnError = function(peer) {
        return function(err) {
          if (err) {
            return removePeer(peer);
          }
        };
      };
      doPong = function(peer) {
        log("ponging " + peer.host + ":" + peer.port);
        return network.pong(peer, _this, knownPeers, removeOnError(peer));
      };
      doPing = function(peer, self) {
        if (debug) {
          log("pinging " + peer.host + ":" + peer.port);
        }
        addPeer(peer);
        return network.ping(peer, self, removeOnError(peer));
      };
      doForceFriend = function(peer, token, done) {
        log("" + _this.id + " is forcefriending " + peer.id);
        if (isFriend(peer)) {
          log("" + _this.id + " and " + peer.id + " are already friends");
          return done();
        } else {
          remCap--;
          addPendingFriend(peer);
          return network.forceFriend(peer, _this, token, function(err, kickedPeer) {
            removePendingFriend(peer);
            if (err != null) {
              log("" + _this.id + " failed request to " + peer.id);
              removePeer(peer);
            } else {
              addFriend(peer);
              if (kickedPeer) {
                log("" + _this.id + ": " + peer.id + " kicked a peer");
              } else {
                remCap++;
                log("" + _this.id + ": " + peer.id + " did not kick a peer");
              }
            }
            return done(err);
          });
        }
      };
      doFriend = function(peer, token, done) {
        log("" + _this.id + " is trying to friend " + peer.id);
        addPendingFriend(peer);
        return network.friend(peer, _this, token, function(err, res) {
          removePendingFriend(peer);
          if (err != null) {
            removePeer(peer);
          } else if (res === constants.errors.ENOUGH_FRIENDS) {
            log("" + _this.id + " is NOT friend with " + peer.id);
          } else {
            addFriend(peer);
            log("" + _this.id + " is now friend with " + peer.id);
          }
          return done();
        });
      };
      doUnfriend = function(peer, newPeer, token) {
        if (peer != null) {
          log("" + _this.id + " is unfriending " + peer.id);
          unFriend(peer);
          return network.unfriend(peer, _this, newPeer, token, removeOnError(peer));
        }
      };
      doDeleteToken = function(peer, token) {
        log("" + _this.id + " tells " + peer.id + " to delete token");
        return network.deleteToken(peer, token, removeOnError(peer));
      };
      network.on(constants.PING, function(peer) {
        if ((peer != null) && peer !== "") {
          doPong(peer);
          return addPeer(peer);
        }
      });
      network.on(constants.PONG, function(sender, peers) {
        var peer, _j, _len1, _results;
        addPeer(sender);
        _results = [];
        for (_j = 0, _len1 = peers.length; _j < _len1; _j++) {
          peer = peers[_j];
          if ((!knows(peer)) && (!same(peer, _this))) {
            _results.push(doPing(peer, _this));
          } else {
            _results.push(void 0);
          }
        }
        return _results;
      });
      network.on(constants.FORCE_FRIEND, function(peer, token, callback) {
        var candidates, oldFriend;
        if (remCap > 0 || isFriend(peer || isPendingFriend(peer))) {
          log("" + _this.id + " accepts forcefriend from " + peer.id + ". No one kicked");
          callback(false);
        } else {
          candidates = friends.copy();
          pendingFriends.forEach(function(p) {
            return candidates.remove(p);
          });
          candidates.sort(function(p1, p2) {
            return p2.capacity - p1.capacity;
          });
          oldFriend = candidates.first;
          doUnfriend(oldFriend, peer, token);
          if (oldFriend != null) {
            log("" + _this.id + " accepts forcefriend from " + peer.id + ". " + oldFriend.id + " kicked (token " + token + ")");
          } else {
            log("buuh");
          }
          callback(true);
        }
        if (!(isFriend(peer || isPendingFriend(peer)))) {
          return addFriend(peer);
        }
      });
      network.on(constants.UNFRIEND, function(oldFriend, peer, token) {
        if (isFriend(oldFriend)) {
          unFriend(oldFriend);
          return doFriend(peer, token, function() {});
        } else {
          if (token) {
            return doDeleteToken(peer, token);
          }
        }
      });
      network.on(constants.FRIEND, function(peer, token, callback) {
        if (token != null) {
          remCap++;
          reserved--;
        }
        if (remCap > 0 || isFriend(peer || isPendingFriend(peer))) {
          log("" + _this.id + " accepts " + peer.id);
          if (!(isFriend(peer || isPendingFriend(peer)))) {
            addFriend(peer);
          }
          return callback();
        } else {
          log("" + _this.id + " rejects " + peer.id);
          return callback(constants.errors.ENOUGH_FRIENDS);
        }
      });
      network.on(constants.GRAPH, function(callback) {
        log("graph");
        return callback(_this.getGraph());
      });
      network.on(constants.DELETE_TOKEN, function(token) {
        if (token != null) {
          return remCap++;
        }
      });
      this.hello = function(_arg, done) {
        var address, host, peer, _j, _len1, _ref1;
        address = _arg[0];
        if (address != null) {
          _ref1 = address.trim().split(":"), host = _ref1[0], port = _ref1[1];
          doPing({
            host: host,
            port: port
          }, _this);
        } else {
          for (_j = 0, _len1 = knownPeers.length; _j < _len1; _j++) {
            peer = knownPeers[_j];
            doPing(peer);
          }
        }
        return done();
      };
      this.getGraph = function() {
        var graph, node;
        graph = new Graph();
        node = new Node(_this.id, _this.capacity);
        graph.addNode(node);
        friends.forEach(function(n) {
          return graph.addEdge(new Edge(node, new Node(n.id, n.capacity)));
        });
        return graph;
      };
      this.printNeighbourhood = function(args, done) {
        var graph, handlePeer, nextIsOutput, out, p, peers, _j, _len1;
        peers = [];
        out = null;
        nextIsOutput = false;
        args.forEach(function(arg) {
          if (arg === "-o") {
            return nextIsOutput = true;
          } else if (nextIsOutput) {
            nextIsOutput = false;
            return out = arg;
          } else {
            if (arg !== "") {
              return peers.push(arg);
            }
          }
        });
        graph = _this.getGraph();
        handlePeer = function(peer, done) {
          peer = knownPeers.findOne(function(p) {
            return p.id === peer;
          });
          if (peer == null) {
            done();
            return;
          }
          return network.createGraph(peer, function(err, g) {
            log("got response from " + peer.id);
            if (err) {
              return done(err);
            } else {
              g.nodes.forEach(function(n) {
                if ((n.id != null) && (n.capacity != null)) {
                  return graph.addNode(new Node(n.id, n.capacity));
                } else {
                  return log("got weird graph from " + peer.id);
                }
              });
              g.edges.forEach(function(e) {
                e.n1 = new Node(e.n1.id, e.n1.capacity);
                e.n2 = new Node(e.n2.id, e.n2.capacity);
                return graph.addEdge(new Edge(e.n1, e.n2));
              });
              return done();
            }
          });
        };
        if (debug && peers.isEmpty) {
          for (_j = 0, _len1 = knownPeers.length; _j < _len1; _j++) {
            p = knownPeers[_j];
            peers.push(p.id);
          }
        }
        return async.each(peers, handlePeer, function(err) {
          if (err != null) {
            log("error in printing" + err);
          } else if (out != null) {
            fs.writeFile(out, graph.print());
          } else {
            log("reserved: " + reserved + "/" + remCap + "\n" + graph.print());
          }
          return done();
        });
      };
      this.dream = function(_arg, done) {
        var timeout;
        timeout = _arg[0];
        timeout = parseInt(timeout) || 1000;
        return setTimeout(done, timeout);
      };
      this.printKnownPeers = function(done) {
        var ids, _j, _len1;
        log("Known peers");
        ids = knownPeers.map(function(p) {
          return p.id;
        });
        ids.sort();
        for (_j = 0, _len1 = ids.length; _j < _len1; _j++) {
          id = ids[_j];
          log(id);
        }
        return done();
      };
      this.joinNeighbourhood = function(done) {
        var candidates, contactedPeers, haveCapacity, highCap, highCaps, idx, startLoop;
        contactedPeers = [];
        haveCapacity = function() {
          return remCap > 0;
        };
        if (_this.capacity === 1) {
          candidates = knownPeers.filter(function(p) {
            return p.capacity > 1;
          });
          candidates.sort(function(p1, p2) {
            return p1.capacity - p2.capacity;
          });
          return async.whilst(haveCapacity, function(done) {
            var peer;
            peer = candidates.first;
            candidates.remove(peer);
            if (peer != null) {
              return doFriend(peer, null, done);
            } else {
              return done("No more peers");
            }
          }, function(err) {
            if ((err != null) && debug) {
              log(err);
            }
            return done();
          });
        } else {
          startLoop = function(err) {
            var friendRandomPeer;
            log("" + _this.id + ": loop started");
            if (err) {
              if (err.peer != null) {
                knownPeers.remove(err.peer);
              }
              return _this.joinNeighbourhood(function() {});
            } else {
              friendRandomPeer = function(done) {
                var idx, peer;
                candidates = knownPeers.copy();
                friends.forEach(function(f1) {
                  var f, _j, _len1, _ref1, _results;
                  _ref1 = candidates.filter(function(f2) {
                    return f1.id === f2.id;
                  });
                  _results = [];
                  for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
                    f = _ref1[_j];
                    _results.push(candidates.remove(f));
                  }
                  return _results;
                });
                contactedPeers.forEach(function(f1) {
                  var f, _j, _len1, _ref1, _results;
                  _ref1 = candidates.filter(function(f2) {
                    return f1.id === f2.id;
                  });
                  _results = [];
                  for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
                    f = _ref1[_j];
                    _results.push(candidates.remove(f));
                  }
                  return _results;
                });
                idx = Math.floor(Math.random() * candidates.length);
                peer = candidates[idx];
                contactedPeers.push(peer);
                if (peer != null) {
                  return doFriend(peer, null, done);
                } else {
                  return done("No more peers");
                }
              };
              return async.whilst(haveCapacity, friendRandomPeer, function(err) {
                log(remCap);
                if (debug && (err != null)) {
                  log(err);
                }
                return done();
              });
            }
          };
          highCaps = knownPeers.filter(function(p) {
            return p.capacity >= constants.limits.HIGH && !isFriend(p);
          });
          idx = Math.floor(Math.random() * highCaps.length);
          highCap = highCaps[idx];
          if ((highCap != null) && remCap >= 2) {
            return doForceFriend(highCap, createToken(), startLoop);
          } else {
            return startLoop();
          }
        }
      };
      nextId = 0;
      sentQueries = [];
      seenQueries = {};
      this.search = function(queries) {
        return queries.forEach(function(query) {
          log("seaching for " + query);
          id = nextId++;
          details = {
            ttl: constants.TTL,
            id: id
          };
          sentQueries[id] = query;
          return friends.forEach(function(peer) {
            return network.query(peer, _this, query, details, removeOnError(peer));
          });
        });
      };
      network.on(constants.QUERY, function(origin, query, details) {
        var bucket, _name;
        if (seenQueries[_name = origin.id] == null) {
          seenQueries[_name] = [];
        }
        bucket = seenQueries[origin.id];
        if (bucket.contains(details.id)) {
          return;
        }
        log("query (" + query + ") from " + origin.id + ". Id: " + details.id + ", TTL: " + details.ttl);
        bucket.push(details.id);
        if (query.toLowerCase() === _this.id.toLowerCase()) {
          return network.queryResult(origin, _this, details, removeOnError(origin));
        } else if (details.ttl > 1) {
          details.ttl--;
          return friends.forEach(function(peer) {
            return network.query(peer, origin, query, details, removeOnError(peer));
          });
        }
      });
      network.on(constants.QUERY_RESULT, function(sender, details) {
        var query;
        id = details.id;
        query = sentQueries[id];
        return log("found " + query + " at " + sender.id);
      });
      joinEvery30Second = function() {
        return setTimeout(function() {
          console.log("### %s TICK ###", _this.id);
          return _this.joinNeighbourhood(function() {});
        }, 5000);
      };
      setTimeout(function() {
        return _this.joinNeighbourhood(joinEvery30Second);
      }, 2000);
      /*
      setInterval () =>
          async.each friends, (f, done) =>
              doPing f, null
              done()
          , () =>
      , 10000
      */

    }

    return Peer;

  })();

  module.exports = Peer;

}).call(this);
