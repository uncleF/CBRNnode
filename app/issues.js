/* jslint node:true */

'use strict';

var Promise = require('bluebird');
let fs = require('fs');
let chalk = require('chalk');
let issue = require('./issue');
let config = require('./configs.json');

module.exports = options => {

  function loadConfig() {
    options.config = config;
    return Promise.resolve();
  }

  function checkDirectory() {
    return new Promise((resolve, reject) => {
      fs.stat(options.dir, (error, status) => {
        if (error) {
          reject(error);
        } else if (!status.isDirectory()) {
          reject('Not a directory');
        } else {
          resolve();
        }
      });
    });
  }

  function readIssues() {
    return new Promise((resolve, reject) => {
      fs.readdir(options.dir, (error, dirs) => {
        if (error) {
          reject(error);
        } else {
          resolve(dirs);
        }
      });
    });
  }

  function handleIssues(dirs) {
    return new Promise.all(dirs.map(dir => issue(dir, options)));
  }

  function logError(error) {
    console.error(chalk.red(`✗ ${error}`));
  }

  function logSuccess() {
    console.log(chalk.green('Done\n'));
  }

  return Promise.resolve()
    .then(loadConfig)
    .then(checkDirectory)
    .then(readIssues)
    .then(handleIssues)
    .catch(logError)
    .done(logSuccess);

};
