'use strict';

/**
 * Лабораторная работа № 14. Задание 4.
 * Потоковая обработка большого текстового файла.
 * Вариант: 5 → дополнительно считаем чётные и нечётные числа.
 *
 * 
 */

const fs = require('fs');
const fsp = require('fs').promises;
const path = require('path');
const readline = require('readline');
const { once } = require('events');

const VARIANT = 5;
const TOTAL_LINES = 100_000;
const HIGH_WATER_MARK = 64 * 1024; // 64 КБ — размер буфера потока

const DATA_FILE = path.join(__dirname, `data_${VARIANT}.txt`);
const RESULT_FILE = path.join(__dirname, `processed_${VARIANT}.txt`);

/** Человекочитаемый размер */
function humanSize(bytes) {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / 1024 / 1024).toFixed(2)} МБ`;
}


async function generateFile() {
  try {
    const st = await fsp.stat(DATA_FILE);
    console.log(`ℹ  Файл ${path.basename(DATA_FILE)} уже существует (${humanSize(st.size)}) — генерация пропущена.`);
    return st.size;
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
  }

  console.log(`⚙  Генерация ${path.basename(DATA_FILE)} (${TOTAL_LINES.toLocaleString('ru-RU')} строк)...`);
  const stream = fs.createWriteStream(DATA_FILE, {
    encoding: 'utf8',
    highWaterMark: HIGH_WATER_MARK,
  });

  try {
    for (let i = 1; i <= TOTAL_LINES; i++) {
      const num = 1 + Math.floor(Math.random() * 1000); 
      const line = `${i}, ${num}, Вариант ${VARIANT}\n`;

      if (!stream.write(line)) await once(stream, 'drain');
    }
    await new Promise((resolve, reject) => {
      stream.on('error', reject);
      stream.end(resolve);
    });
  } catch (err) {
    stream.destroy();
    throw err;
  }

  const st = await fsp.stat(DATA_FILE);
  console.log(`✅ Файл создан: ${path.basename(DATA_FILE)} — ${humanSize(st.size)}`);
  return st.size;
}

async function countLines(file) {
  const stream = fs.createReadStream(file, { highWaterMark: HIGH_WATER_MARK });
  let count = 0;
  for await (const chunk of stream) {
    for (let i = 0; i < chunk.length; i++) {
      if (chunk[i] === 0x0a) count++; // \n
    }
  }
  return count;
}


async function processFile(totalLines) {
  const input = fs.createReadStream(DATA_FILE, {
    encoding: 'utf8',
    highWaterMark: HIGH_WATER_MARK, // потоковое чтение буфером 64 КБ
  });
  const rl = readline.createInterface({ input, crlfDelay: Infinity });

  let count = 0;
  let sum = 0;
  let min = Infinity;
  let max = -Infinity;
  let even = 0; 
  let odd = 0;  
  let nextMark = 10;

  for await (const line of rl) {
    if (!line) continue;

    const parts = line.split(',');
    const num = Number(parts[1]);
    if (!Number.isFinite(num)) continue;

    count++;
    sum += num;
    if (num < min) min = num;
    if (num > max) max = num;
    if (num % 2 === 0) even++; else odd++;

    const percent = Math.floor((count / totalLines) * 100);
    if (percent >= nextMark) {
      console.log(`⏳ Прогресс: ${nextMark}% (${count.toLocaleString('ru-RU')} строк обработано)`);
      nextMark += 10;
    }
  }

  return {
    count, sum, min, max, even, odd,
    avg: count ? sum / count : 0,
  };
}


async function main() {
  const startedAt = Date.now();

  try {
  
    const fileSize = await generateFile();
    console.log(`📦 Размер файла: ${humanSize(fileSize)}`);

  
    const totalLines = await countLines(DATA_FILE);
    console.log(`📊 Всего строк в файле: ${totalLines.toLocaleString('ru-RU')}`);


    console.log(`\n▶  Обработка файла: ${path.basename(DATA_FILE)}`);
    const r = await processFile(totalLines);

    const elapsed = (Date.now() - startedAt) / 1000;
    console.log('✅ Обработка завершена!\n');


    const reportLines = [
      `Результаты обработки файла ${path.basename(DATA_FILE)}`,
      '='.repeat(46),
      `Дата обработки:            ${new Date().toLocaleString('ru-RU')}`,
      `Размер файла:              ${humanSize(fileSize)}`,
      `Всего строк:               ${r.count.toLocaleString('ru-RU')}`,
      `Сумма чисел:               ${r.sum.toLocaleString('ru-RU')}`,
      `Среднее арифметическое:    ${r.avg.toFixed(2)}`,
      `Максимальное число:        ${r.max}`,
      `Минимальное число:         ${r.min}`,
      `Чётных чисел:              ${r.even.toLocaleString('ru-RU')}`,
      `Нечётных чисел:            ${r.odd.toLocaleString('ru-RU')}`,
      `Время выполнения:          ${elapsed.toFixed(2)} сек`,
      '',
    ];

    await fsp.writeFile(RESULT_FILE, reportLines.join('\n'), 'utf8');

    console.log(reportLines.slice(2, -1).join('\n'));
    console.log(`\n📄 Результаты сохранены в: ${path.basename(RESULT_FILE)}`);
    console.log(`⏱  Время выполнения: ${elapsed.toFixed(2)} сек`);
  } catch (err) {
    console.error(`[Ошибка] ${err.code ? err.code + ' — ' : ''}${err.message}`);
    process.exitCode = 1;
  }
}

main();