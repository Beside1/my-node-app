const FileManagerHybrid = require('./fileOperationsHybrid');
const fm = new FileManagerHybrid('./test-data-hybrid');

fm.createFile('a.txt', 'Привет', (err, filePath) => {
  if (err) return console.error(err);
  console.log('Создан через колбэк:', filePath);
});

(async () => {
  const filePath = await fm.createFile('b.txt', 'Пока');
  console.log('Создан через промис:', filePath);
  console.log('Файлы:', await fm.listFiles());
})();