/* jslint node:true */

'use strict';

let fs = require('fs');
let path = require('path');
let chalk = require('chalk');

let config = require('./config.json');

module.exports = (file, options) => {

  let archive;

  function pickExtension(extension) {
    if (extension === '.cbr' || extension === '.rar') return '.rar';
    if (extension === '.cbz' || extension === '.zip') return '.zip';
    return `.${extension}`;
  }

  function padIssueNumber(issueNumber) {
    const padLength = issueNumber.length > 3 ? issueNumber.length : 3;
    return issueNumber.padStart(padLength, "0");
  }

  function normalizeIssueTitle(issueTitle) {
    for (const [key, value] of Object.entries(config.replacements)) {
      issueTitle = issueTitle.replace(new RegExp(key, 'g'), value);
    }
    return issueTitle;
  }

  function processIssueWithNumber(filename, issueNumberMatch, newExtension) {
    const issueTitleRegexp = new RegExp(`(.+?)(?:${issueNumberMatch[0]})`);
    let issueTitle = filename.match(issueTitleRegexp)[1];
    issueTitle = normalizeIssueTitle(issueTitle);
    return `${issueTitle.trim()} #${padIssueNumber(issueNumberMatch[1])}${newExtension}`;
  }

  function processIssueWithoutNumber(filename, extension, newExtension) {
    let issueTitle = filename.replace(/\(.*?\)/gm, "");
    issueTitle = issueTitle.replace(extension, "");
    issueTitle = normalizeIssueTitle(issueTitle);
    return `${issueTitle.trim()}${newExtension}`;
  }

  function processFile(filename) {
    const extension = path.extname(filename);
    const newExtension = pickExtension(extension);
    const issueNumberMatch = filename.match(/(?:^|\s#?)(\d+)(?![^()]*\))/);
    if (issueNumberMatch) {
      return processIssueWithNumber(filename, issueNumberMatch, newExtension);
    } else {
      return processIssueWithoutNumber(filename, extension, newExtension);
    }
  }

  function archiveConfig() {
    const newFileName = processFile(file);
    archive = {
      file: file,
      newFileName: newFileName,
      filePath: `${options.dir}/${file}`,
      newFilePath: `${options.dir}/${newFileName}`,
    };
    return Promise.resolve();
  }

  function checkFile() {
    return new Promise((resolve, reject) => {
      fs.stat(archive.filePath, (error, status) => {
        if (error) {
          reject(error);
        } else if (status.isFile()) {
          resolve();
        }
      });
    });
  }

  function logSuccess() {
    console.log(`${chalk.green('✓')} ${archive.newFileName}`);
  }

  function renameFiles() {
    return new Promise((resolve, reject) => {
      fs.rename(archive.filePath, archive.newFilePath, (error, pages) => {
        if (error) {
          reject(error);
        } else {
          resolve(pages);
        }
      });
    });
  }

  return Promise.resolve()
    .then(archiveConfig)
    .then(checkFile)
    .then(renameFiles)
    .then(logSuccess);

};
