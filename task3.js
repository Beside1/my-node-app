'use strict';

/**
 * Лабораторная работа № 14. Задание 3.
 * Рекурсивный анализ директории + формирование JSON-отчёта.
 * Вариант: 5 → игнорируем файлы размером более 10 МБ.
 *
 * 
 */

const fs = require('fs').promises;
const path = require('path');

const VARIANT = 5;
const MAX_FILE_SIZE = 10 * 1024 * 1024; 
const REPORT_NAME = `report_${VARIANT}.json`;
const REPORT_PATH = path.join(__dirname, REPORT_NAME);


function humanSize(bytes) {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / 1024 / 1024).toFixed(2)} МБ`;
}


function toRelPath(root, full) {
  const rel = path.relative(root, full);
  return './' + rel.split(path.sep).join('/');
}

/**
 * 
 * @param {string} dir 
 * @param {object} ctx 
 */
async function scan(dir, ctx) {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch (err) {
    console.warn(`⚠  Не удалось прочитать ${dir}: ${err.code} — ${err.message}`);
    return;
  }

  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    try {
      if (entry.isDirectory()) {
        ctx.folders++;
        await scan(full, ctx);
      } else if (entry.isFile()) {

        if (entry.name === REPORT_NAME) continue;

        const st = await fs.stat(full);

        if (st.size > MAX_FILE_SIZE) {
          ctx.skipped.push({
            name: entry.name,
            path: toRelPath(ctx.root, full),
            size: st.size,
          });
          continue;
        }

        const ext = path.extname(entry.name).toLowerCase() || '(без расширения)';
        ctx.files++;
        ctx.totalSize += st.size;
        ctx.list.push({
          name: entry.name,
          path: toRelPath(ctx.root, full),
          size: st.size,
          ext,
        });
      }
    } catch (err) {
      console.warn(`⚠  Ошибка при обработке ${full}: ${err.code} — ${err.message}`);
    }
  }
}

function groupByExtension(list) {
  const map = new Map();
  for (const f of list) {
    if (!map.has(f.ext)) map.set(f.ext, { extension: f.ext, count: 0, sizeBytes: 0 });
    const g = map.get(f.ext);
    g.count++;
    g.sizeBytes += f.size;
  }
  return [...map.values()]
    .map((g) => ({ ...g, sizeHuman: humanSize(g.sizeBytes) }))
    .sort((a, b) => b.sizeBytes - a.sizeBytes);
}

function topBySize(list, n, direction) {
  const sorted = [...list].sort((a, b) =>
    direction === 'desc' ? b.size - a.size : a.size - b.size
  );
  return sorted.slice(0, n).map((f) => ({
    name: f.name,
    path: f.path,
    size: f.size,
    sizeHuman: humanSize(f.size),
  }));
}

async function main() {

  const arg = process.argv[2] || '.';
  const root = path.resolve(arg);

  try {
    const st = await fs.stat(root);
    if (!st.isDirectory()) throw new Error('указанный путь не является директорией');
  } catch (err) {
    console.error(`[Ошибка] ${err.code ? err.code + ' — ' : ''}${err.message}`);
    process.exitCode = 1;
    return;
  }

  const ctx = { root, folders: 0, files: 0, totalSize: 0, list: [], skipped: [] };

  console.log(`🔍 Анализ директории: ${arg}`);
  await scan(root, ctx);

  const byExt = groupByExtension(ctx.list);
  const largest = topBySize(ctx.list, 5, 'desc');
  const smallest = topBySize(ctx.list, 5, 'asc');

  const sep = '─'.repeat(45);
  console.log(sep);
  console.log(`Общее количество папок:  ${ctx.folders}`);
  console.log(`Общее количество файлов: ${ctx.files}`);
  console.log(
    `Общий размер: ${humanSize(ctx.totalSize)} (${ctx.totalSize.toLocaleString('ru-RU')} байт)`
  );
  if (ctx.skipped.length) {
    console.log(`Пропущено файлов > 10 МБ: ${ctx.skipped.length}`);
  }
  console.log(sep);

  console.log('Расширения файлов:');
  if (byExt.length === 0) console.log('  (файлов не найдено)');
  for (const g of byExt) {
    console.log(`  ${g.extension.padEnd(20)} ${String(g.count).padStart(3)} файл(ов) — ${g.sizeHuman}`);
  }
  console.log(sep);

  console.log('Топ-5 самых больших файлов:');
  largest.forEach((f, i) => console.log(`  ${i + 1}. ${f.name} (${f.sizeHuman}) — ${f.path}`));
  console.log('Топ-5 самых маленьких файлов:');
  smallest.forEach((f, i) => console.log(`  ${i + 1}. ${f.name} (${f.sizeHuman}) — ${f.path}`));
  console.log(sep);

  const report = {
    variant: VARIANT,
    directory: arg,
    scannedAt: new Date().toISOString(),
    totals: {
      folders: ctx.folders,
      files: ctx.files,
      sizeBytes: ctx.totalSize,
      sizeKB: +(ctx.totalSize / 1024).toFixed(2),
      sizeMB: +(ctx.totalSize / 1024 / 1024).toFixed(2),
    },
    ignored: {
      rule: 'файлы размером более 10 МБ (варианты 1–5)',
      count: ctx.skipped.length,
      files: ctx.skipped,
    },
    byExtension: byExt,
    top5Largest: largest,
    top5Smallest: smallest,
  };

  try {
    await fs.writeFile(REPORT_PATH, JSON.stringify(report, null, 2), 'utf8');
    console.log(`📄 Отчёт сохранён: ${REPORT_NAME}`);
  } catch (err) {
    console.error(`[Ошибка] запись отчёта: ${err.code} — ${err.message}`);
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error('Непредвиденная ошибка:', err);
  process.exitCode = 1;
});