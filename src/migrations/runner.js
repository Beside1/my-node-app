const fs = require('fs');
const path = require('path');
const { pool, query } = require('../config/db');

const MIGRATIONS_DIR = __dirname;

async function ensureTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INT PRIMARY KEY AUTO_INCREMENT,
      name VARCHAR(255) UNIQUE,
      applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
}

async function migrate() {
  await ensureTable();
  const [applied] = await pool.query('SELECT name FROM migrations');
  const appliedSet = new Set(applied.map((r) => r.name));

  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    if (appliedSet.has(file)) {
      console.log(`[SKIP] ${file} — уже применено`);
      continue;
    }
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    console.log(`[APPLY] ${file}`);
    for (const stmt of sql.split(';').map((s) => s.trim()).filter(Boolean)) {
      await query(stmt);
    }
    await query('INSERT INTO migrations (name) VALUES (?)', [file]);
  }

  const [count] = await pool.query('SELECT COUNT(*) AS c FROM migrations');
  console.log(`[INFO] Миграций применено: ${count[0].c}`);
}

async function rollback() {
  await ensureTable();
  const [rows] = await pool.query('SELECT * FROM migrations ORDER BY id DESC LIMIT 1');
  if (!rows.length) {
    console.log('[INFO] Нет миграций для отката');
    return;
  }
  const last = rows[0];
  console.log(`[ROLLBACK] ${last.name} — ручной откат не реализован, только удаление записи из migrations`);
  await query('DELETE FROM migrations WHERE id = ?', [last.id]);
}

module.exports = { migrate, rollback };

if (require.main === module) {
  const cmd = process.argv[2];
  const fn = cmd === 'rollback' ? rollback : migrate;
  fn().then(() => process.exit(0)).catch((e) => {
    console.error(e);
    process.exit(1);
  });
}