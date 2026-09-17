'use strict';

/**
 * Лабораторная работа № 14. Задание 5.
 * Резервное копирование с использованием потоков + синхронизация директорий.
 * Вариант: 5 → при копировании текстовые файлы «сжимаются»
 *              (удаляются лишние пробелы).
 *
 * 
 */

const fs = require('fs');
const fsp = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const { Transform } = require('stream');
const { pipeline } = require('stream/promises');

const VARIANT = 5;

const SRC_DIR = path.join(__dirname, `source_${VARIANT}`);
const DST_DIR = path.join(__dirname, `backup_${VARIANT}`);
const REPORT_PATH = path.join(__dirname, `sync_report_${VARIANT}.txt`);

const STREAM_EXT = ['.txt', '.js', '.json'];                             
const BINARY_EXT = ['.jpg', '.png', '.gif'];                            
const TEXT_EXT   = ['.txt', '.js', '.json', '.md', '.css', '.html', '.log']; 

const BIG_FILE   = 1024 * 1024;  
const CHUNK_SIZE = 512 * 1024;  


const DEMO_DIVERGENCE = true;


function humanSize(bytes) {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / 1024 / 1024).toFixed(2)} МБ`;
}

async function exists(p) {
  try { await fsp.access(p); return true; } catch { return false; }
}

/**
 * 
 * 
 * 
 * @param {string} text
 * @returns {string}
 */
function compressText(text) {
  return text
    .replace(/[ \t]+/g, ' ')    
    .replace(/[ \t]+\n/g, '\n'); 
}


class CompressTransform extends Transform {
  constructor() {
    super();
    this.pending = '';
  }

  _transform(chunk, _enc, cb) {
    const text = this.pending + (typeof chunk === 'string' ? chunk : chunk.toString('utf8'));
    const m = text.match(/[ \t]+$/);           // хвост из пробелов
    const tail = m ? m[0] : '';
    const body = tail ? text.slice(0, -tail.length) : text;
    this.push(compressText(body));
    this.pending = tail;
    cb();
  }

  _flush(cb) {
    this.push(compressText(this.pending));
    cb();
  }
}


function makeTextContent(targetBytes, seed) {
  const words = ['lorem', 'ipsum', 'dolor', 'sit', 'amet', 'node', 'stream', 'async', 'await', 'fs'];
  const parts = [];
  let size = 0;
  let i = 0;
  while (size < targetBytes) {
    const line =
      `${i + 1}:   ${words[(i + seed) % words.length]}    ` +
      `${words[(i * 3 + seed) % words.length]}   ${words[(i * 7 + seed) % words.length]}\n`;
    parts.push(line);
    size += Buffer.byteLength(line);
    i++;
  }
  return parts.join('');
}

async function writeTestFile(fullPath, ext, index, sizeBytes) {
  if (BINARY_EXT.includes(ext)) {
  
    await fsp.writeFile(fullPath, crypto.randomBytes(sizeBytes));
  } else if (TEXT_EXT.includes(ext) || ext === '.json') {
    const content = ext === '.json'
      ? JSON.stringify({ id: index, name: path.basename(fullPath), payload: 'x'.repeat(Math.min(sizeBytes, 2000)) }, null, 2)
      : makeTextContent(sizeBytes, index);
    await fsp.writeFile(fullPath, content, 'utf8');
  } else {
    await fsp.writeFile(fullPath, `Файл ${path.basename(fullPath)}\n`.repeat(Math.max(1, Math.floor(sizeBytes / 32))), 'utf8');
  }
}

async function createTestStructure() {
  await fsp.rm(SRC_DIR, { recursive: true, force: true });
  await fsp.mkdir(SRC_DIR, { recursive: true });

  const exts = ['.txt', '.js', '.json', '.md', '.css', '.html', '.jpg', '.png', '.gif', '.log'];


  for (let i = 1; i <= 20; i++) {
    const ext = exts[(i - 1) % exts.length];
    const name = `file_${String(i).padStart(2, '0')}${ext}`;
    const size = 60 * 1024 * i;
    await writeTestFile(path.join(SRC_DIR, name), ext, i, size);
  }

 
  const subdirs = [
    { name: 'docs',    ext: '.md',   count: 3 },
    { name: 'images',  ext: '.png',  count: 2 },
    { name: 'scripts', ext: '.js',   count: 3 },
  ];
  for (const sd of subdirs) {
    const dir = path.join(SRC_DIR, sd.name);
    await fsp.mkdir(dir, { recursive: true });
    for (let i = 1; i <= sd.count; i++) {
      const size = 10 * 1024 * i;
      await writeTestFile(path.join(dir, `${sd.name}_${i}${sd.ext}`), sd.ext, i, size);
    }
  }

 
  const all = await walk(SRC_DIR);
  const manifest = {
    variant: VARIANT,
    createdAt: new Date().toISOString(),
    files: [],
  };
  for (const f of all) {
    if (path.basename(f.full) === 'manifest.json') continue;
    const st = await fsp.stat(f.full);
    manifest.files.push({
      path: f.rel.split(path.sep).join('/'),
      extension: path.extname(f.rel).toLowerCase(),
      sizeBytes: st.size,
      modified: st.mtime.toISOString(),
    });
  }
  await fsp.writeFile(
    path.join(SRC_DIR, 'manifest.json'),
    JSON.stringify(manifest, null, 2),
    'utf8'
  );

  console.log(`✅ Тестовая структура создана: ${path.basename(SRC_DIR)} (${manifest.files.length + 1} файлов)`);
}


async function walk(dir, base = dir) {
  const result = [];
  let entries;
  try {
    entries = await fsp.readdir(dir, { withFileTypes: true });
  } catch (err) {
    if (err.code === 'ENOENT') return result;
    throw err;
  }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) result.push(...await walk(full, base));
    else if (e.isFile()) result.push({ full, rel: path.relative(base, full) });
  }
  return result;
}


async function streamCopyWithCompression(src, dst, size) {

  const hwm = size > BIG_FILE ? CHUNK_SIZE : 64 * 1024;
  await pipeline(
    fs.createReadStream(src, { encoding: 'utf8', highWaterMark: hwm }),
    new CompressTransform(),
    fs.createWriteStream(dst, { encoding: 'utf8', highWaterMark: hwm })
  );
}


async function streamCopy(src, dst, size) {
  const hwm = size > BIG_FILE ? CHUNK_SIZE : 64 * 1024;
  await pipeline(
    fs.createReadStream(src, { highWaterMark: hwm }),
    fs.createWriteStream(dst, { highWaterMark: hwm })
  );
}


async function plainCopy(src, dst) {
  await fsp.copyFile(src, dst);
}

async function copyAll() {
  const files = await walk(SRC_DIR);
  const total = files.length;
  let done = 0;
  let streamed = 0;
  let plain = 0;
  let totalSize = 0;

  const startedAt = Date.now();
  console.log(`\n📂 Исходная директория:      ${path.basename(SRC_DIR)}`);
  console.log(`📂 Директория назначения:    ${path.basename(DST_DIR)}`);
  console.log(`🔎 Обнаружено файлов:        ${total}\n`);

  await fsp.rm(DST_DIR, { recursive: true, force: true });

  for (const f of files) {
    const ext = path.extname(f.rel).toLowerCase();
    const st = await fsp.stat(f.full);
    totalSize += st.size;

    const dst = path.join(DST_DIR, f.rel);
    await fsp.mkdir(path.dirname(dst), { recursive: true }); 

    try {
      if (BINARY_EXT.includes(ext)) {

        await plainCopy(f.full, dst);
        plain++;
      } else if (STREAM_EXT.includes(ext) || TEXT_EXT.includes(ext)) {

        await streamCopyWithCompression(f.full, dst, st.size);
        streamed++;
      } else {
       
        await streamCopy(f.full, dst, st.size);
        streamed++;
      }
    } catch (err) {
      console.error(`  ✖ Ошибка копирования ${f.rel}: ${err.code} — ${err.message}`);
    }

    done++;
    if (done % 5 === 0 || done === total) {
      console.log(`⏳ Прогресс копирования: ${done}/${total} файлов`);
    }
  }

  const elapsed = (Date.now() - startedAt) / 1000;
  console.log('✅ Копирование завершено!\n');
  console.log('Статистика:');
  console.log(`  - Скопировано файлов:     ${done}`);
  console.log(`  - Потоковое копирование:  ${streamed}`);
  console.log(`  - Обычное копирование:    ${plain}`);
  console.log(`  - Общий размер исходника: ${humanSize(totalSize)}`);
  console.log(`  - Время выполнения:       ${elapsed.toFixed(2)} сек`);

  return { total: done, streamed, plain, totalSize, elapsed };
}


async function collectFiles(dir) {
  const map = new Map();
  const files = await walk(dir);
  for (const f of files) {
    try {
      const st = await fsp.stat(f.full);
      map.set(f.rel.split(path.sep).join('/'), { full: f.full, size: st.size, mtimeMs: st.mtimeMs });
    } catch (err) {
      console.warn(`⚠  Не удалось прочитать ${f.rel}: ${err.message}`);
    }
  }
  return map;
}


async function signature(filePath) {
  const ext = path.extname(filePath).toLowerCase();

  if (TEXT_EXT.includes(ext)) {
    const text = await fsp.readFile(filePath, 'utf8');
    return crypto.createHash('md5').update(compressText(text), 'utf8').digest('hex');
  }

  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('md5');
    fs.createReadStream(filePath)
      .on('error', reject)
      .on('data', (chunk) => hash.update(chunk))
      .on('end', () => resolve(hash.digest('hex')));
  });
}

async function syncDirectories() {
  const srcFiles = await collectFiles(SRC_DIR);
  const dstFiles = await collectFiles(DST_DIR);

  const same = [];
  const changed = [];
  const added = [];   
  const removed = [];

  for (const [rel, s] of srcFiles) {
    if (!dstFiles.has(rel)) { added.push(rel); continue; }
    const d = dstFiles.get(rel);
    const [sh, dh] = [await signature(s.full), await signature(d.full)];
    if (sh === dh) {
      same.push(rel);
    } else {
      const reasons = [];
      if (s.size !== d.size) reasons.push('size');
      if (s.mtimeMs !== d.mtimeMs) reasons.push('modified');
      changed.push({ rel, srcSize: s.size, dstSize: d.size, reasons: reasons.join(', ') || 'content' });
    }
  }
  for (const rel of dstFiles.keys()) {
    if (!srcFiles.has(rel)) removed.push(rel);
  }

  return { same, changed, added, removed };
}

async function main() {
  try {

    await createTestStructure();


    await copyAll();

  
    if (DEMO_DIVERGENCE) {
      console.log('\n🧪 Вносим демонстрационные расхождения в source для проверки синхронизации...');
   
      await fsp.appendFile(path.join(SRC_DIR, 'file_01.txt'), '\nдобавленная позже строка\n', 'utf8');
   
      await fsp.writeFile(path.join(SRC_DIR, `new_file_${VARIANT}.txt`), 'совершенно новый файл\n', 'utf8');

      await fsp.rm(path.join(SRC_DIR, 'file_02.js'), { force: true });
    }

    console.log('\n🔍 Сравнение директорий...');
    const { same, changed, added, removed } = await syncDirectories();

    console.log('Сравнение директорий:');
    console.log(`  - Совпадают: ${same.length} файл(ов)`);
    console.log(`  - Изменены:  ${changed.length} файл(ов)`);
    console.log(`  - Добавлены: ${added.length} файл(ов)`);
    console.log(`  - Удалены:   ${removed.length} файл(ов)`);

    const lines = [
      `Отчёт синхронизации (вариант ${VARIANT})`,
      '='.repeat(46),
      `Дата:                  ${new Date().toLocaleString('ru-RU')}`,
      `Исходная директория:   ${path.basename(SRC_DIR)}`,
      `Директория назначения: ${path.basename(DST_DIR)}`,
      '',
      `Совпадают: ${same.length}`,
      `Изменены:  ${changed.length}`,
      ...changed.map((c) => `  ~ ${c.rel} (source: ${humanSize(c.srcSize)}, backup: ${humanSize(c.dstSize)}; ${c.reasons})`),
      `Добавлены: ${added.length}`,
      ...added.map((r) => `  + ${r}`),
      `Удалены:   ${removed.length}`,
      ...removed.map((r) => `  - ${r}`),
      '',
    ];

    await fsp.writeFile(REPORT_PATH, lines.join('\n'), 'utf8');
    console.log(`\n📄 Отчёт сохранён: ${path.basename(REPORT_PATH)}`);
  } catch (err) {
    console.error(`[Ошибка] ${err.code ? err.code + ' — ' : ''}${err.message}`);
    process.exitCode = 1;
  }
}

main();