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

module.exports = { printLog, logCommandExecution };
