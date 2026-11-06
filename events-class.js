const EventEmitter = require('events');

const GROUP = 'ББМО-01-23';

class DatabaseConnection extends EventEmitter {
  constructor(name) {
    super();
    this.name = name;
    this.connected = false;
  }

  connect() {
    this.emit('connect', `Подключение к БД "${this.name}"...`);
    this.connected = true;
    this.emit('connect', 'Соединение установлено');
  }

  query(sql) {
    if (!this.connected) {
      this.error('Нет соединения с БД');
      return;
    }

    this.emit('query', `Выполнение запроса: ${sql}`);

    if (sql.trim().toUpperCase().startsWith('SELECT')) {
      this.emit('query', 'Результат: 50 записей');
    } else if (sql.trim().toUpperCase().startsWith('INSERT')) {
      this.emit('query', 'Результат: 1 запись добавлена');
    } else {
      this.emit('query', 'Результат: OK');
    }
  }

  close() {
    this.emit('close', 'Закрытие соединения');
    this.connected = false;
    this.emit('close', 'Соединение закрыто');
  }

  error(message) {
    this.emit('error', new Error(message));
  }
}

const db = new DatabaseConnection(`DatabaseConnection (группа ${GROUP})`);

console.log(`1. ${db.name}`);

db.on('connect', (msg) => console.log(`[EVENT] ${msg}`));
db.on('query', (msg) => console.log(`[EVENT] ${msg}`));
db.on('close', (msg) => console.log(`[EVENT] ${msg}`));
db.on('error', (err) => console.log(`[EVENT] Ошибка: ${err.message}`));

db.connect();
db.query('SELECT * FROM students');
db.query('INSERT INTO students');
db.close();

console.log('[EVENT] Демонстрация ошибки');
db.error('Connection timeout');
console.log('(без слушателя error — процесс упал бы с исключением)');

if (process.argv.includes('--crash')) {
  const { spawn } = require('child_process');
  console.log('\n=== Демонстрация падения без слушателя error ===');
  const child = spawn(process.execPath, ['-e', `
    const EventEmitter = require('events');
    const e = new EventEmitter();
    e.emit('error', new Error('нет слушателя error'));
  `], { stdio: 'inherit' });

  child.on('exit', (code) => {
    console.log(`Дочерний процесс завершился с кодом: ${code}`);
  });
}