const service = require('../services/student.service');

module.exports = {
  list: async (ctx) => {
    ctx.body = await service.list({
      limit: Number(ctx.query.limit) || 10,
      offset: Number(ctx.query.offset) || 0,
      group_name: ctx.query.group_name,
    });
  },
  get: async (ctx) => {
    ctx.body = await service.getById(Number(ctx.params.id));
  },
  create: async (ctx) => {
    ctx.status = 201;
    ctx.body = await service.create(ctx.request.body);
  },
  update: async (ctx) => {
    ctx.body = await service.update(Number(ctx.params.id), ctx.request.body);
  },
  remove: async (ctx) => {
    ctx.body = await service.delete(Number(ctx.params.id));
  },
  batch: async (ctx) => {
    ctx.body = await service.batchCreate(ctx.request.body);
  },
  stats: async (ctx) => {
    ctx.body = await service.getStats();
  },
  cacheStats: async (ctx) => {
    ctx.body = service.getCacheStats();
  },
};