const { Readable } = require('stream');

const GROUP = 'ББМО-01-23';

const chunks = [
  `Группа: ${GROUP}`,
  'Студент: Черепович Владислав',
  'Лабораторная работа: №21',
  'Тема: Потоки в Node.js',
];

class MyReadable extends Readable {
  constructor(items) {
    super({ encoding: 'utf8' });
    this.items = items;
    this.index = 0;
  }

  _read() {
    if (this.index < this.items.length) {
      const chunk = this.items[this.index];
      this.index += 1;

      setImmediate(() => this.push(chunk + '\n'));
    } else {
      this.push(null); 
    }
  }
}

console.log('=== Демонстрация Readable-потока ===\n');

const reader = new MyReadable(chunks);

let chunkNumber = 0;
let totalBytes = 0;

reader.on('data', (chunk) => {
  chunkNumber += 1;
  totalBytes += Buffer.byteLength(chunk);
  console.log(`[CHUNK ${chunkNumber}] ${chunk.toString().trim()}`);
});

reader.on('end', () => {
  console.log(`\n[END] Поток завершён`);
  console.log(`Всего получено чанков: ${chunkNumber}`);
  console.log(`Всего получено байт: ${totalBytes}`);
});

reader.on('error', (err) => {
  console.error('[ERROR]', err.message);
});