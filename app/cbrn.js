#! /usr/bin/env node

/* jslint node:true */

'use strict';

let issues = require('./issues');
let prep = require('./prep');
let args = require('minimist')(process.argv.slice(2));

let options = {
  dir: args.d ? args.d : './',
  zip: args.a || args.arch || args.zip,
};

if (args.p || args.prep) {
  prep(options);
} else if (!args.h || args.help) {
  issues(options);
} else {
  console.log("Usage: cbrn [options]");
  console.log("Options:");
  console.log("  -d path - Path to the comic books folders. By default current directory is used.");
  console.log("  -p, --prep - Prepare archives for processing.");
  console.log("  -a, --arch - Archive renamed issues.");
  console.log("  -h, --help - Help.");
}
