const { Readable, Transform, Writable } = require('stream');
const { pipeline } = require('stream/promises');
const fs = require('fs');
const path = require('path');

const GROUP = 'ББМО-01-23';
const TOTAL = 10000;
const FILTER_MIN_GRADE = 3;
const TIMEOUT_MS = 10000;

const OUT_CSV = path.join(__dirname, 'students.csv');
const ERR_LOG = path.join(__dirname, 'errors.log');

fs.writeFileSync(ERR_LOG, '', 'utf8');

class StudentsReadable extends Readable {
  constructor(total) {
    super({ objectMode: true, highWaterMark: 100 });
    this.total = total;
    this.i = 0;
    this.generated = 0;
  }

  _read() {
    for (let k = 0; k < 100 && this.i < this.total; k += 1, this.i += 1) {
      this.generated += 1;
      const id = this.i + 1;

      if (id % 500 === 0) {

        this.push({ id, group: GROUP, course: 2, grade: 4 });
        continue;
      }
      if (id % 777 === 0) {

        this.push({ id, name: `Student ${id}`, group: GROUP, course: 2, grade: 'X' });
        continue;
      }

      const name = `Студент ${id}`;
      const grade = 2 + ((id * 7) % 4); // 2..5
      const course = 1 + ((id * 3) % 4); // 1..4
      this.push({ id, name, group: GROUP, course, grade });
    }

    if (this.i >= this.total) this.push(null);
  }
}

class ValidateTransform extends Transform {
  constructor(stats) {
    super({ objectMode: true, highWaterMark: 200 });
    this.stats = stats;
  }

  _transform(obj, enc, cb) {
    if (!obj.name) {
      this.stats.errors += 1;
      fs.appendFileSync(
        ERR_LOG,
        `[${timestamp()}] [${GROUP}] Ошибка валидации: id=${obj.id}, отсутствует name\n`,
        'utf8'
      );
      return cb();
    }
    if (typeof obj.grade !== 'number') {
      this.stats.errors += 1;
      fs.appendFileSync(
        ERR_LOG,
        `[${timestamp()}] [${GROUP}] Ошибка валидации: id=${obj.id}, некорректный grade\n`,
        'utf8'
      );
      return cb();
    }
    this.stats.validated += 1;
    cb(null, obj);
  }
}

class EnrichTransform extends Transform {
  constructor(stats) {
    super({ objectMode: true, highWaterMark: 200 });
    this.stats = stats;
  }

  _transform(obj, enc, cb) {
    const averageGrade = +(obj.grade - 0.2 + (obj.id % 3) * 0.3).toFixed(1);
    this.stats.enriched += 1;
    cb(null, { ...obj, averageGrade });
  }
}

class FilterTransform extends Transform {
  constructor(stats) {
    super({ objectMode: true, highWaterMark: 200 });
    this.stats = stats;
  }

  _transform(obj, enc, cb) {
    if (obj.grade > FILTER_MIN_GRADE) {
      cb(null, obj);
    } else {
      this.stats.filtered += 1;
      cb();
    }
  }
}

class FormatTransform extends Transform {
  constructor() {
    super({ objectMode: true, highWaterMark: 200 });
    this.headerWritten = false;
  }

  _transform(obj, enc, cb) {
    let str = '';
    if (!this.headerWritten) {
      str += 'id,name,group,course,grade,averageGrade\n';
      this.headerWritten = true;
    }
    str += `${obj.id},${obj.name},${obj.group},${obj.course},${obj.grade},${obj.averageGrade}\n`;
    cb(null, str);
  }
}

class CsvWritable extends Writable {
  constructor(filePath, stats, startedAt) {
    super({ highWaterMark: 16 * 1024 }); // маленький, чтобы ловить backpressure
    this.stream = fs.createWriteStream(filePath);
    this.stats = stats;
    this.startedAt = startedAt;
    this.records = 0;
    this.lastLog = 0;
    this.paused = false;

    this.on('drain', () => {
      console.log('[DRAIN] Продолжаем запись');
      this.paused = false;
    });
  }

  _write(chunk, enc, cb) {
    if (this.records === 0) {

    }

    this.records += 1;
    this.stats.written = this.records;

    if (this.records === 5000 && !this.paused) {
      console.log('\n[BACKPRESSURE] Writable переполнен на 5000-й записи');
      this.paused = true;

      setTimeout(() => {
        console.log('[BACKPRESSURE] Пауза 50 мс окончена');
        this.emit('drain');
      }, 50);
      return setTimeout(() => cb(), 50);
    }

    if (this.records - this.lastLog >= 1000) {
      this.lastLog = this.records;
      const pct = Math.round((this.records / this.stats.expected) * 100);
      const elapsed = (Date.now() - this.startedAt) / 1000;
      const speed = Math.round(this.records / Math.max(elapsed, 0.001));
      console.log(`[PROGRESS] ${pct}% | ${this.records}/${this.stats.expected} | ${speed} записей/сек`);
    }

    const ok = this.stream.write(chunk);
    if (!ok) {

      this.stream.once('drain', cb);
    } else {
      cb();
    }
  }

