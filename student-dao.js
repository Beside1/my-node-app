const pool = require('./db-pool');

function validate(data, partial = false) {
  const errors = [];

  const GROUP_RE = /^\u0411\u0411\u041C\u041E-\d{2}-\d{2}$/;

  if (!partial || 'name' in data) {
    if (
      !data.name ||
      typeof data.name !== 'string' ||
      data.name.length < 2 ||
      data.name.length > 100
    ) {
      errors.push('name должен быть строкой от 2 до 100 символов');
    }
  }

  if (!partial || 'group_name' in data) {

    const g = String(data.group_name || '').trim().normalize('NFC');
    if (!g || !GROUP_RE.test(g)) {
      errors.push('group_name должен соответствовать формату ББМО-XX-XX');
    }
  }

  if (!partial || 'course' in data) {
    if (!Number.isInteger(data.course) || data.course < 1 || data.course > 4) {
      errors.push('course — целое от 1 до 4');
    }
  }

  if ('grade' in data && data.grade !== null && data.grade !== undefined) {
    const gr = Number(data.grade);
    if (Number.isNaN(gr) || gr < 0 || gr > 5) {
      errors.push('grade должен быть от 0 до 5 или NULL');
    }
  }

  if (errors.length) {
    const err = new Error(errors.join('; '));
    err.code = 'VALIDATION_ERROR';
    throw err;
  }
}

class StudentDAO {
  async create(data) {
    validate(data);
    const [res] = await pool.query(
      'INSERT INTO students (name, group_name, course, grade) VALUES (?, ?, ?, ?)',
      [data.name, data.group_name, data.course, data.grade ?? null]
    );
    return this.findById(res.insertId);
  }

  async findById(id) {
    const [rows] = await pool.query('SELECT * FROM students WHERE id = ?', [id]);
    return rows[0] || null;
  }

  async findAll(options = {}) {
    const {
      limit = 10,
      offset = 0,
      group_name,
      course,
      grade_min,
      grade_max,
      sortBy = 'id',
      sortDir = 'ASC',
    } = options;

    const where = [];
    const params = [];

    if (group_name) { where.push('group_name = ?'); params.push(group_name); }
    if (course)     { where.push('course = ?');     params.push(course); }
    if (grade_min !== undefined) { where.push('grade >= ?'); params.push(grade_min); }
    if (grade_max !== undefined) { where.push('grade <= ?'); params.push(grade_max); }

    const allowedSort = ['id', 'name', 'grade', 'created_at'];
    const safeSort = allowedSort.includes(sortBy) ? sortBy : 'id';
    const safeDir = sortDir.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const [countRows] = await pool.query(
      `SELECT COUNT(*) AS total FROM students ${whereSql}`,
      params
    );
    const total = countRows[0].total;

    const [rows] = await pool.query(
      `SELECT * FROM students ${whereSql} ORDER BY ${safeSort} ${safeDir} LIMIT ? OFFSET ?`,
      [...params, Number(limit), Number(offset)]
    );

    return {
      data: rows,
      pagination: {
        total,
        limit: Number(limit),
        offset: Number(offset),
        pages: Math.ceil(total / limit),
        page: Math.floor(offset / limit) + 1,
      },
    };
  }

  async update(id, data) {
    validate(data, true);
    const fields = [];
    const params = [];
    for (const key of ['name', 'group_name', 'course', 'grade']) {
      if (key in data) {
        fields.push(`${key} = ?`);
        params.push(data[key]);
      }
    }
    if (!fields.length) return this.findById(id);
    params.push(id);
    await pool.query(`UPDATE students SET ${fields.join(', ')} WHERE id = ?`, params);
    return this.findById(id);
  }

  async delete(id) {
    const [res] = await pool.query('DELETE FROM students WHERE id = ?', [id]);
    return { deleted: res.affectedRows > 0, id };
  }

  async search(query) {
    const [rows] = await pool.query(
      'SELECT * FROM students WHERE name LIKE ?',
      [`%${query}%`]
    );
    return rows;
  }

  async getStats() {
    const [totalRows] = await pool.query('SELECT COUNT(*) AS total FROM students');
    const [avg] = await pool.query('SELECT AVG(grade) AS avgGrade, MIN(grade) AS minGrade, MAX(grade) AS maxGrade FROM students');
    const [byGroup] = await pool.query('SELECT group_name, COUNT(*) AS cnt FROM students GROUP BY group_name');
    const [byCourse] = await pool.query('SELECT course, COUNT(*) AS cnt FROM students GROUP BY course');

    return {
      total: totalRows[0].total,
      averageGrade: Number(avg[0].avgGrade || 0).toFixed(2),
      minGrade: avg[0].minGrade,
      maxGrade: avg[0].maxGrade,
      byGroup: Object.fromEntries(byGroup.map((r) => [r.group_name, r.cnt])),
      byCourse: Object.fromEntries(byCourse.map((r) => [r.course, r.cnt])),
    };
  }
}

module.exports = StudentDAO;