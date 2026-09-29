#!/usr/bin/env node

// ============================================================
//  CLI-приложение — Задание 1
//  Позиционные аргументы, справка, коды возврата
// ============================================================

const GROUP = '401';
const STUDENT = 'Черепович Владислав Дмитриевич';
const LAB = '№17';

// argv[0] = node, argv[1] = путь к скрипту, дальше — аргументы
const args = process.argv.slice(2);
const command = args[0];

function printHelp() {
  console.log(`Использование: my-cli <команда> [аргументы]

Доступные команды:
  greet <имя>    - поприветствовать пользователя
  info           - вывести информацию о группе
  help           - показать эту справку

Примеры:
  my-cli greet "Иван"
  my-cli info
`);
}

function greet(name) {
  if (!name) {
    console.error('Ошибка: укажите имя. Пример: my-cli greet "Иван"');
    process.exit(1);
  }
  console.log(`Привет, ${name}! Добро пожаловать в CLI-приложение группы ББМО-01-23.`);
}

function info() {
  const now = new Date().toISOString().slice(0, 10);
  console.log(`Группа: ${GROUP}`);
  console.log(`Студент: ${STUDENT}`);
  console.log(`Лабораторная работа: ${LAB}`);
  console.log(`Дата: ${now}`);
}

if (!command) {
  printHelp();
  process.exit(0);
}

switch (command) {
  case 'greet':
    greet(args[1]);
    break;

  case 'info':
    info();
    break;

  case 'help':
  case '--help':
  case '-h':
    printHelp();
    break;

  default:
    console.error(`Ошибка: неизвестная команда "${command}"`);
    console.error('Для справки используйте: my-cli --help');
    process.exit(1);
}
