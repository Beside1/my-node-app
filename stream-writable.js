const { Writable } = require('stream');

const GROUP = 'ББМО-01-23';

class MyWritable extends Writable {
  constructor(options) {
    super(options);
    this.written = 0;
  }

  _write(chunk, encoding, callback) {
    const text = chunk.toString().trim();
    console.log(`[WRITE] ${text}`);

    setTimeout(() => {
      this.written += 1;
      callback();
    }, 50);
  }
}

console.log('=== Демонстрация Writable-потока ===\n');

const writer = new MyWritable({ highWaterMark: 16 });

writer.on('drain', () => {
  console.log('[DRAIN] Буфер освобождён, продолжаем запись');
});

writer.on('finish', () => {
  console.log(`\n[FINISH] Все данные записаны`);
  console.log(`Всего записано: ${writer.written} чанка`);
});

writer.on('error', (err) => {
  console.error('[ERROR]', err.message);
});

const data = [
  `Группа: ${GROUP}`,
  'Студент: Черепович Владислав',
  'Лабораторная работа: №21',
  'Тема: Потоки в Node.js',
];

let i = 0;

function writeNext() {
  while (i < data.length) {
    const ok = writer.write(data[i]);
    console.log(`write() вернул: ${ok}`);

    if (!ok) {
      console.log('  ← буфер переполнен, ждём drain');
      i += 1;
      return; 
    }

    i += 1;
  }

  writer.end();
}

writer.once('drain', writeNext);

writeNext();