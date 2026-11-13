const fs = require('fs');
const path = require('path');
const { pipeline, Transform } = require('stream');
const { promisify } = require('util');

const GROUP = 'ББМО-01-23';
const pipeAsync = promisify(pipeline);

const INPUT = path.join(__dirname, 'input.txt');
const OUT_PIPE = path.join(__dirname, 'output-pipe.txt');
const OUT_PIPELINE = path.join(__dirname, 'output-pipeline.txt');
const OUT_CHAIN = path.join(__dirname, 'output-chain.txt');

const inputContent = `Группа: ${GROUP}\nСтудент: Черепович Владислав\nЛабораторная работа: №21\nТема: Потоки в Node.js\n`;
fs.writeFileSync(INPUT, inputContent, 'utf8');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function demoPipeOk() {
  return new Promise((resolve) => {
    console.log('== Демонстрация pipe() ==');
    console.log(`Чтение: ${path.basename(INPUT)}`);
    console.log(`Запись: ${path.basename(OUT_PIPE)}`);

    const rs = fs.createReadStream(INPUT);
    const ws = fs.createWriteStream(OUT_PIPE);

    rs.pipe(ws);

    ws.on('finish', () => {
      const size = fs.statSync(OUT_PIPE).size;
      console.log(`Копирование завершено`);
      console.log(`Размер: ${size} байт\n`);
      resolve();
    });
  });
}

function demoPipeError() {
  return new Promise((resolve) => {
    console.log('== Демонстрация pipe() с ошибкой ==');
    console.log('Чтение: missing.txt');

    const rs = fs.createReadStream(path.join(__dirname, 'missing.txt'));
    const ws = fs.createWriteStream(path.join(__dirname, 'output-pipe-error.txt'));

    rs.pipe(ws);

    rs.on('error', (err) => {
      console.log(`Ошибка: ${err.message}`);
      console.log(`Внимание: pipe() не закрыл целевой поток!`);
      console.log(`Возможна утечка памяти.`);
      console.log(`ws.writableEnded = ${ws.writableEnded}`);
      console.log(`rs.destroyed = ${rs.destroyed}\n`);
      ws.destroy();
      resolve();
    });
  });
}

function demoPipelineOk() {
  return pipeAsync(
    fs.createReadStream(INPUT),
    fs.createWriteStream(OUT_PIPELINE)
  ).then(() => {
    console.log('== Демонстрация pipeline() ==');
    console.log(`Чтение: ${path.basename(INPUT)}`);
    console.log(`Запись: ${path.basename(OUT_PIPELINE)}`);
    console.log(`Копирование завершено\n`);
  });
}

function demoPipelineError() {
  console.log('== Демонстрация pipeline() с ошибкой ==');
  console.log('Чтение: missing.txt');

  return pipeAsync(
    fs.createReadStream(path.join(__dirname, 'missing.txt')),
    fs.createWriteStream(path.join(__dirname, 'output-pipeline-error.txt'))
  )
    .then(() => {
      console.log('Странно: ошибки не было\n');
    })
    .catch((err) => {
      console.log(`Ошибка: ${err.message}`);
      console.log(`Все потоки автоматически закрыты`);
      console.log(`Утечек нет\n`);
    });
}

async function demoChain() {
  console.log('== Цепочка потоков ==');
  console.log('input.txt → uppercase → reverse → output-chain.txt');

  const upper = new Transform({
    transform(chunk, enc, cb) {
      cb(null, chunk.toString().toUpperCase());
    },
  });

  const reverse = new Transform({
    transform(chunk, enc, cb) {
      cb(null, chunk.toString().split('').reverse().join(''));
    },
  });

  await pipeAsync(
    fs.createReadStream(INPUT),
    upper,
    reverse,
    fs.createWriteStream(OUT_CHAIN)
  );

  console.log('Обработка завершена\n');
}

(async () => {
  await demoPipeOk();
  await demoPipeError();
  await demoPipelineOk();
  await demoPipelineError();
  await demoChain();

  console.log('=== Содержимое выходных файлов ===');
  for (const f of [OUT_PIPE, OUT_PIPELINE, OUT_CHAIN]) {
    console.log(`\n--- ${path.basename(f)} ---`);
    console.log(fs.readFileSync(f, 'utf8'));
  }
})();