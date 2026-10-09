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


program
  .command('init')
  .description('инициализировать новый проект')
  .option('--name <name>', 'название проекта')
  .option('--type <type>', 'тип проекта: web | cli | lib | micro')
  .option('--typescript', 'добавить TypeScript')
  .option('--eslint', 'добавить ESLint')
  .option('--prettier', 'добавить Prettier')
  .option('--jest', 'добавить Jest')
  .option('--git', 'инициализировать Git')
  .option('--token <token>', 'токен доступа')
  .option('--no-interactive', 'отключить интерактивный режим')
  .action(async (options) => {

    const hasAllFlags = options.name && options.type;


    if (options.interactive === false) {
      if (!options.name || !options.type) {
        console.error('Ошибка: в неинтерактивном режиме необходимо указать --name и --type');
        process.exit(1);
      }
      printInitResult(options);
      return;
    }


    if (!hasAllFlags) {
      const { default: inquirer } = await import('inquirer');

      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'name',
          message: 'Введите название проекта:',
          default: 'my-project',
          when: !options.name,
        },
        {
 	  type: 'select',   
	  name: 'type',
          message: 'Выберите тип проекта:',
          choices: [
            { name: 'Web-приложение', value: 'web' },
            { name: 'CLI-утилита',    value: 'cli' },
            { name: 'Библиотека',      value: 'lib' },
            { name: 'Микросервис',     value: 'micro' },
          ],
          when: !options.type,
        },
        {
          type: 'checkbox',
          name: 'features',
          message: 'Выберите дополнительные опции:',
          choices: [
            { name: 'TypeScript', value: 'typescript' },
            { name: 'ESLint',     value: 'eslint' },
            { name: 'Prettier',   value: 'prettier' },
            { name: 'Jest',       value: 'jest' },
          ],
          when: !options.typescript && !options.eslint && !options.prettier && !options.jest,
        },
        {
          type: 'confirm',
          name: 'git',
          message: 'Использовать Git?',
          default: true,
          when: options.git === undefined,
        },
        {
          type: 'password',
          name: 'token',
          message: 'Введите токен доступа:',
          mask: '*',
          when: !options.token,
        },
      ]);

      Object.assign(options, answers);
      if (answers.features) {
        for (const f of answers.features) options[f] = true;
      }
    }

    printInitResult(options);
  });

function printInitResult(opts) {
  const features = [];
  if (opts.typescript) features.push('TypeScript');
  if (opts.eslint)     features.push('ESLint');
  if (opts.prettier)   features.push('Prettier');
  if (opts.jest)       features.push('Jest');

  console.log(`  Проект "${opts.name}" успешно инициализирован!`);
  console.log(`  Тип: ${opts.type}`);
  console.log(`  Опции: ${features.length ? features.join(', ') : '—'}`);
  console.log(`  Git: ${opts.git ? 'да' : 'нет'}`);
}


const chalk = require('chalk');
const ora = require('ora');
const cliProgress = require('cli-progress');

// Silence is Golden: цветной вывод только если stdout — TTY
const useColor = process.stdout.isTTY;
const c = {
  success: (s) => useColor ? chalk.green(s)   : s,
  warn:    (s) => useColor ? chalk.yellow(s)  : s,
  error:   (s) => useColor ? chalk.red(s)     : s,
  info:    (s) => useColor ? chalk.blue(s)    : s,
};

program
  .command('process')
  .description('обработать файлы')
  .requiredOption('--files <files...>', 'список файлов')
  .option('--delay <ms>', 'задержка между файлами', '300')
  .action(async (options) => {
    const fs = require('fs');
    const files = options.files;
    const delay = Number(options.delay);

    const spinner = ora('Обработка файлов...').start();
    await new Promise((r) => setTimeout(r, 500));
    spinner.succeed(c.success(`Файлы найдены (${files.length} шт.)`));


    const bar = new cliProgress.SingleBar({
      format: 'Обработка |' + chalk.cyan('{bar}') + '| {percentage}% | {value}/{total} | ETA: {eta}s',
      hideCursor: true,
    }, cliProgress.Presets.shades_classic);

    bar.start(files.length, 0);

    const results = [];
    let failed = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      await new Promise((r) => setTimeout(r, delay));

      if (fs.existsSync(file) || file.endsWith('.txt')) {
        results.push({ file, status: 'ok' });
        process.stderr.write(c.success(`✔ Файл ${file} обработан\n`));
      } else {
        failed++;
        results.push({ file, status: 'missing' });
        process.stderr.write(c.error(`✖ Файл ${file} не найден\n`));
      }
      bar.update(i + 1);
    }

    bar.stop();

    if (failed > 0) {
      process.stderr.write(c.warn(`⚠ Пропущено ${failed} файл(ов)\n`));
    }


    process.stdout.write(JSON.stringify({ processed: results.length - failed, failed, results }, null, 2) + '\n');

    if (failed > 0) process.exit(1);
  });

program.showHelpAfterError('(используйте --help для справки)');
program.parse(process.argv);