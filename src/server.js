require('dotenv').config();
const Koa = require('koa');
const bodyParser = require('koa-bodyparser');

const dbMiddleware = require('./middleware/db');
const errorMiddleware = require('./middleware/error');
const loggerMiddleware = require('./middleware/logger');
const routes = require('./routes/student.routes');

const app = new Koa();

app.use(errorMiddleware);
app.use(loggerMiddleware);
app.use(bodyParser({ jsonLimit: '1mb' }));
app.use(dbMiddleware);
app.use(routes.routes());
app.use(routes.allowedMethods());

const PORT = Number(process.env.PORT) || 3000;

app.listen(PORT, () => {
  console.log(`[INFO] Koa-сервер запущен на порту ${PORT}`);
  console.log(`[INFO] Группа: ББМО-01-23`);
});