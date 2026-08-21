/* jslint node:true */

'use strict';

function padNumber(number, issueLength) {
  const padLength = Math.max(String(issueLength).length, 2);
  return String(number).padStart(padLength, "0");
}

function generateSingleNumber(number, issueLength) {
  return padNumber(number, issueLength);
}

function generateSpreadNumber(number, pageLength, issueLength) {
  const firstNumber = padNumber(number, issueLength);
  const lastNumber = padNumber((number + pageLength - 1), issueLength);
  return `${firstNumber} - ${lastNumber}`;
}

module.exports = (number, pageLength, issueLength) => {
  return pageLength > 1
    ? generateSpreadNumber(number, pageLength, issueLength)
    : generateSingleNumber(number, issueLength);
};
