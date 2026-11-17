const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/user');
require('dotenv').config();

function generateTokens(user) {
  const payload = { userId: user._id, email: user.email, role: user.role || 'user' };
  const accessToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '15m' });
  const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
  return { accessToken, refreshToken };
}

module.exports = {
  register: async (ctx) => {
    const { name, email, password, group_name, age } = ctx.request.body;
    
    const existing = await User.findByEmail(email);
    if (existing) {
      ctx.status = 409;
      ctx.body = { error: 'Email already exists', status: 409 };
      return;
    }

    // Хэшируем пароль (10 раундов)
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const user = await User.create({
      name, email, password: hashedPassword, group_name, age, role: 'user'
    });

    const tokens = generateTokens(user);
    ctx.status = 201;
    ctx.body = { 
      data: { userId: user._id, email: user.email },
      ...tokens 
    };
  },

  login: async (ctx) => {
    const { email, password } = ctx.request.body;
    
    const user = await User.findByEmail(email);
    if (!user || !user.password) {
      ctx.status = 401;
      ctx.body = { error: 'Invalid credentials', status: 401 };
      return;
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      ctx.status = 401;
      ctx.body = { error: 'Invalid credentials', status: 401 };
      return;
    }

    const tokens = generateTokens(user);
    ctx.body = { ...tokens, expiresIn: 900 }; // 900 сек = 15 мин
  },

  refresh: async (ctx) => {
    const { refreshToken } = ctx.request.body;
    if (!refreshToken) {
      ctx.status = 401;
      ctx.body = { error: 'Refresh token required', status: 401 };
      return;
    }

    try {
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
      const user = await User.findById(decoded.userId);
      if (!user) throw new Error('User not found');
      
      const tokens = generateTokens(user);
      ctx.body = tokens;
    } catch (err) {
      ctx.status = 401;
      ctx.body = { error: 'Invalid refresh token', status: 401 };
    }
  }
};