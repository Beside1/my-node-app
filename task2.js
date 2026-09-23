'use strict';

/**
 * Лабораторная работа № 14. Задание 2.
 * Работа с каталогами (создание, обход, перемещение, переименование, удаление).
 * Вариант: 5 (нечётный → в src/components создаём папки 1, 2, 3)
 */

const fs = require('fs').promises;
const path = require('path');

const VARIANT = 5;
const ROOT = path.join(__dirname, `project_${VARIANT}`);

const STRUCTURE = {
  src: {
    info: 'Исходный код проекта',
    children: {
      modules: { info: 'Переиспользуемые модули приложения' },
      components: {
        info: 'Компоненты пользовательского интерфейса',

        children: {
          '1': { info: 'Вложенная папка компонента № 1' },
          '2': { info: 'Вложенная папка компонента № 2' },
          '3': { info: 'Вложенная папка компонента № 3' },
        },
      },
      utils: { info: 'Вспомогательные утилиты' },
    },
  },
  data: {
    info: 'Данные проекта',
    children: {
      input:  { info: 'Входные данные' },
      output: { info: 'Результаты работы (будет переименована в results)' },
    },
  },
  temp: { info: 'Временные файлы (удаляется после обработки)' },
};

/**
 * 
 * @param {string} dir 
 * @param {object} node 
 */
async function createStructure(dir, node) {
  await fs.mkdir(dir, { recursive: true });                   
  await fs.writeFile(                                          
    path.join(dir, 'info.txt'),
    `${node.info || 'Папка проекта'}\n`,
    'utf8'
  );
  for (const [name, child] of Object.entries(node.children || {})) {
    await createStructure(path.join(dir, name), child);
  }
}

/**
 * 
 * @param {string} dir
 * @param {string} prefix
 * @returns {Promise<string>}
 */
async function buildTree(dir, prefix = '') {
  let out = '';
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch (err) {
    return `${prefix}└── [недоступно: ${err.code}]\n`;
  }

  entries.sort((a, b) => {
    if (a.isDirectory() !== b.isDirectory()) return a.isDirectory() ? -1 : 1;
    return a.name.localeCompare(b.name, 'ru');
  });

  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    const last = i === entries.length - 1;
    out += `${prefix}${last ? '└── ' : '├── '}${e.name}${e.isDirectory() ? '/' : ''}\n`;
    if (e.isDirectory()) {
      out += await buildTree(path.join(dir, e.name), prefix + (last ? '    ' : '│   '));
    }
  }
  return out;
}

async function printTree(title) {
  console.log(`\n${title}`);
  console.log(`${path.basename(ROOT)}/`);
  console.log(await buildTree(ROOT));
}

async function main() {
  try {
    await fs.rm(ROOT, { recursive: true, force: true }); // чистим прошлый запуск
    await createStructure(ROOT, { children: STRUCTURE });
    console.log(`✅ Структура создана: ${path.basename(ROOT)}`);

    await printTree('Исходное дерево:');

    const tempOld = path.join(ROOT, 'temp');
    const tempNew = path.join(ROOT, 'data', 'temp');
    await fs.rename(tempOld, tempNew);
    console.log('➡  temp перемещена в data/');

    const outOld = path.join(ROOT, 'data', 'output');
    const outNew = path.join(ROOT, 'data', 'results');
    await fs.rename(outOld, outNew);
    console.log('➡  data/output переименована в data/results');

    await fs.rm(tempNew, { recursive: true, force: true });
    console.log('🗑  data/temp удалена вместе с содержимым');

    await printTree('Обновлённое дерево:');
  } catch (err) {

    console.error(`[Ошибка] ${err.code ? err.code + ' — ' : ''}${err.message}`);
    process.exitCode = 1;
  }
}

main();