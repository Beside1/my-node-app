const { getDB } = require('../db');
const { ObjectId } = require('mongodb');

class User {
  // Хелпер для доступа к коллекции
  static collection() {
    return getDB().collection('users');
  }

  // Получение списка с фильтрацией, сортировкой и пагинацией
  static async findAll(filter = {}, options = {}) {
    const { skip = 0, limit = 10, sort = { created_at: -1 } } = options;
    
    return this.collection()
      .find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .toArray();
  }

  // Подсчёт общего количества документов (для пагинации)
  static async count(filter = {}) {
    return this.collection().countDocuments(filter);
  }

  // Поиск по ID
  static async findById(id) {
    if (!ObjectId.isValid(id)) return null;
    return this.collection().findOne({ _id: new ObjectId(id) });
  }

  // Поиск по email (для проверки уникальности)
  static async findByEmail(email) {
    return this.collection().findOne({ email });
  }

  // Создание нового пользователя
  static async create(data) {
    const doc = { ...data, created_at: new Date() };
    const result = await this.collection().insertOne(doc);
    return { ...doc, _id: result.insertedId };
  }

  // Обновление пользователя
  static async update(id, data) {
    if (!ObjectId.isValid(id)) return null;
    
    // В mongodb драйвере v6+ findOneAndUpdate возвращает документ напрямую (или null)
    const result = await this.collection().findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: data },
      { returnDocument: 'after' }
    );
    return result;
  }

  // Удаление пользователя
  static async delete(id) {
    if (!ObjectId.isValid(id)) return false;
    const result = await this.collection().deleteOne({ _id: new ObjectId(id) });
    return result.deletedCount > 0;
  }

  // Получение статистики (Агрегация MongoDB)
  static async getStats() {
    const total = await this.collection().countDocuments();
    
    const avgAgeResult = await this.collection().aggregate([
      { $group: { _id: null, avg: { $avg: '$age' } } }
    ]).toArray();
    
    const byGroupResult = await this.collection().aggregate([
      { $group: { _id: '$group_name', count: { $sum: 1 } } }
    ]).toArray();

    const byGroup = {};
    byGroupResult.forEach(item => {
      if (item._id) byGroup[item._id] = item.count;
    });

    return {
      total,
      averageAge: avgAgeResult[0]?.avg || 0,
      byGroup
    };
  }
}

module.exports = User;