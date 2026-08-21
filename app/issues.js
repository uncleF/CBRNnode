/* jslint node:true */

'use strict';

const fs = require('fs');
const chalk = require('chalk');
const issue = require('./issue');
const config = require('./config.json');

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
    return Promise.all(dirs.map(dir => issue(dir, options)));
  }

  function logError(error) {
    console.error(chalk.red(`✗ ${error}`));
    if (error.stack) {
      console.error(error.stack);
    }
  }

  function logSuccess() {
    console.log(chalk.green('Done'));
  }

  return Promise.resolve()
    .then(loadConfig)
    .then(checkDirectory)
    .then(readIssues)
    .then(handleIssues)
    .then(logSuccess)
    .catch(logError);
};
