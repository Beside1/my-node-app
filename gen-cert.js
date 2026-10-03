const selfsigned = require('selfsigned');
const fs = require('fs');
const path = require('path');

(async () => {
  const certDir = path.join(__dirname, 'cert');
  if (!fs.existsSync(certDir)) fs.mkdirSync(certDir, { recursive: true });

  const attrs = [{ name: 'commonName', value: 'localhost' }];

  let pems;
  try {
    pems = await selfsigned.generate(attrs, {
      days: 365,
      keySize: 2048,
      algorithm: 'sha256',
    });
  } catch (e) {
    console.error('[ERROR] selfsigned упал:', e.message);
    process.exit(1);
  }

  console.log('[DEBUG] Поля объекта:', Object.keys(pems));

  const privateKey = pems.private || pems.privateKey || pems.key;
  const cert       = pems.cert    || pems.certificate;

  if (!privateKey || !cert) {
    console.error('[ERROR] Не удалось получить private/cert.');
    console.error(pems);
    process.exit(1);
  }

  fs.writeFileSync(path.join(certDir, 'key.pem'), privateKey);
  fs.writeFileSync(path.join(certDir, 'cert.pem'), cert);

  console.log('[INFO] Сертификаты созданы:');
  console.log('  ', path.join(certDir, 'key.pem'));
  console.log('  ', path.join(certDir, 'cert.pem'));
})();