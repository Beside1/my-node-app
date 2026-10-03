const http = require('http');
const querystring = require('querystring');

const GROUP = 'ББМО-01-23';
const PORT = 3000;
const MAX_BODY_SIZE = 1024 * 1024; // 1 MB

function readBody(req) {
  return new Promise((resolve, reject) => {
    let chunks = [];
    let size = 0;

    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_SIZE) {
        const err = new Error('Payload Too Large');
        err.code = 'PAYLOAD_TOO_LARGE';
        req.destroy();
        reject(err);
        return;
      }
      chunks.push(chunk);
    });

    req.on('end', () => {
      const raw = Buffer.concat(chunks);
      resolve({ raw, size });
    });

    req.on('error', (err) => reject(err));
  });
}

const server = http.createServer(async (req, res) => {
  const { method, url, headers } = req;

  if (method === 'POST' && url === '/echo') {
    try {
      const { raw, size } = await readBody(req);
      const contentType = (headers['content-type'] || '').split(';')[0].trim();

      console.log(`[LOG] POST /echo, Content-Type: ${contentType}, размер тела: ${size} байт`);

      if (contentType === 'application/json') {
        try {
          const parsed = JSON.parse(raw.toString('utf8'));
          const response = { ...parsed, group: GROUP };
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify(response, null, 2));
        } catch (err) {
          res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ error: 'Invalid JSON', message: err.message }));
        }
        return;
      }

      if (contentType === 'application/x-www-form-urlencoded') {
        const parsed = querystring.parse(raw.toString('utf8'));
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(parsed, null, 2));
        return;
      }

      if (contentType === 'text/plain' || contentType === '') {
        res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end(raw.toString('utf8'));
        return;
      }

      if (contentType === 'application/octet-stream') {
        res.writeHead(200, {
          'Content-Type': 'application/json; charset=utf-8',
        });
        res.end(
          JSON.stringify(
            {
              receivedBytes: size,
              preview: raw.slice(0, 16).toString('hex'),
            },
            null,
            2
          )
        );
        return;
      }

      res.writeHead(415, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Unsupported Media Type');
    } catch (err) {
      if (err.code === 'PAYLOAD_TOO_LARGE') {
        res.writeHead(413, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('413 Payload Too Large');
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Internal Server Error');
      }
    }
    return;
  }

  if (method === 'POST' && url === '/form') {
    try {
      const { raw, size } = await readBody(req);
      console.log(`[LOG] POST /form, размер тела: ${size} байт`);

      const contentType = (headers['content-type'] || '').split(';')[0].trim();

      let parsed;

      if (contentType === 'application/json') {
        parsed = JSON.parse(raw.toString('utf8'));
      } else {
        parsed = querystring.parse(raw.toString('utf8'));
      }

      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(parsed, null, 2));
    } catch (err) {
      if (err.code === 'PAYLOAD_TOO_LARGE') {
        res.writeHead(413, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('413 Payload Too Large');
      } else {
        res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Bad Request');
      }
    }
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('404 Not Found');
});

server.listen(PORT, () => {
  console.log(`[INFO] Сервер тела запроса запущен на http://localhost:${PORT}`);
});

process.on('SIGINT', () => {
  console.log('\n[INFO] Остановка сервера');
  server.close(() => process.exit(0));
});