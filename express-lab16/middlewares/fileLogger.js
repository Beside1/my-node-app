const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, '..', 'operations.log');

module.exports = function fileLogger(req, res, next) {
  const start = Date.now();

  res.on('finish', () => {
    const ms = Date.now() - start;
    const time = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const line = `[${time}] ${req.method} ${req.originalUrl} ${res.statusCode} - ${ms}ms\n`;

    fs.appendFile(LOG_FILE, line, (err) => {
      if (err) console.error('Ошибка записи в лог:', err.message);
    });
  });

  next();
};
