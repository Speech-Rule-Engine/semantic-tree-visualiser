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
  this.root = null;
  this.rerun = false;
  this.diagonal = null;
  this.orientation();
  this.states = {};
  this.svg = d3.create('svg')
    .attr('width', this.w + this.m[1] + this.m[3])
    .attr('height', this.h + this.m[0] + this.m[2]);
  this.vis = this.svg.append('svg:g')
    .attr('transform', 'translate(' + this.m[3] + ',' + this.m[0] + ')');
  d3.select('#body').node().appendChild(this.svg.node());

};



/**
 * Base configurations.
 * @enum {string|boolean}
 */
streeVis.config = {
  // url: 'simple.json',
  scale: .75,
  direction: 'top-bottom',
  sre: '../speech-rule-engine/lib/sre.js',
  expanded: false,
  script: null,
  rendered: 0,
  trieScale: 2,
  trie: false
};


streeVis.prototype.orientation = function(maxWidth = window.innerWidth,
                                          maxHeight = window.innerHeight) {
  if (this.direction === 'top-bottom') {
    streeVis.prototype.orientX = function(source, zero) {
      return zero ? source.x0 : source.x;
    };

    streeVis.prototype.orientY = function(source, zero) {
      return zero ? source.y0 : source.y;
    };

    this.m = [50, 20, 50, 20];
    this.w = (maxWidth * streeVis.config.scale) - this.m[1] - this.m[3];
    this.h = (maxHeight * streeVis.config.scale) - this.m[0] - this.m[2];

    this.xFor = 0;
    this.xAft = -3;
    this.yFor = '-.5em';
    this.yAft = '1.2em';
    this.tree = d3.tree().size([this.w, this.h]);
    this.diagonal = function link(d) {
      return "M" + d.source.x + "," + d.source.y
        + "C" + d.source.x + "," + (d.source.y + d.target.y) / 2
        + " " + d.target.x + "," + (d.source.y + d.target.y) / 2
        + " " + d.target.x + "," + d.target.y;
    };
} else {
    streeVis.prototype.orientX = function(source, zero) {
    return zero ? source.y0 : source.y;
    };

  streeVis.prototype.orientY = function(source, zero) {
    return zero ? source.x0 : source.x;
  };

  this.m = [20, 120, 20, 120];
  this.w = 1.2 * ((maxWidth * streeVis.config.scale) - this.m[1] - this.m[3]);
  this.h = 1.2 * ((maxHeight * streeVis.config.scale) - this.m[0] - this.m[2]);

  this.xFor = -10;
  this.xAft = 10;
  this.yFor = '-.1em';
  this.yAft = '0.35em';
  this.tree = d3.tree().size([this.h, this.w]);
  this.diagonal = function link(d) {
    return "M" + d.source.y + "," + d.source.x
      + "C" + (d.source.y + d.target.y) / 2 + "," + d.source.x
      + " " + (d.source.y + d.target.y) / 2 + "," + d.target.x
      + " " + d.target.y + "," + d.target.x;
  };
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
  let data = node.data;
  if (node.data['$t']) return node.data['$t'];
  var str = '';
  if (node.data.content) {
    node.data.content.forEach(function(x) {
      if (x['$t']) str += x['$t'];
    });
    return str;
  }
  str = streeVis.special[node.data.type];
  return str;
};


streeVis.prototype.update = function(source) {
  const duration = d3.event && d3.event.altKey ? 5000 : 500;
  const transition = this.svg.transition().duration(duration);
  const nodes = this.root.descendants().reverse();
  const links = this.root.links();

  // Compute the new tree layout.
  this.tree(this.root);

  // Normalize for fixed-depth.
  // nodes.forEach(function(d) { d.y = d.depth * 180; });

  // Update the nodes…
  let i = 0;
  var node = this.vis.selectAll('g.node').
      data(nodes, d => d.id || (d.id = ++i));

  // Enter any new nodes at the parent's previous position.
  let nodeEnter = node.enter().append('svg:g')
      .attr('class', 'node')
      .attr('transform', function(d) {
          return 'translate(' + this.orientX(source, true) + ',' +
            this.orientY(source, true) + ')'; }.bind(this))
        .on('click', function(e, d) {
          // d.children = d.children ? null : d._children;
          this.toggle(d);
          this.update(d); }.bind(this));

  nodeEnter.append('svg:circle')
      .attr('r', 5)
    .style('fill', function(d) {
      return d._children ? 'lightsteelblue' : '#fff'; });

  nodeEnter.append('svg:title')
    .text(function(d) { return streeVis.getHover(d.data); });

  nodeEnter.append('svg:text')
    .attr('x', function(d) {
      return d.children || d._children ? this.xFor : this.xAft; }.bind(this))
    .attr('dy', function(d) {
      return d.children || d._children ? this.yFor : this.yAft; }.bind(this))
    .attr('text-anchor', function(d) {
      return d.children || d._children ? 'end' : 'start'; })
    .text(function(d) { return streeVis.getContent(d); })
    .style('font-size', '20')
    .style('fill', function(d) { return streeVis.getColor(d); })
    .attr('transform', function() { return streeVis.config.trie ? 'rotate(30)' : ''; });


  // Transition nodes to their new position.
  var nodeUpdate = node.merge(nodeEnter).transition(transition)
        .attr('transform', function(d) {
          return 'translate(' + this.orientX(d) + ',' + this.orientY(d) + ')'; }.bind(this));

  nodeUpdate.select('circle')
      .attr('r', 4.5)
      .style('fill', function(d) { return d._children ? 'lightsteelblue' : '#fff'; });

  nodeUpdate.select('text')
      .style('fill-opacity', 1);

  // Transition exiting nodes to the parent's new position.
  var nodeExit = node.exit().transition(transition)
        .attr('transform', function(d) {
          return 'translate(' + this.orientX(source) + ',' + this.orientY(source) + ')'; }.bind(this))
      .remove();

  nodeExit.select('circle')
      .attr('r', 1e-6);

  nodeExit.select('text')
      .style('fill-opacity', 1e-6);

  // Update the links…
  var link = this.vis.selectAll('path.link')
      .data(this.root.links(nodes), function(d) { return d.target.id; });

  // Enter any new links at the parent's previous position.
  link.enter().insert('svg:path', 'g')
      .attr('class', 'link')
    .attr('d', function(d) {
      var o = {x: source.x0, y: source.y0};
      return this.diagonal({source: o, target: o});
    }.bind(this))
    .transition(transition)
    .attr('d', this.diagonal.bind(this));

  // Transition links to their new position.
  link.transition(transition)
      .duration(duration)
    .attr('d', this.diagonal.bind(this));

  // Transition exiting nodes to the parent's new position.
  link.exit().transition(transition)
    .attr('d', function(d) {
      var o = {x: source.x, y: source.y};
      return this.diagonal({source: o, target: o});
    }.bind(this))
      .remove();
  // Stash the old positions for transition.
  this.root.eachBefore(function(d) {
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
  this.expand(this.root);
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
  this.collapse(this.root);
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

  // NEW
  this.root = d3.hierarchy(this.stree.stree);
  this.root.x0 = 10;
  this.root.y0 = this.w / (this.root.height + 1);
  this.update(this.stree);
};


streeVis.prototype.init = function() {
  this.visualiseJson(this.json);
};

streeVis.currentSVG = null;

streeVis.run = function(option) {
  option = option || {};
  if (streeVis.config.trie) {
    streeVis.config.scale *= streeVis.config.trieScale;
  }
  var states = (option.rerun && streeVis.currentSVG) ?
      streeVis.currentSVG.states : {};
  if (streeVis.currentSVG && streeVis.currentSVG.svg) {
    var svg = streeVis.currentSVG.svg.nodes()[0];
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
  // TODO: Not strictly necessary but circumvents a MathJax error for now.
  let value = (display ? '\\displaystyle ' : '') + window.input.value;
  try {
    streeVis.show(MathJax.tex2mml(value, {display: display}));
  } catch (e) {
    console.error(e);
    alert('Incorrect LaTeX!');
    return;
  }
  streeVis.config.rendered = 1;
};


streeVis.translateMathML = function() {
  try {
    streeVis.show(MathJax.mathml2mml(
      streeVis.dom.prepareMmlString(window.input.value.trim())));
  } catch (e) {
    console.error(e);
    alert('Incorrect MathML!');
    return;
  }
  streeVis.config.rendered = 2;
};


streeVis.translateSRE = function() {
  try {
    streeVis.show(streeVis.dom.prepareMmlString(
      window.input.value.trim()));
  } catch (e) {
    console.error(e);
    alert('Incorrect MathML!');
    return;
  }
  streeVis.config.rendered = 3;
};


streeVis.show = async function(mml) {
  if (!mml) return;
  streeVis.showMathml(mml);
  streeVis.render(mml);
  streeVis.config.json = SRE.toJson(mml);
  streeVis.showJson();
  streeVis.showSemantics(mml);
  streeVis.showEnrMml(mml);
  streeVis.run();
  await streeVis.setupEngine();
  streeVis.showSpeech(mml);
};


streeVis.setupEngine = function() {
  let speech = window.speech.value;
  let locale = window.locale.value;
  let modality = locale === 'nemeth' ? 'braille' : 'speech';
  let domain = window.locale === 'nemeth' ? 'default' :
      window.domain.value.toLowerCase();
  return SRE.setupEngine(
    {locale: locale, modality: modality,
     domain: domain, style: 'default', speech: speech});
};

streeVis.removeLocalLibrary = function() {
  if (streeVis.config.script) {
    streeVis.config.script.parentNode.removeChild(streeVis.config.script);
    streeVis.config.script = null;
  }
};


streeVis.loadLocalLibrary = function() {
  streeVis.removeLocalLibrary();
  var scr = document.createElement('script');
  scr.type = 'text/javascript';
  scr.src = streeVis.config.sre;
  document.body.appendChild(scr);
  streeVis.config.script = scr;
  streeVis.setLocale();
};

streeVis.setLocale = function() {
  const node = window.locale;
  node.innerHTML = '';
  if (SRE.variables?.LOCALES) {
  for (let locale of SRE.variables.LOCALES) {
    let option = document.createElement('option');
    option.innerHTML = locale;
    node.appendChild(option);
  }
  } else {
    console.log('not yet');
  }
};

streeVis.keep = function() {
  let binaries = [
    // DISPLAY
    window.display.checked,
    window.showMathml.checked,
    window.showJson.checked,
    window.showSemantics.checked,
    window.showEnrMml.checked,
    streeVis.config.direction === 'top-bottom',
    window.semanticId.checked,
    window.semanticType.checked,
    window.semanticRole.checked,
    window.semanticFont.checked,
    window.semanticAnnotation.checked];
  let param = binaries.map(x => x ? 1 : 0).join('');
  window.location =
    String(window.location).replace(/\?.*/,'') + '?' +
    streeVis.config.rendered + param + escape(window.input.value);
};


streeVis.reload = function() {
  streeVis.setLocale();
  if (window.location.search.length > 1) {
    let value = unescape(window.location.search.replace(/.*\?/,''));
    streeVis.config.rendered = value.slice(0, 1);
    streeVis.defaultDisplayValues(value.slice(1, 7));
    streeVis.defaultHoverValues(value.slice(7, 12));
    value = value.slice(12);
    window.input.value = value;
  }
  streeVis.setDisplayValues();
  streeVis.setHoverValues();
  streeVis.rerender();
};


streeVis.rerender = function() {
  let count = 0;
  new Promise((ok, fail) => {
    setTimeout(function execute() {
      count++;
      if (count > 10) {
        fail();
      } else if (MathJax.tex2mml && MathJax.mathml2mml && SRE &&
                 SRE.engineReady()) {
        streeVis.setupEngine();
        ok();
      } else {
        execute();
      }
    }, 1500);
  }).
    then(() => {
      switch (streeVis.config.rendered) {
      case '1':
        streeVis.translateTex(streeVis.config.display);
        break;
      case '2':
        streeVis.translateMathML();
        break;
      case '3':
        streeVis.translateSRE();
        break;
      default:
        break;
      }}).
    catch(() => {
      alert('Something went wrong on rerendering.');
    });
};


streeVis.showMathml = function (mml) {
  window.mathml.innerHTML = '';
  if (window.showMathml.checked) {
    mml = mml.replace(/data-semantic-/g, '');
    mml = mml.replace(/ xmlns=".*"/g, '');
    streeVis.addText(window.mathml, mml);
  }
};


streeVis.showEnrMml = function (mml) {
  window.enrmml.innerHTML = '';
  if (window.showEnrMml.checked) {
    let mathml = SRE.toEnriched(mml);
    let emml = streeVis.dom.serializeXml(mathml);
    emml = emml.replace(/data-semantic-/g, '');
    emml = emml.replace(/ xmlns="http:\/\/www.w3.org\/1999\/xhtml"/g, '');
    emml = emml.replace(/ xmlns=""/g, '');
    emml = emml.replace(/ xmlns="http:\/\/www.w3.org\/1998\/Math\/MathML"/, 'PLACEHOLDER');
    emml = emml.replace(/ xmlns="http:\/\/www.w3.org\/1998\/Math\/MathML"/g, '');
    emml = emml.replace('PLACEHOLDER', ' xmlns="http:\/\/www.w3.org\/1998\/Math\/MathML"/');
    streeVis.addText(window.enrmml, streeVis.dom.formatXml(emml));
  }
};


streeVis.showJson = function () {
  window.json.innerHTML = '';
  if (window.showJson.checked) {
    streeVis.addText(window.json, JSON.stringify(streeVis.config.json, null, 2));
  }
};


streeVis.showSemantics = function (mml) {
  window.semantics.innerHTML = '';
  if (window.showSemantics.checked) {
    const stree = SRE.toSemantic(mml);
    streeVis.addText(
      window.semantics,
      streeVis.dom.formatXml(streeVis.dom.serializeXml(stree)));
  }
};


streeVis.showSpeech = function(mml) {
  let element = document.getElementById('rendered');
  SRE.setupEngine({domain: 'mathspeak', style: 'default'});
  let div1 = document.createElement('div');
  div1.classList.add('scrollbox');
  streeVis.addText(div1, SRE.toSpeech(mml));
  SRE.setupEngine({domain: 'clearspeak', style: 'default'});
  let div2 = document.createElement('div');
  streeVis.addText(div2, SRE.toSpeech(mml));
  div2.classList.add('scrollbox');
  element.appendChild(div1);
  element.appendChild(div2);
};

streeVis.addText = function(node, text) {
  node.appendChild(document.createTextNode(text));
};


streeVis.DISPLAY_INFO = {
  display: true,
  showMathml: false,
  showJson: false,
  showSemantics: false,
  orientation: true
};

streeVis.defaultDisplayValues = function(defs) {
  let values = defs.split('').map(x => parseInt(x));
  let i = 0;
  streeVis.DISPLAY_INFO.display = !!values[i++];
  streeVis.DISPLAY_INFO.showMathml = !!values[i++];
  streeVis.DISPLAY_INFO.showJson = !!values[i++];
  streeVis.DISPLAY_INFO.showSemantics = !!values[i++];
  streeVis.DISPLAY_INFO.showEnrMml = !!values[i++];
  streeVis.DISPLAY_INFO.orientation = !!values[i++];
};

streeVis.setDisplayValues = function() {
  window.display.checked = streeVis.DISPLAY_INFO.display;
  window.showMathml.checked = streeVis.DISPLAY_INFO.showMathml;
  window.showJson.checked = streeVis.DISPLAY_INFO.showJson;
  window.showSemantics.checked = streeVis.DISPLAY_INFO.showSemantics;
  window.showEnrMml.checked = streeVis.DISPLAY_INFO.showEnrMml;
  streeVis.config.direction = streeVis.DISPLAY_INFO.orientation ?
    'top-bottom' : 'left-right';
};

// Hover information. Should be done separately.

streeVis.HOVER_INFO = {
  id: true,
  type: true,
  role: true,
  font: false,
  annotation: false
};

streeVis.defaultHoverValues = function(defs) {
  let values = defs.split('').map(x => parseInt(x));
  let i = 0;
  streeVis.HOVER_INFO.id = !!values[i++];
  streeVis.HOVER_INFO.type = !!values[i++];
  streeVis.HOVER_INFO.role = !!values[i++];
  streeVis.HOVER_INFO.font = !!values[i++];
  streeVis.HOVER_INFO.annotation = !!values[i++];
};

streeVis.setHoverValues = function() {
  window.semanticId.checked = streeVis.HOVER_INFO.id;
  window.semanticType.checked = streeVis.HOVER_INFO.type;
  window.semanticRole.checked = streeVis.HOVER_INFO.role;
  window.semanticFont.checked = streeVis.HOVER_INFO.font;
  window.semanticAnnotation.checked = streeVis.HOVER_INFO.annotation;
};

streeVis.getHoverValues = function() {
  streeVis.HOVER_INFO.id = window.semanticId.checked;
  streeVis.HOVER_INFO.type = window.semanticType.checked;
  streeVis.HOVER_INFO.role = window.semanticRole.checked;
  streeVis.HOVER_INFO.font = window.semanticFont.checked;
  streeVis.HOVER_INFO.annotation = window.semanticAnnotation.checked;
};

streeVis.getHover = function(data) {
  if (streeVis.config.trie) {
    streeVis.HOVER_INFO.type = true;
  } else {
    streeVis.getHoverValues();
  }
  let result = [];
  for (let info in streeVis.HOVER_INFO) {
    if (streeVis.HOVER_INFO[info]) {
      let value = data[info];
      if (value !== undefined) {
        result.push(`${info}=${data[info]}`);
      }
    }
  }
  let str = result.join('; ');
  if (data['speech']) {
    str += '\n' + data['speech'];
  }
  return str;
};


// Trie rendering. This is experimental!
// This does not yet work with SRE4!

streeVis.renderRules = function(name = '') {
  let set = sre.SpeechRuleEngine.getInstance().ruleSets_[name];
  streeVis.renderTrie(set ? set.trie : sre.SpeechRuleEngine.getInstance().activeStore_.trie);
};


streeVis.renderTrie = function(trie) {
  streeVis.config.json = trie.json();
  streeVis.config.trie = true;
  streeVis.run();
};


streeVis.handleFileSelect = function(evt) {
  var files = evt.target.files; // FileList object
  var reader = new FileReader();
  var json = null;
  reader.onload = function(f) {
    json = JSON.parse(f.target.result);
    streeVis.config.json = json;
    streeVis.config.trie = true;
    streeVis.run();
  };
  reader.readAsText(files[0]);
};


// The following is copied straight out of SRE.
streeVis.dom = {};

/**
 * Serializes and XML element.
 * @param {Element} node The node to serialize.
 * @return {string} The serialized expression.
 */
streeVis.dom.serializeXml = function(node) {
  const xmls = new XMLSerializer();
  return xmls.serializeToString(node);
};

/**
 * Pretty prints an XML representation while dealing with mixed content:
 * Example:
 *
 * <a>A<b>B</b>C</a> is rewritten to
 * <a>A
 *   <b>B</b>
 *    C
 * </a>
 *
 * @param xml The serialised XML string.
 * @returns The formatted string.
 */
streeVis.dom.formatXml = function(xml) {
  let formatted = '';
  let reg = /(>)(<)(\/*)/g;
  // Separate at touching tags.
  xml = xml.replace(reg, '$1\r\n$2$3');
  let pad = 0;
  let split = xml.split('\r\n');
  reg = /(\.)*(<)(\/*)/g;
  // Separate at any remaining tags.
  split = split
    .map((x) => x.replace(reg, '$1\r\n$2$3').split('\r\n'))
    .reduce((x, y) => x.concat(y), []);
  while (split.length) {
    let node = split.shift();
    if (!node) {
      continue;
    }
    let indent = 0;
    if (node.match(/^<\w[^>/]*>[^>]+$/)) {
      // Start node with trailing content.
      const match = streeVis.dom.matchingStartEnd(node, split[0]);
      if (match[0]) {
        // Combine with end node
        if (match[1]) {
          // Trailing mixed content after end node.
          node = node + split.shift().slice(0, -match[1].length);
          if (
            // In case of trailing spaces.
            match[1].trim()
          ) {
            split.unshift(match[1]);
          }
        } else {
          node = node + split.shift();
        }
      } else {
        indent = 1;
      }
    } else if (node.match(/^<\/\w/)) {
      // End node.
      if (pad !== 0) {
        pad -= 1;
      }
    } else if (node.match(/^<\w[^>]*[^/]>.*$/)) {
      // Simple start node.
      indent = 1;
    } else if (node.match(/^<\w[^>]*\/>.+$/)) {
      // Empty tag node with trailing mixed content.
      const position = node.indexOf('>') + 1;
      const rest = node.slice(position);
      if (
        // In case of trailing spaces.
        rest.trim()
      ) {
        split.unshift();
      }
      node = node.slice(0, position);
    } else {
      // Empty tag node
      indent = 0;
    }
    formatted += new Array(pad + 1).join('  ') + node + '\r\n';
    pad += indent;
  }
  return formatted;
}

/**
 * Checks for two tags if the second is a matching end tag for the first.
 *
 * @param start The start tag.
 * @param end The next, possible end tag.
 * @returns A pair indicating success and the possible
 *     remainder after the end tag, in case it is followed by mixed content.
 */
streeVis.dom.matchingStartEnd = function(start, end) {
  if (!end) {
    return [false, ''];
  }
  const tag1 = start.match(/^<([^> ]+).*>/);
  const tag2 = end.match(/^<\/([^>]+)>(.*)/);
  return tag1 && tag2 && tag1[1] === tag2[1] ? [true, tag2[2]] : [false, ''];
};


streeVis.dom.prepareMmlString = function(expr) {
  if (!expr.match(/^<math/)) {
    expr = '<math>' + expr;
  }
  if (!expr.match(/\/math>$/)) {
    expr += '</math>';
  }
  return expr;
}
