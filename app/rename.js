/* jslint node:true */

var Promise = require('bluebird');
var fs = require('fs');
var archiver = require('archiver');
var fileType = require('file-type');
var sizeOf = require('image-size');
var chalk = require('chalk');
var config = require('./configs.json');

function run(options) {

  var pageParameters;
  var dir;
  var zip;
  var comp;
  var clean;
  var bd;

  function generatePath(directory, destination) {
    return `${directory}/${destination}`;
  }

  function getPageLength(spreadHorizontal, spreadVertical) {
    return (spreadHorizontal || spreadVertical) ? 2 : 1;
  }

  function calculatePageRatio(width, height) {
    return (height / width).toFixed(4) / 1;
  }

  function checkHorizontalSpread(width, height, ratio, max, delta) {
    return width > height && ratio < (max + delta) && ratio > (max - delta);
  }

  function checkVerticalSpread(width, height, ratio, max, delta) {
    var reverse = (1 / max).toFixed(4) / 1;
    var reverseDelta = (delta / reverse).toFixed(4) / 1;
    return width < height && ratio < (reverse + reverseDelta) && ratio > (reverse - reverseDelta);
  }

  function checkHorizontalIrregular(width, height, ratio, max, delta) {
    var reverse = (1 / max).toFixed(4) / 1;
    var reverseDelta = (delta / reverse).toFixed(4) / 1;
    return width > height && (ratio < (reverse - reverseDelta) || ratio > (reverse + reverseDelta));
  }

  function checkVerticalIrregular(width, height, ratio, max, delta) {
    return width < height && (ratio < (max - delta) || ratio > (max + delta));
  }

  function warnIrregular(singleIrregularHorizontal, singleIrregularVertical, newName) {
    if (singleIrregularHorizontal || singleIrregularVertical) {
      console.warn(chalk.yellow(newName));
    }
  }

  function warnTag(singleIrregularHorizontal, singleIrregularVertical, issue, fileCount, index) {
    if (fileCount === index && (singleIrregularHorizontal || singleIrregularVertical)) {
      console.warn(chalk.yellow(`${issue} might contain a tag`));
    }
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

  function generateFileNumber(number, length) {
    return generatePageNumber(number, length);
  }

  function generateFileSpreadNumber(number, length) {
    var pageFirst = generatePageNumber(number, length);
    var pageSecond = generatePageNumber((number + 1), length);
    return `${pageFirst} - ${pageSecond}`;
  }

  function getExtension(file) {
    var name = file.split('.');
    return name[name.length - 1];
  }

  function newNumber(number, spreadHorizontal, spreadVertical) {
    return number > 0 && (spreadHorizontal || spreadVertical) ? (number + 2) : (number + 1);
  }

  function generateNewName(issue, number, ext, length, spreadHorizontal, spreadVertical) {
    var pageNumber;
    if (number > 0 && (spreadHorizontal || spreadVertical)) {
      pageNumber = generateFileSpreadNumber(number, length);
    } else {
      pageNumber = generateFileNumber(number, length);
    }
    return `${issue} - ${pageNumber}.${ext}`;
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

  function getConfig() {
    if (bd) {
      pageParameters = config.bd;
    } else {
      pageParameters = config.comic;
    }
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

  function getIssueLength(pages, issuePath) {
    var length = 0;
    pages.map(function(page, index) {
      if (index === 0) {
        var file = generatePath(issuePath, page);
        var type = fileType(fs.readFileSync(file));
        var size;
        var ratio;
        var spreadHorizontal;
        var spreadVertical;
        if (type && config.fileTypes.indexOf(type.ext) > -1) {
          size = sizeOf(file);
          ratio = calculatePageRatio(size.width, size.height);
          spreadHorizontal = checkHorizontalSpread(size.width, size.height, ratio, pageParameters.spreadMaxRatio, config.maxRatioDelta);
          spreadVertical = checkVerticalSpread(size.width, size.height, ratio, pageParameters.spreadMaxRatio, config.maxRatioDelta);
          length += getPageLength(spreadHorizontal, spreadVertical);
        }
      } else {
        length += 1;
      }
    });
    return length;
  }

  function renameFile(file, number, issuePath, issue, length, fileCount, index) {
    var size = sizeOf(file);
    var ratio = calculatePageRatio(size.width, size.height);
    var spreadHorizontal = checkHorizontalSpread(size.width, size.height, ratio, pageParameters.spreadMaxRatio, config.maxRatioDelta);
    var spreadVertical = checkVerticalSpread(size.width, size.height, ratio, pageParameters.spreadMaxRatio, config.maxRatioDelta);
    var singleIrregularHorizontal = !spreadHorizontal && checkHorizontalIrregular(size.width, size.height, ratio, pageParameters.singleMaxRatio, config.maxRatioDelta);
    var singleIrregularVertical = !spreadVertical && checkVerticalIrregular(size.width, size.height, ratio, pageParameters.singleMaxRatio, config.maxRatioDelta);
    var ext = getExtension(file);
    var newName = generateNewName(issue, number, ext, length, spreadHorizontal, spreadVertical);
    warnIrregular(singleIrregularHorizontal, singleIrregularVertical, newName);
    warnTag(singleIrregularHorizontal, singleIrregularVertical, issue, fileCount, index);
    fs.rename(file, generatePath(issuePath, newName));
    return newNumber(number, spreadHorizontal, spreadVertical);
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
      if (type && config.fileTypes.indexOf(type.ext) > -1) {
        number = renameFile(file, number, issuePath, issue, length, fileCount, index);
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

  function archiveFiles(issuePath, issue, resolve) {
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
        archiveFiles(issuePath, issue, resolve);
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
    console.log(chalk.green('Done\n'));
  }

  function logError(error) {
    console.error(chalk.red(`✗ ${error}`));
  }

  function init(options) {
    return new Promise(function(resolve, reject) {
      dir = options.dir;
      zip = options.zip;
      comp = options.comp;
      clean = options.clean;
      bd = options.bd;
      resolve();
    });
  }

  init(options)
    .then(getConfig)
    .then(checkDirectory)
    .then(getIssues)
    .then(iterateThroughIssues)
    .catch(logError)
    .done(logDone);

}

exports.run = run;
