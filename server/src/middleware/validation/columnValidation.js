const { body, param } = require('express-validator');
const { validateRequest } = require('../validateRequest');

exports.createColumnValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Column name is required')
    .isLength({ max: 100 })
    .withMessage('Column name cannot exceed 100 characters'),
  validateRequest
];

exports.updateColumnValidation = [
  param('columnId')
    .isMongoId()
    .withMessage('Invalid column ID format'),
  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Column name cannot be empty')
    .isLength({ max: 100 })
    .withMessage('Column name cannot exceed 100 characters'),
  validateRequest
];
