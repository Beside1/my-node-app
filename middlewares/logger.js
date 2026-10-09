module.exports = async function logger(ctx, next) {
  const start = Date.now();
  const time = new Date().toISOString().replace('T', ' ').slice(0, 19);

  await next();

  const ms = Date.now() - start;
  console.log(`[${time}] ${ctx.method} ${ctx.url} - ${ms}ms`);
};