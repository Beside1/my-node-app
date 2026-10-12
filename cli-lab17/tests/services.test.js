const { initProject, buildProject, testProject, deployProject } = require('../services/projectService');
const fs = require('fs');
const path = require('path');

describe('projectService', () => {
  test('initProject создаёт папку и package.json', () => {
    const result = initProject({ name: 'test-app', type: 'cli' });
    expect(fs.existsSync(result.dir)).toBe(true);
    expect(fs.existsSync(path.join(result.dir, 'package.json'))).toBe(true);
    fs.rmSync(result.dir, { recursive: true, force: true });
  });

  test('initProject без name бросает ошибку', () => {
    expect(() => initProject({ type: 'cli' })).toThrow('Не указано имя проекта');
  });

  test('buildProject без конфига бросает CONFIG_NOT_FOUND', () => {
    expect(() => buildProject({ config: 'nonexistent.json' })).toThrow('не найден');
  });

  test('testProject возвращает корректные данные', () => {
    const r = testProject();
    expect(r.passed).toBe(15);
    expect(r.total).toBe(15);
  });

  test('deployProject без force бросает FORCE_REQUIRED', () => {
    expect(() => deployProject({ env: 'production' })).toThrow();
  });

  test('deployProject с force возвращает URL', () => {
    const r = deployProject({ env: 'production', force: true });
    expect(r.ok).toBe(true);
    expect(r.url).toContain('my-app.example.com');
  });
});
