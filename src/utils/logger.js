const chalk = require('chalk');

module.exports = {
  info: (msg) => console.log(chalk.blue(`[INFO] `) + msg),
  success: (msg) => console.log(chalk.green(`[SUCCESS] `) + msg),
  warn: (msg) => console.log(chalk.yellow(`[WARN] `) + msg),
  error: (msg, err) => {
    console.log(chalk.red(`[ERROR] `) + msg);
    if (err) console.error(err);
  },
  cmd: (msg) => console.log(chalk.magenta(`[CMD] `) + msg),
  event: (msg) => console.log(chalk.cyan(`[EVENT] `) + msg)
};
