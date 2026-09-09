const { body, param } = require('express-validator');
const { validateRequest } = require('../validateRequest');

exports.createCommentValidation = [
  body('content')
    .trim()
    .notEmpty()
    .withMessage('Comment content cannot be empty')
    .isLength({ max: 5000 })
    .withMessage('Comment cannot exceed 5000 characters'),
  validateRequest
];

exports.updateCommentValidation = [
  param('commentId')
    .isMongoId()
    .withMessage('Invalid comment ID format'),
  body('content')
    .trim()
    .notEmpty()
    .withMessage('Comment content cannot be empty')
    .isLength({ max: 5000 })
    .withMessage('Comment cannot exceed 5000 characters'),
  validateRequest
];
