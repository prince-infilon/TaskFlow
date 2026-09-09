const logger = require('../utils/logger');

exports.errorHandler = (err, req, res, next) => {
  logger.error(`${err.message} - ${req.method} ${req.originalUrl} - IP: ${req.ip}`, {
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    body: req.body
  });

  let statusCode = err.statusCode || 500;
  let message = err.message || 'An unexpected error occurred on the server.';

  if (err.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid ID format.';
  } else if (err.name === 'ValidationError') {
    statusCode = 400;
    const msgs = Object.values(err.errors).map(e => e.message);
    message = msgs[0] || 'Validation failed.';
  } else if (err.type === 'entity.too.large') {
    statusCode = 413;
    message = 'Request body too large.';
  } else if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {})[0] || 'Field';
    message = `${field} already exists.`;
  }

  // In production, mask unhandled 500 internal server error details
  if (process.env.NODE_ENV === 'production' && statusCode === 500) {
    message = 'Internal server error. Please try again later.';
  }

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
    }
  });
};
