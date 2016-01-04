#! /usr/bin/env node

var fs = require('fs');
var _ = require('lodash');
var sizeOf = require('image-size');
var archiver = require('archiver');
var args = require('minimist')(process.argv.slice(2));
var chalk = require('chalk');

var dir = args.d ? args.d + '/' : './';
var zip = args.zip;

var DOUBLE_PAGE_V_MAX_RATIO = 1.35;

function getIssues() {
  fs.readdir(dir, iterateThroughIssues);
}

function iterateThroughIssues(error, issues) {
  _.forEach(issues, function(issue) {
    var issueDir = dir + issue;
    fs.stat(issueDir, function(error, status) {
      if (status.isDirectory()) {
        renameIssue(issueDir, issue);
        if (zip) {
          archiveIssue(issueDir, issue);
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
      if (fs.statSync(file).isFile()) {
        number = renamePage(file, number, issueDir, issue, length);
      }
    });
  });
}

function renamePage(file, number, issueDir, issue, length) {
  var size = sizeOf(file);
  var ratio = size.width / size.height;
  var pageNumber;
  var newName;
  if (number > 1 && size.width > size.height) {
    pageNumber = renameHorizontalPage(number, length);
    number += 1;
  } else {
    pageNumber = renameVerticalPage(number, length);
  }
  newName = issue + ' - ' + pageNumber + '.jpg';
  if (size.width > size.height && ratio > DOUBLE_PAGE_V_MAX_RATIO) {
    console.log(chalk.yellow(newName));
  }
  fs.rename(file, (issueDir + '/' + newName));
  number += 1;
  return number;
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
    var size = sizeOf(file);
    length += size.width > size.height ? 2 : 1;
  });
  return length;
}

getIssues();
