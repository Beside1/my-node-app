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

  console.log('=== Транзакция (успех) ===');
  const session1 = client.startSession();
  try {
    await session1.withTransaction(async () => {
      console.log('[BEGIN] Транзакция начата');
      await students.insertOne({ name: 'Иван', group_name: GROUP, course: 2, grade: 4.5 }, { session: session1 });
      console.log('[INSERT] Студент 1: Иван');
      await students.insertOne({ name: 'Мария', group_name: GROUP, course: 2, grade: 3.8 }, { session: session1 });
      console.log('[INSERT] Студент 2: Мария');
      await students.updateOne({ name: 'Иван' }, { $set: { grade: 4.8 } }, { session: session1 });
      console.log('[UPDATE] Студент 1: grade=4.8');
    });
    console.log('[COMMIT] Транзакция зафиксирована');
    console.log('✔ Данные сохранены');
  } finally {
    await session1.endSession();
  }

  console.log('\n=== Транзакция (откат) ===');
  const session2 = client.startSession();
  try {
    await session2.withTransaction(async () => {
      console.log('[BEGIN] Транзакция начата');
      await students.insertOne({ name: 'Пётр', group_name: GROUP, course: 2, grade: 4.2 }, { session: session2 });
      console.log('[INSERT] Студент 3: Пётр');
      throw new Error('Искусственная ошибка для отката');
    });
  } catch (err) {
    console.log(`[ABORT] Транзакция отменена: ${err.message}`);
    console.log('✔ Данные не сохранены');
  } finally {
    await session2.endSession();
  }

  const count = await students.countDocuments({});
  console.log(`Проверка: студентов в БД = ${count} (Пётр не добавлен)`);

  console.log('\n=== Change Streams ===');
  console.log('[WATCH] Отслеживание коллекции students');
  const changeStream = students.watch();

  changeStream.on('change', (change) => {
    console.log(`[CHANGE] ${change.operationType}:`, change.fullDocument ? change.fullDocument.name : change.documentKey._id);
  });

  setTimeout(async () => {
    await students.insertOne({ name: 'Анна', group_name: GROUP, course: 1, grade: 4.7 });
    await students.updateOne({ name: 'Анна' }, { $set: { grade: 5.0 } });
    await students.deleteOne({ name: 'Анна' });

    setTimeout(async () => {
      await changeStream.close();
      console.log('[WATCH] Stream закрыт');
      await client.close();
      process.exit(0);
    }, 1500);
  }, 500);
})();