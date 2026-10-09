module.exports = async function auth(ctx, next) {
  const token = ctx.headers['authorization'];
  if (!token) {
    ctx.status = 401;
    ctx.body = { error: 'Требуется заголовок Authorization', status: 401 };
    return;
  }
  await next();
};