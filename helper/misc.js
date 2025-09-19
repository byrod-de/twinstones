const moment = require('moment');
const winston = require('winston');
require('winston-daily-rotate-file');

// Winston transport with rotation
const transport = new winston.transports.DailyRotateFile({
  filename: 'logs/bot-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  maxSize: '10m',
  maxFiles: '14d',
});

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.printf(info => {
    const timestamp = moment().format('YYYY-MM-DD HH:mm:ss');
    const level = info.level.toUpperCase();
    return `${timestamp} [${level}] > ${info.message}`;
  }),
  transports: [
    transport,
    new winston.transports.Console(),
  ],
});

/**
 * Logs a message with optional level.
 * @param {string} logtext - The message to log
 * @param {'info'|'warn'|'error'|'debug'} [level='info'] - Log level
 * @returns {string}
 */
function printLog(logtext, level = 'info') {
  logger.log({ level, message: logtext });
  return logtext;
}

/**
 * Logs command execution details.
 * @param {Object} interaction - The interaction object
 */
function logCommandExecution(interaction) {
  const shortUser = `${interaction.user.username}${interaction.user.discriminator ? `#${interaction.user.discriminator}` : ''}`;
  const guildenId = interaction.guild ? interaction.guild.id : 'DM';
  printLog(`Command /${interaction.commandName} executed by ${shortUser}: ${guildenId}`);
}

const EPHEMERAL = 1 << 6;

/**
 * Returns the correct flag for an ephemeral reply.
 * @param {boolean} [hidden=true] - true = ephemeral, false = public
 * @returns {number|undefined} - 64 if hidden, otherwise undefined
 */
function hideEmbed(hidden = true) {
  return hidden ? EPHEMERAL : undefined;
}

/**
 * Retrieves a colour from the colours.json file based on the colourType parameter.
 * If the colourType does not exist in the colours.json file, it will default to the value of 'default' or '#4682B4'.
 * @param {string} colourType - The type of colour to retrieve
 * @returns {string} - The selected colour
 */
function getColours(colourType = 'default') {
  const colours = require('../conf/colours.json');
  const selectedColour = colours[colourType.toLowerCase()] || colours.default || '#4682B4';
  return selectedColour;
}

/**
 * Simulates the roll of a die with the given number of sides.
 * @param {number} sides - The number of sides on the die.
 * @returns {number} - A random number between 1 and the number of sides (inclusive).
 */
function rollDie(sides) {
    return Math.floor(Math.random() * sides) + 1;
}

/**
 * Roll multiple dice of the same size.
 * @param {number} count - Number of dice to roll
 * @param {number} sides - Number of sides per die
 * @returns {number[]} - Array of individual rolls
 */
function rollDice(count, sides) {
  return Array.from({ length: count }, () => rollDie(sides));
}

module.exports = { printLog, logCommandExecution, hideEmbed, getColours, rollDie, rollDice };
