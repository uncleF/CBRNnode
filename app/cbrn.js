#! /usr/bin/env node

/* jslint node:true */

'use strict';

const issues = require('./issues');
const prep = require('./prep');
const args = require('minimist')(process.argv.slice(2), {
  alias: {
    d: 'dir',
    p: 'prep',
    a: ['arch', 'zip'],
    h: 'help'
  },
  default: {
    dir: './'
  },
  boolean: ['prep', 'arch', 'help'] // Ensures these are always treated as true/false flags
});

const options = {
  dir: args.d ? args.d : './',
  zip: args.a || args.arch || args.zip,
};

if (args.help) {
  console.log("Usage: cbrn [options]");
  console.log("Options:");
  console.log("  -d, --dir path - Path to the comic books folders. By default current directory is used.");
  console.log("  -p, --prep - Prepare archives for processing.");
  console.log("  -a, --arch - Archive renamed issues.");
  console.log("  -h, --help - Help.");
} else if (args.prep) {
  prep(options);
} else {
  issues(options);
}
