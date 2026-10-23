const os = require('os');

const GROUP = 'ББМО-01-23';

function maskMac(mac) {
  if (!mac || mac === '00:00:00:00:00:00') return mac;

  const parts = mac.split(':');
  if (parts.length !== 6) return mac;

  return `${parts[0]}:${parts[1]}:${parts[2]}:****:****`;
}

const interfaces = os.networkInterfaces();
let primary = null;

console.log('=== Сетевые интерфейсы ===');

for (const [name, addresses] of Object.entries(interfaces)) {
  console.log(`\nИнтерфейс: ${name}`);

  for (const addr of addresses) {
    const isIPv4 = addr.family === 'IPv4' || addr.family === 4;
    const family = isIPv4 ? 'IPv4' : 'IPv6';

    console.log(`  ${family}: ${addr.address}`);
    console.log(`  MAC: ${maskMac(addr.mac)}`);
    console.log(`  Внутренний: ${addr.internal ? 'да' : 'нет'}`);
    console.log(`  CIDR: ${addr.cidr || 'нет'}`);

    if (!primary && isIPv4 && !addr.internal) {
      primary = { name, address: addr.address };
    }
  }
}

console.log('\n--- Основной интерфейс ---');
if (primary) {
  console.log(`${primary.name} (${primary.address})`);
} else {
  console.log('Внешний IPv4-интерфейс не найден');
}

console.log('\n=== Информация о пользователе ===');
const user = os.userInfo();

console.log(`Имя пользователя: ${user.username}`);
console.log(`UID: ${user.uid}`);
console.log(`GID: ${user.gid}`);
console.log(`Домашняя директория: ${user.homedir}`);
console.log(`Оболочка: ${user.shell || 'не определена'}`);

console.log(`\nГруппа: ${GROUP}`);

const isUnix = process.platform !== 'win32';
const uid = typeof process.getuid === 'function' ? process.getuid() : null;
const isRoot = isUnix && uid === 0;

console.log(`Проверка root: ${isRoot ? 'да' : 'нет'}`);

if (isRoot) {
  console.log('Внимание: скрипт запущен от root!');
}