const Koa = require('koa');
const Router = require('koa-router');
const bodyParser = require('koa-bodyparser');

const logger = require('./middlewares/logger');
const errorHandler = require('./middlewares/errorHandler');
const auth = require('./middlewares/auth');

const app = new Koa();
const router = new Router();


app.use(errorHandler);   
app.use(logger);       
app.use(bodyParser());  

let users = [
  { id: 1, name: 'Иванов Иван', group: 'ББМО-01-23' },
  { id: 2, name: 'Петров Петр', group: 'ББМО-01-23' },
];
let nextId = 3;

router.get('/', (ctx) => {
  const now = new Date().toLocaleString('ru-RU');
  ctx.type = 'text/html; charset=utf-8';
  ctx.body = `
    <!DOCTYPE html>
    <html lang="ru">
    <head>
      <meta charset="UTF-8">
      <title>Лабораторная работа №15</title>
    </head>
    <body>
      <h1>Лабораторная работа №15</h1>
      <p>Группа: ББМО-01-23</p>
      <p>Текущая дата и время: ${now}</p>
      <p>Сервер Koa.js работает </p>
    </body>
    </html>
  `;
});



router.get('/api/users', (ctx) => {
  ctx.body = users;
});

router.put('/api/users/:id', (ctx) => {
  const user = users.find((u) => u.id === Number(ctx.params.id));

  if (!user) {
    ctx.throw(404, 'Пользователь не найден');
  }

  const { name, group } = ctx.request.body || {};

  if (!name || !group) {
    ctx.throw(400, 'Поля name и group обязательны');
  }

  user.name = name;
  user.group = group;

  ctx.body = user;
});

router.post('/api/users', (ctx) => {
  const { name, group } = ctx.request.body || {};

  if (!name || !group) {
    ctx.throw(400, 'Поля name и group обязательны');
  }

  const user = { id: nextId++, name, group };
  users.push(user);

  ctx.status = 201;
  ctx.body = user;
});


router.get('/api/users/:id', (ctx) => {
  const user = users.find((u) => u.id === Number(ctx.params.id));

  if (!user) {
    ctx.throw(404, 'Пользователь не найден');
  }

  ctx.body = user;
});

router.delete('/api/users/:id', (ctx) => {
  const index = users.findIndex((u) => u.id === Number(ctx.params.id));

  if (index === -1) {
    ctx.throw(404, 'Пользователь не найден');
  }

  users.splice(index, 1);

  ctx.body = { message: `Пользователь id=${ctx.params.id} успешно удалён` };
});


router.get('/protected', auth, (ctx) => {
  ctx.body = { message: 'Доступ разрешён 🔓' };
});

router.get('/error', () => {
  throw new Error('Тестовая внутренняя ошибка');
});

app.use(router.routes()).use(router.allowedMethods());

app.on('error', (err) => {
  console.error('Ошибка:', err.message);
});

app.listen(3000, () => {
  console.log('Сервер запущен: http://localhost:3000');
});