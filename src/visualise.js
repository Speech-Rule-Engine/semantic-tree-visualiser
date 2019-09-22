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
  this.json = streeVis.config.json;
  this.direction = streeVis.config.direction;
  this.m = this.w = this.h = null;
  this.xFor = this.xAft = this.yFor = this.yAft = null;
  this.stree = null;
  this.tree = null;
  this.rerun = false;
  this.orientation();

  this.states = {};
  
  this.diagonal = function link(d) {
  return "M" + d.source.y + "," + d.source.x
      + "C" + (d.source.y + d.target.y) / 2 + "," + d.source.x
      + " " + (d.source.y + d.target.y) / 2 + "," + d.target.x
      + " " + d.target.y + "," + d.target.x;
  };// d3.svg.diagonal()
  //   .projection(function(d) {
  //     return [this.orientX(d), this.orientY(d)]; }.bind(this));

  this.svg = d3.select('#body').append('svg:svg');
  this.vis = this.svg
    .attr('width', this.w + this.m[1] + this.m[3])
    .attr('height', this.h + this.m[0] + this.m[2])
    .append('svg:g')
    .attr('transform', 'translate(' + this.m[3] + ',' + this.m[0] + ')');

};



/**
 * Base configurations.
 * @enum {string|boolean}
 */
streeVis.config = {
  // url: 'simple.json',
  direction: 'top-bottom',
  sre: './node_modules/speech-rule-engine/lib/sre_browser.js',
  expanded: false,
  script: null
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
    this.tree = d3.tree().size([this.w, this.h]);

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
  this.tree = d3.tree().size([this.h, this.w]);
}

};

streeVis.prototype.newOrientation = function(direction) {
  // TODO (sorge) Put in an enumerate.
  if (this.direction === direction) return;
  this.direction = direction;
  this.orientation();
};


/**
 * @enum {string}
 */
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


/**
 * @enum {string}
 */
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


