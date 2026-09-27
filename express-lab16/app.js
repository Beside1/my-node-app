const express = require('express');
const app = express();
const PORT = 3000;


app.use(express.json());


let books = [
  { id: 1, title: 'Война и мир',              author: 'Толстой',     year: 1869 },
  { id: 2, title: 'Преступление и наказание', author: 'Достоевский', year: 1866 },
  { id: 3, title: 'Мастер и Маргарита',       author: 'Булгаков',    year: 1967 },
];
let nextId = 4;



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
        .footer { color:#95a5a6; font-size:13px; margin-top:20px; }
      </style>
    </head>
    <body>
      <div class="card">
        <h1>Лабораторная работа №16</h1>
        <p>Группа: <span class="group">401</span></p>
        <p>Текущая дата и время: ${now}</p>
        <p>Добро пожаловать! Сервер Express.js работает 🚀</p>

        <h3>Доступные маршруты:</h3>
        <ul>
          <li><a href="/">/</a> — главная</li>
          <li><a href="/about">/about</a> — о разработчике</li>
          <li><a href="/contacts">/contacts</a> — контакты</li>
          <li><a href="/api/books">/api/books</a> — список книг (API)</li>
        </ul>

        <p class="footer">© 2026, Черепович В.Д.</p>
      </div>
    </body>
    </html>
  `);
});

app.get('/about', (req, res) => {
  res.type('html').send(`
    <!DOCTYPE html>
    <html lang="ru">
    <head>
      <meta charset="UTF-8">
      <title>О разработчике</title>
      <style>
        body { font-family: Arial, sans-serif; background:#f4f6f8; padding:40px; }
        .card { background:#fff; padding:30px; border-radius:12px;
                max-width:600px; margin:0 auto; box-shadow:0 4px 12px rgba(0,0,0,0.1); }
        a { color:#2980b9; }
      </style>
    </head>
    <body>
      <div class="card">
        <h1>О разработчике</h1>
        <p><strong>ФИО:</strong> Черепович Владислав Дмитриевич</p>
        <p><strong>Группа:</strong> 401</p>
        <p><strong>Дисциплина:</strong> Лабораторная работа №16 — Express.js</p>
        <p><strong>Цель:</strong> исследование методов создания простого сервера на Express.js</p>
        <p><a href="/">← На главную</a></p>
      </div>
    </body>
    </html>
  `);
});

app.get('/contacts', (req, res) => {
  res.type('html').send(`
    <!DOCTYPE html>
    <html lang="ru">
    <head>
      <meta charset="UTF-8">
      <title>Контакты</title>
      <style>
        body { font-family: Arial, sans-serif; background:#f4f6f8; padding:40px; }
        .card { background:#fff; padding:30px; border-radius:12px;
                max-width:600px; margin:0 auto; box-shadow:0 4px 12px rgba(0,0,0,0.1); }
        a { color:#2980b9; }
      </style>
    </head>
    <body>
      <div class="card">
        <h1>Контакты</h1>
        <p><strong>Email:</strong>
          <a href="mailto:cherepvlad2006@gmail.com">cherepvlad2006@gmail.com</a>
        </p>
        <p><strong>GitHub:</strong>
          <a href="https://github.com/Beside1" target="_blank">github.com/Beside1</a>
        </p>
        <p><a href="/">← На главную</a></p>
      </div>
    </body>
    </html>
  `);
});


app.get('/api/books', (req, res) => {
  res.json(books);
});


app.get('/api/books/search', (req, res) => {
  const { author } = req.query;

  if (!author) return res.json(books);

  const result = books.filter(
    (b) => b.author.toLowerCase() === author.toLowerCase()
  );
  res.json(result);
});

app.get('/api/books/:id', (req, res) => {
  const book = books.find((b) => b.id === Number(req.params.id));

  if (!book) {
    return res.status(404).json({ error: 'Книга не найдена', status: 404 });
  }

  res.json(book);
});

app.post('/api/books', (req, res) => {
  const { title, author, year } = req.body || {};

  if (!title || !author || year === undefined) {
    return res.status(400).json({
      error: 'Поля title, author и year обязательны',
      status: 400,
    });
  }

  const book = { id: nextId++, title, author, year };
  books.push(book);
  res.status(201).json(book);
});

app.put('/api/books/:id', (req, res) => {
  const book = books.find((b) => b.id === Number(req.params.id));

  if (!book) {
    return res.status(404).json({ error: 'Книга не найдена', status: 404 });
  }

  const { title, author, year } = req.body || {};

  if (title === undefined && author === undefined && year === undefined) {
    return res.status(400).json({
      error: 'Нужно передать хотя бы одно поле',
      status: 400,
    });
  }

  if (title  !== undefined) book.title  = title;
  if (author !== undefined) book.author = author;
  if (year   !== undefined) book.year   = year;

  res.json(book);
});

app.delete('/api/books/:id', (req, res) => {
  const index = books.findIndex((b) => b.id === Number(req.params.id));

  if (index === -1) {
    return res.status(404).json({ error: 'Книга не найдена', status: 404 });
  }

  books.splice(index, 1);
  res.json({ message: `Книга id=${req.params.id} удалена` });
});

app.listen(PORT, () => {
  console.log(`Сервер запущен: http://localhost:${PORT}`);
});