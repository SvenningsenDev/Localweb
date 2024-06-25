const chalk = (await import('chalk')).default;
const date = require('date-and-time');
require('dotenv').config();

const logger = {
  debug: process.env.LOG_LEVEL > 3 ? message => console.debug(chalk.blue(`[DEBUG][${date.format(new Date(), 'HH:mm:ss')}]${message}`)) : () => {},
  info: process.env.LOG_LEVEL > 2 ? message => console.info(chalk.green(`[INFO][${date.format(new Date(), 'HH:mm:ss')}]${message}`)) : () => {},
  warn: process.env.LOG_LEVEL > 1 ? message => console.warn(chalk.bold.yellow(`[WARN][${date.format(new Date(), 'HH:mm:ss')}]${message}`)) : () => {},
  error: process.env.LOG_LEVEL > 0 ? message => console.log(chalk.bold.red(`[ERROR][${date.format(new Date(), 'HH:mm:ss')}]${message}`)) : () => {},
};

export default logger;