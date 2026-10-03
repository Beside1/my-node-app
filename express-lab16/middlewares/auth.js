const jwt = require('jsonwebtoken');
const SECRET = 'lab16-secret-key';

function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    SECRET,
    { expiresIn: '1h' }
  );
}

function authRequired(req, res, next) {
  const header = req.headers['authorization'];
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Требуется токен', status: 401 });
  }
  try {
    req.user = jwt.verify(header.slice(7), SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Невалидный токен', status: 401 });
  }
}

function adminRequired(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Доступ только для администратора', status: 403 });
  }
  next();
}

module.exports = { generateToken, authRequired, adminRequired, SECRET };
