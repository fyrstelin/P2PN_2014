require('array-sugar')
xmlrpc = require('xmlrpc')
constants = require('./constants')
os = require('os')
async = require('async')
fs = require('fs')
Graph = require('./graph').Graph
Node = require('./graph').Node
Edge = require('./graph').Edge

debug = true

same = (p1, p2) ->
    p1.host is p2.host and p1.port is p2.port
    
    
class Peer
    constructor: (@port, @id, @capacity = 5, loggers = []) ->
        remCap = @capacity
        reserved = 0
        knownPeers = []
        friends = []
        pendingFriends = []
        
        log = (msg) ->
            logger.log msg for logger in loggers
                
        @addLogger = (logger) ->
            loggers.push logger
        
        
        self = this
        
        
        # Find IP
        ifaces = os.networkInterfaces();
        for dev of ifaces
            for details in ifaces[dev] when details.family is "IPv4" and not details.internal
                @host = details.address 
        
        # helpers
        addFriend = (p) ->
            log "is friends already" if isFriend p
            throw "Add frieds sucks" if remCap <= 0
            friends.push p
            remCap--
        
        unFriend = (p) ->
            log "%s is unfriending %s", self.id, p.id
            oldFriend = friends.findOne (p1) -> same p, p1
            if oldFriend?
                remCap++
                friends.remove oldFriend
            else
                throw 'unfriend sucks'
        
        createToken = () -> @id
        
        knows = (peer) ->
            (knownPeers.findOne (p) -> same p, peer)?
            
        isFriend = (peer) ->
            (friends.findOne (p) -> same p, peer)?
            
        addPeer = (peer) ->
            return if (same peer, self) or (knows peer)
            knownPeers.push peer
            
        removePeer = (peer) ->
            try
                unfriend peer
            catch
                
            knownPeers.remove peer
        
        #funtions
        removeOnError = (peer, err) ->
            (err) ->
                removePeer peer if err
        
        doPong = (peer) ->
            log "ponging #{ peer.host }:#{ peer.port}" if debug
            if (not peer.host?)
                log typeof peer
            client = xmlrpc.createClient peer
            client.methodCall constants.PONG, [self, knownPeers], removeOnError(peer)
        
        doPing = (peer, self) ->
            log "pinging #{ peer.host }:#{ peer.port}" if debug
            client = xmlrpc.createClient peer
            client.methodCall constants.PING, [self], removeOnError(peer)
            
        doForceFriend = (peer, token, done) ->
            log "%s is forcefriending %s", self.id, peer.id
            log "force friending #{ peer.id }" if debug
            if isFriend peer
                log "%s and %s are already friends", self.id, peer.id
                done()
            else
                remCap-- #reserve spot for peer and maybe kicked peer
                reserved++
                addFriend peer
                pendingFriends.push peer
                client = xmlrpc.createClient peer
                client.methodCall constants.FORCE_FRIEND, [self, token], (err, args) ->
                    pendingFriends.remove peer
                    log "%s got reply from %s", self.id, peer.id
                    if not err or not err.code?
                        kickedPeer = args[0]
                        if not kickedPeer #unreserve spot for kicked peer - no one is kicked!!
                            remCap++ 
                            reserved--
                            log "%s: %s did not kick a peer", self.id, peer.id
                        else
                            log "%s: %s kicked a peer", self.id, peer.id
                    else
                        removePeer peer
                    done(err)
                
        doFriend = (peer, token, done) ->
            log "%s is trying to friend %s", self.id, peer.id
            client = xmlrpc.createClient peer
            addFriend peer
            pendingFriends.push peer
            client.methodCall constants.FRIEND, [self, token], (err, res) ->
                pendingFriends.remove peer
                if err?
                    removePeer peer
                else if res is constants.errors.ENOUGH_FRIENDS
                    unFriend peer
                    log "%s is NOT friend with %s", self.id, peer.id
                else
                    log "%s is now friend with %s", self.id, peer.id
                done()
                
        doUnfriend = (peer, newPeer, token) ->
            if peer?
                log "unfriending #{peer.id}" if debug
                unFriend peer
                client = xmlrpc.createClient peer
                client.methodCall constants.UNFRIEND, [self, newPeer, token], removeOnError(peer)
        
           
        # server
        server = xmlrpc.createServer {
            port: self.port
        }
        
        #rounting
        server.on constants.PING, (err, [peer], callback) ->
            callback null # acknowledge
            if (peer? and peer isnt "")
                doPong peer
                addPeer peer
        
        server.on constants.PONG, (err, [sender, peers], callback) ->
            callback null # acknowledge
            addPeer sender
            for peer in peers 
                if (not knows peer) and (not same peer, self)
                    doPing peer, self
                
        server.on constants.FORCE_FRIEND, (err, [peer, token], callback) ->
            if remCap > 0 or isFriend peer
                log "%s accepts forcefriend from %s. No one kicked", self.id, peer.id
                callback null, false
            else
                candidates = friends.copy()
                pendingFriends.forEach (p) ->
                    candidates.remove p
                    
                candidates.sort (p1, p2) -> p1.capacity - p2.capacity
                oldFriend = candidates.first
                doUnfriend oldFriend, peer, token
                if oldFriend?
                    log "%s accepts forcefriend from %s. %s kicked (token %s)", self.id, peer.id, oldFriend.id, token
                else
                    log "buuh"
                callback null, true
            addFriend peer if not isFriend peer
        
        server.on constants.UNFRIEND, (err, [oldFriend, peer, token], callback) ->
            callback null
            if isFriend oldFriend
                unFriend oldFriend
            doFriend peer, token, () -> 
            
        server.on constants.FRIEND, (err, [peer, token], callback) ->
            if token? #TODO: check token
                remCap++
                reserved--
            if remCap > 0 or isFriend peer
                log "%s accepts %s", self.id, peer.id
                addFriend peer if not isFriend peer
                callback null
            else
                log "%s rejects %s", self.id, peer.id
                callback null, constants.errors.ENOUGH_FRIENDS
                
        server.on constants.GRAPH, (err, [], callback) =>
            log "graph"
            callback null, @getGraph()
                
        log "Listening on #{ self.host}: #{ self.port }"
        
        # helpers
        @hello = ([address], done) ->
            if address?
                [host, port] = address.trim().split ":"
                doPing {
                    host: host,
                    port: port
                }, self
            else
                doPing peer for peer in knownPeers
            done()
    
        @getGraph = () ->
            graph = new Graph()
            node = new Node self.id, self.capacity
            graph.addNode node
            friends.forEach (n) ->
                graph.addEdge new Edge node, (new Node n.id, n.capacity)
            return graph
        
        @printNeighbourhood = (args, done) ->
            peers = []
            out = null
            nextIsOutput = false
            args.forEach (arg) ->
                if arg is "-o"
                    nextIsOutput = true
                else if nextIsOutput
                    nextIsOutput = false
                    out = arg
                else
                    if arg isnt ""
                        peers.push(arg)
            
            graph = @getGraph()
            handlePeer = (peer, done) ->
                peer = knownPeers.findOne (p) -> p.id is peer
                if not peer?
                    done()
                    return
                client = xmlrpc.createClient peer
                client.methodCall constants.GRAPH, [], (err, g) ->
                    log "got response from #{peer.id}"
                    if (err)
                        done()
                    else
                        g.nodes.forEach (n) ->
                            graph.addNode (new Node n.id, n.capacity)
                        g.edges.forEach (e) ->
                            e.n1 = new Node e.n1.id, e.n1.capacity
                            e.n2 = new Node e.n2.id, e.n2.capacity
                            graph.addEdge (new Edge e.n1, e.n2)
                        done()
            
            if debug and peers.isEmpty
                peers.push p.id for p in knownPeers
                
            async.each peers, handlePeer, (err) ->
                # handle output
                if out?
                    fs.writeFile out, graph.print()
                else
                    log "reserved: " + reserved + "/" + remCap + "\n" + graph.print()
                done()
                
        #TODO: remove this        
        @dream = ([timeout], done) ->
            timeout = parseInt(timeout) or 1000
            setTimeout(done, timeout)

        @printKnownPeers = (done) ->
            log "Known peers"
            ids = knownPeers.map (p) -> p.id
            ids.sort()
            log id for id in ids
            done()
         
        
        @joinNeighbourhood = (done) ->
            contactedPeers = []
            haveCapacity = () ->
                remCap > 0
            
            if self.capacity is 1
                candidates = knownPeers.filter (p) -> p.capacity > 1 # do not friend "ones"
                candidates.sort (p1, p2) -> p1.capacity - p2.capacity
                async.whilst haveCapacity, (done) ->
                    peer = candidates.first
                    candidates.remove peer
                    if peer?
                        doFriend peer, null, done
                    else
                        done "No more peers"
                , (err) -> log err if err? and debug
            else
                startLoop = (err) =>
                    log "%s: loop started", self.id
                    if err
                        knownPeers.remove err.peer if err.peer?
                        @joinNeighbourhood () ->
                    else
                        friendRandomPeer = (done) ->
                            candidates = knownPeers.copy()
                            friends.forEach (f1) ->
                                candidates.remove f for f in candidates.filter (f2) -> f1.id is f2.id
                            contactedPeers.forEach (f1) ->
                                candidates.remove f for f in candidates.filter (f2) -> f1.id is f2.id
                            idx = Math.floor Math.random()*candidates.length
                            peer = candidates[idx]
                            contactedPeers.push peer
                            if peer?
                                doFriend peer, null, done
                            else
                                done "No more peers"
                        
                        async.whilst haveCapacity, friendRandomPeer, (err) ->
                            log remCap
                            log err if debug and err?
                            done()
                highCaps = knownPeers.filter (p) -> p.capacity >= constants.limits.HIGH and not isFriend p
                idx = Math.floor Math.random()*highCaps.length
                highCap = highCaps[idx]
                if highCap? and remCap >= 2
                    doForceFriend highCap, createToken(), startLoop
                else
                    startLoop()
                    
                    
        joinEvery30Second = () =>
            setTimeout () =>
                console.log "### %s TICK ###", self.id
                @joinNeighbourhood joinEvery30Second
            , 15000
                    
        setTimeout () =>
            @joinNeighbourhood joinEvery30Second
        , 2000
        
        setInterval () =>
            async.each friends, (f, done) =>
                doPing f, null
                done()
            , () =>
        , 10000

module.exports = Peer

