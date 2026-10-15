const { deployProject } = require('../services/projectService');
const log = require('../utils/logger');

module.exports = function registerDeploy(program) {
  program
    .command('deploy')
    .description('развернуть проект')
    .option('--env <env>', 'окружение', 'production')
    .option('--force', 'без подтверждения')
    .action((options) => {
      try {
        if (options.env === 'production' && !options.force) {
          log.warn('Вы собираетесь развернуть проект в production!');
          process.exit(1);
        }
        const r = deployProject({ ...options, force: true });
        log.success('Развёрнуто успешно');
        log.info(`URL: ${r.url}`);
      } catch (err) {
        log.error(err.message);
        process.exit(1);
      }
    });
};
