/*************************************************************************
 *
 *  visualise.js
 *
 *  A simple visualiser for the semantic tree produced by the SRE.
 *  With much help of code from
 *  http://mbostock.github.io/d3/talk/20111018/tree.html
 *
 * ----------------------------------------------------------------------
 *
 *  Copyright (c) 2016 The MathJax Consortium
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */


/**
 * @fileoverview Simple visualiser for SRE based on d3.
 */


/**
 * @constructor
 */
streeVis = function() {
  this.file =  streeVis.config.file;
  this.direction =  streeVis.config.direction;
  this.m = this.w = this.h = null;
  this.xFor = this.xAft = this.yFor = this.yAft = null;
  this.stree = null;
  this.tree = null;
  this.orientation();

  this.diagonal = d3.svg.diagonal()
    .projection(goog.bind(function(d) { return [this.orientX(d), this.orientY(d)]; }, this));

  this.svg = d3.select('#body').append('svg:svg');
  this.vis = this.svg
    .attr('width', this.w + this.m[1] + this.m[3])
    .attr('height', this.h + this.m[0] + this.m[2])
    .append('svg:g')
    .attr('transform', 'translate(' + this.m[3] + ',' + this.m[0] + ')');

};



/**
 * Base configurations.
 * @type {Object.<string, string>}
 */
streeVis.config = {
  file: 'simple.json',
  direction: 'left-right'
};


streeVis.prototype.orientation = function() {
  if (this.direction === 'top-bottom') {
    streeVis.prototype.orientX = function(source, zero) {
      return zero ? source.x0 : source.x;
    };

    streeVis.prototype.orientY = function(source, zero) {
      return zero ? source.y0 : source.y;
    };

    this.m = [50, 20, 50, 20];
    this.w = 1280 - this.m[1] - this.m[3];
    this.h = 800 - this.m[0] - this.m[2];

    this.xFor = 0;
    this.xAft = -3;
    this.yFor = '-.5em';
    this.yAft = '1.2em';
    this.tree = d3.layout.tree().size([this.w, this.h]);

} else {
    streeVis.prototype.orientX = function(source, zero) {
    return zero ? source.y0 : source.y;
    };

  streeVis.prototype.orientY = function(source, zero) {
    return zero ? source.x0 : source.x;
  };

  this.m = [20, 120, 20, 120];
  this.w = 1280 - this.m[1] - this.m[3];
  this.h = 800 - this.m[0] - this.m[2];

  this.xFor = -10;
  this.xAft = 10;
  this.yFor = '-.1em';
  this.yAft = '0.35em';
  this.tree = d3.layout.tree().size([this.h, this.w]);
}

};

streeVis.prototype.newOrientation = function(direction) {
  // TODO (sorge) Put in an enumerate.
  if (this.direction === direction) return;
  this.direction = direction;
  this.orientation();
};


streeVis.color = {
  LEAF: 'red',
  BRANCH: 'blue',
  CONTENT: 'green',
  SPECIAL: 'magenta'
};


streeVis.getColor = function(node) {
  if (!node.children && !node._children) return streeVis.color.LEAF;
  if (node['$t']) return streeVis.color.BRANCH;
  if (node.content) return streeVis.color.CONTENT;
  return streeVis.color.SPECIAL;
};


streeVis.special = {
  fraction: '/',
  sqrt: '\u221A',
  root: '\u221A',
  superscript: '\u25FD\u02D9',
  subscript: '\u25FD.',
  subsup:'\u25FD:'
};

streeVis.getContent = function(node) {
  if (node['$t']) return node['$t'];
  var str = '';
  if (node.content) {
    node.content.forEach(function(x) {
      if (x['$t']) str += x['$t'];
    });
    return str;
  }
  str = streeVis.special[node.type];
  return str;
};


streeVis.prototype.prepare = function(tree) {
  var snodes = [];
  for (var node in tree) {
    snodes = snodes.concat(this.prepareNode(node, tree[node]));
    delete tree[node];
  }
  snodes.sort(function(x, y) {
    return x.id - y.id;
  });
  return snodes;
};

streeVis.prototype.prepareNode = function(type, node) {
  if (!node.id) {
    var snodes = [];
    for (var i = 0, n; n = node[i]; i++) {
      snodes = snodes.concat(this.prepareNode(type, n));
    }
    return snodes;
  }
  node.type = type;
  if (node.children) {
    node.children = this.prepare(node.children);
  }
  if (node.content) {
    node.content = this.prepare(node.content);
  }
  return [node];
};

