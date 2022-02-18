#! /usr/bin/env node

/* jslint node:true */

'use strict';

let issues = require('./issues');
let prep = require('./prep');
let args = require('minimist')(process.argv.slice(2));

let options = {
  dir: args.d ? args.d : './',
  zip: args.zip
};

if (args.p) {
  prep(options);
} else if (!args.h) {
  issues(options);
} else {
  console.log('Usage: cbrn [options]');
  console.log('Options:');
  console.log('  -p - Prep.');
  console.log('  -d path - Path to the comic books folders. By default current directory is used.');
  console.log('  --zip - Archive renamed issues.');
  console.log('  -h - Help.');
}
