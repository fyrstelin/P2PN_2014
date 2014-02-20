// Generated by CoffeeScript 1.6.3
(function() {
  var Edge, Graph, Node,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  require('array-sugar');

  Graph = (function() {
    function Graph() {
      this.nodes = [];
      this.edges = [];
    }

    Graph.prototype.addNode = function(node) {
      if ((this.nodes.findOne(function(n) {
        return node.equals(n);
      })) != null) {
        return;
      }
      return this.nodes.push(node);
    };

    Graph.prototype.addEdge = function(edge) {
      if ((this.edges.findOne(function(e) {
        return edge.equals(e);
      })) != null) {
        return;
      }
      this.addNode(edge.n1);
      this.addNode(edge.n2);
      return this.edges.push(edge);
    };

    Graph.prototype.print = function() {
      var res;
      res = "graph network {\n";
      this.nodes.forEach(function(node) {
        return res += "\t" + node.print() + ";\n";
      });
      this.edges.forEach(function(edge) {
        return res += "\t" + edge.print() + ";\n";
      });
      res += "}";
      return res;
    };

    return Graph;

  })();

  Node = (function() {
    function Node(id, capacity) {
      this.id = id;
      this.capacity = capacity;
      this.print = __bind(this.print, this);
      this.equals = __bind(this.equals, this);
    }

    Node.prototype.equals = function(node) {
      return node.id === this.id;
    };

    Node.prototype.print = function() {
      return '"' + this.id + '(' + this.capacity + ')"';
    };

    return Node;

  })();

  Edge = (function() {
    function Edge(n1, n2) {
      this.n1 = n1;
      this.n2 = n2;
    }

    Edge.prototype.equals = function(edge) {
      return (edge.n1.equals(this.n1)) && (edge.n2.equals(this.n2)) || (edge.n1.equals(this.n2)) && (edge.n2.equals(this.n1));
    };

    Edge.prototype.print = function() {
      return this.n1.print() + " -- " + this.n2.print();
    };

    return Edge;

  })();

  module.exports = {
    Graph: Graph,
    Node: Node,
    Edge: Edge
  };

  /*        
  g = new Graph()
  
  n0 = new Node("p0", 4)
  n3 = new Node("p3", 6)
  n4 = new Node("p4", 6)
  n6 = new Node("p6", 3)
  n8 = new Node("p8", 1)
  n1 = new Node("p1", 8)
  n5 = new Node("p5", 7)
  n7 = new Node("p7", 5)
  n9 = new Node("p9", 2)
  
  
  e1 = new Edge(n1, n0)
  e2 = new Edge(n1, n3)
  e3 = new Edge(n1, n4)
  e4 = new Edge(n1, n5)
  e5 = new Edge(n1, n6)
  e6 = new Edge(n1, n7)
  e7 = new Edge(n1, n8)
  e8 = new Edge(n1, n9)
  
  g.addEdge(e1)
  g.addEdge(e2)
  g.addEdge(e3)
  g.addEdge(e4)
  g.addEdge(e5)
  g.addEdge(e6)
  g.addEdge(e7)
  g.addEdge(e8)
  
  console.log g.print()
  */


}).call(this);
