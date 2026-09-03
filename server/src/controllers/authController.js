const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const generateTokens = (userId) => {
  const accessToken = jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '15m' });
  const refreshToken = jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
  return { accessToken, refreshToken };
};

const sendResponseWithTokens = (res, user, statusCode = 200) => {
  const { accessToken, refreshToken } = generateTokens(user._id);

  const isProduction = process.env.NODE_ENV === 'production';

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'Strict' : 'Lax',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });

  res.status(statusCode).json({
    success: true,
    data: {
      user,
      token: accessToken
    }
  });
};

exports.register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, error: { message: 'This email is already registered.' } });
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const newUser = await User.create({
      name,
      email,
      passwordHash
    });

    sendResponseWithTokens(res, newUser, 201);
  } catch (error) {
    next(error);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ success: false, error: { message: 'Invalid email or password.' } });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: { message: 'Invalid email or password.' } });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, error: { message: 'Account is deactivated.' } });
    }

    sendResponseWithTokens(res, user, 200);
  } catch (error) {
    next(error);
  }
};

exports.logout = (req, res) => {
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'Strict' : 'Lax',
  });
  res.status(200).json({ success: true, data: { message: 'Logged out successfully' } });
};

exports.refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.cookies;

    if (!refreshToken) {
      return res.status(401).json({ success: false, error: { message: 'No refresh token provided.' } });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    
    const user = await User.findById(decoded.userId);
    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, error: { message: 'Invalid refresh token or inactive user.' } });
    }

    // Issue a new access token (and optionally rotate the refresh token by calling sendResponseWithTokens)
    sendResponseWithTokens(res, user, 200);
  } catch (error) {
    if (error.name === 'TokenExpiredError' || error.name === 'JsonWebTokenError') {
      return res.status(401).json({ success: false, error: { message: 'Invalid or expired refresh token.' } });
    }
    next(error);
  }
};
