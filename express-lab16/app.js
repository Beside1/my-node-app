const express = require('express');
const app = express();
const PORT = 3000;

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
        a { color:#2980b9; }
      </style>
    </head>
    <body>
      <div class="card">
        <h1>Лабораторная работа №16</h1>
        <p>Группа: <span class="group">401</span></p>
        <p>Текущая дата и время: ${now}</p>
        <p>Добро пожаловать! Сервер Express.js работает </p>
        <h3>Доступные маршруты:</h3>
        <ul>
          <li><a href="/">/</a> — главная</li>
          <li><a href="/about">/about</a> — о разработчике</li>
          <li><a href="/contacts">/contacts</a> — контакты</li>
        </ul>
      </div>
    </body>
    </html>
  `);
});

app.get('/about', (req, res) => {
  res.type('html').send(`
    <!DOCTYPE html><html lang="ru"><head><meta charset="UTF-8">
    <title>О разработчике</title></head><body>
      <h1>О разработчике</h1>
      <p>Черепович Владислав Дмитриевич</p>
      <p>Студент группы 401</p>
      <p>Лабораторная работа №16 — Express.js</p>
      <a href="/">← На главную</a>
    </body></html>
  `);
});

app.get('/contacts', (req, res) => {
  res.type('html').send(`
    <!DOCTYPE html><html lang="ru"><head><meta charset="UTF-8">
    <title>Контакты</title></head><body>
      <h1>Контакты</h1>
      <p>Email: cherepvlad2006@gmail.com</p>
      <p>GitHub: https://github.com/Beside1</p>
      <a href="/">← На главную</a>
    </body></html>
  `);
});

app.listen(PORT, () => {
  console.log(`Сервер запущен: http://localhost:${PORT}`);
});