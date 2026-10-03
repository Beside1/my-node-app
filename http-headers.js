const http = require('http');

const GROUP = 'ББМО-01-23';        
const GROUP_HEADER = 'BBMO-01-23'; 
const PORT = 3000;

const server = http.createServer((req, res) => {
  const { method, url, headers, httpVersion } = req;

  if (method === 'GET' && url === '/headers') {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('X-Powered-By', 'Node.js');
    res.setHeader('X-Group', GROUP_HEADER);
    res.setHeader('Cache-Control', 'no-cache');

    const body = JSON.stringify(
      { headers, method, url, httpVersion },
      null,
      2
    );

    res.writeHead(200);
    res.end(body);
    return;
  }

  if (method === 'GET' && url === '/headers/set') {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('X-Powered-By', 'Node.js');
    res.setHeader('X-Group', GROUP_HEADER);
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('X-Custom-Header', 'LR20'); // без кириллицы

    res.writeHead(200);
    res.end(`<h1>Заголовки установлены</h1><p>Группа ${GROUP}</p>`);
    return;
  }

  if (method === 'GET' && url === '/headers/check') {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('X-Group', GROUP_HEADER);
    res.setHeader('X-Temp', 'temporary');

    const hasContentType = res.hasHeader('Content-Type');
    const hasXGroup = res.hasHeader('X-Group');
    const hasUnknown = res.hasHeader('X-Unknown');
    const xGroupValue = res.getHeader('X-Group');

    res.removeHeader('X-Temp');
    const hasXTempAfterRemove = res.hasHeader('X-Temp');

    res.writeHead(200);
    res.end(
      JSON.stringify(
        { hasContentType, hasXGroup, hasUnknown, xGroupValue, hasXTempAfterRemove },
        null,
        2
      )
    );
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('404 Not Found');
});

server.listen(PORT, () => {
  console.log(`[INFO] Сервер заголовков запущен на http://localhost:${PORT}`);
});

process.on('SIGINT', () => {
  console.log('\n[INFO] Остановка сервера');
  server.close(() => process.exit(0));
});