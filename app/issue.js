/* jslint node:true */

'use strict';

var Promise = require('bluebird');
let fs = require('fs');
let archiver = require('archiver');
let chalk = require('chalk');
let page = require('./page');

module.exports = (dir, options) => {

  function updateConfig() {
    options.issuePath = `${options.dir}/${dir}`;
    return Promise.resolve();
  }

  function checkDirectory() {
    return new Promise((resolve, reject) => {
      fs.stat(options.issuePath, (error, status) => {
        if (error) {
          reject(error);
        } else if (!status.isDirectory()) {
          resolve(false);
        } else {
          resolve();
        }
      });
    });
  }

  function readIssue() {
    return new Promise((resolve, reject) => {
      fs.readdir(options.issuePath, (error, pages) => {
        if (error) {
          reject(error);
        } else {
          resolve(pages);
        }
      });
    });
  }

  function calculateBaseline(pages) {
    let index = 0;
    let length = pages.length;
    while (index < length) {
      let basePagePath = `${options.issuePath}/${pages[index]}`;
      let basePageType = page.getFileType(basePagePath);
      if (basePageType && options.config.fileTypes.indexOf(basePageType.ext) > -1) {
        var basePageSize = page.getPageSize(basePagePath);
        var basePageRatio = page.calculatePageRatio(basePageSize);
        options.config.singleMaxRatio = basePageRatio;
        options.config.spreadMaxRatio = basePageRatio / 2;
        options.config.singleMaxRatioReverse = (1 / options.config.singleMaxRatio).toFixed(4) / 1;
        options.config.spreadMaxRatioReverse = (1 / options.config.spreadMaxRatio).toFixed(4) / 1;
        return Promise.resolve(pages);
      }
    }
    return Promise.reject();
  }

  function prepareIssue(pages) {
    let issuePages = [];
    let issueLength = pages.reduce((value, file, index) => {
      let pageData = page.getData(file, index, options);
      issuePages.push(pageData);
      return value + pageData.length;
    }, 0);
    let issue = {
      pages: issuePages,
      length: issueLength
    };
    return Promise.resolve(issue);
  }

  function renameIssue(issue) {
    return new Promise.all(issue.pages.map(issuePage => page.rename(issuePage, issue, options)));
  }

  function archiveFiles() {
    return new Promise((resolve, reject) => {
      let output = fs.createWriteStream(`${options.issuePath}.zip`);
      let archive = archiver('zip');
      output.on('close', resolve);
      archive.pipe(output);
      archive.bulk([{
        expand: true,
        cwd: options.issuePath,
        src: ['*.*'],
        dest: dir
      }]);
      archive.finalize();
    });
  }

  function archiveIssue() {
    return new Promise(function(resolve, reject) {
      if (options.zip) {
        return archiveFiles();
      } else {
        resolve();
      }
    });
  }

  function logSuccess() {
    console.log(chalk.green('✔') + ` ${dir}`);
  }

  return new Promise.resolve()
    .then(updateConfig)
    .then(checkDirectory)
    .then(readIssue)
    .then(calculateBaseline)
    .then(prepareIssue)
    .then(renameIssue)
    .then(archiveIssue)
    .done(logSuccess);

};