streeVis.prototype.update = function(source) {
  console.log('Updating');
  var duration = d3.event && d3.event.altKey ? 5000 : 500;

  // Compute the new tree layout.
  // var nodes = this.tree.nodes(this.stree.stree).reverse();
  // var nodes = this.tree.nodes(this.stree.stree).reverse();

  // NEW
  console.log(this.stree.stree);
  const root = d3.hierarchy(this.stree.stree);
  console.log(root);
  root.dx = 10;
  root.dy = this.w / (root.height + 1);
  console.log(root.dx);
  console.log(root.dy);
  var nodes = d3.tree().nodeSize([root.dx, root.dy])(root);
  console.log(nodes);

  // Normalize for fixed-depth.
  // nodes.forEach(function(d) { d.y = d.depth * 180; });

  // Update the nodes…
  // var node = this.vis.selectAll('g.node')
  //     .data(nodes, function(d) { return d.id || (d.id = ++i); });
  // console.log(node);

  const g = this.svg.append("g")
        .attr("font-family", "sans-serif")
        .attr("font-size", 10)
        .attr("transform", `translate(${root.dy / 3},${root.dx + 100})`);
    
  const link = g.append("g")
    .attr("fill", "none")
    .attr("stroke", "#555")
    .attr("stroke-opacity", 0.4)
    .attr("stroke-width", 1.5)
  .selectAll("path")
    .data(root.links())
    .join("path")
      .attr("d", d3.linkHorizontal()
          .x(d => d.y)
          .y(d => d.x));
  
  const node = g.append("g")
      .attr("stroke-linejoin", "round")
      .attr("stroke-width", 3)
    .selectAll("g")
    .data(root.descendants())
    .join("g")
      .attr("transform", d => `translate(${d.y},${d.x})`);

  node.append("circle")
      .attr("fill", d => d.children ? "#555" : "#999")
      .attr("r", 2.5);

  node.append("text")
      .attr("dy", "0.31em")
      .attr("x", d => d.children ? -6 : 6)
      .attr("text-anchor", d => d.children ? "end" : "start")
      .text(d => d.data.name)
    .clone(true).lower()
      .attr("stroke", "white");
  


  
  // // Enter any new nodes at the parent's previous position.
  // var nodeEnter = node.enter().append('svg:g')
  //     .attr('class', 'node')
  //       .attr('transform', function(d) {
  //         return 'translate(' + this.orientX(source, true) + ',' +
  //           this.orientY(source, true) + ')'; }.bind(this))
  //       .on('click', function(d) {
  //         this.toggle(d); this.update(d); }.bind(this));

  // nodeEnter.append('svg:circle')
  //     .attr('r', 1e-6)
  //   .style('fill', function(d) {
  //     return d._children ? 'lightsteelblue' : '#fff'; });

  // nodeEnter.append('svg:title')
  //   .text(function(d) { return d.type + ': ' + d.role; });

  // nodeEnter.append('svg:text')
  //   .attr('x', function(d) {
  //     return d.children || d._children ? this.xFor : this.xAft; }.bind(this))
  //   .attr('dy', function(d) {
  //     return d.children || d._children ? this.yFor : this.yAft; }.bind(this))
  //   .attr('text-anchor', function(d) {
  //     return d.children || d._children ? 'end' : 'start'; })
  //   .text(function(d) { return streeVis.getContent(d); })
  //   .style('font-size', '20')
  //   .style('fill', function(d) { return streeVis.getColor(d); });


  // // Transition nodes to their new position.
  // var nodeUpdate = node.transition()
  //     .duration(duration)
  //       .attr('transform', function(d) {
  //         return 'translate(' + this.orientX(d) + ',' + this.orientY(d) + ')'; }.bind(this));

  // nodeUpdate.select('circle')
  //     .attr('r', 4.5)
  //     .style('fill', function(d) { return d._children ? 'lightsteelblue' : '#fff'; });

  // nodeUpdate.select('text')
  //     .style('fill-opacity', 1);

  // // Transition exiting nodes to the parent's new position.
  // var nodeExit = node.exit().transition()
  //     .duration(duration)
  //       .attr('transform', function(d) {
  //         return 'translate(' + this.orientX(source) + ',' + this.orientY(source) + ')'; }.bind(this))
  //     .remove();

  // nodeExit.select('circle')
  //     .attr('r', 1e-6);

  // nodeExit.select('text')
  //     .style('fill-opacity', 1e-6);

  // // Update the links…
  // console.log(this.vis.selectAll('path.link'));
  // var link = this.vis.selectAll('path.link')
  //     .data(this.tree.links(nodes), function(d) { return d.target.id; });

  // // Enter any new links at the parent's previous position.
  // link.enter().insert('svg:path', 'g')
  //     .attr('class', 'link')
  //   .attr('d', function(d) {
  //     var o = {x: source.x0, y: source.y0};
  //     return this.diagonal({source: o, target: o});
  //   }.bind(this))
  //   .transition()
  //     .duration(duration)
  //   .attr('d', this.diagonal.bind(this));

  // // Transition links to their new position.
  // link.transition()
  //     .duration(duration)
  //   .attr('d', this.diagonal.bind(this));

  // // Transition exiting nodes to the parent's new position.
  // link.exit().transition()
  //     .duration(duration)
  //   .attr('d', function(d) {
  //     var o = {x: source.x, y: source.y};
  //     return this.diagonal({source: o, target: o});
  //   }.bind(this))
  //     .remove();
  // // Stash the old positions for transition.
  // nodes.forEach(function(d) {
  //   d.x0 = d.x;
  //   d.y0 = d.y;
  // });
};


// Toggle children.
streeVis.prototype.toggle = function(d, state) {
  if (d.children) {
    d._children = d.children;
    d.children = null;
  } else {
    d.children = d._children;
    d._children = null;
  }
  this.states[d.id] = !!d.children;
};


streeVis.prototype.toggleAll = function(d) {
  if (d.children) {
    d.children.forEach(this.toggleAll.bind(this));
    this.toggle(d);
  }
};


streeVis.prototype.toggleSome = function(d) {
  if (this.states[d.id]) {
    if (d._children) {
      d.children = d._children;
      d._children = null;
    }
    d.children.forEach(this.toggleSome.bind(this));
  } else {
    this.toggleAll(d);
  }
};


streeVis.prototype.expand = function(d) {
  if (!d.children && !d._children)  {
    return;
  }
  if (d._children) {
    d.children = d._children;
    d._children = null;
    this.states[d.id] = true;
    this.update(d);
    d.children.forEach(this.expand.bind(this));
  }
};


streeVis.prototype.expandAll = function() {
  this.expand(this.stree.stree);
};


streeVis.prototype.collapse = function(d) {
  if (!d.children && !d._children)  {
    return;
  }
  if (d.children) {
    d.children.forEach(this.collapse.bind(this));
    d._children = d.children;
    d.children = null;
    this.states[d.id] = false;
    this.update(d);
  }
};


