const moment = require('moment');
const fs = require('fs');

/**
 * Prints the log text along with the current date and time, and logs it to the console.
 *
 * @param {string} logtext - The text to be logged
 * @return {string} The logged message
 */
function printLog(logtext) {
    let currentDate = moment().format().replace('T', ' ');
    let message = currentDate + ' > ' + logtext
    console.log(message);
    return message;
}

module.exports = { printLog };