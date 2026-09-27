const express = require('express');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

const logger = require('./middlewares/logger');
const errorHandler = require('./middlewares/errorHandler');

const app = express();
const PORT = 3000;

app.use(logger);          // 1. Логирование
app.use(compression());   // 2. Сжатие ответов (gzip/deflate)
app.use(express.json());  // 3. Парсинг JSON

app.use(rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Слишком много запросов, попробуйте позже', status: 429 },
}));

let books = [
  { id: 1, title: 'Война и мир',              author: 'Толстой',     year: 1869 },
  { id: 2, title: 'Преступление и наказание', author: 'Достоевский', year: 1866 },
  { id: 3, title: 'Мастер и Маргарита',       author: 'Булгаков',    year: 1967 },
];
let nextId = 4;

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

app.get('/', (req, res) => {
  const now = new Date().toLocaleString('ru-RU');
  res.type('html').send(`
    <!DOCTYPE html>
    <html lang="ru">
    <head>
      <meta charset="UTF-8">
      <title>Лабораторная работа №16</title>
      <style>
        body { font-family: Arial, sans-serif; background:#f4f6f8; padding:40px; }
        .card { background:#fff; padding:30px; border-radius:12px;
                max-width:700px; margin:0 auto; box-shadow:0 4px 12px rgba(0,0,0,0.1); }
        h1 { color:#2c3e50; }
        .group { color:#3498db; font-weight:bold; }
        ul { line-height:1.8; }
        a { color:#2980b9; text-decoration:none; }
        a:hover { text-decoration:underline; }
      </style>
    </head>
    <body>
      <div class="card">
        <h1>Лабораторная работа №16</h1>
        <p>Группа: <span class="group">401</span></p>
        <p>Текущая дата и время: ${now}</p>
        <p>Сервер Express.js работает </p>
        <h3>Доступные маршруты:</h3>
        <ul>
          <li><a href="/">/</a> — главная</li>
          <li><a href="/about">/about</a> — о разработчике</li>
          <li><a href="/contacts">/contacts</a> — контакты</li>
          <li><a href="/api/books">/api/books</a> — список книг</li>
        </ul>
      </div>
    </body>
    </html>
  `);
});

app.get('/about', (req, res) => {
  res.type('html').send(`
    <h1>О разработчике</h1>
    <p>Черепович Владислав Дмитриевич</p>
    <p>Группа 401</p>
    <a href="/">← На главную</a>
  `);
});

app.get('/contacts', (req, res) => {
  res.type('html').send(`
    <h1>Контакты</h1>
    <p>Email: cherepvlad2006@gmail.com</p>
    <p>GitHub: <a href="https://github.com/Beside1">github.com/Beside1</a></p>
    <a href="/">← На главную</a>
  `);
});

app.get('/api/books', (req, res) => {
  res.json(books);
});

app.get('/api/books/search', (req, res) => {
  const { author } = req.query;
  if (!author) return res.json(books);
  res.json(books.filter((b) => b.author.toLowerCase() === author.toLowerCase()));
});

app.get('/api/books/:id', asyncHandler(async (req, res) => {
  const book = books.find((b) => b.id === Number(req.params.id));
  if (!book) {
    const e = new Error('Книга не найдена');
    e.status = 404;
    throw e;
  }
  res.json(book);
}));

app.post('/api/books', asyncHandler(async (req, res) => {
  const { title, author, year } = req.body || {};
  if (!title || !author || year === undefined) {
    const e = new Error('Поля title, author и year обязательны');
    e.status = 400;
    throw e;
  }
  const book = { id: nextId++, title, author, year };
  books.push(book);
  res.status(201).json(book);
}));

app.put('/api/books/:id', asyncHandler(async (req, res) => {
  const book = books.find((b) => b.id === Number(req.params.id));
  if (!book) {
    const e = new Error('Книга не найдена');
    e.status = 404;
    throw e;
  }
  const { title, author, year } = req.body || {};
  if (title  !== undefined) book.title  = title;
  if (author !== undefined) book.author = author;
  if (year   !== undefined) book.year   = year;
  res.json(book);
}));

app.delete('/api/books/:id', asyncHandler(async (req, res) => {
  const index = books.findIndex((b) => b.id === Number(req.params.id));
  if (index === -1) {
    const e = new Error('Книга не найдена');
    e.status = 404;
    throw e;
  }
  books.splice(index, 1);
  res.json({ message: `Книга id=${req.params.id} удалена` });
}));

app.get('/error', (req, res, next) => {
  next(new Error('Тестовая внутренняя ошибка'));
});

app.get('/async-error', asyncHandler(async (req, res) => {
  await new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Асинхронная ошибка')), 100)
  );
}));

app.use((req, res) => {
  res.status(404).json({ error: 'Маршрут не найден', status: 404 });
});

app.use(errorHandler);


app.listen(PORT, () => {
  console.log(`Сервер запущен: http://localhost:${PORT}`);
});