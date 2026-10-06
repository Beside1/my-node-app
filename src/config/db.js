require('dotenv').config();
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  connectionLimit: Number(process.env.DB_POOL_LIMIT) || 10,
  waitForConnections: true,
});

const metrics = { queries: 0, errors: 0, totalMs: 0 };
const cache = new Map();

async function query(sql, params = []) {
  const start = Date.now();
  try {
    const [rows] = await pool.query(sql, params);
    metrics.queries += 1;
    metrics.totalMs += Date.now() - start;
    logSql(sql, Date.now() - start);
    return rows;
  } catch (err) {
    metrics.errors += 1;
    throw err;
  }
}

function logSql(sql, ms) {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const ts = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  console.log(`[${ts}] [${process.env.DB_NAME}] ${sql.replace(/\s+/g, ' ').slice(0, 120)} (${ms}ms)`);
}

module.exports = { pool, query, metrics, cache };