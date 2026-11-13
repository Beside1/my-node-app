const { pool } = require('../config/db');

module.exports = async (ctx, next) => {
  ctx.db = pool;
  await next();
};
