exports.errorHandler = (err, req, res, next) => {
  console.error('Unhandled Error:', err);

  let statusCode = err.statusCode || 500;
  let message = err.message || 'An unexpected error occurred on the server.';

  if (err.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid ID format.';
  }

  if (err.name === 'ValidationError') {
    statusCode = 400;
    const msgs = Object.values(err.errors).map(e => e.message);
    message = msgs[0] || 'Validation failed.';
  }

  if (err.type === 'entity.too.large') {
    statusCode = 413;
    message = 'Request body too large.';
  }

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  });
};
