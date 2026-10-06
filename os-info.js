const os = require('os');

const GROUP = 'ББМО-01-23';

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

const platform = os.platform();

console.log(`=== Информация о системе (группа ${GROUP}) ===`);
console.log(`Платформа: ${platform}`);
console.log(`Тип ОС: ${os.type()}`);
console.log(`Архитектура: ${os.arch()}`);
console.log(`Версия ОС: ${os.release()}`);
console.log(`Имя хоста: ${os.hostname()}`);
console.log(`Время работы: ${formatUptime(os.uptime())}`);

switch (platform) {
  case 'win32':
    console.log('Вы работаете в Windows');
    break;
  case 'linux':
    console.log('Вы работаете в Linux');
    break;
  case 'darwin':
    console.log('Вы работаете в macOS');
    break;
  default:
    console.log('Неизвестная платформа');
}