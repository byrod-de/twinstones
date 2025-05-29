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

function logCommandExecution(interaction) {
    const shortUser = `${interaction.user.username}${interaction.user.discriminator ? `#${interaction.user.discriminator}` : ''}`;
    const guildenId = interaction.guild ? interaction.guild.id : 'DM';
    printLog(`Command /${interaction.commandName} executed by ${shortUser}: ${guildenId}`);
}

module.exports = { printLog, logCommandExecution };