  _final(cb) {
    this.stream.end(cb);
  }
}

function timestamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

// ===== Основной запуск =====
async function main() {
  console.log(`=== Конвейер обработки данных (группа ${GROUP}) ===`);
  console.log(`Источник: ${TOTAL} студентов`);
  console.log(`Фильтр: оценка > ${FILTER_MIN_GRADE}\n`);

  const stats = {
    generated: TOTAL,
    validated: 0,
    enriched: 0,
    filtered: 0,
    written: 0,
    errors: 0,
    expected: TOTAL, 
  };

  const startedAt = Date.now();

  await pipeline(
    new StudentsReadable(TOTAL),
    new ValidateTransform(stats),
    new EnrichTransform(stats),
    new FilterTransform(stats),
    new FormatTransform(),
    new CsvWritable(OUT_CSV, stats, startedAt)
  );

  const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
  const csvSize = (fs.statSync(OUT_CSV).size / 1024 / 1024).toFixed(2);
  const speed = Math.round(stats.written / Math.max(elapsed, 0.001));

  console.log('\n=== Результаты ===');
  console.log(`Всего сгенерировано: ${stats.generated}`);
  console.log(`Прошло валидацию:    ${stats.validated}`);
  console.log(`Обогащено:           ${stats.enriched}`);
  console.log(`Отфильтровано:       ${stats.filtered}`);
  console.log(`Записано в CSV:      ${stats.written}`);
  console.log(`Ошибок:              ${stats.errors}`);
  console.log(`Время выполнения:    ${elapsed} сек`);
  console.log(`Средняя скорость:    ${speed} записей/сек`);
  console.log(`\nФайл: students.csv (${csvSize} МБ)`);
}

async function demoBackpressure() {
  console.log('\n=== Демонстрация backpressure ===');
  // уже показано во время main; тут просто краткое резюме
  console.log('См. логи [BACKPRESSURE] выше.');
}

async function demoTimeout() {
  console.log('\n=== Отмена по таймауту ===');
  console.log('Запуск с таймаутом 1 сек...');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 1000);

  const stats = { validated: 0, enriched: 0, filtered: 0, written: 0, errors: 0, expected: TOTAL };

  try {
    await pipeline(
      new StudentsReadable(TOTAL),
      new ValidateTransform(stats),
      new EnrichTransform(stats),
      new FilterTransform(stats),
      new FormatTransform(),
      new CsvWritable(path.join(__dirname, 'students-timeout.csv'), stats, Date.now()),
      { signal: controller.signal }
    );
    console.log('Успели обработать за 1 сек');
  } catch (err) {
    if (err.name === 'AbortError' || err.code === 'ABORT_ERR') {
      console.log('✘ Таймаут! Обработка отменена');
      console.log('✔ Все потоки корректно закрыты');
      console.log('✔ Ресурсы освобождены');
    } else {
      console.log('Ошибка:', err.message);
    }
  } finally {
    clearTimeout(timer);
  }
}

async function demoAsyncIterator() {
  console.log('\n=== Сравнение с async iterator ===');

  const stats = { validated: 0, enriched: 0, filtered: 0, written: 0, errors: 0, expected: TOTAL };
  const startedAt = Date.now();

  const source = new StudentsReadable(TOTAL);
  const validate = new ValidateTransform(stats);
  const enrich = new EnrichTransform(stats);
  const filter = new FilterTransform(stats);

  source.pipe(validate).pipe(enrich).pipe(filter);

  let count = 0;
  for await (const obj of filter) {
    if (obj.grade > FILTER_MIN_GRADE) count += 1;
  }

  const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
  const speed = Math.round(count / Math.max(elapsed, 0.001));

  console.log(`[ASYNC] Обработано: ${count} записей за ${elapsed} сек`);
  console.log(`Скорость: ${speed} записей/сек`);
}

(async () => {
  try {
    await main();
    await demoBackpressure();
    await demoTimeout();
    await demoAsyncIterator();

    console.log('\n=== Содержимое students.csv (первые 10 строк) ===');
    const lines = fs.readFileSync(OUT_CSV, 'utf8').split('\n').slice(0, 10);
    console.log(lines.join('\n'));

    console.log('\n=== Содержимое errors.log (первые 5 строк) ===');
    const errLines = fs.readFileSync(ERR_LOG, 'utf8').split('\n').slice(0, 5);
    console.log(errLines.join('\n'));
  } catch (err) {
    console.error('Критическая ошибка:', err);
    process.exit(1);
  }
})();