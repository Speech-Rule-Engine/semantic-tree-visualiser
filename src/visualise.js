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
  this.url = streeVis.config.url;
  this.json = streeVis.config.json;
  this.direction = streeVis.config.direction;
  this.m = this.w = this.h = null;
  this.xFor = this.xAft = this.yFor = this.yAft = null;
  this.stree = null;
  this.tree = null;
  this.rerun = false;
  this.legacy = false;
  this.orientation();

  this.states = {};
  
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
 * @enum {string|boolean}
 */
streeVis.config = {
  url: 'simple.json',
  direction: 'top-bottom',
  sre: './mathjax-sre.js',
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


// For the legacy format
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
// End legacy

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
          this.toggle(d); this.update(d); }, this));

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
    d.children.forEach(goog.bind(this.toggleAll, this));
    this.toggle(d);
  }
};


streeVis.prototype.toggleSome = function(d) {
  if (this.states[d.id]) {
    if (d._children) {
      d.children = d._children;
      d._children = null;
    }
    d.children.forEach(goog.bind(this.toggleSome, this));
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
    d.children.forEach(goog.bind(this.expand, this));
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
    d.children.forEach(goog.bind(this.collapse, this));
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
    node.children.forEach(goog.bind(this.setStates, this));
    this.states[node.id] = true;
  }
};

streeVis.prototype.visualiseJson = function(json) {
  if (!json) return;
  this.stree = JSON.parse(JSON.stringify(json));
  this.stree.x0 = this.h / 2;
  this.stree.y0 = 0;

  // Legacy only!
  if (this.legacy) {
    this.stree.stree = this.prepare(this.stree.stree)[0];
  }
  
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
  this.url ? 
    d3.json(this.url, goog.bind(this.visualiseJson, this)) :
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
  streeVis.currentSVG.legacy = !!option.legacy;
  streeVis.currentSVG.states = states;
  streeVis.currentSVG.rerun = option.rerun;
  streeVis.currentSVG.init();
};


streeVis.changeOrientation = function() {
  if (streeVis.config.direction === "top-bottom") {
    streeVis.config.direction = "left-right";
  } else {
    streeVis.config.direction = "top-bottom";
  }
  streeVis.currentSVG ?
    streeVis.run({rerun: true, legacy: streeVis.currentSVG.legacy}) :
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


streeVis.loadUrl = function(legacy) {
  var url = document.getElementById('url');
  var value = url.value;
  if (!value) {return;}
  streeVis.config.json = null;
  streeVis.config.url = value;
  streeVis.run({legacy: legacy});
  url.value = "";
};



streeVis.handleFileSelect = function(evt, legacy) {
  var files = evt.target.files; // FileList object
  // files is a FileList of File objects. List some properties.
  var reader = new FileReader();
  var json = null;
  reader.onload = function(f) {
    json = JSON.parse(f.target.result);
    streeVis.config.json = json;
    streeVis.config.url = '';
    streeVis.run({legacy: legacy});
  };
  
  reader.readAsText(files[0]);
  // var output = [];
  // document.getElementById('list').innerHTML = '<ul>' + output.join('') + '</ul>';
};

streeVis.render = function(text) {
  streeVis.showMathml(text);
  streeVis.showJson();
  var element = document.getElementById('rendered');
  var script = element.querySelector('script');
  var jax = MathJax.Hub.getJaxFor(script);
  MathJax.Hub.Queue(
    ["Text", jax, text],
  );
};

streeVis.translateTex = function(display) {
  var value = (display ? '\\displaystyle ' : '') + window.input.value;
  try {
    var jax = MathJax.InputJax.TeX.Parse(value).mml();
  } catch(err) {
    if (!err.texError) {throw err;}
    window.alert('The following error has occurred: ' + err);
    return;
  }
  if (jax.inferred) {
    jax = MathJax.ElementJax.mml.apply(MathJax.ElementJax, jax.data);
  } else {
    jax = MathJax.ElementJax.mml(jax);
  }
  var mml = jax.root.toMathML();
  streeVis.config.json = streeVis.treeJson(mml);
  streeVis.render(mml);
  streeVis.config.url = '';
  streeVis.run();
};


streeVis.translateMathML = function() {
  try {
    var mmlJax = MathJax.InputJax.MathML;
    if (!mmlJax.ParseXML) {
      mmlJax.ParseXML = mmlJax.createParser();
    }
    var mml = mmlJax.Parse(window.input.value).mml.toMathML();
  } catch(err) {
    window.alert('The following error has occurred: ' + err);
    return;
  }
  if (!mml) return;
  streeVis.config.json = streeVis.treeJson(mml);
  streeVis.render(mml);
  streeVis.config.url = '';
  streeVis.run();
};


streeVis.translateSRE = function() {
  streeVis.config.json = streeVis.treeJson(window.input.value);
  streeVis.render(window.input.value);
  streeVis.config.url = '';
  streeVis.run();
};


// Computes tree and JSON.
streeVis.treeJson = function(mml) {
  if (sre.SemanticTree.prototype.toJson) {
    return sre.System.getInstance().toJson(mml);
  }
  var stree = sre.System.getInstance().toSemantic(mml);
  if (!stree) return null;
  return streeVis.treeHTML(stree);
};


// This will be replaced by the dedicated SRE function.
streeVis.treeHTML = function(tree) {
  var object = {};
  streeVis.treeHTML_(tree.childNodes[0], object);
  object = {stree: object};
  return object;
};

streeVis.treeHTML_ = function(element, object) {
  object["type"] = element.nodeName;
  var attributes = element.attributes;
  for (var i = 0; i < attributes.length; i++) {
    object[attributes[i].nodeName] = attributes[i].nodeValue;
  }
  var nodeList = element.childNodes;
  if (nodeList != null) {
    if (nodeList.length) {
      for (var i = 0; i < nodeList.length; i++) {
        var node = nodeList[i];
        if (node.nodeType == 3) {
          object['$t'] = object['$t'] || '';
          object["$t"] += node.nodeValue;
          continue;
        }
        streeVis.addChildren('children', node, object);
        streeVis.addChildren('content', node, object);
      }
    }
  }
};


streeVis.addChildren = function(name, element, object) {
  if (element.nodeName === name) {
    object[name] = object[name] || [];
    var children = element.childNodes;
    for (var j = 0, child; child = children[j]; j++) {
      var newObject = {};
      streeVis.treeHTML_(child, newObject);
      object[name].push(newObject);
    }
  }
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
    String(window.location).replace(/\?.*/,"")+"?"
    +escape(window.input.value);
};


streeVis.reload = function() {
  if (window.location.search.length > 1) {
    window.input.defaultValue =
      unescape(window.location.search.replace(/.*\?/,""));
  }
};


streeVis.showMathml = function (mathml) {
  if (window.showMathml.checked) {
    window.mathml.innerHTML = "";
    MathJax.HTML.addText(window.mathml, mathml);
  } else {
    window.mathml.innerHTML = "";
  }
};


streeVis.showJson = function () {
  if (window.showJson.checked) {
    window.json.innerHTML = "";
    MathJax.HTML.addText(window.json, JSON.stringify(streeVis.config.json, null, 2));
  } else {
    window.json.innerHTML = "";
  }
};
