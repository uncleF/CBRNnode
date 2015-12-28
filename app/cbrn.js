#! /usr/bin/env node

/* jshint browser:true */

var fs = require('fs');
var sizeOf = require('image-size');
var archiver = require('archiver');
var args = require('minimist')(process.argv.slice(2));
var chalk = require('chalk');

var dir = args.d ? args.d + '/' : './';
var zip = args.zip ? true : false;

var issues;

var DOUBLE_PAGE_V_MAX_RATIO = 1.35;

function getIssues() {
  issues = fs.readdirSync(dir);
}

function iterateOverIssues() {
  for (var index = 0, length = issues.length; index < length; index += 1) {
    var issue = dir + issues[index];
    if (!fs.statSync(issue).isFile()) {
      renameIssue(issue, issues[index]);
      if (zip) {
        archiveIssue(issue, issues[index]);
      }
    }
  }
}

function renameIssue(issue, name) {
  var pages = fs.readdirSync(issue);
  var file;
  var size;
  var ratio;
  var page = 0;
  var nextPage;
  var pageNumber;
  var newName;
  for (var index = 0, length = pages.length; index < length; index += 1) {
    file = issue + '/' + pages[index];
    if (fs.statSync(file).isFile()) {
      size = sizeOf(file);
      ratio = size.width / size.height;
      if (page > 1 && size.width > size.height) {
        nextPage = page + 1;
        if (page < 10) {
          if (length >= 100) {
            pageNumber = '00' + page + ' - 00' + nextPage;
          } else {
            pageNumber = '0' + page + ' - 0' + nextPage;
          }
        } else if (nextPage > 9 && page <= 9) {
          if (length >= 100) {
            pageNumber = '00' + page + ' - 0' + nextPage;
          } else {
            pageNumber = '0' + page + ' - ' + nextPage;
          }
        } else {
          if (length >= 100) {
            if (nextPage < 100) {
              pageNumber = '0' + page + ' - 0' + nextPage;
            } else if (nextPage > 99 && page <= 99) {
              pageNumber = '0' + page + ' - ' + nextPage;
            } else {
              pageNumber = page + ' - ' + nextPage;
            }
          } else {
            pageNumber = page + ' - ' + nextPage;
          }
        }
        page += 1;
      } else {
        if (page <= 9) {
          if (length >= 100) {
            pageNumber = '00' + page;
          } else {
            pageNumber = '0' + page;
          }
        } else {
          if (length >= 100) {
            if (nextPage < 100) {
              pageNumber = '0' + page;
            } else {
              pageNumber = page;
            }
          } else {
            pageNumber = page;
          }
        }
      }
      newName = name + ' - ' + pageNumber + '.jpg';
      if (size.width > size.height && ratio > DOUBLE_PAGE_V_MAX_RATIO) {
        console.log(chalk.yellow(newName));
      }
      fs.renameSync(file, (issue + '/' + newName));
      page += 1;
    }
  }
}

function archiveIssue(issue, name) {
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

function processIssues() {
  getIssues();
  iterateOverIssues();
}

processIssues();
