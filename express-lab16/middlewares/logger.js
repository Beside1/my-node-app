module.exports = function logger(req, res, next) {
  const start = Date.now();

  res.on('finish', () => {
    const ms = Date.now() - start;
    const time = new Date().toISOString().replace('T', ' ').slice(0, 19);
    console.log(
      `[${time}] ${req.method} ${req.originalUrl} ${res.statusCode} - ${ms}ms`
    );
  });

  next();
};
