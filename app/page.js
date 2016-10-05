/* jslint node:true */

'use strict';

var Promise = require('bluebird');
let fs = require('fs');
let number = require('./number');
var fileType = require('file-type');
var imageSize = require('image-size');
let chalk = require('chalk');

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

function checkHorizontalSpread(size, ratio, config) {
  return isWidthLonger(size) && isInside(ratio, config.spreadMaxRatio, config.maxRatioDelta);
}

function checkVerticalSpread(size, ratio, config) {
  return !isWidthLonger(size) && isInside(ratio, config.spreadMaxRatioReverse, config.maxRatioDelta);
}

function checkHorizontalIrregular(size, ratio, config) {
  return isWidthLonger(size) && isOutside(ratio, config.spreadMaxRatioReverse, config.maxRatioDelta);
}

function checkVerticalIrregular(size, ratio, config) {
  return !isWidthLonger(size) && isOutside(ratio, config.spreadMaxRatio, config.maxRatioDelta);
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

function getPageLayout(size, ratio, config) {
  let spreadHorizontal = checkHorizontalSpread(size, ratio, config);
  let spreadVertical = checkVerticalSpread(size, ratio, config);
  let singleIrregularHorizontal = !spreadHorizontal ? checkHorizontalIrregular(size, ratio, config) : false;
  let singleIrregularVertical = !spreadVertical ? checkVerticalIrregular(size, ratio, config) : false;
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
    return Math.ceil(config.singleMaxRatio / ratio);
  }
}

function getData(file, index, options) {
  let pagePath = `${options.issuePath}/${file}`;
  let pageExt = getExtension(file);
  let pageIndex = index;
  let pageSize = getPageSize(pagePath);
  let pageRatio = calculatePageRatio(pageSize);
  let pageLayout = getPageLayout(pageSize, pageRatio, options.config);
  let pageLength = calculatePageLength(pageIndex, pageSize, pageRatio, pageLayout, options.config);
  return {
    path: pagePath,
    ext: pageExt,
    index: pageIndex,
    size: pageSize,
    ratio: pageRatio,
    layout: pageLayout,
    length: pageLength,
  };
}

/* Warn */

function warnIrregular(newName, pageData) {
  if (pageData.layout.singleIrregularHorizontal || pageData.layout.singleIrregularVertical) {
    console.warn(chalk.yellow(newName));
  }
}

function warnTag(pageData, issue) {
  if (pageData.index === (issue.pages.length - 1) && (pageData.layout.singleIrregularHorizontal || pageData.layout.singleIrregularVertical)) {
    console.warn(chalk.yellow(`${issue} might contain a tag`));
  }
}

function warn(newName, pageData, issue) {
  warnIrregular(newName, pageData);
  warnTag(pageData, issue);
}

/* Rename */

// function newNumber(number, spreadHorizontal, spreadVertical) {
//   return number > 0 && (spreadHorizontal || spreadVertical) ? (number + 2) : (number + 1);
// }

// function generateNewName(issue, number, ext, length, spreadHorizontal, spreadVertical) {
//   var pageNumber;
//   if (number > 0 && (spreadHorizontal || spreadVertical)) {
//     pageNumber = generateFileSpreadNumber(number, length);
//   } else {
//     pageNumber = generateFileNumber(number, length);
//   }
//   return `${issue} - ${pageNumber}.${ext}`;
// }

// function renameFile(file, number, issuePath, issue, length, fileCount, index) {
//   var size = sizeOf(file);
//   var ratio = calculatePageRatio(size.width, size.height);
//   var ext = getExtension(file);

//   return newNumber(number, spreadHorizontal, spreadVertical);
// }

// function rename() {
//   let newName = generateNewName(issue, number, ext, length, spreadHorizontal, spreadVertical);
//   fs.rename(file, generatePath(issuePath, newName));
// }

/* Interface */

exports.getData = getData;
exports.getFileType = getFileType;
exports.getPageSize = getPageSize;
exports.calculatePageRatio = calculatePageRatio;
exports.rename = rename;
