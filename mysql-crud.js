require('dotenv').config();
const mysql = require('mysql2/promise');

const GROUP = '401';
const GROUP_SQL = GROUP; 

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  connectionLimit: Number(process.env.DB_POOL_LIMIT) || 10,
});

async function createTable() {
  console.log('=== Создание таблицы ===');
  await pool.query(`
    CREATE TABLE IF NOT EXISTS students (
      id INT PRIMARY KEY AUTO_INCREMENT,
      name VARCHAR(100) NOT NULL,
      group_name VARCHAR(20) NOT NULL,
      course INT NOT NULL,
      grade DECIMAL(3,2),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log('Таблица students создана\n');
}

async function insertOne() {
  console.log('=== INSERT ===');
  const [res] = await pool.query(
    'INSERT INTO students (name, group_name, course, grade) VALUES (?, ?, ?, ?)',
    ['Иван', GROUP, 2, 4.5]
  );
  console.log(`Вставлен студент: id=${res.insertId}, affectedRows=${res.affectedRows}`);

  const [many] = await pool.query(
    'INSERT INTO students (name, group_name, course, grade) VALUES (?, ?, ?, ?), (?, ?, ?, ?), (?, ?, ?, ?)',
    ['Мария', GROUP, 2, 3.8, 'Пётр', GROUP, 2, 4.2, 'Ольга', GROUP, 2, 4.7]
  );
  console.log(`Вставлено 3 студента: affectedRows=${many.affectedRows}\n`);
}

async function selectAll() {
  console.log('=== SELECT ===');
  const [all] = await pool.query('SELECT * FROM students ORDER BY id');
  console.log('Все студенты:');
  for (const s of all) {
    console.log(`  id=${s.id}, name=${s.name}, group=${s.group_name}, grade=${s.grade}`);
  }

  const [filtered] = await pool.query(
    'SELECT id, name, grade FROM students WHERE group_name = ? ORDER BY grade DESC',
    [GROUP]
  );
  console.log(`\nСтуденты группы ${GROUP} (сортировка по grade):`);
  for (const s of filtered) {
    console.log(`  id=${s.id}, name=${s.name}, grade=${s.grade}`);
  }

  const [paged] = await pool.query(
    'SELECT id, name FROM students ORDER BY id LIMIT ? OFFSET ?',
    [2, 1]
  );
  console.log('\nПагинация LIMIT 2 OFFSET 1:');
  for (const s of paged) console.log(`  id=${s.id}, name=${s.name}`);
  console.log();
}

async function updateDemo() {
  console.log('=== UPDATE ===');
  const [u1] = await pool.query(
    'UPDATE students SET grade = ? WHERE id = ?',
    [4.9, 1]
  );
  console.log(`Обновлён студент id=1: affectedRows=${u1.affectedRows}, changedRows=${u1.changedRows}`);

  const [u2] = await pool.query(
    'UPDATE students SET grade = ? WHERE id = ?',
    [4.9, 1]
  );
  console.log(`Повторное обновление: affectedRows=${u2.affectedRows}, changedRows=${u2.changedRows}\n`);
}

async function deleteDemo() {
  console.log('=== DELETE ===');
  const [d] = await pool.query('DELETE FROM students WHERE id = ?', [1]);
  console.log(`Удалён студент id=1: affectedRows=${d.affectedRows}\n`);
}

async function sqlInjectionDemo() {
  console.log('=== Защита от SQL-инъекции ===');
  const malicious = "'; DROP TABLE students; --";
  console.log(`Попытка инъекции: "${malicious}"`);

  const [safe] = await pool.query('SELECT * FROM students WHERE name = ?', [malicious]);
  console.log(`Параметризованный запрос безопасен (найдено ${safe.length} строк)`);

  const [tables] = await pool.query("SHOW TABLES LIKE 'students'");
  if (tables.length > 0) {
    console.log('Конкатенация привела бы к удалению таблицы');
    console.log('Таблица students на месте — параметризация работает\n');
  }
}

(async () => {
  try {
    await createTable();
    await insertOne();
    await selectAll();
    await updateDemo();
    await deleteDemo();
    await sqlInjectionDemo();
  } catch (err) {
    console.error('Ошибка:', err.code, err.message);
  } finally {
    await pool.end();
  }
})();