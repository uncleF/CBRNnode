#! /usr/bin/env node

/*jslint node: true */

var Bluebird = require('bluebird');
var fs = require('fs');
var archiver = require('archiver');
var fileType = require('file-type');
var sizeOf = require('image-size');
var args = require('minimist')(process.argv.slice(2));
var chalk = require('chalk');

var dir = args.d ? args.d + '/' : './';
var zip = args.zip;
var comp = args.comp;
var clean = args.clean;

var SINGLE_MAX_RATIO = 1.5372;
var SPREAD_MAX_RATIO = 0.7688;
var MAX_RATIO_DELTA = 0.1500;
var FILE_TYPES = ['jpg', 'png', 'gif', 'bmp', 'webp', 'tif'];

function getIssues() {
  return new Bluebird(function(resolve, reject) {
    fs.readdir(dir, function(error, files) {
      if (error) {
        reject(error);
      } else {
        resolve(files);
      }
    });
  });
}

function generateIssuePath(issue) {
  return dir + issue;
}

function iterateThroughIssues(issues) {
  return new Bluebird.all(issues.map(function(issue) {
    return new Bluebird(function(resolve, reject) {
      var issuePath = generateIssuePath(issue);
      fs.stat(issuePath, function(error, status) {
        var promise;
        if (error) {
          reject(error);
        } else {
          if (status.isDirectory()) {
            promise = renameIssue(issuePath, issue).then(archiveIssue);
            resolve(promise);
          } else {
            resolve(undefined);
          }
        }
      });
    });
  }));
}

function renameSinglePage(number, length) {
  var pageNumber;
  if (length >= 100) {
    if (number <= 9) {
      pageNumber = '00' + number;
    } else if (number <= 99) {
      pageNumber = '0' + number;
    } else {
      pageNumber = number;
    }
  } else {
    if (number <= 9) {
      pageNumber = '0' + number;
    } else {
      pageNumber = number;
    }
  }
  return pageNumber;
}

function renameSpreadPage(number, length) {
  var numberNext = number + 1;
  var pageNumber;
  if (length >= 100) {
    if (number <= 8) {
      pageNumber = '00' + number + ' - 00' + numberNext;
    } else if (number === 9 && numberNext === 10) {
      pageNumber = '00' + number + ' - 0' + numberNext;
    } else if (number <= 98) {
      pageNumber = '0' + number + ' - 0' + numberNext;
    } else if (number === 99 && numberNext === 100) {
      pageNumber = '0' + number + ' - ' + numberNext;
    } else {
      pageNumber = number + ' - ' + numberNext;
    }
  } else {
    if (number <= 8) {
      pageNumber = '0' + number + ' - 0' + numberNext;
    } else if (number === 9 && numberNext === 10) {
      pageNumber = '0' + number + ' - ' + numberNext;
    } else {
      pageNumber = number + ' - ' + numberNext;
    }
  }
  return pageNumber;
}

function renamePage(file, number, issuePath, issue, length) {
  var pageNumber;
  var newName;
  var size = sizeOf(file);
  var ratio =  (size.height / size.width).toFixed(4);
  var spreadHorizontal = size.width > size.height && ratio < (SPREAD_MAX_RATIO + MAX_RATIO_DELTA) && ratio > (SPREAD_MAX_RATIO - MAX_RATIO_DELTA);
  var spreadVertical = size.width < size.height && ratio < ((1 / SPREAD_MAX_RATIO).toFixed(4) + MAX_RATIO_DELTA) && ratio > ((1 / SPREAD_MAX_RATIO).toFixed(4) - MAX_RATIO_DELTA);
  var singleIrregularHorizontal = size.width > size.height && ratio < (SINGLE_MAX_RATIO - MAX_RATIO_DELTA) && ratio > (SINGLE_MAX_RATIO + MAX_RATIO_DELTA);
  var singleIrregularVertical = size.width < size.height && ratio < ((1 / SINGLE_MAX_RATIO).toFixed(4) - MAX_RATIO_DELTA) && ratio > ((1 / SINGLE_MAX_RATIO).toFixed(4) + MAX_RATIO_DELTA);
  var ext = file.split('.');
  ext = ext[ext.length - 1];
  if (number > 1 && (spreadHorizontal || spreadVertical)) {
    pageNumber = renameSpreadPage(number, length);
    number += 1;
  } else {
    pageNumber = renameSinglePage(number, length);
  }
  newName = issue + ' - ' + pageNumber + '.' + ext;
  if (singleIrregularHorizontal || singleIrregularVertical) {
    console.log(chalk.yellow(newName));
  }
  fs.rename(file, (issuePath + '/' + newName));
  return number + 1;
}

function getIssueLength(pages, issuePath) {
  var length = 0;
  pages.map(function(page) {
    var file = issuePath + '/' + page;
    var type = fileType(fs.readFileSync(file));
    var size;
    if (type && FILE_TYPES.indexOf(type.ext) > -1) {
      size = sizeOf(file);
      length += ((size.width > size.height) || (size.width < size.height && size.height / size.width <= SINGLE_MAX_RATIO)) ? 2 : 1;
    }
  });
  return length;
}

function renameIssue(issuePath, issue) {
  return new Bluebird(function(resolve, reject) {
    if (!comp) {
      fs.readdir(issuePath, function(error, pages) {
        if (error) {
          reject(error);
        } else {
          var number = 0;
          var length = getIssueLength(pages, issuePath);
          pages.map(function(page) {
            var file = issuePath + '/' + page;
            var type = fileType(fs.readFileSync(file));
            if (type && FILE_TYPES.indexOf(type.ext) > -1) {
              number = renamePage(file, number, issuePath, issue, length);
            } else {
              if (clean) {
                fs.unlinkSync(file);
                console.log(chalk.yellow('Removed file ' + page + ' from the ' + issuePath.replace(dir, '')));
              } else {
                console.log(chalk.yellow('Directory ' + issuePath.replace(dir, '') + ' contains files other than images – ' + page));
              }
            }
          });
          resolve([issuePath, issue]);
        }
      });
    } else {
      resolve([issuePath, issue]);
    }
  });
}

function archiveIssue(issueInfo) {
  return new Bluebird(function(resolve, reject) {
    var issuePath = issueInfo[0];
    var issue = issueInfo[1];
    var output;
    var archive;
    if (zip || comp) {
      output = fs.createWriteStream(issuePath + '.zip');
      output.on('close', function() {
        resolve(issue);
      });
      archive = archiver('zip');
      archive.pipe(output);
      archive.bulk([{
        expand: true,
        cwd: issuePath,
        src: ['*.*'],
        dest: dir
      }]);
      archive.finalize();
    } else {
      resolve(issue);
    }
  });
}

function logDone(issues) {
  issues.map(function(issue) {
    if (issue) {
      console.log(issue);
    }
  });
  console.log('Done');
}

function logError(error) {
  console.error(error);
}

getIssues()
  .then(iterateThroughIssues)
  .catch(logError)
  .done(logDone);
