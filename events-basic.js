const EventEmitter = require('events');

const GROUP = 'ББМО-01-23';
const emitter = new EventEmitter();

console.log(`=== Базовый EventEmitter (группа ${GROUP}) ===`);

emitter.on('greet', (name) => {
  console.log(`[greet] Привет, ${name}!`);
});

emitter.on('info', (message) => {
  console.log(`[info] ${message}`);
});

emitter.on('sum', (a, b) => {
  console.log(`[sum] ${a} + ${b} = ${a + b}`);
});

console.log(`Слушателей на "greet": ${emitter.listenerCount('greet')}`);
console.log(`Слушателей на "info": ${emitter.listenerCount('info')}`);

emitter.emit('greet', 'студент группы ' + GROUP);
emitter.emit('info', `Группа ${GROUP} выполняет ЛР19`);
emitter.emit('sum', 5, 7);

console.log('Готово.');