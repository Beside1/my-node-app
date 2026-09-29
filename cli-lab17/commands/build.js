const { buildProject } = require('../services/projectService');
const log = require('../utils/logger');

module.exports = function registerBuild(program) {
  program
    .command('build')
    .description('собрать проект')
    .option('--config <path>', 'путь к конфигу', 'config.json')
    .action((options) => {
      try {
        const result = buildProject(options);
        log.success(`Сборка завершена за ${(result.duration / 1000).toFixed(1)}s`);
        log.info(`Результат: ${result.dist}`);
      } catch (err) {
        if (process.env.NODE_ENV === 'development') {
          log.error(err.stack || err.message);
        } else {
          log.error(err.message);
        }
        process.exit(1);
      }
    });
};
