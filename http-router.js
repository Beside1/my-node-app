const http = require('http');

const GROUP = 'ББМО-01-23';       
const GROUP_HEADER = 'BBMO-01-23'; 
const PORT = 3000;

let nextId = 3;
const students = [
  { id: 1, name: 'Иван',  group: GROUP },
  { id: 2, name: 'Мария', group: GROUP },
];

function timestamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function logRequest(method, url, status) {
  console.log(`[${timestamp()}] [${GROUP}] ${method} ${url} ${status}`);
}

function sendJson(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'X-Group': GROUP_HEADER,     
  });
  res.end(JSON.stringify(data, null, 2));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw) return resolve({});
      try { resolve(JSON.parse(raw)); }
      catch { resolve({ __raw: raw }); }
    });
    req.on('error', reject);
  });
}

const routes = [];

function route(method, pattern, handler) {
  const keys = [];
  const regexp = new RegExp(
    '^' +
      pattern.replace(/:([A-Za-z0-9_]+)/g, (_, key) => {
        keys.push(key);
        return '([^/]+)';
      }) +
      '/?$'
  );
  routes.push({ method, regexp, keys, handler });
}


route('GET', '/api/students', (req, res, params, query) => {
  let list = students;
  if (query.group) list = list.filter((s) => s.group === query.group);
  sendJson(res, 200, list);
});

route('GET', '/api/students/:id', (req, res, params) => {
  const student = students.find((s) => s.id === Number(params.id));
  if (!student) return sendJson(res, 404, { error: 'Not found' });
  sendJson(res, 200, student);
});

route('POST', '/api/students', async (req, res) => {
  const body = await readBody(req);
  if (!body.name) return sendJson(res, 400, { error: 'name is required' });
  const student = { id: nextId++, name: body.name, group: body.group || GROUP };
  students.push(student);
  sendJson(res, 201, student);
});

route('PUT', '/api/students/:id', async (req, res, params) => {
  const student = students.find((s) => s.id === Number(params.id));
  if (!student) return sendJson(res, 404, { error: 'Not found' });
  const body = await readBody(req);
  if (body.name)  student.name  = body.name;
  if (body.group) student.group = body.group;
  sendJson(res, 200, student);
});

route('DELETE', '/api/students/:id', (req, res, params) => {
  const index = students.findIndex((s) => s.id === Number(params.id));
  if (index === -1) return sendJson(res, 404, { error: 'Not found' });
  students.splice(index, 1);
  sendJson(res, 200, { deleted: true, id: Number(params.id) });
});


const server = http.createServer(async (req, res) => {
  const parsed = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsed.pathname;
  const query = Object.fromEntries(parsed.searchParams.entries());

  let pathMatched = false;

  for (const r of routes) {
    const match = r.regexp.exec(pathname);
    if (!match) continue;
    pathMatched = true;
    if (r.method !== req.method) continue;

    const params = {};
    r.keys.forEach((k, i) => { params[k] = decodeURIComponent(match[i + 1]); });

    try {
      await r.handler(req, res, params, query);
    } catch (err) {
      console.error(err);
      sendJson(res, 500, { error: 'Internal Server Error' });
    }

    logRequest(req.method, req.url, res.statusCode);
    return;
  }

  if (pathMatched) {
    res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('405 Method Not Allowed');
    logRequest(req.method, req.url, 405);
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('404 Not Found');
  logRequest(req.method, req.url, 404);
});

server.listen(PORT, () => {
  console.log(`[INFO] REST-сервер запущен на http://localhost:${PORT}`);
  console.log(`[INFO] Группа: ${GROUP}`);
});

process.on('SIGINT', () => {
  console.log('\n[INFO] Остановка сервера');
  server.close(() => process.exit(0));
});