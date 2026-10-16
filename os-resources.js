const os = require('os');

const GROUP = 'ББМО-01-23';
const MEM_WARNING_PERCENT = process.env.MEM_WARNING_PERCENT
  ? Number(process.env.MEM_WARNING_PERCENT)
  : 10;

function toGB(bytes) {
  return (bytes / 1024 ** 3).toFixed(2);
}

function formatUptime(totalSeconds) {
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);

  const parts = [];
  if (days > 0) parts.push(`${days} д`);
  if (hours > 0 || days > 0) parts.push(`${hours} ч`);
  parts.push(`${minutes} мин`);
  parts.push(`${seconds} сек`);

  return parts.join(' ');
}

console.log(`=== Ресурсы системы (группа ${GROUP}) ===`);

console.log('\n--- Информация о процессе ---');
console.log(`PID: ${process.pid}`);
console.log(`PPID: ${process.ppid}`);
console.log(`Имя процесса: ${process.title}`);
console.log(`Node.js: ${process.version}`);
console.log(`Платформа процесса: ${process.platform}`);
console.log(`Архитектура процесса: ${process.arch}`);
console.log(`Время работы процесса: ${formatUptime(process.uptime())}`);
console.log(`Текущая директория: ${process.cwd()}`);
console.log(`Исполняемый файл: ${process.execPath}`);
console.log(`Аргументы: ${process.argv.join(' ')}`);

const processMemory = process.memoryUsage();

console.log('\n--- Память процесса ---');
console.log(`RSS: ${toGB(processMemory.rss)} ГБ`);
console.log(`Heap total: ${toGB(processMemory.heapTotal)} ГБ`);
console.log(`Heap used: ${toGB(processMemory.heapUsed)} ГБ`);
console.log(`External: ${toGB(processMemory.external)} ГБ`);

const totalMem = os.totalmem();
const freeMem = os.freemem();
const usedMem = totalMem - freeMem;
const usedPercent = (usedMem / totalMem) * 100;
const freePercent = (freeMem / totalMem) * 100;

console.log('\n--- Память системы ---');
console.log(`Всего: ${toGB(totalMem)} ГБ`);
console.log(`Использовано: ${toGB(usedMem)} ГБ (${usedPercent.toFixed(1)}%)`);
console.log(`Свободно: ${toGB(freeMem)} ГБ (${freePercent.toFixed(1)}%)`);

const loadAvg = os.loadavg();

console.log('\n--- Средняя загрузка ---');
console.log(`1 мин: ${loadAvg[0].toFixed(2)}`);
console.log(`5 мин: ${loadAvg[1].toFixed(2)}`);
console.log(`15 мин: ${loadAvg[2].toFixed(2)}`);

if (process.platform === 'win32') {
  console.log('Примечание: в Windows os.loadavg() возвращает [0, 0, 0].');
}

if (freePercent < MEM_WARNING_PERCENT) {
  console.log(
    `Предупреждение: свободной памяти меньше ${MEM_WARNING_PERCENT}% (${freePercent.toFixed(1)}%)`
  );
} else {
  console.log('Память в норме');
}