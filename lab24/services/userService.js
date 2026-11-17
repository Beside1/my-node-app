const User = require('../models/user');

class UserService {
    async getAll(query) {
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 10;
    const skip = (page - 1) * limit;

    const filter = {};
    if (query.group_name) filter.group_name = query.group_name;
    
    // Поиск по имени или email (текстовый)
    if (query.search) {
      filter.$or = [
        { name: { $regex: query.search, $options: 'i' } },
        { email: { $regex: query.search, $options: 'i' } }
      ];
    }

    // Сортировка (по умолчанию -created_at)
    let sort = { created_at: -1 };
    if (query.sort === 'name') sort = { name: 1 };
    if (query.sort === '-name') sort = { name: -1 };
    if (query.sort === 'age') sort = { age: 1 };
    if (query.sort === '-age') sort = { age: -1 };
    
    const users = await User.findAll(filter, { skip, limit, sort });
    const total = await User.count(filter);

    return {
      data: users,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) }
    };
  }

  async getById(id) {
    return User.findById(id);
  }

  async create(data) {
    console.log(`[SERVICE] Создание пользователя: ${data.email}`);
    const existing = await User.findByEmail(data.email);
    if (existing) {
      const err = new Error('Email already exists');
      err.status = 409;
      throw err;
    }
    return User.create(data);
  }

  async update(id, data) {
    return User.update(id, data);
  }

  async delete(id) {
    return User.delete(id);
  }

  async getStats() {
    return User.getStats();
  }
}

module.exports = new UserService();