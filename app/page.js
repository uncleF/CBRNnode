/* jslint node:true */

'use strict';

let fs = require('fs');
var fileType = require('file-type');
var imageSize = require('image-size');
let chalk = require('chalk');
let number = require('./number');

/* Utilities */

function isWidthLonger(size) {
  return size.width > size.height;
}

function isInside(point, center, radius) {
 return point < (center + radius) && point > (center - radius);
}

function isOutside(point, center, radius) {
 return point < (center - radius) || point > (center + radius);
}

/* Page Layout */

function checkHorizontalSpread(size, ratio, issueConfig, optionsConfig) {
  return isWidthLonger(size) && isInside(ratio, issueConfig.spreadMaxRatio, optionsConfig.maxRatioDelta);
}

function checkVerticalSpread(size, ratio, issueConfig, optionsConfig) {
  return !isWidthLonger(size) && isInside(ratio, issueConfig.spreadMaxRatioReverse, optionsConfig.maxRatioDelta);
}

function checkHorizontalIrregular(size, ratio, issueConfig, optionsConfig) {
  return isWidthLonger(size) && isOutside(ratio, issueConfig.singleMaxRatioReverse, optionsConfig.maxRatioDelta);
}

function checkVerticalIrregular(size, ratio, issueConfig, optionsConfig) {
  return !isWidthLonger(size) && isOutside(ratio, issueConfig.singleMaxRatio, optionsConfig.maxRatioDelta);
}

/* Page Data */

function getFileType(file) {
  return fileType(fs.readFileSync(file));
}

function getExtension(file) {
  return file.split('.').pop();
}

function getPageSize(file) {
  return imageSize(file);
}

function calculatePageRatio(size) {
  return (size.height / size.width).toFixed(4) / 1;
}

function getPageLayout(size, ratio, issueConfig, optionsConfig) {
  let spreadHorizontal = checkHorizontalSpread(size, ratio, issueConfig, optionsConfig);
  let spreadVertical = checkVerticalSpread(size, ratio, issueConfig, optionsConfig);
  let singleIrregularHorizontal = !spreadHorizontal ? checkHorizontalIrregular(size, ratio, issueConfig, optionsConfig) : false;
  let singleIrregularVertical = !spreadVertical ? checkVerticalIrregular(size, ratio, issueConfig, optionsConfig) : false;
  return {
    spreadHorizontal: spreadHorizontal,
    spreadVertical: spreadVertical,
    singleIrregularHorizontal: singleIrregularHorizontal,
    singleIrregularVertical: singleIrregularVertical
  };
}

function calculatePageLength(index, size, ratio, layout, config) {
  if (index === 0 || (!layout.spreadHorizontal && !layout.spreadVertical)) {
    return 1;
  } else if (layout.spreadHorizontal || layout.spreadVertical) {
    return Math.round(config.singleMaxRatio / ratio);
  }
}

function getData(file, index, issue, options) {
  let pagePath = `${issue.issuePath}/${file}`;
  let pageType = getFileType(pagePath);
  if (pageType && options.config.fileTypes.indexOf(pageType.ext) > -1) {
    let pageExt = getExtension(file);
    let pageIndex = index;
    let pageSize = getPageSize(pagePath);
    let pageRatio = calculatePageRatio(pageSize);
    let pageLayout = getPageLayout(pageSize, pageRatio, issue.config, options.config);
    let pageLength = calculatePageLength(pageIndex, pageSize, pageRatio, pageLayout, issue.config);
    return {
      path: pagePath,
      ext: pageExt,
      index: pageIndex,
      size: pageSize,
      ratio: pageRatio,
      layout: pageLayout,
      length: pageLength,
    };
  } else {
    if (fs.existsSync(pagePath)) {
      fs.unlinkSync(pagePath);
      console.log(chalk.yellow(`Removed file ${file} from the ${issue.issue}`));
    }
    return false;
  }
}

/* Warnings */

function warnIrregular(newName, pageData) {
  if (pageData.layout.singleIrregularHorizontal || pageData.layout.singleIrregularVertical) {
    console.warn(chalk.yellow(newName));
  }
}

function warnTag(pageData, issue) {
  if (pageData.index === (issue.pages.length - 1) && (pageData.layout.singleIrregularHorizontal || pageData.layout.singleIrregularVertical)) {
    console.warn(chalk.yellow(`${issue.issue} might contain a tag`));
  }
}

function warn(newName, pageData, issue) {
  warnIrregular(newName, pageData);
  warnTag(pageData, issue);
}

/* Rename */

function generateNewName(page, issue) {
  let pageNumber = number(page.number, page.length, issue.length);
  return `${issue.issue} - ${pageNumber}.${page.ext}`;
}

function rename(pageData, issue, options) {
  return new Promise((resolve, reject) => {
    let newName = generateNewName(pageData, issue);
    let newPath = `${issue.issuePath}/${newName}`;
    warn(newName, pageData, issue);
    fs.rename(pageData.path, newPath, error => {
      if (!error) {
        resolve();
      } else {
        reject(error);
      }
    });
  });
}

/* Interface */

exports.getData = getData;
exports.getFileType = getFileType;
exports.getPageSize = getPageSize;
exports.calculatePageRatio = calculatePageRatio;
exports.rename = rename;
