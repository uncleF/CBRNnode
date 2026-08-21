/* jslint node:true */

'use strict';

const fs = require('fs');
const archive = require('./archive');
const chalk = require('chalk');

module.exports = (options) => {

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
      fs.readdir(options.dir, (error, issues) => {
        if (error) {
          reject(error);
        } else {
          resolve(issues);
        }
      });
    });
  }

  function handleArchives(files) {
    return Promise.all(files.map(file => archive(file, options)));
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
    .then(checkDirectory)
    .then(readIssues)
    .then(handleArchives)
    .then(logSuccess)
    .catch(logError);
};
