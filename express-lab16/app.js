const express = require('express');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

const logger = require('./middlewares/logger');
const fileLogger = require('./middlewares/fileLogger');
const errorHandler = require('./middlewares/errorHandler');
const cache = require('./middlewares/cache');
const { generateToken, authRequired, adminRequired } = require('./middlewares/auth');
const {
  validate,
  bookSchema,
  bookUpdateSchema,
  registerSchema,
  loginSchema,
  reviewSchema,
} = require('./middlewares/validate');
const { generateBooks } = require('./data/generator');

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

let books = generateBooks(100, 'ББМО-01-23');
let nextId = books.length + 1;
const users = [];

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Library API — ЛР №16',
      version: '1.0.0',
      description: 'REST API для управления библиотекой. Группа 401.',
    },
    servers: [{ url: `http://localhost:${PORT}` }],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
    },
  },
  apis: ['./express-lab16/app.js'],
});

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

/**
 * @swagger
 * /:
 *   get:
 *     summary: Главная страница
 *     responses:
 *       200: { description: HTML-страница }
 */
app.get('/', (req, res) => {
  const now = new Date().toLocaleString('ru-RU');
  res.type('html').send(`
    <h1>Лабораторная работа №16</h1>
    <p>Группа: 401</p>
    <p>Дата и время: ${now}</p>
    <p>Express.js работает 🚀</p>
    <ul>
      <li><a href="/api/books">/api/books</a></li>
      <li><a href="/api/books/stats">/api/books/stats</a></li>
      <li><a href="/api-docs">/api-docs (Swagger)</a></li>
    </ul>
  `);
});

app.get('/about', (req, res) => {
  res.type('html').send('<h1>О разработчике</h1><p>Черепович Владислав Дмитриевич, группа 401</p>');
});
app.get('/contacts', (req, res) => {
  res.type('html').send('<h1>Контакты</h1><p>cherepvlad2006@gmail.com</p>');
});

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Регистрация пользователя
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, name]
 *             properties:
 *               email: { type: string }
 *               password: { type: string }
 *               name: { type: string }
 *     responses:
 *       201: { description: Пользователь зарегистрирован }
 *       400: { description: Ошибка валидации }
 */
app.post('/auth/register', validate(registerSchema), asyncHandler(async (req, res) => {
  const { email, password, name } = req.body;

  if (users.find((u) => u.email === email)) {
    const e = new Error('Пользователь с таким email уже существует');
    e.status = 400;
    throw e;
  }

  const hash = await bcrypt.hash(password, 10);
  // Первый зарегистрированный — админ
  const role = users.length === 0 ? 'admin' : 'user';

  const user = { id: users.length + 1, email, name, password: hash, role };
  users.push(user);

  res.status(201).json({
    message: 'Пользователь зарегистрирован',
    user: { id: user.id, email, name, role },
  });
}));

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Вход в систему
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string }
 *               password: { type: string }
 *     responses:
 *       200:
 *         description: JWT токен
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token: { type: string }
 *       401: { description: Неверные данные }
 */
app.post('/auth/login', validate(loginSchema), asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = users.find((u) => u.email === email);

  if (!user) {
    const e = new Error('Неверный email или пароль');
    e.status = 401;
    throw e;
  }

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) {
    const e = new Error('Неверный email или пароль');
    e.status = 401;
    throw e;
  }

  const token = generateToken(user);
  res.json({
    token,
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  });
}));

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Информация о текущем пользователе
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Данные пользователя }
 *       401: { description: Нет токена }
 */
app.get('/auth/me', authRequired, (req, res) => {
  res.json({ user: req.user });
});

