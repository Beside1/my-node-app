const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const url = require('url');
const crypto = require('crypto');

const GROUP = 'ББМО-01-23';        
const GROUP_HEADER = 'BBMO-01-23';   
const HTTP_PORT = 3000;
const HTTPS_PORT = 3443;
const PUBLIC_DIR = path.join(__dirname, 'public');
const STATIC_PREFIX = '/static/';
const CACHE_TTL_MS = 60 * 1000;

const metrics = {
  group: GROUP,
  total: 0,
  byMethod: {},
  byStatus: {},
  startedAt: Date.now(),
};

function recordMetric(method, status) {
  metrics.total += 1;
  metrics.byMethod[method] = (metrics.byMethod[method] || 0) + 1;
  metrics.byStatus[status] = (metrics.byStatus[status] || 0) + 1;
}

const ACCESS_LOG = path.join(__dirname, 'access.log');

function timestamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function logAccess(method, urlPath, status) {
  const line = `[${timestamp()}] [${GROUP}] ${method} ${urlPath} ${status}\n`;
  fs.appendFileSync(ACCESS_LOG, line, 'utf8');
  process.stdout.write(line);
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.zip': 'application/zip',
};

function mimeType(filePath) {
  return MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
}

const cache = new Map();

function cacheGet(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expires) {
    cache.delete(key);
    return null;
  }
  return entry;
}

function cacheSet(key, body, type) {
  cache.set(key, { body, type, expires: Date.now() + CACHE_TTL_MS });
}

const middlewares = [];

function use(fn) {
  middlewares.push(fn);
}

use((req, res, next) => {
  res.setHeader('X-Group', GROUP_HEADER);
  next();
});

use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    console.log(`[MW] ${req.method} ${req.url} -> ${res.statusCode} (${ms}ms)`);
  });
  next();
});

function runMiddlewares(req, res, handler) {
  let i = 0;

  function next(err) {
    if (err) {
      res.writeHead(err.status || 500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(`Middleware error: ${err.message}`);
      return;
    }

    if (i >= middlewares.length) {
      return handler(req, res);
    }

    const mw = middlewares[i++];
    try {
      mw(req, res, next);
    } catch (e) {
      next(e);
    }
  }

  next();
}

async function handle(req, res) {
  const parsed = url.parse(req.url, true);
  const pathname = decodeURIComponent(parsed.pathname);

  if (req.method === 'GET' && pathname === '/stream') {
    res.writeHead(200, {
      'Content-Type': 'application/octet-stream',
      'X-Group': GROUP_HEADER,
    });

    const totalBytes = 32 * 1024 * 1024;
    let written = 0;
    const chunk = Buffer.alloc(64 * 1024, 0x61);

    function writeChunk() {
      if (written >= totalBytes) {
        res.end();
        recordMetric(req.method, 200);
        logAccess(req.method, pathname, 200);
        return;
      }
      const canContinue = res.write(chunk);
      written += chunk.length;
      if (canContinue) {
        setImmediate(writeChunk);
      } else {
        res.once('drain', writeChunk);
      }
    }

    writeChunk();
    return;
  }

  if (req.method === 'GET' && pathname === '/metrics') {
    const data = {
      group: GROUP,
      total: metrics.total,
      byMethod: metrics.byMethod,
      byStatus: metrics.byStatus,
      uptime: Math.floor((Date.now() - metrics.startedAt) / 1000),
    };

    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'X-Group': GROUP_HEADER,
    });
    res.end(JSON.stringify(data, null, 2));
    recordMetric(req.method, 200);
    logAccess(req.method, pathname, 200);
    return;
  }

  if (req.method === 'GET' && pathname.startsWith(STATIC_PREFIX)) {
    const rel = pathname.slice(STATIC_PREFIX.length);

    const safePath = path.normalize(rel).replace(/^(\.\.[/\\])+/, '');
    const filePath = path.join(PUBLIC_DIR, safePath);

    if (!filePath.startsWith(PUBLIC_DIR)) {
      res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('403 Forbidden');
      recordMetric(req.method, 403);
      logAccess(req.method, pathname, 403);
      return;
    }

    fs.stat(filePath, (err, stat) => {
      if (err || !stat.isFile()) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('404 Not Found');
        recordMetric(req.method, 404);
        logAccess(req.method, pathname, 404);
        return;
      }

      const etag = `"${crypto
        .createHash('md5')
        .update(`${stat.size}-${stat.mtimeMs}`)
        .digest('hex')}"`;

      if (req.headers['if-none-match'] === etag) {
        res.writeHead(304, {
          'X-Group': GROUP_HEADER,
          ETag: etag,
          'Cache-Control': 'max-age=60',
        });
        res.end();
        recordMetric(req.method, 304);
        logAccess(req.method, pathname, 304);
        return;
      }

      const cacheKey = filePath;
      const cached = cacheGet(cacheKey);

      if (cached) {
        res.writeHead(200, {
          'Content-Type': cached.type,
          'X-Group': GROUP_HEADER,
          ETag: etag,
          'Cache-Control': 'max-age=60',
          'X-Cache': 'HIT',
        });
        res.end(cached.body);
        recordMetric(req.method, 200);
        logAccess(req.method, pathname, 200);
        return;
      }

      fs.readFile(filePath, (err2, body) => {
        if (err2) {
          res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end('500 Internal Server Error');
          recordMetric(req.method, 500);
          logAccess(req.method, pathname, 500);
          return;
        }

        const type = mimeType(filePath);
        cacheSet(cacheKey, body, type);

        res.writeHead(200, {
          'Content-Type': type,
          'X-Group': GROUP_HEADER,
          ETag: etag,
          'Cache-Control': 'max-age=60',
          'X-Cache': 'MISS',
        });
        res.end(body);
        recordMetric(req.method, 200);
        logAccess(req.method, pathname, 200);
      });
    });
    return;
  }

  if (req.method === 'GET' && (pathname === '/' || pathname === '/index.html')) {
    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'X-Group': GROUP_HEADER,
    });
    res.end('<h1>Главная</h1><p>Группа ' + GROUP + '</p>');
    recordMetric(req.method, 200);
    logAccess(req.method, pathname, 200);
    return;
  }

  res.writeHead(404, {
    'Content-Type': 'text/plain; charset=utf-8',
    'X-Group': GROUP_HEADER,
  });
  res.end('404 Not Found');
  recordMetric(req.method, 404);
  logAccess(req.method, pathname, 404);
}

