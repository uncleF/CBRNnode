/* jslint node: true */

var Promise = require('bluebird');
var fs = require('fs');
var archiver = require('archiver');
var fileType = require('file-type');
var sizeOf = require('image-size');
var chalk = require('chalk');
var qconf = require('qconf');

var config = qconf();

var dir;
var zip;
var comp;
var clean;

const SINGLE_MAX_RATIO = config.get('singleMaxRatio');
const SPREAD_MAX_RATIO = config.get('spreadMaxRatio');
const MAX_RATIO_DELTA = config.get('maxRatioDelta');
const FILE_TYPES = config.get('fileTypes');

function generatePath(directory, destination) {
  return `${directory}/${destination}`;
}

function calculatePageRatio(width, height) {
  return (height / width).toFixed(4) / 1;
}

function checkHorizontalSpread(width, height, ratio, max, delta) {
  return width > height && ratio < (max + delta) && ratio > (max - delta);
}

function checkVerticalSpread(width, height, ratio, max, delta) {
  var reverse = (1 / max).toFixed(4) / 1;
  return width < height && ratio < (reverse + delta) && ratio > (reverse - delta);
}

function checkHorizontalIrregular(width, height, ratio, max, delta) {
  return width > height && (ratio < (max - delta) || ratio > (max + delta));
}

function checkVerticalIrregular(width, height, ratio, max, delta) {
  var reverse = (1 / max).toFixed(4) / 1;
  return width < height && (ratio < (reverse - delta) || ratio > (reverse + delta));
}

function getExtension(file) {
  var name = file.split('.');
  return name[name.length - 1];
}

function generatePageNumber(number, length) {
  var pageNumber;
  if (length >= 100) {
    if (number < 10) {
      pageNumber = `00${number}`;
    } else if (number >= 10 && number < 100) {
      pageNumber = `0${number}`;
    } else {
      pageNumber = `${number}`;
    }
  } else {
    if (number < 10) {
      pageNumber = `0${number}`;
    } else {
      pageNumber = `${number}`;
    }
  }
  return pageNumber;
}

function renameSinglePage(number, length) {
  return generatePageNumber(number, length);
}

function renameSpreadPage(number, length) {
  var pageFirst = generatePageNumber(number, length);
  var pageSecond = generatePageNumber((number + 1), length);
  return `${pageFirst} - ${pageSecond}`;
}

function generateNewName(issue, number, ext, length, spreadHorizontal, spreadVertical) {
  var pageNumber;
  if (number > 1 && (spreadHorizontal || spreadVertical)) {
    pageNumber = renameSpreadPage(number, length);
  } else {
    pageNumber = renameSinglePage(number, length);
  }
  return `${issue} - ${pageNumber}.${ext}`;
}

function checkIrregular(singleIrregularHorizontal, singleIrregularVertical, newName) {
  if (singleIrregularHorizontal || singleIrregularVertical) {
    console.log(chalk.yellow(newName));
  }
}

function checkTag(singleIrregularHorizontal, singleIrregularVertical, issue, fileCount, index) {
  if (fileCount === index && (singleIrregularHorizontal || singleIrregularVertical)) {
    console.log(chalk.yellow(`${issue} might contain a tag`));
  }
}

function newNumber(number, spreadHorizontal, spreadVertical) {
  return (spreadHorizontal || spreadVertical) ? (number + 2) : (number + 1);
}

function getPageLength(spreadHorizontal, spreadVertical) {
  return (spreadHorizontal || spreadVertical) ? 2 : 1;
}

function checkDirectory() {
  return new Promise(function(resolve, reject) {
    fs.stat(dir, function(error, status) {
      if (error) {
        reject('No such directory');
      } else if (status.isDirectory()) {
        resolve(true);
      } else {
        reject('Not a directory');
      }
    });
  });
}

function getIssues() {
  return new Promise(function(resolve, reject) {
    fs.readdir(dir, function(error, files) {
      if (error) {
        reject(error);
      } else {
        resolve(files);
      }
    });
  });
}

function iterateThroughIssues(issues) {
  return new Promise.all(issues.map(function(issue) {
    return new Promise(function(resolve, reject) {
      var issuePath = generatePath(dir, issue);
      fs.stat(issuePath, function(error, status) {
        if (error) {
          reject(error);
        } else if (status.isDirectory()) {
          resolve(renameIssue(issuePath, issue).then(archiveIssue));
        } else {
          resolve(undefined);
        }
      });
    });
  }));
}

