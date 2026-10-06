const os = require('os');
const fs = require('fs');
const path = require('path');

const GROUP = 'ББМО-01-23';
const LOG_FILE = path.join(__dirname, 'monitor.log');
const INTERVAL_MS = 2000;
const MEM_WARNING_PERCENT = process.env.MEM_WARNING_PERCENT
  ? Number(process.env.MEM_WARNING_PERCENT)
  : 10;

let warningsCount = 0;
let lastCpuTimes = getCpuTimes();
let lastCpuLevel = 'норма';
let lastMemLow = false;

function getCpuTimes() {
  const cpus = os.cpus();

  let user = 0;
  let nice = 0;
  let sys = 0;
  let idle = 0;
  let irq = 0;

  for (const cpu of cpus) {
    user += cpu.times.user;
    nice += cpu.times.nice;
    sys += cpu.times.sys;
    idle += cpu.times.idle;
    irq += cpu.times.irq;
  }

  const total = user + nice + sys + idle + irq;

  return { user, nice, sys, idle, irq, total };
}

function calcCpuLoad(prev, curr) {
  const idleDiff = curr.idle - prev.idle;
  const totalDiff = curr.total - prev.total;

  if (totalDiff <= 0) return 0;

  const busyDiff = totalDiff - idleDiff;
  return Math.max(0, Math.min(100, (busyDiff / totalDiff) * 100));
}

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

function getPrimaryInterface() {
  const interfaces = os.networkInterfaces();

  for (const [name, addresses] of Object.entries(interfaces)) {
    for (const addr of addresses) {
      const isIPv4 = addr.family === 'IPv4' || addr.family === 4;

      if (isIPv4 && !addr.internal) {
        return { name, address: addr.address };
      }
    }
  }

  return null;
}

function collectSnapshot() {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const user = os.userInfo();

  return {
    group: GROUP,
    timestamp: new Date().toISOString(),
    platform: os.platform(),
    type: os.type(),
    arch: os.arch(),
    release: os.release(),
    hostname: os.hostname(),
    uptime: os.uptime(),
    process: {
      pid: process.pid,
      node: process.version,
      uptime: process.uptime(),
      cwd: process.cwd(),
    },
    memory: {
      total: totalMem,
      free: freeMem,
      used: usedMem,
      usedPercent: (usedMem / totalMem) * 100,
      freePercent: (freeMem / totalMem) * 100,
    },
    user: {
      username: user.username,
      uid: user.uid,
      gid: user.gid,
      homedir: user.homedir,
      shell: user.shell,
    },
    primaryInterface: getPrimaryInterface(),
  };
}

function formatTimestamp(date) {
  const pad = (n) => String(n).padStart(2, '0');

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function logWarning(message) {
  warningsCount += 1;

  const line = `[${formatTimestamp(new Date())}] [${GROUP}] Предупреждение: ${message}\n`;
  fs.appendFileSync(LOG_FILE, line, 'utf8');
}

function render(cpuLoad, snapshot) {
  console.clear();

  console.log(`Мониторинг (группа ${GROUP}). Ctrl+C для выхода.`);
  console.log(`Время: ${new Date(snapshot.timestamp).toLocaleString()}`);
  console.log(`Платформа: ${snapshot.platform} | ${snapshot.type} | ${snapshot.arch}`);
  console.log(`Версия ОС: ${snapshot.release}`);
  console.log(`Хост: ${snapshot.hostname}`);
  console.log(`Uptime системы: ${formatUptime(snapshot.uptime)}`);
  console.log(`PID: ${snapshot.process.pid} | Node.js: ${snapshot.process.node}`);
  console.log(`Пользователь: ${snapshot.user.username} | Дом: ${snapshot.user.homedir}`);

  if (snapshot.primaryInterface) {
    console.log(
      `Основной интерфейс: ${snapshot.primaryInterface.name} (${snapshot.primaryInterface.address})`
    );
  }

  console.log('');
  console.log(
    `CPU: ${cpuLoad.toFixed(1)}% | RAM: ${snapshot.memory.usedPercent.toFixed(1)}% (${toGB(
      snapshot.memory.free
    )} ГБ свободно)`
  );

  let cpuStatus = 'норма';
  if (cpuLoad > 80) cpuStatus = 'КРИТИЧНО: CPU > 80%';
  else if (cpuLoad > 50) cpuStatus = 'ПРЕДУПРЕЖДЕНИЕ: CPU > 50%';

  let memStatus = 'норма';
  if (snapshot.memory.freePercent < MEM_WARNING_PERCENT) {
    memStatus = `ПРЕДУПРЕЖДЕНИЕ: свободная память < ${MEM_WARNING_PERCENT}%`;
  }

  console.log(`CPU статус: ${cpuStatus}`);
  console.log(`RAM статус: ${memStatus}`);
}

function handleWarnings(cpuLoad, snapshot) {
  let cpuLevel = 'норма';

  if (cpuLoad > 80) cpuLevel = 'critical';
  else if (cpuLoad > 50) cpuLevel = 'warning';

  if (cpuLevel !== lastCpuLevel) {
    if (cpuLevel === 'critical') {
      logWarning(`CPU > 80%: ${cpuLoad.toFixed(1)}%`);
    } else if (cpuLevel === 'warning') {
      logWarning(`CPU > 50%: ${cpuLoad.toFixed(1)}%`);
    }

    lastCpuLevel = cpuLevel;
  }

  const memLow = snapshot.memory.freePercent < MEM_WARNING_PERCENT;

  if (memLow && !lastMemLow) {
    logWarning(
      `Свободная память < ${MEM_WARNING_PERCENT}%: ${snapshot.memory.freePercent.toFixed(1)}%`
    );
  }

  lastMemLow = memLow;
}

function tick() {
  const currCpuTimes = getCpuTimes();
  const cpuLoad = calcCpuLoad(lastCpuTimes, currCpuTimes);
  lastCpuTimes = currCpuTimes;

  const snapshot = collectSnapshot();

  render(cpuLoad, snapshot);
  handleWarnings(cpuLoad, snapshot);
}

fs.appendFileSync(
  LOG_FILE,
  `[${formatTimestamp(new Date())}] [${GROUP}] Мониторинг запущен\n`,
  'utf8'
);

console.log(`Мониторинг (группа ${GROUP}). Ctrl+C для выхода.`);
console.log('Первичный сбор данных...');

const initialSnapshot = collectSnapshot();
console.dir(initialSnapshot, { depth: null, colors: false });

console.log('\nНажмите Enter для запуска периодического мониторинга...');

process.stdin.resume();
process.stdin.once('data', () => {
  lastCpuTimes = getCpuTimes();

  setInterval(tick, INTERVAL_MS);
  tick();
});

process.on('SIGINT', () => {
  console.log(`\nМониторинг остановлен. Предупреждений: ${warningsCount}`);
  process.exit(0);
});