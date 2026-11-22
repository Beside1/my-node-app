const swaggerJSDoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Lab24 Users API',
      version: '1.0.0',
      description: 'REST API для работы с пользователями (MongoDB + Koa)',
    },
    servers: [{ url: 'http://localhost:3000' }],
  },
  apis: ['./lab24/routes/*.js'], 
};

module.exports = swaggerJSDoc(options);