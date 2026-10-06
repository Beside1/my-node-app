const { metrics, cache } = require('../config/db');

module.exports = {
  metrics: async (ctx) => {
    ctx.body = {
      queries: metrics.queries,
      errors: metrics.errors,
      avgTime: metrics.queries ? +(metrics.totalMs / metrics.queries).toFixed(2) : 0,
      cacheSize: cache.size,
    };
  },
};