/**
 * @swagger
 * /api/books:
 *   get:
 *     summary: Список книг с фильтрацией, пагинацией, сортировкой
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: author, schema: { type: string } }
 *       - { in: query, name: year, schema: { type: integer } }
 *       - { in: query, name: yearFrom, schema: { type: integer } }
 *       - { in: query, name: yearTo, schema: { type: integer } }
 *       - { in: query, name: search, schema: { type: string } }
 *       - { in: query, name: sort, schema: { type: string } }
 *       - { in: query, name: limit, schema: { type: integer, default: 10 } }
 *       - { in: query, name: page, schema: { type: integer, default: 1 } }
 *     responses:
 *       200: { description: Список книг }
 *       401: { description: Не авторизован }
 */
app.get('/api/books', authRequired, cache, (req, res) => {
  let result = [...books];
  const { author, year, yearFrom, yearTo, search, sort } = req.query;

  if (author) {
    result = result.filter((b) => b.author.toLowerCase() === author.toLowerCase());
  }
  if (year) result = result.filter((b) => b.year === Number(year));
  if (yearFrom) result = result.filter((b) => b.year >= Number(yearFrom));
  if (yearTo) result = result.filter((b) => b.year <= Number(yearTo));
  if (search) {
    const q = search.toLowerCase();
    result = result.filter(
      (b) => b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q)
    );
  }

  if (sort) {
    const desc = sort.startsWith('-');
    const field = desc ? sort.slice(1) : sort;
    if (!['title', 'author', 'year', 'id', 'genre'].includes(field)) {
      return res.status(400).json({ error: `Недопустимое поле сортировки: ${field}`, status: 400 });
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

/**
 * @swagger
 * /api/books/available:
 *   get:
 *     summary: Список доступных книг
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Доступные книги }
 */
app.get('/api/books/available', authRequired, cache, (req, res) => {
  const available = books.filter((b) => b.available);
  res.json({ total: available.length, data: available });
});

/**
 * @swagger
 * /api/books/stats:
 *   get:
 *     summary: Статистика по книгам
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Статистика }
 */
app.get('/api/books/stats', authRequired, cache, (req, res) => {
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
    available: books.filter((b) => b.available).length,
    byAuthor,
    byGenre,
    oldestYear,
    newestYear,
  });
});

/**
 * @swagger
 * /api/books/export:
 *   get:
 *     summary: Экспорт всех книг в JSON
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Файл books.json }
 */
app.get('/api/books/export', authRequired, (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="books.json"');
  res.send(JSON.stringify(books, null, 2));
});

/**
 * @swagger
 * /api/books/recommendations:
 *   get:
 *     summary: Рекомендации книг по жанру
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: genre, schema: { type: string } }
 *     responses:
 *       200: { description: Рекомендации }
 */
app.get('/api/books/recommendations', authRequired, (req, res) => {
  const { genre } = req.query;
  if (!genre) {
    return res.status(400).json({ error: 'Параметр genre обязателен', status: 400 });
  }
  const recs = books
    .filter((b) => b.genre && b.genre.toLowerCase() === genre.toLowerCase())
    .slice(0, 10);
  res.json({ genre, total: recs.length, data: recs });
});

/**
 * @swagger
 * /api/books/search:
 *   get:
 *     summary: Поиск по автору
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: author, schema: { type: string } }
 *     responses:
 *       200: { description: Книги автора }
 */
app.get('/api/books/search', authRequired, (req, res) => {
  const { author } = req.query;
  if (!author) return res.json({ total: books.length, data: books });
  const result = books.filter((b) => b.author.toLowerCase() === author.toLowerCase());
  res.json({ total: result.length, data: result });
});

/**
 * @swagger
 * /api/books/{id}:
 *   get:
 *     summary: Получение книги по ID
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     responses:
 *       200: { description: Книга }
 *       404: { description: Не найдена }
 */
app.get('/api/books/:id', authRequired, asyncHandler(async (req, res) => {
  const book = books.find((b) => b.id === Number(req.params.id));
  if (!book) {
    const e = new Error('Книга не найдена');
    e.status = 404;
    throw e;
  }
  res.json(book);
}));

/**
 * @swagger
 * /api/books:
 *   post:
 *     summary: Добавление книги (только админ)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, author, year]
 *             properties:
 *               title: { type: string }
 *               author: { type: string }
 *               year: { type: integer }
 *               genre: { type: string }
 *     responses:
 *       201: { description: Книга создана }
 *       400: { description: Ошибка валидации }
 *       403: { description: Только для админа }
 */
app.post('/api/books',
  authRequired,
  adminRequired,
  validate(bookSchema),
  asyncHandler(async (req, res) => {
    const { title, author, year, genre } = req.body;

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
      title,
      author,
      year,
      genre: genre || null,
      isbn: '978-5-' + String(nextId).padStart(4, '0'),
      available: true,
      reviews: [],
    };
    books.push(book);
    res.status(201).json(book);
  })
);