streeVis.prototype.update = function(source) {
  var duration = d3.event && d3.event.altKey ? 5000 : 500;

  // Compute the new tree layout.
  var nodes = this.tree.nodes(this.stree.stree).reverse();

  // Normalize for fixed-depth.
  // nodes.forEach(function(d) { d.y = d.depth * 180; });

  // Update the nodes…
  var node = this.vis.selectAll('g.node')
      .data(nodes, function(d) { return d.id || (d.id = ++i); });

  // Enter any new nodes at the parent's previous position.
  var nodeEnter = node.enter().append('svg:g')
      .attr('class', 'node')
        .attr('transform', goog.bind(function(d) {
          return 'translate(' + this.orientX(source, true) + ',' +
            this.orientY(source, true) + ')'; }, this))
        .on('click', goog.bind(function(d) {
          streeVis.toggle(d); this.update(d); }, this));

  nodeEnter.append('svg:circle')
      .attr('r', 1e-6)
    .style('fill', function(d) {
      return d._children ? 'lightsteelblue' : '#fff'; });

  nodeEnter.append('svg:title')
      .text(function(d) { return d.type + ': ' + d.role; });

  nodeEnter.append('svg:text')
    .attr('x', goog.bind(function(d) {
      return d.children || d._children ? this.xFor : this.xAft; }, this))
    .attr('dy', goog.bind(function(d) {
      return d.children || d._children ? this.yFor : this.yAft; }, this))
    .attr('text-anchor', function(d) {
      return d.children || d._children ? 'end' : 'start'; })
    .text(function(d) { return streeVis.getContent(d); })
    .style('font-size', '20')
    .style('fill', function(d) { return streeVis.getColor(d); });


  // Transition nodes to their new position.
  var nodeUpdate = node.transition()
      .duration(duration)
        .attr('transform', goog.bind(function(d) {
          return 'translate(' + this.orientX(d) + ',' + this.orientY(d) + ')'; }, this));

  nodeUpdate.select('circle')
      .attr('r', 4.5)
      .style('fill', function(d) { return d._children ? 'lightsteelblue' : '#fff'; });

  nodeUpdate.select('text')
      .style('fill-opacity', 1);

  // Transition exiting nodes to the parent's new position.
  var nodeExit = node.exit().transition()
      .duration(duration)
        .attr('transform', goog.bind(function(d) {
          return 'translate(' + this.orientX(source) + ',' + this.orientY(source) + ')'; }, this))
      .remove();

  nodeExit.select('circle')
      .attr('r', 1e-6);

  nodeExit.select('text')
      .style('fill-opacity', 1e-6);

  // Update the links…
  var link = this.vis.selectAll('path.link')
      .data(this.tree.links(nodes), function(d) { return d.target.id; });

  // Enter any new links at the parent's previous position.
  link.enter().insert('svg:path', 'g')
      .attr('class', 'link')
    .attr('d', goog.bind(function(d) {
        var o = {x: source.x0, y: source.y0};
      return this.diagonal({source: o, target: o});
      }, this))
    .transition()
      .duration(duration)
    .attr('d', goog.bind(this.diagonal, this));

  // Transition links to their new position.
  link.transition()
      .duration(duration)
    .attr('d', goog.bind(this.diagonal, this));

  // Transition exiting nodes to the parent's new position.
  link.exit().transition()
      .duration(duration)
    .attr('d', goog.bind(function(d) {
        var o = {x: source.x, y: source.y};
      return this.diagonal({source: o, target: o});
      }, this))
      .remove();

  // Stash the old positions for transition.
  nodes.forEach(function(d) {
    d.x0 = d.x;
    d.y0 = d.y;
  });
};

// Toggle children.
streeVis.toggle = function(d) {
  if (d.children) {
    d._children = d.children;
    d.children = null;
  } else {
    d.children = d._children;
    d._children = null;
  }
};

streeVis.prototype.init = function() {
  d3.json(this.file, goog.bind(function(json) {
    if (!json) return;
    this.stree = json;
    this.stree.x0 = this.h / 2;
    this.stree.y0 = 0;

  function toggleAll(d) {
    if (d.children) {
      d.children.forEach(toggleAll);
      streeVis.toggle(d);
    }
  }

    this.stree.stree = this.prepare(this.stree.stree)[0];
    toggleAll(this.stree.stree);

    this.update(this.stree);
  }, this));
};

streeVis.currentSVG = null;

streeVis.run = function() {
  if (streeVis.currentSVG && streeVis.currentSVG.svg) {
    var svg = streeVis.currentSVG.svg[0][0];
    if (svg.parentNode) {
      svg.parentNode.removeChild(svg);
      streeVis.currentSVG = null;
    }
  }
  streeVis.currentSVG = new streeVis();
  streeVis.currentSVG.init();
};