function renamePage(file, number, issuePath, issue, length, fileCount, index) {
  var size = sizeOf(file);
  var ratio = calculatePageRatio(size.width, size.height);
  var spreadHorizontal = checkHorizontalSpread(size.width, size.height, ratio, SPREAD_MAX_RATIO, MAX_RATIO_DELTA);
  var spreadVertical = checkVerticalSpread(size.width, size.height, ratio, SPREAD_MAX_RATIO, MAX_RATIO_DELTA);
  var singleIrregularHorizontal = !spreadHorizontal && checkHorizontalIrregular(size.width, size.height, ratio, SINGLE_MAX_RATIO, MAX_RATIO_DELTA);
  var singleIrregularVertical = !spreadVertical && checkVerticalIrregular(size.width, size.height, ratio, SINGLE_MAX_RATIO, MAX_RATIO_DELTA);
  var ext = getExtension(file);
  var newName = generateNewName(issue, number, ext, length, spreadHorizontal, spreadVertical);
  checkIrregular(singleIrregularHorizontal, singleIrregularVertical, newName);
  checkTag(singleIrregularHorizontal, singleIrregularVertical, issue, fileCount, index);
  fs.rename(file, generatePath(issuePath, newName));
  return newNumber(number, spreadHorizontal, spreadVertical);
}

function getIssueLength(pages, issuePath) {
  var length = 0;
  pages.map(function(page) {
    var file = generatePath(issuePath, page);
    var type = fileType(fs.readFileSync(file));
    var size;
    var ratio;
    var spreadHorizontal;
    var spreadVertical;
    if (type && FILE_TYPES.indexOf(type.ext) > -1) {
      size = sizeOf(file);
      ratio = calculatePageRatio(size.width, size.height);
      spreadHorizontal = checkHorizontal(size.width, size.height, ratio, SPREAD_MAX_RATIO, MAX_RATIO_DELTA);
      spreadVertical = checkVertical(size.width, size.height, ratio, SPREAD_MAX_RATIO, MAX_RATIO_DELTA);
      length += getPageLength(spreadHorizontal, spreadVertical);
    }
  });
  return length;
}

function deleteFile(file, page, issuePath) {
  var issue = issuePath.replace(`${dir}/`, '');
  fs.unlinkSync(file);
  console.log(chalk.yellow(`Removed file ${page} from the ${issue}`));
}

function processPages(pages, issuePath, issue) {
  var number = 0;
  var length = getIssueLength(pages, issuePath);
  var fileCount = pages.length - 1;
  pages.map(function(page, index) {
    var file = generatePath(issuePath, page);
    var type = fileType(fs.readFileSync(file));
    if (type && FILE_TYPES.indexOf(type.ext) > -1) {
      number = renamePage(file, number, issuePath, issue, length, fileCount, index);
    } else {
      if (clean) {
        deleteFile(file, page, issuePath);
      } else {
        console.log(chalk.yellow(`${issue} contains files other than images – ${page}`));
      }
    }
  });
}

function renameIssue(issuePath, issue) {
  return new Promise(function(resolve, reject) {
    if (!comp) {
      fs.readdir(issuePath, function(error, pages) {
        if (error) {
          reject(error);
        } else {
          processPages(pages, issuePath, issue);
          resolve([issuePath, issue]);
        }
      });
    } else {
      resolve([issuePath, issue]);
    }
  });
}

function archivePages(issuePath, issue, resolve) {
  var output = fs.createWriteStream(`${issuePath}.zip`);
  var archive = archiver('zip');
  output.on('close', function() {
    resolve(issue);
  });
  archive.pipe(output);
  archive.bulk([{
    expand: true,
    cwd: issuePath,
    src: ['*.*'],
    dest: dir
  }]);
  archive.finalize();
}

function archiveIssue(issueInfo) {
  return new Promise(function(resolve, reject) {
    var issuePath = issueInfo[0];
    var issue = issueInfo[1];
    if (zip || comp) {
      archivePages(issuePath, issue, resolve);
    } else {
      resolve(issue);
    }
  });
}

function logDone(issues) {
  issues.map(function(issue) {
    if (issue) {
      console.log(chalk.green('✔') + ` ${issue}`);
    }
  });
  console.log('');
}

function logError(error) {
  console.log(chalk.red('✗') + ` ${error}`);
}

function init(options) {
  return new Promise(function(resolve, reject) {
    dir = options.dir;
    zip = options.zip;
    comp = options.comp;
    clean = options.clean;
    resolve();
  });
}

function run(options) {
  init(options)
    .then(checkDirectory)
    .then(getIssues)
    .then(iterateThroughIssues)
    .catch(logError)
    .done(logDone);
}

exports.run = run;