/**
 * @swagger
 * /api/books/{id}:
 *   put:
 *     summary: Обновление книги
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     responses:
 *       200: { description: Книга обновлена }
 *       404: { description: Не найдена }
 */
app.put('/api/books/:id',
  authRequired,
  validate(bookUpdateSchema),
  asyncHandler(async (req, res) => {
    const book = books.find((b) => b.id === Number(req.params.id));
    if (!book) {
      const e = new Error('Книга не найдена');
      e.status = 404;
      throw e;
    }

    const { title, author, year, genre } = req.body;
    if (title !== undefined) book.title = title;
    if (author !== undefined) book.author = author;
    if (year !== undefined) book.year = year;
    if (genre !== undefined) book.genre = genre;

    res.json(book);
  })
);

/**
 * @swagger
 * /api/books/{id}:
 *   delete:
 *     summary: Удаление книги (только админ)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     responses:
 *       200: { description: Удалено }
 *       403: { description: Только для админа }
 *       404: { description: Не найдена }
 */
app.delete('/api/books/:id',
  authRequired,
  adminRequired,
  asyncHandler(async (req, res) => {
    const index = books.findIndex((b) => b.id === Number(req.params.id));
    if (index === -1) {
      const e = new Error('Книга не найдена');
      e.status = 404;
      throw e;
    }
    const [removed] = books.splice(index, 1);
    res.json({ message: `Книга id=${req.params.id} удалена`, book: removed });
  })
);

/**
 * @swagger
 * /api/books/{id}/reviews:
 *   post:
 *     summary: Добавить отзыв к книге
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [rating, text]
 *             properties:
 *               rating: { type: integer, minimum: 1, maximum: 5 }
 *               text: { type: string }
 *     responses:
 *       201: { description: Отзыв добавлен }
 *       404: { description: Книга не найдена }
 */
app.post('/api/books/:id/reviews',
  authRequired,
  validate(reviewSchema),
  asyncHandler(async (req, res) => {
    const book = books.find((b) => b.id === Number(req.params.id));
    if (!book) {
      const e = new Error('Книга не найдена');
      e.status = 404;
      throw e;
    }

    const review = {
      id: book.reviews.length + 1,
      user: req.user.email,
      rating: req.body.rating,
      text: req.body.text,
      createdAt: new Date().toISOString(),
    };
    book.reviews.push(review);
    res.status(201).json(review);
  })
);

/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     summary: Список пользователей (только админ)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Пользователи }
 *       403: { description: Только для админа }
 */
app.get('/api/admin/users', authRequired, adminRequired, (req, res) => {
  res.json(users.map((u) => ({ id: u.id, email: u.email, name: u.name, role: u.role })));
});

app.get('/error', (req, res, next) => next(new Error('Тестовая внутренняя ошибка')));
app.get('/async-error', asyncHandler(async () => {
  await new Promise((_, rej) => setTimeout(() => rej(new Error('Асинхронная ошибка')), 100));
}));

app.use((req, res) => {
  res.status(404).json({ error: 'Маршрут не найден', status: 404 });
});
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Сервер запущен: http://localhost:${PORT}`);
  console.log(`Сгенерировано книг: ${books.length}`);
  console.log(`Swagger: http://localhost:${PORT}/api-docs`);
});