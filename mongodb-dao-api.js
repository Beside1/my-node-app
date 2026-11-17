require('dotenv').config();
const Koa = require('koa');
const Router = require('@koa/router');
const bodyParser = require('koa-bodyparser');
const { MongoClient } = require('mongodb');
const WebSocket = require('ws');

const GROUP = 'ББМО-01-23';
const URI = process.env.MONGO_URI || 'mongodb://student:student_pass_2024@localhost:27017/bbmo_01_23?replicaSet=rs0';
const DB_NAME = 'bbmo_01_23';

const app = new Koa();
const router = new Router({ prefix: '/api' });

let students;
const cache = new Map();
const metrics = { queries: 0, errors: 0, totalMs: 0 };

function cacheGet(key) {
  const e = cache.get(key);
  if (!e) return null;
  if (Date.now() > e.expires) { cache.delete(key); return null; }
  return e.value;
}
function cacheSet(key, value) { cache.set(key, { value, expires: Date.now() + 60000 }); }
function cacheInvalidate() { cache.clear(); }

router.get('/students', async (ctx) => {
  const limit = Number(ctx.query.limit) || 10;
  const offset = Number(ctx.query.offset) || 0;
  const key = `list:${limit}:${offset}`;
  const cached = cacheGet(key);
  if (cached) { ctx.body = { ...cached, cached: true }; return; }
  
  const start = Date.now();
  const data = await students.find({}).skip(offset).limit(limit).toArray();
  const total = await students.countDocuments({});
  const result = { data, pagination: { total, limit, offset } };
  
  cacheSet(key, result);
  metrics.queries++; metrics.totalMs += Date.now() - start;
  ctx.body = result;
});

router.post('/students', async (ctx) => {
  const doc = { ...ctx.request.body, group_name: GROUP, created_at: new Date() };
  const r = await students.insertOne(doc);
  cacheInvalidate();
  ctx.status = 201;
  ctx.body = { insertedId: r.insertedId };
});

router.get('/students/stats', async (ctx) => {
  const key = 'stats';
  const cached = cacheGet(key);
  if (cached) { ctx.body = { ...cached, cached: true }; return; }
  const total = await students.countDocuments({});
  const agg = await students.aggregate([{ $group: { _id: '$group_name', count: { $sum: 1 }, avgGrade: { $avg: '$grade' } } }]).toArray();
  const result = { total, byGroup: agg };
  cacheSet(key, result);
  ctx.body = result;
});

router.get('/students/search', async (ctx) => {
  const q = ctx.query.q || '';
  const data = await students.find({ $text: { $search: q } }).toArray();
  ctx.body = { found: data.length, data };
});

router.get('/metrics', async (ctx) => {
  ctx.body = { ...metrics, avgTime: metrics.queries ? (metrics.totalMs / metrics.queries).toFixed(2) : 0 };
});

app.use(bodyParser());
app.use(router.routes());
app.use(router.allowedMethods());

(async () => {
  const client = new MongoClient(URI);
  await client.connect();
  const db = client.db(DB_NAME);
  students = db.collection('students');
  
  await students.createIndex({ group_name: 1 });
  await students.createIndex({ name: 'text' });

  const wss = new WebSocket.Server({ port: 3001 });
  console.log(`[INFO] WebSocket на порту 3001`);

  const changeStream = students.watch();
  changeStream.on('change', (change) => {
    wss.clients.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: change.operationType, doc: change.fullDocument || change.documentKey }));
      }
    });
  });

  app.listen(3000, () => {
    console.log(`[INFO] MongoDB подключена: ${DB_NAME}`);
    console.log(`[INFO] Индексы созданы: group_name_1, name_text`);
    console.log(`[INFO] Change Stream запущен`);
    console.log(`[INFO] Koa-сервер на порту 3000`);
  });
})();