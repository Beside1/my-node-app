const { getDB } = require('../db');

let requestCount = 0;

module.exports = {

  countRequests: async (ctx, next) => {
    requestCount++;
    await next();
  },

  health: async (ctx) => {
    const db = getDB();
    const isConnected = db !== undefined;
    ctx.status = isConnected ? 200 : 500;
    ctx.body = {
      status: isConnected ? 'ok' : 'error',
      uptime: Math.floor(process.uptime()),
      db: isConnected ? 'connected' : 'disconnected'
    };
  },

  metrics: async (ctx) => {
    ctx.set('Content-Type', 'text/plain; version=0.0.4');
    ctx.body = `# HELP http_requests_total Total HTTP requests\n# TYPE http_requests_total counter\nhttp_requests_total ${requestCount}\n`;
  }
};