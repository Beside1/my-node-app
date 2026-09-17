'use strict';

/**
 * Лабораторная работа № 14. Задание 1.
 * Создание и чтение файлов средствами fs.promises (async/await).
 * Вариант: 5
 */

const fs = require('fs').promises; 
const path = require('path');      

const VARIANT = 5;
const STUDENT = 'Иванов Иван';
const GROUP   = 'ИС-202';

const FAVORITES = [
  '«Война и мир» — Л. Толстой',
  '«Преступление и наказание» — Ф. Достоевский',
  '«Мастер и Маргарита» — М. Булгаков',
  '«1984» — Дж. Оруэлл',
  '«Гарри Поттер» — Дж. Роулинг',
];

const FILE_NAME = `student_${VARIANT}.txt`;
const FILE_PATH = path.join(__dirname, FILE_NAME);

/**
 * 
 * @param {Date} date
 * @returns {string}
 */
function formatDate(date) {
  const p = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())} ` +
         `${p(date.getHours())}:${p(date.getMinutes())}:${p(date.getSeconds())}`;
}


function logError(step, err) {
  console.error(`[Ошибка] ${step}: ${err.code ? err.code + ' — ' : ''}${err.message}`);
}

async function main() {
  
  const lines = [
    `Студент: ${STUDENT}`,
    `Группа: ${GROUP}`,
    `Вариант: ${VARIANT}`,
    `Дата: ${formatDate(new Date())}`,
    'Любимые книги:',
    ...FAVORITES.map((title, i) => `${i + 1}. ${title}`),
  ];


  try {
    await fs.writeFile(FILE_PATH, lines.join('\n') + '\n', 'utf8');
    console.log(`Создан файл: ${FILE_NAME}`);
  } catch (err) {
    logError('создание файла', err);
    return;
  }

  let lineCount = 0;
  try {
    const written = await fs.readFile(FILE_PATH, 'utf8');
    lineCount = written.split('\n').filter((l) => l.trim() !== '').length;
  } catch (err) {
    logError('чтение файла для подсчёта строк', err);
    return;
  }

  try {
    await fs.appendFile(FILE_PATH, `Количество записей: ${lineCount}\n`, 'utf8');
  } catch (err) {
    logError('дозапись в файл', err);
    return;
  }

  try {
    const content = await fs.readFile(FILE_PATH, 'utf8');
    const sep = '─'.repeat(33);
    console.log('Содержимое файла:');
    console.log(sep);
    process.stdout.write(content.endsWith('\n') ? content : content + '\n');
    console.log(sep);
  } catch (err) {
    logError('чтение итогового файла', err);
  }
}

main().catch((err) => {
  console.error('Непредвиденная ошибка:', err);
  process.exitCode = 1;
});