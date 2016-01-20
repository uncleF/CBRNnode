#! /usr/bin/env node

var fs = require('fs');
var _ = require('lodash');
var fileType = require('file-type');
var sizeOf = require('image-size');
var archiver = require('archiver');
var args = require('minimist')(process.argv.slice(2));
var chalk = require('chalk');

var dir = args.d ? args.d + '/' : './';
var zip = args.zip;
var arch = args.arch;
var clean = args.clean;

var DOUBLE_PAGE_V_MAX_RATIO = 1.35;
var FILE_TYPES = ['jpg', 'png', 'gif', 'bmp', 'webp', 'tif'];

function getIssues() {
  fs.readdir(dir, iterateThroughIssues);
}

function iterateThroughIssues(error, issues) {
  _.forEach(issues, function(issue) {
    var issueDir = dir + issue;
    fs.stat(issueDir, function(error, status) {
      if (status.isDirectory()) {
        console.log(arch);
        if (arch) {
          archiveIssue(issueDir, issue);
        } else {
          renameIssue(issueDir, issue);
          if (zip) {
            archiveIssue(issueDir, issue);
          }
        }
      }
    });
  });
}

function renameIssue(issueDir, issue) {
  fs.readdir(issueDir, function(error, pages) {
    var number = 0;
    var length = getIssueLength(pages, issueDir);
    _.forEach(pages, function(page) {
      var file = issueDir + '/' + page;
      var type = fileType(fs.readFileSync(file));
      if (type && FILE_TYPES.indexOf(type.ext) > -1) {
        number = renamePage(file, number, issueDir, issue, length);
      } else {
        if (clean) {
          fs.unlinkSync(file);
          console.log('Removed file ' + page + ' from the ' + issueDir.replace(dir, ''));
        } else {
          console.log('Directory ' + issueDir.replace(dir, '') + ' contains files other than images – ' + page);
        }
      }
    });
  });
}

function renamePage(file, number, issueDir, issue, length) {
  var type = fileType(fs.readFileSync(file));
  var size;
  var ratio;
  var pageNumber;
  var newName;
  var ext;
  if (FILE_TYPES.indexOf(type) > -1) {
    size = sizeOf(file);
    ratio = size.width / size.height;
    ext = file.split('.');
    ext = ext[ext.length - 1];
    if (number > 1 && size.width > size.height) {
      pageNumber = renameHorizontalPage(number, length);
      number += 1;
    } else {
      pageNumber = renameVerticalPage(number, length);
    }
    newName = issue + ' - ' + pageNumber + '.' + ext;
    if (size.width > size.height && ratio > DOUBLE_PAGE_V_MAX_RATIO) {
      console.log(chalk.yellow(newName));
    }
    fs.rename(file, (issueDir + '/' + newName));
    number += 1;
    return number;
  } else {
    return false;
  }
}

function renameHorizontalPage(number, length) {
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

function renameVerticalPage(number, length) {
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

function archiveIssue(issue) {
  var output = fs.createWriteStream(issue + '.zip');
  var archive = archiver('zip');
  archive.pipe(output);
  archive.bulk([{
    expand: true,
    cwd: issue,
    src: ['*.*'],
    dest: dir
  }]);
  archive.finalize();
}

function getIssueLength(pages, issueDir) {
  var length = 0;
  _.forEach(pages, function(page) {
    var file = issueDir + '/' + page;
    var type = fileType(fs.readFileSync(file));
    var size;
    if (type && FILE_TYPES.indexOf(type.ext) > -1) {
      size = sizeOf(file);
      length += size.width > size.height ? 2 : 1;
    }
  });
  return length;
}

getIssues();
