const jwt = require('jsonwebtoken');
require('dotenv').config();

module.exports = {

  authMiddleware: async (ctx, next) => {
    const authHeader = ctx.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      ctx.status = 401;
      ctx.body = { error: 'Требуется токен авторизации', status: 401 };
      return;
    }

    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      ctx.user = decoded; 
      await next();
    } catch (err) {
      ctx.status = 401;
      ctx.body = { error: 'Неверный или истёкший токен', status: 401 };
    }
  },

  requireRole: (role) => async (ctx, next) => {
    if (!ctx.user || ctx.user.role !== role) {
      ctx.status = 403;
      ctx.body = { error: 'Forbidden: недостаточно прав', status: 403 };
      return;
    }
    await next();
  }
};