const fs = require('fs');
const path = require('path');

function initProject({ name, type, typescript, prettier, git }) {
  if (!name) throw new Error('Не указано имя проекта');
  if (!type) throw new Error('Не указан тип проекта');

  const dir = path.join(process.cwd(), name);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const pkg = {
    name,
    version: '1.0.0',
    type: type === 'cli' ? 'commonjs' : 'module',
    scripts: {},
  };
  if (typescript) pkg.devDependencies = { typescript: '^5.0.0' };
  if (prettier)   pkg.devDependencies = { ...(pkg.devDependencies || {}), prettier: '^3.0.0' };

  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify(pkg, null, 2));

  return { name, type, typescript: !!typescript, prettier: !!prettier, git: !!git, dir };
}

function buildProject({ config = 'config.json' } = {}) {
  const cfgPath = path.join(process.cwd(), config);
  if (!fs.existsSync(cfgPath)) {
    const err = new Error(`файл ${config} не найден`);
    err.code = 'CONFIG_NOT_FOUND';
    throw err;
  }
  const start = Date.now();
  // имитация сборки
  while (Date.now() - start < 300) {}
  return { ok: true, dist: 'dist/my-app.js', duration: Date.now() - start };
}

function testProject() {
  return { passed: 15, total: 15, coverage: 87 };
}

function deployProject({ env = 'production', force = false } = {}) {
  if (env === 'production' && !force) {
    const err = new Error('Для развёртывания в production требуется --force');
    err.code = 'FORCE_REQUIRED';
    throw err;
  }
  return { ok: true, url: `https://my-app.example.com (${env})` };
}

module.exports = { initProject, buildProject, testProject, deployProject };
