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

const pool = mysql.createPool({
  ...baseConfig,
  connectionLimit: 10,
  waitForConnections: true,
});

pool.on('error', (err) => {
  console.log(`[POOL ERROR] ${err.code}`);
  console.log('[POOL] Пересоздание пула...');

});

async function demoErrors() {
  console.log('=== Демонстрация ошибок ===');

  try {
    const bad = await mysql.createConnection({ ...baseConfig, port: 9999 });
    await bad.end();
  } catch (e) {
    console.log(`[${e.code}] Сервер недоступен: ${baseConfig.host}:9999`);
  }

  try {
    const bad = await mysql.createConnection({ ...baseConfig, password: 'wrong' });
    await bad.end();
  } catch (e) {
    console.log(`[${e.code}] Неверный пароль для пользователя ${baseConfig.user}`);
  }

  try {
    await pool.query('SELECT * FRM students');
  } catch (e) {
    console.log(`[${e.code}] Синтаксическая ошибка: SELECT * FRM students`);
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS uniq_test (
      id INT PRIMARY KEY,
      name VARCHAR(50)
    ) ENGINE=InnoDB
  `);
  await pool.query('DELETE FROM uniq_test');
  await pool.query('INSERT INTO uniq_test (id, name) VALUES (?, ?)', [1, 'test']);
  try {
    await pool.query('INSERT INTO uniq_test (id, name) VALUES (?, ?)', [1, 'dup']);
  } catch (e) {
    console.log(`[${e.code}] Дублирование ключа: id=1`);
  }

  try {
    await pool.query('INSERT INTO students (name, group_name, course, grade) VALUES (?, ?, ?, ?)',
      [null, GROUP, 1, 4]);
  } catch (e) {
    console.log(`[${e.code}] NULL в NOT NULL столбце: name`);
  }
  console.log();
}

async function demoPoolError() {
  console.log('=== Обработка ошибок пула ===');
  pool.emit('error', Object.assign(new Error('sim'), { code: 'PROTOCOL_CONNECTION_LOST' }));
  console.log();
}

async function demoStreaming() {
  console.log('=== Потоковый запрос ===');

  await pool.query(`
    CREATE TABLE IF NOT EXISTS big_data (
      id INT PRIMARY KEY AUTO_INCREMENT,
      n INT,
      payload VARCHAR(100)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  await pool.query('TRUNCATE TABLE big_data');

  console.log('Генерация 100000 записей...');
  const BATCH = 1000;
  const TOTAL = 100000;
  for (let start = 0; start < TOTAL; start += BATCH) {
    const values = [];
    for (let i = 0; i < BATCH; i += 1) {
      const n = start + i;
      values.push([n, `row-${n}`]);
    }
    await pool.query('INSERT INTO big_data (n, payload) VALUES ?', [values]);
  }
  console.log('Готово');

  const memBefore = process.memoryUsage().heapUsed / 1024 / 1024;
  console.log(`Память до стрима: ${memBefore.toFixed(1)} МБ`);
  console.log('Чтение 100000 записей через .stream()...');

  const started = Date.now();
  const conn = await pool.getConnection();
  let count = 0;
  let peak = memBefore;

  await new Promise((resolve, reject) => {
    const stream = conn.connection.query('SELECT * FROM big_data').stream();
    stream.on('data', () => {
      count += 1;
      if (count % 10000 === 0) {
        const mem = process.memoryUsage().heapUsed / 1024 / 1024;
        peak = Math.max(peak, mem);
        console.log(`[STREAM] Получено: ${count} (${(count / TOTAL * 100).toFixed(0)}%)`);
      }
    });
    stream.on('end', resolve);
    stream.on('error', reject);
  });

  conn.release();
  const elapsed = ((Date.now() - started) / 1000).toFixed(1);
  console.log(`Обработано за ${elapsed} сек`);
  console.log(`Пик памяти: ${peak.toFixed(1)} МБ`);

  console.log('\nСравнение: SELECT целиком');
  const memBeforeFull = process.memoryUsage().heapUsed / 1024 / 1024;
  try {
    const [rows] = await pool.query('SELECT * FROM big_data');
    const memAfterFull = process.memoryUsage().heapUsed / 1024 / 1024;
    console.log(`Прочитано ${rows.length} строк за раз`);
    console.log(`Память выросла: ${(memAfterFull - memBeforeFull).toFixed(1)} МБ`);
  } catch (e) {
    console.log(`Ошибка: ${e.message}`);
  }
  console.log();
}

async function demoTransaction() {
  console.log('=== Транзакция ===');
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    console.log('Начало транзакции');

    await conn.query(
      'INSERT INTO uniq_test (id, name) VALUES (?, ?)',
      [10, 'tx1']
    );
    console.log('INSERT 1 выполнен');

    await conn.query(
      'INSERT INTO uniq_test (id, name) VALUES (?, ?)',
      [11, 'tx2']
    );
    console.log('INSERT 2 выполнен');

    await conn.query(
      'INSERT INTO uniq_test (id, name) VALUES (?, ?)',
      [10, 'tx3']  
    );
    console.log('INSERT 3 не выполнен (дубликат)');
  } catch (e) {
    await conn.rollback();
    console.log(`Rollback выполнен (${e.code})`);
  } finally {
    conn.release();
    console.log('Соединение возвращено в пул\n');
  }
}

(async () => {
  try {
    await demoErrors();
    await demoPoolError();
    await demoStreaming();
    await demoTransaction();
  } catch (err) {
    console.error('Критическая ошибка:', err);
  } finally {
    await pool.end();
  }
})();