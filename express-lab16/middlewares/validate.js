const Joi = require('joi');

const bookSchema = Joi.object({
  title: Joi.string().trim().min(1).max(200).required()
    .messages({ 'string.empty': 'Название не должно быть пустым' }),
  author: Joi.string().trim().min(1).max(100).required(),
  year: Joi.number().integer().min(0).max(new Date().getFullYear()).required()
    .messages({ 'number.max': 'Год не может быть в будущем' }),
  genre: Joi.string().trim().max(50).allow(null, '').optional(),
  isbn: Joi.string().pattern(/^[\d-]+$/).optional(),
});

const bookUpdateSchema = Joi.object({
  title: Joi.string().trim().min(1).max(200).optional(),
  author: Joi.string().trim().min(1).max(100).optional(),
  year: Joi.number().integer().min(0).max(new Date().getFullYear()).optional(),
  genre: Joi.string().trim().max(50).allow(null, '').optional(),
}).min(1);

const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(5).max(100).required(),
  name: Joi.string().trim().min(1).max(100).required(),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

const reviewSchema = Joi.object({
  rating: Joi.number().integer().min(1).max(5).required(),
  text: Joi.string().trim().min(1).max(1000).required(),
});

function validate(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body || {}, { abortEarly: false });
    if (error) {
      return res.status(400).json({
        error: 'Ошибка валидации',
        details: error.details.map((d) => d.message),
        status: 400,
      });
    }
    req.body = value;
    next();
  };
}

module.exports = {
  validate,
  bookSchema,
  bookUpdateSchema,
  registerSchema,
  loginSchema,
  reviewSchema,
};
