# Semantic Tree Visualiser

A simple visualiser for the semantic tree produced by the 
[speech-rule-engine](https://github.com/speech-rule-engine/speech-rule-engine) for MathML elements.

## Install

Install with 

``` bash
npm install sre-visualiser
```

Use by loading `index.html` in a browser.

## Run

Load visualise.html into a browser and load a sample from the samples directory, e.g.,

    samples/quad.json

for the quadratic equation. This currently only works via a URL, i.e., not locally from files.

For left-right trees, change the ```direction``` option to ```left-right```.

## Test

Play with the visualiser online on [github pages](http://speech-rule-engine.github.io/semantic-tree-visualiser/visualise.html).
