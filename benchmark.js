const fs = require('fs');
const path = require('path');
const FileManagerPromises = require('./fileOperationsPromises');

const N = 100;
const dir = './bench-data';
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

async function measure(name, fn) {
  const start = process.hrtime.bigint();
  await fn();
  const end = process.hrtime.bigint();
  console.log(`${name}: ${(Number(end - start) / 1e6).toFixed(2)} ms`);
}

async function syncTest() {
  for (let i = 0; i < N; i++) {
    const p = path.join(dir, `sync-${i}.txt`);
    fs.writeFileSync(p, 'test');
    fs.readFileSync(p, 'utf8');
    fs.unlinkSync(p);
  }
}

async function callbackTest() {
  for (let i = 0; i < N; i++) {
    const p = path.join(dir, `cb-${i}.txt`);
    await new Promise((resolve, reject) => {
      fs.writeFile(p, 'test', err => {
        if (err) return reject(err);
        fs.readFile(p, 'utf8', (err, data) => {
          if (err) return reject(err);
          fs.unlink(p, err => {
            if (err) return reject(err);
            resolve();
          });
        });
      });
    });
  }
}

async function promiseTest() {
  const fm = new FileManagerPromises(dir);
  for (let i = 0; i < N; i++) {
    await fm.createFile(`pr-${i}.txt`, 'test');
    await fm.readFile(`pr-${i}.txt`);
    await fm.deleteFile(`pr-${i}.txt`);
  }
}

(async () => {
  await measure('sync', syncTest);
  await measure('callbacks', callbackTest);
  await measure('promises', promiseTest);
})();