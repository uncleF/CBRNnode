#! /usr/bin/env node

/* jslint node:true */

'use strict';

let issues = require('./issues');
let args = require('minimist')(process.argv.slice(2));

let options = {
  dir: args.d ? args.d : './',
  zip: args.zip
};

if (!args.h) {
  issues(options);
} else {
  console.log('Usage: cbrn [options]');
  console.log('Options:');
  console.log('  -d path - Path to the comic books folders. By default current directory is used.');
  console.log('  --zip - Archive renamed issues.');
  console.log('  -h - Help.');
}
