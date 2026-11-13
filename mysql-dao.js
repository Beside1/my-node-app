const StudentDAO = require('./student-dao');
const pool = require('./db-pool');

const GROUP = 'ББМО-01-23';

(async () => {
  const dao = new StudentDAO();

  await pool.query('DELETE FROM students');
  await pool.query('ALTER TABLE students AUTO_INCREMENT = 1');

  console.log('=== Структура класса StudentDAO ===');
  console.log(Object.getOwnPropertyNames(StudentDAO.prototype).filter((m) => m !== 'constructor'));

  console.log('\n=== Создание с валидацией ===');
  try {
    const s1 = await dao.create({ name: 'И', group_name: 'WRONG', course: 9, grade: 10 });
    console.log(s1);
  } catch (e) {
    console.log(`✘ ${e.code}: ${e.message}`);
  }

  const s1 = await dao.create({ name: 'Иван', group_name: GROUP, course: 2, grade: 4.5 });
  const s2 = await dao.create({ name: 'Мария', group_name: GROUP, course: 2, grade: 3.8 });
  const s3 = await dao.create({ name: 'Пётр', group_name: GROUP, course: 1, grade: 4.2 });
  const s4 = await dao.create({ name: 'Ольга', group_name: 'ББМО-02-23', course: 3, grade: 4.8 });
  console.log('Создано 4 студента:', [s1.id, s2.id, s3.id, s4.id].join(', '));

  console.log('\n=== Пагинация ===');
  const page1 = await dao.findAll({ limit: 2, offset: 0 });
  console.log('Страница 1:', page1.data.map((s) => s.name).join(', '));
  console.log('Метаданные:', JSON.stringify(page1.pagination));

  console.log('\n=== Фильтры ===');
  const onlyGroup = await dao.findAll({ group_name: GROUP });
  console.log(`Студентов в ${GROUP}: ${onlyGroup.data.length}`);
  const byGrade = await dao.findAll({ grade_min: 4.0, sortBy: 'grade', sortDir: 'DESC' });
  console.log('grade >= 4.0 (убыв.):', byGrade.data.map((s) => `${s.name}=${s.grade}`).join(', '));

  console.log('\n=== Поиск ===');
  const found = await dao.search('Ива');
  console.log('search("Ива"):', found.map((s) => s.name).join(', '));

  console.log('\n=== Статистика ===');
  console.log(await dao.getStats());

  await pool.end();
})();