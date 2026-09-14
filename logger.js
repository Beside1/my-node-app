const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, 'logs.txt');

function writeLog(eventName, data) {
  const time = new Date().toISOString();
  let payload = '';

  if (data !== undefined) {
    payload = typeof data === 'string' ? data : JSON.stringify(data);
  }

  const line = `[${time}] ${eventName}: ${payload}\n`;

  fs.appendFile(LOG_FILE, line, (err) => {
    if (err) {
      console.error('Ошибка записи в лог:', err);
    }
  });
}

function setupLogger(app) {
  app.on('server:started', (port) => {
    writeLog('server:started', { port });
  });

  app.on('request:received', (reqInfo) => {
    writeLog('request:received', reqInfo);
  });

  app.on('server:stopped', () => {
    writeLog('server:stopped', {});
  });
}

module.exports = { setupLogger };