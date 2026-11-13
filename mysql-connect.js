require('dotenv').config();
const mysql = require('mysql2/promise');

const GROUP = '401';

const baseConfig = {
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
};

async function demoSingle() {
  console.log('=== Одиночное соединение ===');
  try {
    const conn = await mysql.createConnection(baseConfig);
    console.log('Подключение установлено');

    const [rows] = await conn.query('SELECT VERSION() AS v, DATABASE() AS db, USER() AS u');
    console.log(`Версия MySQL: ${rows[0].v}`);
    console.log(`Текущая БД: ${rows[0].db}`);
    console.log(`Пользователь: ${rows[0].u}`);

    await conn.end();
    console.log('Соединение закрыто\n');
  } catch (err) {
    console.error('Ошибка:', err.code, err.message, '\n');
  }
}

async function demoPool() {
  console.log('=== Пул соединений ===');
  const pool = mysql.createPool({
    ...baseConfig,
    waitForConnections: true,
    connectionLimit: Number(process.env.DB_POOL_LIMIT) || 10,
    queueLimit: 0,
  });

  try {
    const [rows] = await pool.query('SELECT VERSION() AS v, DATABASE() AS db');
    console.log(`Пул создан (лимит: ${process.env.DB_POOL_LIMIT || 10})`);
    console.log(`Версия MySQL: ${rows[0].v}`);
    console.log(`Текущая БД: ${rows[0].db}`);
    console.log(`Соединений в пуле: ${pool.pool._allConnections?.length ?? '—'}`);
    console.log('Пул готов к работе\n');
  } catch (err) {
    console.error('Ошибка пула:', err.code, err.message);
  } finally {
    await pool.end();
  }
}

async function demoWrongPassword() {
  console.log('=== Проверка ошибки подключения (неверный пароль) ===');
  try {
    const bad = await mysql.createConnection({
      ...baseConfig,
      password: 'wrong_password_xxx',
    });
    await bad.end();
  } catch (err) {
    console.log(`✘ ${err.code}: ${err.message}\n`);
  }
}

(async () => {
  console.log(`Лабораторная работа №22, группа ${GROUP}\n`);
  await demoSingle();
  await demoPool();
  await demoWrongPassword();
})();