require('dotenv').config();
const { MongoClient } = require('mongodb');

const GROUP = 'ББМО-01-23';
const URI = process.env.MONGO_URI || 'mongodb://student:student_pass_2024@localhost:27017/bbmo_01_23?replicaSet=rs0';
const DB_NAME = 'bbmo_01_23';

(async () => {
  const client = new MongoClient(URI);
  await client.connect();
  const db = client.db(DB_NAME);
  const students = db.collection('students');

  console.log('=== Курсоры ===');
  await students.deleteMany({});
  const docs = [];
  for (let i = 1; i <= 10000; i++) {
    docs.push({ name: `Студент ${i}`, group_name: i % 2 === 0 ? GROUP : 'ББМО-02-23', course: (i % 4) + 1, grade: 3 + (i % 3) * 0.5, created_at: new Date() });
  }
  await students.insertMany(docs);
  console.log(`Вставлено ${docs.length} документов для теста`);

  const start = Date.now();
  let count = 0;
  for await (const doc of students.find({}).batchSize(1000)) count++;
  console.log(`Итерация через for await: получено ${count} документов за ${((Date.now() - start) / 1000).toFixed(2)} сек`);

  console.log('\n=== Агрегации ===');
  const avgByGroup = await students.aggregate([{ $group: { _id: '$group_name', avgGrade: { $avg: '$grade' } } }, { $sort: { _id: 1 } }]).toArray();
  console.log('Средний балл по группам:');
  avgByGroup.forEach((g) => console.log(`  ${g._id}: ${g.avgGrade.toFixed(2)}`));

  const byCourse = await students.aggregate([{ $group: { _id: '$course', count: { $sum: 1 } } }, { $sort: { _id: 1 } }]).toArray();
  console.log('\nКоличество по курсам:');
  byCourse.forEach((c) => console.log(`  ${c._id} курс: ${c.count}`));

  console.log('\n=== Индексы ===');
  await students.createIndex({ group_name: 1 });
  console.log('✔ Создан индекс: group_name_1');
  await students.createIndex({ group_name: 1, grade: -1 });
  console.log('✔ Создан индекс: group_name_1_grade_-1');
  await students.createIndex({ name: 'text' });
  console.log('✔ Создан текстовый индекс: name_text');

  console.log('\n=== Текстовый поиск ===');
  const found = await students.find({ $text: { $search: 'Студент 1' } }).toArray();
  console.log(`Найдено: ${found.length} документов`);
  if (found.length) console.log(`Топ-1: ${found[0].name}`);

  await client.close();
})();