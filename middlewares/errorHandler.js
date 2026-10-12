module.exports = async function errorHandler(ctx, next) {
  try {
    await next();

    if (ctx.status === 404 && !ctx.body) {
      ctx.status = 404;
      ctx.body = { error: 'Маршрут не найден', status: 404 };
    }
  } catch (err) {
    ctx.status = err.status || 500;
    ctx.body = {
      error: err.message || 'Внутренняя ошибка сервера',
      status: ctx.status,
    };
    ctx.app.emit('error', err, ctx);
  }
};