const EventEmitter = require('events');

const GROUP = 'ББМО-01-23';
const PREFIX = `[${GROUP}]`;

class PluginManager extends EventEmitter {
  constructor() {
    super();
    this.plugins = new Map();
  }

  registerPlugin(name, plugin) {
    this.plugins.set(name, plugin);
    this.emit('plugin:registered', name);
  }

  removePlugin(name) {
    if (!this.plugins.has(name)) return;
    this.plugins.delete(name);
    this.emit('plugin:removed', name);
  }
}

console.log('=== Система плагинов ===');

const manager = new PluginManager();

manager.on('newListener', (event, listener) => {
  console.log(`[newListener] Добавлен слушатель "${event}"`);
});

manager.on('removeListener', (event, listener) => {
  console.log(`[removeListener] Удалён слушатель "${event}"`);
});

manager.on('plugin:registered', (name) => {
  console.log(`[PLUGIN] Зарегистрирован: ${name}`);
});

manager.on('plugin:removed', (name) => {
  console.log(`[PLUGIN] Удалён: ${name}`);
});

function onLog(msg) {
  console.log(`${PREFIX} [LOG] ${msg}`);
}

manager.on('log', onLog);
manager.registerPlugin('LoggerPlugin', {});

manager.registerPlugin('AlertPlugin', {});

manager.off('log', onLog);
manager.removePlugin('LoggerPlugin');

console.log('\n=== Демонстрация утечки ===');

const leaky = new EventEmitter();

const before = leaky.listenerCount('leak');
console.log(`Слушателей до: ${before}`);

for (let i = 0; i < 1000; i += 1) {
  leaky.on('leak', () => {});
}

const after = leaky.listenerCount('leak');
console.log(`Слушателей после добавления 1000: ${after}`);

leaky.removeAllListeners('leak');
console.log(`Слушателей после removeAllListeners: ${leaky.listenerCount('leak')}`);

console.log('\n=== Асинхронные слушатели ===');

const asyncEmitter = new EventEmitter();

asyncEmitter.on('async:event', async () => {
  await new Promise((resolve) => setTimeout(resolve, 100));
  console.log(`${PREFIX} async-слушатель завершён через 100ms`);
});

asyncEmitter.emit('async:event');
console.log(`${PREFIX} emit вызван (не ждёт async-слушатель)`);

setImmediate(() => {
  console.log(`${PREFIX} setImmediate: отложенный код выполнен`);
});