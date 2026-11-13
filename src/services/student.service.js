const { query, metrics, cache } = require('../config/db');

const CACHE_TTL = 60_000;

function cacheGet(key) {
  const e = cache.get(key);
  if (!e) return null;
  if (Date.now() > e.expires) { cache.delete(key); return null; }
  return e.value;
}

function cacheSet(key, value) {
  cache.set(key, { value, expires: Date.now() + CACHE_TTL });
}

function cacheInvalidate(prefix) {
  for (const k of cache.keys()) if (k.startsWith(prefix)) cache.delete(k);
}

function validate(data, partial = false) {
  const errors = [];
  if (!partial || 'name' in data) {
    if (!data.name || data.name.length < 2 || data.name.length > 100) {
      errors.push('name 2..100 символов');
    }
  }
  if (!partial || 'group_name' in data) {
    if (!data.group_name || !/^ББМО-\d{2}-\d{2}$/.test(data.group_name)) {
      errors.push('group_name формат ББМО-XX-XX');
    }
  }
  if (!partial || 'course' in data) {
    if (!Number.isInteger(data.course) || data.course < 1 || data.course > 4) {
      errors.push('course 1..4');
    }
  }
  if ('grade' in data && data.grade !== null) {
    const g = Number(data.grade);
    if (Number.isNaN(g) || g < 0 || g > 5) errors.push('grade 0..5');
  }
  if (errors.length) {
    const e = new Error(errors.join('; '));
    e.code = 'VALIDATION_ERROR';
    throw e;
  }
}

class StudentService {
  async list({ limit = 10, offset = 0, group_name } = {}) {
    const key = `list:${limit}:${offset}:${group_name || ''}`;
    const cached = cacheGet(key);
    if (cached) return { ...cached, cached: true };

    const where = [];
    const params = [];
    if (group_name) { where.push('group_name = ?'); params.push(group_name); }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const [{ total }] = await query(`SELECT COUNT(*) AS total FROM students ${whereSql}`, params);
    const rows = await query(
      `SELECT * FROM students ${whereSql} ORDER BY id LIMIT ? OFFSET ?`,
      [...params, Number(limit), Number(offset)]
    );

    const result = {
      data: rows,
      pagination: {
        total,
        limit: Number(limit),
        offset: Number(offset),
        pages: Math.ceil(total / limit),
      },
    };
    cacheSet(key, result);
    return result;
  }

  async getById(id) {
    const key = `item:${id}`;
    const cached = cacheGet(key);
    if (cached) return { ...cached, cached: true };

    const rows = await query('SELECT * FROM students WHERE id = ?', [id]);
    if (!rows.length) {
      const e = new Error('Not found');
      e.status = 404;
      throw e;
    }
    cacheSet(key, rows[0]);
    return rows[0];
  }

  async create(data) {
    validate(data);
    const result = await query(
      'INSERT INTO students (name, group_name, course, grade) VALUES (?, ?, ?, ?)',
      [data.name, data.group_name, data.course, data.grade ?? null]
    );
    cacheInvalidate('list:');
    cacheInvalidate('stats');
    return this.getById(result.insertId);
  }

  async update(id, data) {
    validate(data, true);
    const fields = [];
    const params = [];
    for (const k of ['name', 'group_name', 'course', 'grade']) {
      if (k in data) { fields.push(`${k} = ?`); params.push(data[k]); }
    }
    if (!fields.length) return this.getById(id);
    params.push(id);
    await query(`UPDATE students SET ${fields.join(', ')} WHERE id = ?`, params);
    cacheInvalidate(`item:${id}`);
    cacheInvalidate('list:');
    cacheInvalidate('stats');
    return this.getById(id);
  }

  async delete(id) {
    const res = await query('DELETE FROM students WHERE id = ?', [id]);
    cacheInvalidate(`item:${id}`);
    cacheInvalidate('list:');
    cacheInvalidate('stats');
    return { deleted: res.affectedRows > 0, id };
  }

  async batchCreate(items) {
    const conn = await require('../config/db').pool.getConnection();
    try {
      await conn.beginTransaction();
      const created = [];
      for (const item of items) {
        validate(item);
        const [res] = await conn.query(
          'INSERT INTO students (name, group_name, course, grade) VALUES (?, ?, ?, ?)',
          [item.name, item.group_name, item.course, item.grade ?? null]
        );
        created.push(res.insertId);
      }
      await conn.commit();
      cacheInvalidate('list:');
      cacheInvalidate('stats');
      return { created: created.length, transaction: 'committed', ids: created };
    } catch (err) {
      await conn.rollback();
      return { created: 0, transaction: 'rolled_back', error: err.message };
    } finally {
      conn.release();
    }
  }

  async getStats() {
    const key = 'stats';
    const cached = cacheGet(key);
    if (cached) return { ...cached, cached: true };

    const [total] = await query('SELECT COUNT(*) AS total FROM students');
    const [avg] = await query('SELECT AVG(grade) AS avgGrade FROM students');
    const byGroup = await query('SELECT group_name, COUNT(*) AS cnt FROM students GROUP BY group_name');

    const result = {
      total: total.total,
      averageGrade: Number(avg.avgGrade || 0).toFixed(2),
      byGroup: Object.fromEntries(byGroup.map((r) => [r.group_name, r.cnt])),
    };
    cacheSet(key, result);
    return result;
  }

  getCacheStats() {
    const { cache } = require('../config/db');
    return {
      size: cache.size,
      keys: [...cache.keys()],
    };
  }
}

module.exports = new StudentService();