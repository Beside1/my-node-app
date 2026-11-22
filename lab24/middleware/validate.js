const Joi = require('joi');

const groupRegex = /^\p{Script=Cyrillic}{4}-\d{2}-\d{2}$/u;

const createUserSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  email: Joi.string().email().required(),
  group_name: Joi.string().pattern(groupRegex).required(),
  age: Joi.number().integer().min(16).max(100).required()
});

const validateBody = (schema) => async (ctx, next) => {
  const { error, value } = schema.validate(ctx.request.body, { abortEarly: false });
  if (error) {
    ctx.status = 400;
    ctx.body = {
      error: 'Validation failed',
      details: error.details.map(d => ({ field: d.path[0], message: d.message }))
    };
    return;
  }
  ctx.request.body = value;
  await next();
};

module.exports = { validateBody, createUserSchema };