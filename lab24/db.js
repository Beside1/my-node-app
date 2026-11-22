require('dotenv').config();
const { MongoClient } = require('mongodb');

const URI = process.env.MONGO_URI || 'mongodb://student:student_pass_2024@localhost:27017/bbmo_01_23?replicaSet=rs0&authSource=admin';
const DB_NAME = 'bbmo_01_23';

let client;
let db;

async function connectDB() {
  if (db) return db;
  client = new MongoClient(URI);
  await client.connect();
  db = client.db(DB_NAME);
  console.log('[INFO] MongoDB подключена');
  return db;
}

function getDB() {
  return db;
}

module.exports = { connectDB, getDB };