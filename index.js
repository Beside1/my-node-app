const http = require('http');
const { EventEmitter } = require('events');

function calculatePi(decimals) {
  const scale = 10n ** BigInt(decimals + 10);
  let pi = 0n;
  let sign = 1n;
  const iterations = 1000000;

  for (let i = 0n; i < BigInt(iterations); i++) {
    const term = scale / (2n * i + 1n);
    pi += sign * term;
    sign = -sign;
  }
  pi = pi * 4n;

  let piStr = pi.toString();
  if (piStr.length <= decimals) {
    piStr = '0'.repeat(decimals - piStr.length + 1) + piStr;
  }
  const integerPart = piStr.slice(0, -decimals) || '0';
  const decimalPart = piStr.slice(-decimals);
  return `${integerPart}.${decimalPart}`;
}

let cachedPi = null;
function getPi(digits) {
  if (!cachedPi) {
    cachedPi = calculatePi(digits + 100);
  }
  return cachedPi;
}

function findNumberInPi(target, digits) {
  const piString = getPi(digits);
  const targetStr = target.toString();
  const index = piString.indexOf(targetStr);

  if (index !== -1) {
    const start = Math.max(0, index - 15);
    const end = Math.min(piString.length, index + targetStr.length + 15);
    return {
      found: true,
      position: index,
      context: piString.substring(start, end),
      fullPi: piString.substring(0, 100) + '...'
    };
  }
  return {
    found: false,
    fullPi: piString.substring(0, 100) + '...'
  };
}

class AppServer extends EventEmitter {
  constructor() {
    super();
    this.server = null;
  }

  start(port) {
    if (this.server) return;

    this.server = http.createServer((req, res) => {

      this.emit('request:received', { url: req.url, method: req.method });

      const result = findNumberInPi(19, 2000);

      let html = `
        <h1>Черепович Владислав Дмитриевич</h1>
        <h2>Группа: 401</h2>
        <h3>Поиск числа 19 в числе Пи:</h3>
      `;

      html += `<p><b>Hello from Event-Driven Server!</b></p>`;

      if (result.found) {
        html += `
          <p>Число 19 найдено на позиции ${result.position}</p>
          <p>Контекст: ...${result.context}...</p>
          <p>Начало Пи: ${result.fullPi}</p>
        `;
      } else {
        html += `
          <p>Число 19 не найдено</p>
          <p>Начало Пи: ${result.fullPi}</p>
        `;
      }

      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
    });

    this.server.listen(port, () => {
      this.emit('server:started', port);
    });
  }

  stop() {
    if (!this.server) return;

    this.server.close(() => {
      this.emit('server:stopped');
      this.server = null;
    });
  }
}

const app = new AppServer();

app.on('server:started', (port) => {
  console.log(`Сервер запущен на порту ${port}`);
});

app.on('request:received', (reqInfo) => {
  console.log(`Получен запрос: ${reqInfo.method} ${reqInfo.url}`);
});

app.on('server:stopped', () => {
  console.log('Сервер остановлен');
});

const PORT = 3000;
app.start(PORT);

setTimeout(() => {
  app.stop();
}, 10000);