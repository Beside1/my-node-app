const userService = require('../services/userService');

module.exports = {
  getAll: async (ctx) => {
    ctx.body = await userService.getAll(ctx.query);
  },
  
  getById: async (ctx) => {
    const user = await userService.getById(ctx.params.id);
    if (!user) {
      ctx.status = 404;
      ctx.body = { error: 'User not found', status: 404 };
      return;
    }
    ctx.body = { data: user };
  },

  create: async (ctx) => {
    const user = await userService.create(ctx.request.body);
    ctx.status = 201;
    ctx.body = { data: user };
  },

  update: async (ctx) => {
    const user = await userService.update(ctx.params.id, ctx.request.body);
    if (!user) {
      ctx.status = 404;
      ctx.body = { error: 'User not found', status: 404 };
      return;
    }
    ctx.body = { data: user };
  },

  delete: async (ctx) => {
    const deleted = await userService.delete(ctx.params.id);
    if (!deleted) {
      ctx.status = 404;
      ctx.body = { error: 'User not found', status: 404 };
      return;
    }
    ctx.body = { data: { deleted: true } };
  },

  getStats: async (ctx) => {
    const stats = await userService.getStats();
    ctx.body = stats;
  }
};