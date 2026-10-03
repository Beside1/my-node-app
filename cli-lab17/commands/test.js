const { testProject } = require('../services/projectService');
const log = require('../utils/logger');

module.exports = function registerTest(program) {
  program
    .command('test')
    .description('запустить тесты')
    .action(() => {
      const r = testProject();
      log.success(`Пройдено: ${r.passed}/${r.total} тестов`);
      log.success(`Покрытие: ${r.coverage}%`);
    });
};