const httpServer = http.createServer((req, res) => {
  runMiddlewares(req, res, handle);
});

httpServer.on('clientError', (err, socket) => {
  console.error('[clientError]', err.message);
  if (socket.writable) {
    socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
  }
});

httpServer.listen(HTTP_PORT, () => {
  console.log(`[INFO] HTTP-сервер запущен на порту ${HTTP_PORT}`);
});

function loadOrCreateCert() {
  const certDir = path.join(__dirname, 'cert');
  const keyPath = path.join(certDir, 'key.pem');
  const certPath = path.join(certDir, 'cert.pem');

  if (!fs.existsSync(certDir)) fs.mkdirSync(certDir, { recursive: true });

  if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
    console.log('[INFO] Использую существующие cert/key.pem и cert/cert.pem');
    return {
      key: fs.readFileSync(keyPath),
      cert: fs.readFileSync(certPath),
    };
  }

  try {
    const selfsigned = require('selfsigned');
    const attrs = [{ name: 'commonName', value: 'localhost' }];

    const genResult = selfsigned.generate(attrs, {
      days: 365,
      keySize: 2048,
      algorithm: 'sha256',
    });

    const finish = (pems) => {
      if (!pems) return null;
      const privateKey = pems.private || pems.privateKey || pems.key;
      const cert = pems.cert || pems.certificate;
      if (!privateKey || !cert) return null;

      fs.writeFileSync(keyPath, privateKey);
      fs.writeFileSync(certPath, cert);
      console.log('[INFO] Сертификаты созданы через selfsigned');
      return { key: privateKey, cert };
    };

    if (genResult && typeof genResult.then === 'function') {
      console.log('[INFO] selfsigned вернул Promise — генерирую синхронно нельзя, ставлю заглушку.');

      console.error('[WARN] Запусти node gen-cert.js и снова запусти http-advanced.js');
      return null;
    }

    const result = finish(genResult);
    if (result) return result;
  } catch (e) {
   
  }

  console.log('[INFO] Пробую openssl...');
  const { execSync } = require('child_process');

  try {
    execSync(
      `openssl req -x509 -newkey rsa:2048 -nodes -keyout "${keyPath}" -out "${certPath}" -days 365 -subj "/CN=localhost"`,
      { stdio: 'inherit' }
    );
    return {
      key: fs.readFileSync(keyPath),
      cert: fs.readFileSync(certPath),
    };
  } catch (err) {
    console.error('[ERROR] Не удалось сгенерировать сертификат.');
    console.error('Запусти: node gen-cert.js  и перезапусти этот файл.');
    return null;
  }
}

const credentials = loadOrCreateCert();

if (credentials) {
  const httpsServer = https.createServer(credentials, (req, res) => {
    if (req.url === '/') {
      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'X-Group': GROUP_HEADER,
      });
      res.end(`<h1>=== HTTPS работает! ===</h1><p>Группа: ${GROUP}</p>`);
      logAccess(req.method, req.url, 200);
      return;
    }
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('404 Not Found');
  });

  httpsServer.listen(HTTPS_PORT, () => {
    console.log(`[INFO] HTTPS-сервер запущен на порту ${HTTPS_PORT}`);
  });
}

console.log(`[INFO] Группа: ${GROUP}`);
console.log(`[INFO] Static-директория: ${PUBLIC_DIR}`);
console.log(`[INFO] Access log: ${ACCESS_LOG}`);

process.on('SIGINT', () => {
  console.log('\n[INFO] Корректное завершение сервера...');
  httpServer.close(() => {
    console.log('[INFO] HTTP-сервер остановлен');
    process.exit(0);
  });

  setTimeout(() => process.exit(0), 1000);
});