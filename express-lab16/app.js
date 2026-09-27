const express = require('express');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

const logger = require('./middlewares/logger');
const fileLogger = require('./middlewares/fileLogger');
const errorHandler = require('./middlewares/errorHandler');

const app = express();
const PORT = 3000;

app.use(logger);
app.use(fileLogger);
app.use(compression());
app.use(express.json());

app.use(rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Слишком много запросов, попробуйте позже', status: 429 },
}));

let books = [
  { id: 1, title: 'Война и мир',              author: 'Толстой',     year: 1869, genre: 'роман' },
  { id: 2, title: 'Преступление и наказание', author: 'Достоевский', year: 1866, genre: 'роман' },
  { id: 3, title: 'Мастер и Маргарита',       author: 'Булгаков',    year: 1967, genre: 'роман' },
  { id: 4, title: 'Анна Каренина',            author: 'Толстой',     year: 1877, genre: 'роман' },
  { id: 5, title: 'Идиот',                    author: 'Достоевский', year: 1869, genre: 'роман' },
  { id: 6, title: 'Отцы и дети',              author: 'Тургенев',    year: 1862, genre: 'роман' },
  { id: 7, title: 'Мёртвые души',             author: 'Гоголь',      year: 1842, genre: 'поэма' },
  { id: 8, title: 'Ревизор',                  author: 'Гоголь',      year: 1836, genre: 'комедия' },
  { id: 9, title: 'Евгений Онегин',           author: 'Пушкин',      year: 1833, genre: 'роман в стихах' },
  { id: 10, title: 'Герой нашего времени',    author: 'Лермонтов',   year: 1840, genre: 'роман' },
];
let nextId = 11;

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
        <p>Сервер Express.js работает 🚀</p>
        <h3>Доступные маршруты:</h3>
        <ul>
          <li><a href="/">/</a> — главная</li>
          <li><a href="/about">/about</a> — о разработчике</li>
          <li><a href="/contacts">/contacts</a> — контакты</li>
          <li><a href="/api/books">/api/books</a> — список книг</li>
          <li><a href="/api/books/stats">/api/books/stats</a> — статистика</li>
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
  let result = [...books];

  const { author, year, yearFrom, yearTo, search, sort } = req.query;

  // --- Фильтрация ---
  if (author) {
    result = result.filter(
      (b) => b.author.toLowerCase() === author.toLowerCase()
    );
  }
  if (year) {
    result = result.filter((b) => b.year === Number(year));
  }
  if (yearFrom) {
    result = result.filter((b) => b.year >= Number(yearFrom));
  }
  if (yearTo) {
    result = result.filter((b) => b.year <= Number(yearTo));
  }

  if (search) {
    const q = search.toLowerCase();
    result = result.filter(
      (b) =>
        b.title.toLowerCase().includes(q) ||
        b.author.toLowerCase().includes(q)
    );
  }

  if (sort) {
    const desc = sort.startsWith('-');
    const field = desc ? sort.slice(1) : sort;

    if (!['title', 'author', 'year', 'id', 'genre'].includes(field)) {
      return res.status(400).json({
        error: `Недопустимое поле сортировки: ${field}`,
        status: 400,
      });
    }

    result.sort((a, b) => {
      if (a[field] < b[field]) return desc ? 1 : -1;
      if (a[field] > b[field]) return desc ? -1 : 1;
      return 0;
    });
  }

  const total = result.length;
  const limit = Math.max(1, Math.min(100, Number(req.query.limit) || 10));
  const page = Math.max(1, Number(req.query.page) || 1);
  const offset = (page - 1) * limit;
  const data = result.slice(offset, offset + limit);

  res.json({
    total,
    page,
    limit,
    pages: Math.ceil(total / limit),
    count: data.length,
    data,
  });
});

app.get('/api/books/stats', (req, res) => {
  const byAuthor = {};
  const byGenre = {};
  let oldestYear = null;
  let newestYear = null;

  for (const b of books) {
    byAuthor[b.author] = (byAuthor[b.author] || 0) + 1;
    if (b.genre) byGenre[b.genre] = (byGenre[b.genre] || 0) + 1;
    if (oldestYear === null || b.year < oldestYear) oldestYear = b.year;
    if (newestYear === null || b.year > newestYear) newestYear = b.year;
  }

  res.json({
    total: books.length,
    byAuthor,
    byGenre,
    oldestYear,
    newestYear,
  });
});

app.get('/api/books/search', (req, res) => {
  const { author } = req.query;
  if (!author) return res.json(books);

  res.json(
    books.filter((b) => b.author.toLowerCase() === author.toLowerCase())
  );
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
  const { title, author, year, genre } = req.body || {};

  if (!title || !author || year === undefined) {
    const e = new Error('Поля title, author и year обязательны');
    e.status = 400;
    throw e;
  }

  if (typeof title !== 'string' || title.trim().length === 0) {
    const e = new Error('Название не должно быть пустым');
    e.status = 400;
    throw e;
  }

  const currentYear = new Date().getFullYear();
  if (typeof year !== 'number' || !Number.isInteger(year) || year < 0 || year > currentYear) {
    const e = new Error(`Год должен быть целым числом от 0 до ${currentYear}`);
    e.status = 400;
    throw e;
  }

  const dup = books.find(
    (b) =>
      b.title.toLowerCase() === title.toLowerCase() &&
      b.author.toLowerCase() === author.toLowerCase()
  );
  if (dup) {
    const e = new Error('Книга с таким названием и автором уже существует');
    e.status = 400;
    throw e;
  }

  const book = {
    id: nextId++,
    title: title.trim(),
    author: author.trim(),
    year,
    genre: genre || null,
  };
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

  const { title, author, year, genre } = req.body || {};

  if (title !== undefined) {
    if (typeof title !== 'string' || title.trim().length === 0) {
      const e = new Error('Название не должно быть пустым');
      e.status = 400;
      throw e;
    }
    book.title = title.trim();
  }

  if (author !== undefined) {
    if (typeof author !== 'string' || author.trim().length === 0) {
      const e = new Error('Автор не должен быть пустым');
      e.status = 400;
      throw e;
    }
    book.author = author.trim();
  }

  if (year !== undefined) {
    const currentYear = new Date().getFullYear();
    if (typeof year !== 'number' || !Number.isInteger(year) || year < 0 || year > currentYear) {
      const e = new Error(`Год должен быть целым числом от 0 до ${currentYear}`);
      e.status = 400;
      throw e;
    }
    book.year = year;
  }

  if (genre !== undefined) book.genre = genre;

  res.json(book);
}));

app.delete('/api/books/:id', asyncHandler(async (req, res) => {
  const index = books.findIndex((b) => b.id === Number(req.params.id));
  if (index === -1) {
    const e = new Error('Книга не найдена');
    e.status = 404;
    throw e;
  }
  const [removed] = books.splice(index, 1);
  res.json({ message: `Книга id=${req.params.id} удалена`, book: removed });
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
  console.log(`Книг в библиотеке: ${books.length}`);
});