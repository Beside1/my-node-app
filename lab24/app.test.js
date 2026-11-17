const request = require('supertest');
const Koa = require('koa');
const bodyParser = require('koa-bodyparser');
const usersRouter = require('./routes/users');

const app = new Koa();
app.use(bodyParser());
app.use(usersRouter.routes());
app.use(usersRouter.allowedMethods());

const server = app.callback();

describe('Lab 24: Тестирование REST API (без БД)', () => {

  it('POST /api/users без токена должен вернуть 401', async () => {
    const res = await request(server)
      .post('/api/users')
      .send({ name: 'Тест' });
    
    expect(res.statusCode).toEqual(401);
    expect(res.body).toHaveProperty('error');
  });

  it('POST /api/users с невалидными данными', async () => {
    
    const jwt = require('jsonwebtoken');
    require('dotenv').config();
    const token = jwt.sign({ userId: '123', role: 'user' }, process.env.JWT_SECRET || 'secret');

    const res = await request(server)
      .post('/api/users')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'А' }); 
    
    expect(res.statusCode).toEqual(400);
    expect(res.body.error).toEqual('Validation failed');
  });

  it('GET /api/unknown должен вернуть 404', async () => {
    const res = await request(server).get('/api/unknown');
    expect(res.statusCode).toEqual(404);
  });
});