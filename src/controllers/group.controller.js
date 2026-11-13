const { query, pool } = require('../config/db');

module.exports = {
  list: async (ctx) => {
    ctx.body = await query('SELECT DISTINCT group_name FROM students ORDER BY group_name');
  },
  create: async (ctx) => {
  
    ctx.status = 201;
    ctx.body = { created: true, group: ctx.request.body };
  },
  students: async (ctx) => {
    const rows = await query('SELECT * FROM students WHERE group_name = ?', [ctx.params.id]);
    ctx.body = rows;
  },
};