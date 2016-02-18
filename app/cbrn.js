#! /usr/bin/env node

/* jslint node:true */

var cbrn = require('./rename');
var args = require('minimist')(process.argv.slice(2));

var options = {
  dir: args.d ? args.d : './',
  zip: args.zip,
  comp: args.comp,
  clean: args.clean,
};
var help = args.h;

if (!help) {
  cbrn.run(options);
} else {
  console.log('Usage: cbrn [options]');
  console.log('Options:');
  console.log('  -d path - Path to the issues. If ommited current directory will be used');
  console.log('  --zip - Archive renamed issues');
  console.log('  --comp - Archive issues without renaming');
  console.log('  --clean - Remove all non-images found inside each issue while renaming');
  console.log('  -h - Help');
}
