/* jslint node:true */

'use strict';

let fs = require('fs');
let path = require('path');
let chalk = require('chalk');

module.exports = (file, options) => {

  let archive;

  function pickExtension(extension) {
    if (extension === '.cbr' || extension === '.rar') return '.rar';
    if (extension === '.cbz' || extension === '.zip') return '.zip';
    return `.${extension}`;
  }

  function replaceNumber(match, numberGroup, extensionGroup) {
    if (numberGroup) return `#${numberGroup.padStart(3, "0")}.${extensionGroup}`;
    return `.${extensionGroup}`;
  }

  function processFile(filename) {
    const extension = path.extname(filename);
    const newExtension = pickExtension(extension);
    return filename
      .replace(/\s\((of\s)?\d*?\).*/, newExtension)
      .replace(/(\d*)\.(rar|zip)/, replaceNumber);
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
