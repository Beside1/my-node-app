const { Readable, Transform, Writable } = require('stream');
const { pipeline } = require('stream/promises');

const GROUP = 'ББМО-01-23';

class UpperCaseTransform extends Transform {
  constructor() {
    super();
  }

  _transform(chunk, encoding, callback) {
    const text = chunk.toString().trim();
    callback(null, `[${GROUP}] ${text.toUpperCase()}\n`);
  }
}

class JsonParserTransform extends Transform {
  constructor() {
    super({ readableObjectMode: true });
  }

  _transform(chunk, encoding, callback) {
    const lines = chunk.toString().split('\n').filter(Boolean);
    for (const line of lines) {
      try {
        const obj = JSON.parse(line);
        this.push(obj);
      } catch (err) {

      }
    }
    callback();
  }
}

class FilterTransform extends Transform {
  constructor(predicate) {
    super({ objectMode: true });
    this.predicate = predicate;
  }

  _transform(obj, encoding, callback) {
    if (this.predicate(obj)) this.push(obj);
    callback();
  }
}

class CollectorWritable extends Writable {
  constructor() {
    super({ objectMode: true });
    this.items = [];
  }

  _write(obj, encoding, callback) {
    this.items.push(obj);
    console.log(`[COLLECT] ${obj.name} (${obj.group}, курс ${obj.course})`);
    callback();
  }
}

async function demoUpper() {
  console.log('=== Демонстрация UpperCaseTransform ===');

  const source = Readable.from([
    'студент: иванов иван\n',
    'группа: ббмо-01-23\n',
    'тема: потоки в node.js\n',
  ]);

  await pipeline(
    source,
    new UpperCaseTransform(),
    new Writable({
      write(chunk, enc, cb) {
        process.stdout.write(chunk.toString());
        cb();
      },
    })
  );
  console.log();
}

async function demoObjectMode() {
  console.log('=== Демонстрация Object Mode ===');

  const jsonLines =
    JSON.stringify({ id: 1, name: 'Иванов Иван', group: GROUP, course: 2 }) + '\n' +
    JSON.stringify({ id: 2, name: 'Петрова Мария', group: GROUP, course: 2 }) + '\n' +
    JSON.stringify({ id: 3, name: 'Сидоров Олег', group: 'ДРУГАЯ', course: 1 }) + '\n';

  const source = Readable.from([jsonLines]);
  const collector = new CollectorWritable();

  await pipeline(
    source,
    new JsonParserTransform(),
    new FilterTransform((obj) => obj.group === GROUP),
    collector
  );

  console.log(`Итого после фильтра: ${collector.items.length}`);
  console.log();
}

async function demoAsyncIterator() {
  console.log('=== Демонстрация async iterator ===');

  const source = Readable.from([
    JSON.stringify({ id: 10, name: 'A', group: GROUP, course: 3 }) + '\n',
    JSON.stringify({ id: 11, name: 'B', group: GROUP, course: 3 }) + '\n',
    JSON.stringify({ id: 12, name: 'C', group: GROUP, course: 3 }) + '\n',
  ]);

  const parser = new JsonParserTransform();
  source.pipe(parser);

  let count = 0;
  for await (const obj of parser) {
    count += 1;
    console.log(`[ASYNC] ${count}: ${obj.name}`);
  }

  console.log(`Всего прочитано через for-await: ${count}`);
}

(async () => {
  await demoUpper();
  await demoObjectMode();
  await demoAsyncIterator();
})();