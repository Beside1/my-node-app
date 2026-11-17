require('dotenv').config();
const { MongoClient } = require('mongodb');

const GROUP = 'ББМО-01-23';
const URI = process.env.MONGO_URI || 'mongodb://student:student_pass_2024@localhost:27017/bbmo_01_23?replicaSet=rs0&authSource=admin';
const DB_NAME = 'bbmo_01_23';

(async () => {
  const client = new MongoClient(URI);

  client.on('serverHeartbeatSucceeded', () => {
    console.log(`[HEARTBEAT] Успешно: ${new Date().toISOString()}`);
  });
  client.on('serverHeartbeatFailed', (event) => {
    console.log(`[HEARTBEAT] Ошибка: ${event.failure.message}`);
  });

  try {
    await client.connect();
    console.log('=== Подключение к MongoDB ===');
    console.log('✔ Подключение установлено');

    const db = client.db(DB_NAME);
    const buildInfo = await db.command({ buildInfo: 1 });
    console.log(`Версия MongoDB: ${buildInfo.version}`);
    console.log(`База данных: ${DB_NAME}`);
    console.log(`Пользователь: student`);

    const adminDb = client.db('admin').admin();
    const dbs = await adminDb.listDatabases();
    console.log('\n=== Информация о сервере ===');
    console.log('Список БД:');
    dbs.databases.forEach((d) => console.log(`- ${d.name}`));

    const collections = await db.listCollections().toArray();
    console.log(`\nКоллекции в ${DB_NAME}:`);
    if (collections.length === 0) console.log('(пусто – БД создана лениво)');
    else collections.forEach((c) => console.log(`- ${c.name}`));

    console.log('\n=== Heartbeat ===');
    console.log('Ожидание heartbeat (5 сек)...');
    await new Promise((r) => setTimeout(r, 5000));

    console.log('\n✔ Соединение стабильно');
  } catch (err) {
    console.error('✘ Ошибка подключения:', err.message);
  } finally {
    await client.close();
    console.log('✘ Соединение закрыто');
  }
})();