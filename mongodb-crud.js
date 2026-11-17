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

  await students.deleteMany({});
  console.log(`=== Коллекция students (группа ${GROUP}) ===\n`);

  console.log('--- INSERT ---');
  const one = await students.insertOne({ name: 'Иван', group_name: GROUP, course: 2, grade: 4.5, created_at: new Date() });
  console.log(`✔ Вставлен: insertedId=${one.insertedId}`);

  const many = await students.insertMany([
    { name: 'Мария', group_name: GROUP, course: 2, grade: 3.8, created_at: new Date() },
    { name: 'Пётр', group_name: GROUP, course: 2, grade: 4.2, created_at: new Date() },
    { name: 'Ольга', group_name: GROUP, course: 1, grade: 4.7, created_at: new Date() },
  ]);
  console.log(`✔ Вставлено 3 документа: insertedIds=${Object.values(many.insertedIds).join(', ')}\n`);

  console.log('--- SELECT ---');
  const all = await students.find({}).toArray();
  console.log(`Все документы (${all.length}):`);
  all.forEach((d) => console.log(`  id=${d._id}, name=${d.name}, group=${d.group_name}, grade=${d.grade}`));

  const filtered = await students.find({ group_name: GROUP }).toArray();
  console.log(`\nС фильтром по группе (${filtered.length}):`);
  filtered.forEach((d) => console.log(`  name=${d.name}, grade=${d.grade}`));

  const projected = await students.find({}, { projection: { name: 1, grade: 1, _id: 0 } }).toArray();
  console.log('\nС проекцией (только name, grade):');
  projected.forEach((d) => console.log(`  { name: "${d.name}", grade: ${d.grade} }`));

  const sorted = await students.find({}).sort({ grade: -1 }).limit(2).skip(1).toArray();
  console.log('\nС сортировкой и пагинацией (grade DESC, limit 2, skip 1):');
  sorted.forEach((d) => console.log(`  ${d.name}: ${d.grade}`));

  console.log('\n--- UPDATE ---');
  const u1 = await students.updateOne({ name: 'Иван' }, { $set: { grade: 4.9 } });
  console.log(`✔ updateOne: matchedCount=${u1.matchedCount}, modifiedCount=${u1.modifiedCount}`);

  const u2 = await students.updateMany({ group_name: GROUP }, { $inc: { course: 1 } });
  console.log(`✔ updateMany (group=${GROUP}, $inc: course+1): matchedCount=${u2.matchedCount}, modifiedCount=${u2.modifiedCount}`);

  console.log('\n--- DELETE ---');
  const d1 = await students.deleteOne({ name: 'Пётр' });
  console.log(`✔ deleteOne: deletedCount=${d1.deletedCount}`);

  const d2 = await students.deleteMany({ grade: { $lt: 4.5 } });
  console.log(`✔ deleteMany (grade < 4.5): deletedCount=${d2.deletedCount}`);

  await client.close();
})();