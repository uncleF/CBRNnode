#! /usr/bin/env node

/* jslint node:true */

'use strict';

var issues = require('./issues');
var args = require('minimist')(process.argv.slice(2));

var options = {
  dir: args.d ? args.d : './',
  zip: args.zip
};

if (!args.h) {
  issues(options);
} else {
  console.log('Usage: cbrn [options]');
  console.log('Options:');
  console.log('  -d path - Path to the issues. If ommited current directory will be used.');
  console.log('  --zip - Archive renamed issues.');
  console.log('  -h - Help.');
}
