const { initProject } = require('../services/projectService');
const log = require('../utils/logger');

module.exports = function registerInit(program) {
  program
    .command('init')
    .description('инициализировать проект')
    .option('--name <name>', 'имя проекта')
    .option('--type <type>', 'тип проекта')
    .option('--typescript', 'добавить TypeScript')
    .option('--prettier', 'добавить Prettier')
    .option('--git', 'инициализировать Git')
    .action((options) => {
      try {
        const result = initProject(options);
        log.success(`Проект "${result.name}" создан`);
        log.success('Установлены зависимости');
        if (result.git) log.success('Инициализирован Git-репозиторий');
        log.info('Проект готов к работе!');
      } catch (err) {
        log.error(err.message);
        process.exit(1);
      }
    });
};
