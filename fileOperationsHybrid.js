const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const writeFileAsync = promisify(fs.writeFile);
const readFileAsync = promisify(fs.readFile);
const unlinkAsync = promisify(fs.unlink);
const readdirAsync = promisify(fs.readdir);
const statAsync = promisify(fs.stat);

class FileManagerHybrid {
  constructor(baseDir = './data-hybrid') {
    this.baseDir = baseDir;
    if (!fs.existsSync(baseDir)) {
      fs.mkdirSync(baseDir, { recursive: true });
    }
  }

  _handle(promise, callback) {
    if (typeof callback === 'function') {
      promise.then(res => callback(null, res)).catch(err => callback(err));
      return;
    }
    return promise;
  }

  createFile(filename, content, callback) {
    const filePath = path.join(this.baseDir, filename);
    const promise = writeFileAsync(filePath, content, 'utf8').then(() => filePath);
    return this._handle(promise, callback);
  }

  readFile(filename, callback) {
    const filePath = path.join(this.baseDir, filename);
    return this._handle(readFileAsync(filePath, 'utf8'), callback);
  }

  deleteFile(filename, callback) {
    const filePath = path.join(this.baseDir, filename);
    return this._handle(unlinkAsync(filePath), callback);
  }

  async listFiles() {
    const files = await readdirAsync(this.baseDir);
    const stats = await Promise.all(
      files.map(async file => {
        const filePath = path.join(this.baseDir, file);
        const s = await statAsync(filePath);
        return { name: file, isFile: s.isFile() };
      })
    );
    return stats.filter(f => f.isFile).map(f => f.name);
  }
}

module.exports = FileManagerHybrid;