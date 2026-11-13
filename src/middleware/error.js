const MAP = {
  ER_DUP_ENTRY: 409,
  ER_NO_REFERENCED_ROW: 400,
  ER_NO_REFERENCED_ROW_2: 400,
  ECONNREFUSED: 503,
  ETIMEDOUT: 503,
  PROTOCOL_CONNECTION_LOST: 503,
  VALIDATION_ERROR: 400,
};

module.exports = async (ctx, next) => {
  try {
    await next();
  } catch (err) {
    const status = MAP[err.code] || err.status || 500;
    ctx.status = status;
    ctx.body = {
      error: true,
      code: err.code || 'INTERNAL_ERROR',
      message: err.message,
    };
  }
};
