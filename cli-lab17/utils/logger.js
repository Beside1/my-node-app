const chalk = require('chalk');
const useColor = process.stdout.isTTY;

const c = {
  success: (s) => useColor ? chalk.green(s) : s,
  warn:    (s) => useColor ? chalk.yellow(s) : s,
  error:   (s) => useColor ? chalk.red(s) : s,
  info:    (s) => useColor ? chalk.blue(s) : s,
};

function success(msg) { process.stderr.write(c.success('✔ ' + msg) + '\n'); }
function warn(msg)    { process.stderr.write(c.warn('⚠ ' + msg) + '\n'); }
function error(msg)   { process.stderr.write(c.error('✖ ' + msg) + '\n'); }
function info(msg)    { process.stderr.write(c.info('ℹ ' + msg) + '\n'); }
function data(obj)    { process.stdout.write(JSON.stringify(obj, null, 2) + '\n'); }

module.exports = { success, warn, error, info, data };
