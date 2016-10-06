/* jslint node:true */

'use strict';

function padNumber(number, issueLength) {
  let zeroes = issueLength >= 100 ? '00' : '0';
  let index = issueLength >= 100 ? 3 : 2;
  return `${zeroes}${number}`.split('').reverse().splice(0, index).reverse().join('');
}

function generateSingleNumber(number, issueLength) {
  return padNumber(number, issueLength);
}

function generateSpreadNumber(number, pageLength, issueLength) {
  let firstNumber = padNumber(number, issueLength);
  let lastNumber = padNumber((number + pageLength - 1), issueLength);
  return `${firstNumber} - ${lastNumber}`;
}

module.exports = (number, pageLength, issueLength) => {
  return pageLength > 1 ? generateSpreadNumber(number, pageLength, issueLength) : generateSingleNumber(number, issueLength);
};
