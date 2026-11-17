require('dotenv').config();
const Koa = require('koa');
const bodyParser = require('koa-bodyparser');
const { koaSwagger } = require('koa2-swagger-ui');

const { connectDB } = require('./db');
const usersRouter = require('./routes/users');
const authRouter = require('./routes/auth');
const swaggerSpec = require('./swagger');
const { health, metrics, countRequests } = require('./middleware/monitoring');

const app = new Koa();
const PORT = 3000;

app.use(countRequests);

app.use(async (ctx, next) => {
  ctx.set('X-Group', 'BBMO-01-23'); 
  try {
    await next();
    if (ctx.status === 404 && !ctx.body) {
      ctx.status = 404;
      ctx.body = { error: 'Not found', status: 404 };
    }
  } catch (err) {
    ctx.status = err.status || 500;
    ctx.body = { error: err.message, status: ctx.status };
    if (ctx.status === 500) console.error(err);
  }
});

app.use(async (ctx, next) => {
  if (ctx.path === '/health') return health(ctx);
  if (ctx.path === '/metrics') return metrics(ctx);
  await next();
});

app.use(
  koaSwagger({
    routePrefix: '/api-docs',
    swaggerOptions: { spec: swaggerSpec },
  })
);

app.use(bodyParser());

app.use(authRouter.routes());
app.use(authRouter.allowedMethods());

app.use(usersRouter.routes());
app.use(usersRouter.allowedMethods());

(async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`[INFO] Koa-сервер на порту ${PORT}`);
      console.log(`[INFO] Группа: ББМО-01-23`);
      console.log(`[INFO] Swagger: http://localhost:${PORT}/api-docs`);
      console.log(`[INFO] Health:  http://localhost:${PORT}/health`);
      console.log(`[INFO] Metrics: http://localhost:${PORT}/metrics`);
    });
  } catch (err) {
    console.error('Ошибка запуска:', err);
  }
})();