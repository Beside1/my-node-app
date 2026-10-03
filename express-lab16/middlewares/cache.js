const cache = new Map();
const TTL = 5 * 60 * 1000; // 5 минут

function cacheMiddleware(req, res, next) {
  if (req.method !== 'GET') return next();

  const key = req.originalUrl;
  const entry = cache.get(key);
  if (entry && Date.now() - entry.time < TTL) {
    res.set('X-Cache', 'HIT');
    return res.json(entry.data);
  }

  res.set('X-Cache', 'MISS');

  const originalJson = res.json.bind(res);
  res.json = (data) => {
    cache.set(key, { data, time: Date.now() });
    return originalJson(data);
  };
  next();
}

module.exports = cacheMiddleware;
