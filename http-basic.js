const http = require('http');

const GROUP = 'ББМО-01-23';
const PORT = 3000;

function timestamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function log(method, url, status) {
  console.log(`[${timestamp()}] ${method} ${url} ${status}`);
}

const server = http.createServer((req, res) => {
  const url = req.url;

  if (req.method === 'GET' && url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`<h1>Главная страница</h1><p>Группа ${GROUP}</p>`);
    log('GET', url, 200);
    return;
  }

  if (req.method === 'GET' && url === '/about') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`<h1>О сервере</h1><p>Учебный HTTP-сервер, группа ${GROUP}</p>`);
    log('GET', url, 200);
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end('<h1>404 Not Found</h1>');
  log(req.method, url, 404);
});

server.listen(PORT, () => {
  console.log(`[INFO] Сервер запущен на http://localhost:${PORT}`);
  console.log(`[INFO] Группа: ${GROUP}`);
});