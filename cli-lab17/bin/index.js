#!/usr/bin/env node



const { Command } = require('commander');
const program = new Command();

const GROUP = '401';
const STUDENT = 'Черепович Владислав Дмитриевич';

program
  .name('my-cli')
  .description('CLI-приложение для лабораторной работы №17')
  .version('1.0.0');

// --- Глобальный флаг -v/--verbose ---
program.option('-v, --verbose', 'подробный вывод');


program
  .command('generate')
  .description('сгенерировать отчёт')
  .option('-t, --type <type>', 'тип отчёта', 'html')
  .option('-o, --output <path>', 'путь для сохранения')
  .option('-f, --force', 'перезаписать существующий файл')
  .option('--dry-run', 'показать что будет сделано без выполнения')
  .action((options) => {
    const validTypes = ['html', 'pdf', 'json', 'csv'];
    if (!validTypes.includes(options.type)) {
      console.error(`Ошибка: недопустимый тип отчёта "${options.type}".`);
      console.error(`Допустимые значения: ${validTypes.join(', ')}`);
      process.exit(1);
    }

    const output = options.output || `./output.${options.type}`;

    if (options.dryRun) {
      console.log(`[DRY-RUN] Будет сгенерирован отчёт типа: ${options.type}`);
      console.log(`[DRY-RUN] Файл будет сохранён в: ${output}`);
      console.log('[DRY-RUN] Действия не выполнены (режим проверки)');
      return;
    }

    if (program.opts().verbose) {
      console.log('[VERBOSE] Запуск генерации отчёта...');
      console.log(`[VERBOSE] Тип отчёта: ${options.type}`);
      console.log(`[VERBOSE] Путь сохранения: ${output}`);
    }

    console.log(`Отчёт успешно сгенерирован: ${output}`);
  });

program
  .command('convert')
  .description('конвертировать файл')
  .argument('<input>', 'исходный файл')
  .option('-o, --output <path>', 'выходной файл')
  .option('-f, --format <format>', 'целевой формат', 'json')
  .action((input, options) => {
    const output = options.output || `${input}.${options.format}`;
    console.log(`Конвертация: ${input} → ${output}`);
    console.log(`Формат: ${options.format}`);
  });

program
  .command('info')
  .description('информация о группе и студенте')
  .action(() => {
    const now = new Date().toISOString().slice(0, 10);
    console.log(`Группа: ${GROUP}`);
    console.log(`Студент: ${STUDENT}`);
    console.log(`Лабораторная работа: №17`);
    console.log(`Дата: ${now}`);
  });


program
  .command('greet')
  .description('поприветствовать пользователя')
  .argument('<name>', 'имя пользователя')
  .action((name) => {
    console.log(`Привет, ${name}! Добро пожаловать в CLI-приложение группы ББМО-01-23.`);
  });


program.showHelpAfterError('(используйте --help для справки)');
program.parse(process.argv);