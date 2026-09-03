const { validationResult } = require('express-validator');

exports.validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // We send a generic 400 with the first error message to match the envelope
    const firstError = errors.array()[0];
    return res.status(400).json({
      success: false,
      error: { message: firstError.msg }
    });
  }
  next();
};
