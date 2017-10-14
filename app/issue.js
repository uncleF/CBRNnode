/* jslint node:true */

'use strict';

let fs = require('fs');
let archiver = require('archiver');
let chalk = require('chalk');
let page = require('./page');

module.exports = (dir, options) => {

  let issue;

  function issueConfig() {
    issue = {
      issue: dir,
      issuePath: `${options.dir}/${dir}`
    };
    return Promise.resolve();
  }

  function checkDirectory() {
    return new Promise((resolve, reject) => {
      fs.stat(issue.issuePath, (error, status) => {
        if (error) {
          reject(error);
        } else if (status.isDirectory()) {
          resolve();
        }
      });
    });
  }

  function readIssue() {
    return new Promise((resolve, reject) => {
      fs.readdir(issue.issuePath, (error, pages) => {
        if (error) {
          reject(error);
        } else {
          resolve(pages);
        }
      });
    });
  }

  function checkIssue(pages) {
    return new Promise((resolve, reject) => {
      fs.stat(`${issue.issuePath}/${pages[0]}`, (error, status) => {
        if (error) {
          reject(error);
        } else if (status.isDirectory()) {
          reject(`There is a subdirectory in the ${issue.issue}`);
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
      let basePagePath = `${issue.issuePath}/${pages[index]}`;
      let basePageType = page.getFileType(basePagePath);
      if (basePageType && options.config.fileTypes.indexOf(basePageType.ext) > -1) {
        let basePageSize = page.getPageSize(basePagePath);
        let basePageRatio = page.calculatePageRatio(basePageSize);
        let basePageSpreadRatio = basePageRatio / 2;
        issue.config = {
          singleMaxRatio: basePageRatio,
          spreadMaxRatio: basePageSpreadRatio,
          singleMaxRatioReverse: (1 / basePageRatio).toFixed(4) / 1,
          spreadMaxRatioReverse: (1 / basePageSpreadRatio).toFixed(4) / 1
        };
        return Promise.resolve(pages);
      }
    }
    return Promise.reject();
  }

  function prepareIssue(pages) {
    let issuePages = [];
    let issueLength = pages.reduce((value, file, index) => {
      let pageData = page.getData(file, index, issue, options);
      if (pageData) {
        issuePages.push(pageData);
        return value + pageData.length;
      }
    }, 0);
    issue.pages = issuePages;
    issue.length = issueLength;
    return Promise.resolve(issue);
  }

  function renameIssue(issue) {
    let promises = [];
    issue.pages.reduce((pageNumber, issuePage) => {
      issuePage.number = pageNumber;
      promises.push(page.rename(issuePage, issue, options));
      return pageNumber + issuePage.length;
    }, 0);
    return Promise.all(promises);
  }

  function archiveFiles() {
    return new Promise((resolve, reject) => {
      let output = fs.createWriteStream(`${issue.issuePath}.zip`);
      let archive = archiver('zip');
      output.on('close', resolve);
      archive.pipe(output);
      archive.bulk([{
        expand: true,
        cwd: issue.issuePath,
        src: ['*.*'],
        dest: dir
      }]);
      archive.finalize();
    });
  }

  function archiveIssue() {
    if (options.zip) {
      return archiveFiles();
    } else {
      return Promise.resolve();
    }
  }

  function logSuccess() {
    console.log(`${chalk.green('✓')} ${dir}`);
  }

  return Promise.resolve()
    .then(issueConfig)
    .then(checkDirectory)
    .then(readIssue)
    .then(checkIssue)
    .then(calculateBaseline)
    .then(prepareIssue)
    .then(renameIssue)
    .then(archiveIssue)
    .then(logSuccess);

};