streeVis.prototype.collapseAll = function() {
  this.collapse(this.stree.stree);
};


streeVis.prototype.setStates = function(node) {
  if (node.children) {
    node.children.forEach(this.setStates.bind(this));
    this.states[node.id] = true;
  }
};

streeVis.prototype.visualiseJson = function(json) {
  if (!json) return;
  this.stree = JSON.parse(JSON.stringify(json));
  this.stree.x0 = this.h / 2;
  this.stree.y0 = 0;

  if (this.rerun) {
    this.toggleSome(this.stree.stree);
  } else if (!streeVis.config.expanded) {
    this.toggleAll(this.stree.stree);
  } else {
    this.setStates(this.stree.stree);
  }
  this.update(this.stree);
};


streeVis.prototype.init = function() {
  this.visualiseJson(this.json);
};

streeVis.currentSVG = null;

streeVis.run = function(option) {
  option = option || {};
  var states = (option.rerun && streeVis.currentSVG) ?
      streeVis.currentSVG.states : {};
  if (streeVis.currentSVG && streeVis.currentSVG.svg) {
    var svg = streeVis.currentSVG.svg[0][0];
    if (svg.parentNode) {
      svg.parentNode.removeChild(svg);
      streeVis.currentSVG = null;
    }
  }
  streeVis.currentSVG = new streeVis();
  streeVis.currentSVG.states = states;
  streeVis.currentSVG.rerun = option.rerun;
  streeVis.currentSVG.init();
};


streeVis.changeOrientation = function() {
  if (streeVis.config.direction === 'top-bottom') {
    streeVis.config.direction = 'left-right';
  } else {
    streeVis.config.direction = 'top-bottom';
  }
  streeVis.run({rerun: true});
};


streeVis.expandAll = function() {
  if (streeVis.currentSVG) {
    streeVis.currentSVG.expandAll();
  }
};


streeVis.collapseAll = function() {
  if (streeVis.currentSVG) {
    streeVis.currentSVG.collapseAll();
  }
};


streeVis.render = function(text) {
  var element = document.getElementById('rendered');
  element.innerHTML = '';
  var jax = MathJax.mathml2chtml(text);
  element.appendChild(jax);
  MathJax.startup.document.clear();
  MathJax.startup.document.updateDocument();
};

streeVis.translateTex = function(display) {
  var value = (display ? '\\displaystyle ' : '') + window.input.value;
  streeVis.show(MathJax.tex2mml(value));
};


streeVis.translateMathML = function() {
  streeVis.show(MathJax.mathml2mml(window.input.value));
};


streeVis.translateSRE = function() {
  streeVis.show(sre.DomUtil.formatXml(window.input.value).trim());
};

// sre.DomUtil.formatXml(
streeVis.show = function(mml) {
  if (!mml) return;
  streeVis.showMathml(mml);
  streeVis.render(mml);
  streeVis.config.json = sre.System.getInstance().toJson(mml);
  streeVis.showJson();
  streeVis.run();
};

streeVis.removeLocalLibrary = function() {
  if (streeVis.config.script) {
    streeVis.config.script.parentNode.removeChild(streeVis.config.script);
  }
};


streeVis.loadLocalLibrary = function() {
  streeVis.removeLocalLibrary();
  var scr = document.createElement('script');
  scr.type = 'text/javascript';
  scr.src = streeVis.config.sre;
  document.head ? document.head.appendChild(scr) :
    document.body.appendChild(scr);
};

streeVis.keep = function() {
  window.location = 
    String(window.location).replace(/\?.*/,'') + '?'
    +escape(window.input.value);
};


streeVis.reload = function() {
  if (window.location.search.length > 1) {
    window.input.defaultValue =
      unescape(window.location.search.replace(/.*\?/,''));
  }
};


streeVis.showMathml = function (mathml) {
  window.mathml.innerHTML = '';
  if (window.showMathml.checked) {
    streeVis.addText(window.mathml, mathml);
  }
};


streeVis.showJson = function () {
  window.json.innerHTML = '';
  if (window.showJson.checked) {
    streeVis.addText(window.json, JSON.stringify(streeVis.config.json, null, 2));
  }
};


streeVis.showSemantics = function (stree) {
  window.semantics.innerHTML = '';
  if (window.showSemantics.checked) {
    streeVis.addText(window.semantics, sre.DomUtil.formatXml(stree.toString()));
  }
};


streeVis.addText = function(node, text) {
  node.appendChild(document.createTextNode(text));
};
