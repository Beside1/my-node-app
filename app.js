const Koa = require('koa');
const Router = require('koa-router');
const bodyParser = require('koa-bodyparser');

const logger = require('./middlewares/logger');
const errorHandler = require('./middlewares/errorHandler');
const auth = require('./middlewares/auth');
const { generateStudents } = require('./data/generator');

const app = new Koa();
const router = new Router();


app.use(errorHandler);  
app.use(logger);         
app.use(bodyParser());   


let users = [{ id: 1, name: 'Иванов Иван', group: 'ПО-01-23' }];
let nextId = 2;

let students = generateStudents(50, 'ПО-01-23');
let nextStudentId = students.length + 1;

router.get('/api/users', (ctx) => { ctx.body = users; });

router.post('/api/users', (ctx) => {
  const { name, group } = ctx.request.body || {};
  if (!name || !group) ctx.throw(400, 'Поля name и group обязательны');

  const user = { id: nextId++, name, group };
  users.push(user);
  ctx.status = 201;
  ctx.body = user;
});

router.put('/api/users/:id', (ctx) => {
  const user = users.find((u) => u.id === Number(ctx.params.id));
  if (!user) ctx.throw(404, 'Пользователь не найден');

  const { name, group } = ctx.request.body || {};
  if (!name || !group) ctx.throw(400, 'Поля name и group обязательны');

  user.name = name;
  user.group = group;
  ctx.body = user;
});

router.delete('/api/users/:id', (ctx) => {
  const index = users.findIndex((u) => u.id === Number(ctx.params.id));
  if (index === -1) ctx.throw(404, 'Пользователь не найден');

  users.splice(index, 1);
  ctx.body = { message: `Пользователь id=${ctx.params.id} удалён` };
});


router.get('/students', (ctx) => {
  const { group, limit = 10, offset = 0, sort, search } = ctx.query;
  let result = [...students];

  if (group) result = result.filter((s) => s.group === group);

  if (search) {
    const q = search.toLowerCase();
    result = result.filter((s) => s.name.toLowerCase().includes(q));
  }

  if (sort) {
    const desc = sort.startsWith('-');
    const field = desc ? sort.slice(1) : sort;

    if (!['name', 'course', 'id', 'group'].includes(field)) {
      ctx.throw(400, `Недопустимое поле сортировки: ${field}`);
    }

    result.sort((a, b) => {
      if (a[field] < b[field]) return desc ? 1 : -1;
      if (a[field] > b[field]) return desc ? -1 : 1;
      return 0;
    });
  }

  const total = result.length;
  const lim = Math.max(1, Math.min(100, Number(limit)));
  const off = Math.max(0, Number(offset));
  const page = result.slice(off, off + lim);

  ctx.body = { total, limit: lim, offset: off, count: page.length, data: page };
});

router.get('/students/:id', (ctx) => {
  const student = students.find((s) => s.id === Number(ctx.params.id));
  if (!student) ctx.throw(404, 'Студент не найден');
  ctx.body = student;
});

router.post('/students', (ctx) => {
  const { name, group, course } = ctx.request.body || {};
  if (!name || !group || course === undefined) {
    ctx.throw(400, 'Поля name, group и course обязательны');
  }
  if (typeof course !== 'number' || course < 1 || course > 4) {
    ctx.throw(400, 'course должен быть числом от 1 до 4');
  }

  const student = { id: nextStudentId++, name, group, course };
  students.push(student);
  ctx.status = 201;
  ctx.body = student;
});

router.put('/students/:id', (ctx) => {
  const student = students.find((s) => s.id === Number(ctx.params.id));
  if (!student) ctx.throw(404, 'Студент не найден');

  const { name, group, course } = ctx.request.body || {};
  if (name) student.name = name;
  if (group) student.group = group;
  if (course !== undefined) {
    if (typeof course !== 'number' || course < 1 || course > 4) {
      ctx.throw(400, 'course должен быть числом от 1 до 4');
    }
    student.course = course;
  }
  ctx.body = student;
});

router.delete('/students/:id', (ctx) => {
  const index = students.findIndex((s) => s.id === Number(ctx.params.id));
  if (index === -1) ctx.throw(404, 'Студент не найден');

  const [removed] = students.splice(index, 1);
  ctx.body = { message: 'Студент удалён', student: removed };
});

router.get('/protected', auth, (ctx) => {
  ctx.body = { message: 'Доступ разрешён ' };
});

router.get('/error', () => {
  throw new Error('Тестовая внутренняя ошибка');
});

router.get('/', (ctx) => {
  const now = new Date().toLocaleString('ru-RU');
  ctx.type = 'text/html; charset=utf-8';
  ctx.body = `
    <!DOCTYPE html>
    <html lang="ru">
    <head><meta charset="UTF-8"><title>ЛР №15</title>
    <style>
      body { font-family: Arial, sans-serif; background: #f4f6f8; padding: 40px; }
      .card { background: #fff; padding: 30px; border-radius: 12px;
              max-width: 600px; margin: 0 auto; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
      h1 { color: #2c3e50; } .group { color: #ff0000; font-weight: bold; }
      .date { color: #7f8c8d; font-size: 14px; }
    </style></head>
    <body><div class="card">
      <h1>Лабораторная работа №15</h1>
      <p>Группа: <span class="group">ББМО-01-23</span></p>
      <p class="date">Текущая дата и время: ${now}</p>
      <p>Добро пожаловать! Сервер Koa.js работает </p>
      <p>Всего студентов: ${students.length}</p>
    </div></body></html>
  `;
});

//zadanie2//

router.get('/api/users', (ctx) => {
  ctx.body = users;
});

router.post('/api/users', (ctx) => {
  const { name, group } = ctx.request.body || {};

  if (!name || !group) {
    ctx.status = 400;
    ctx.body = { error: 'Поля name и group обязательны', status: 400 };
    return;
  }

  const user = { id: nextId++, name, group };
  users.push(user);
  ctx.status = 201;
  ctx.body = user;
});

router.put('/api/users/:id', (ctx) => {
  const id = Number(ctx.params.id);
  const user = users.find((u) => u.id === id);

  if (!user) {
    ctx.status = 404;
    ctx.body = { error: 'Пользователь не найден', status: 404 };
    return;
  }

  const { name, group } = ctx.request.body || {};
  if (!name || !group) {
    ctx.status = 400;
    ctx.body = { error: 'Поля name и group обязательны', status: 400 };
    return;
  }

  user.name = name;
  user.group = group;
  ctx.body = user;
});

router.delete('/api/users/:id', (ctx) => {
  const id = Number(ctx.params.id);
  const index = users.findIndex((u) => u.id === id);

  if (index === -1) {
    ctx.status = 404;
    ctx.body = { error: 'Пользователь не найден', status: 404 };
    return;
  }

  users.splice(index, 1);
  ctx.body = { message: `Пользователь id=${id} успешно удалён` };
});

app.use(router.routes()).use(router.allowedMethods());

app.listen(3000, () => {
  console.log('✅ Сервер: http://localhost:3000');
});