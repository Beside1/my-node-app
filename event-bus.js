const EventEmitter = require('events');
const os = require('os');
const http = require('http');

const GROUP = 'ББМО-01-23';
const PREFIX = `[${GROUP}]`;
const PORT = 3000;

class EventBus extends EventEmitter {
  constructor() {
    super();
    this.listenersByPriority = new Map(); 
    this.anyListeners = [];
    this.metrics = {
      events: {},
      errors: {},
      total: 0,
      lastCalled: {},
    };
  }

  on(event, listener, priority = 0) {
    if (!this.listenersByPriority.has(event)) {
      this.listenersByPriority.set(event, []);
    }

    this.listenersByPriority.get(event).push({ listener, priority, once: false });
    this.listenersByPriority.get(event).sort((a, b) => b.priority - a.priority);
    this._registerRawListener(event, listener);

    return this;
  }

  once(event, listener, priority = 0) {
    if (!this.listenersByPriority.has(event)) {
      this.listenersByPriority.set(event, []);
    }

    this.listenersByPriority.get(event).push({ listener, priority, once: true });
    this.listenersByPriority.get(event).sort((a, b) => b.priority - a.priority);
    this._registerRawListener(event, listener);

    return this;
  }

  _registerRawListener(event, listener) {

    super.on(event, listener);
  }

  off(event, listener) {
    const list = this.listenersByPriority.get(event);
    if (list) {
      const index = list.findIndex((entry) => entry.listener === listener);
      if (index !== -1) list.splice(index, 1);
    }
    return super.removeListener(event, listener);
  }

  onAny(listener) {
    this.anyListeners.push(listener);
    return this;
  }

  emit(event, ...args) {
    if (!this.metrics.events[event]) this.metrics.events[event] = 0;
    this.metrics.events[event] += 1;
    this.metrics.total += 1;
    this.metrics.lastCalled[event] = new Date().toISOString();

    for (const entry of this.anyListeners) {
      try {
        entry(event, args);
      } catch (err) {
        this._logError(event, err);
      }
    }

    const list = this.listenersByPriority.get(event) || [];
    const onceToRemove = [];

    for (const entry of list) {
      try {
        entry.listener(...args);
      } catch (err) {
        if (!this.metrics.errors[event]) this.metrics.errors[event] = 0;
        this.metrics.errors[event] += 1;
        this._logError(event, err);
      }

      if (entry.once) onceToRemove.push(entry);
    }

    for (const entry of onceToRemove) {
      this.off(event, entry.listener);
    }

    return true;
  }

  _logError(event, err) {
    console.log(`${PREFIX} [ERROR] Ошибка в слушателе "${event}": ${err.message}`);
  }

  getMetrics() {
    const listeners = {};
    for (const [event, list] of this.listenersByPriority.entries()) {
      if (list.length > 0) listeners[event] = list.length;
    }

    return {
      group: GROUP,
      events: { ...this.metrics.events },
      errors: { ...this.metrics.errors },
      total: this.metrics.total,
      lastCalled: { ...this.metrics.lastCalled },
      listeners,
    };
  }
}

console.log(`=== EventBus (группа ${GROUP}) ===`);

const bus = new EventBus();

console.log('\n--- Приоритеты ---');
bus.on('greet', () => console.log('[priority 0] Низкий приоритет'), 0);
bus.on('greet', () => console.log('[priority 10] Высокий приоритет'), 10);
bus.on('greet', () => console.log('[priority 5] Средний приоритет'), 5);

bus.emit('greet', 'Иван');

console.log('\n--- Wildcard ---');
bus.onAny((event, args) => {
  console.log(`[onAny] Событие "${event}" с аргументами: ${JSON.stringify(args)}`);
});

bus.emit('greet', 'Иван');
bus.emit('info', GROUP);

console.log('\n--- Once-кэш ---');
let onceCalls = 0;
bus.once('tick', () => {
  onceCalls += 1;
  console.log(`[tick] Вызов ${onceCalls}`);
});

bus.emit('tick');
bus.emit('tick');
bus.emit('tick');
console.log(`once-слушатель вызван: ${onceCalls} раз`);

console.log('\n--- Обработка ошибок ---');
bus.on('test', () => {
  throw new Error('специально сломанный слушатель');
}, 100);

bus.on('test', () => console.log('[test] Нормальный слушатель'));

bus.on('test2', () => {
  throw new Error('другая ошибка');
});

bus.emit('test');
bus.emit('test2');

console.log('\n--- Метрики ---');
console.log(JSON.stringify(bus.getMetrics(), null, 2));

console.log(`\n--- HTTP-сервер на http://localhost:${PORT}/metrics ---`);
console.log('Открой в браузере или выполни: curl http://localhost:' + PORT + '/metrics');

const server = http.createServer((req, res) => {
  bus.emit('request', req.method, req.url);

  if (req.url === '/metrics') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(bus.getMetrics(), null, 2));
    return;
  }

  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('EventBus работает. Открой /metrics для метрик.');
});

bus.onAny((event, args) => {
  if (event !== 'request') return;
  console.log(`${PREFIX} [HTTP] ${args[0]} ${args[1]}`);
});

bus.on('request', () => {

  const freePercent = (os.freemem() / os.totalmem()) * 100;
  if (freePercent < 5) {
    console.log(`${PREFIX} [os] Свободная память < 5%: ${freePercent.toFixed(1)}%`);
  }
});

server.listen(PORT);

process.on('SIGINT', () => {
  console.log('\nОстановка EventBus...');
  server.close(() => process.exit(0));
});