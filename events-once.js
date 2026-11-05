const EventEmitter = require('events');

const GROUP = 'ББМО-01-23';
const emitter = new EventEmitter();

let onCount = 0;
let onceCount = 0;

console.log(`=== Сравнение on и once (группа ${GROUP}) ===\n`);

emitter.on('tick', () => {
  onCount += 1;
  console.log(`[tick #${onCount}] on-слушатель`);
});

emitter.once('tick', () => {
  onceCount += 1;
  console.log(`[tick #${onCount}] once-слушатель`);
});

emitter.emit('tick');
emitter.emit('tick');
emitter.emit('tick');

console.log(`\non-слушатель вызван: ${onCount} раза`);
console.log(`once-слушатель вызван: ${onceCount} раз`);

console.log('\n=== Управление подписками ===');

const listenerA = () => console.log('  A');
const listenerB = () => console.log('  B');
const listenerC = () => console.log('  C');

emitter.on('multi', listenerA);
emitter.on('multi', listenerB);
emitter.on('multi', listenerC);

console.log(`Слушателей до удаления: ${emitter.listenerCount('multi')}`);

emitter.removeListener('multi', listenerB);
console.log(`Слушателей после удаления одного: ${emitter.listenerCount('multi')}`);

emitter.emit('multi');

emitter.removeAllListeners('multi');
console.log(`Слушателей после removeAllListeners: ${emitter.listenerCount('multi')}`);

console.log('\n=== Порядок вызова слушателей ===');

emitter.on('order', function first() {
  console.log(`1. Первый слушатель (группа ${GROUP})`);
});
emitter.on('order', function second() {
  console.log('2. Второй слушатель');
});
emitter.on('order', function third() {
  console.log('3. Третий слушатель');
});

emitter.emit('order');