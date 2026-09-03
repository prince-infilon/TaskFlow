const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: { message: 'No access token provided.' } });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    
    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, error: { message: 'User not found or inactive.' } });
    }
    
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, error: { message: 'Access token expired.' } });
    }
    return res.status(401).json({ success: false, error: { message: 'Invalid access token.' } });
  }
};

/**
 * Middleware to authorize users based on global roles.
 * Usage: authorize('admin', 'manager')
 */
exports.authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.globalRole) {
      return res.status(401).json({ success: false, error: { message: 'User not authenticated properly for authorization.' } });
    }

    if (!allowedRoles.includes(req.user.globalRole)) {
      return res.status(403).json({ success: false, error: { message: 'Forbidden: You do not have permission to perform this action.' } });
    }

    next();
  };
};
