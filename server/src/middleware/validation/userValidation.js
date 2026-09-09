const { body, param } = require('express-validator');
const { validateRequest } = require('../validateRequest');

exports.createUserValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Full name is required')
    .isLength({ max: 100 })
    .withMessage('Name cannot exceed 100 characters'),
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email address is required')
    .isEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('role')
    .optional()
    .isIn(['admin', 'manager', 'member'])
    .withMessage('Invalid role specified'),
  body('managerId')
    .optional({ nullable: true, checkFalsy: true })
    .custom((val) => {
      if (!val) return true;
      const mongoose = require('mongoose');
      return mongoose.Types.ObjectId.isValid(val);
    })
    .withMessage('Invalid manager ID format'),
  validateRequest
];

exports.updateUserValidation = [
  param('userId')
    .isMongoId()
    .withMessage('Invalid user ID format'),
  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Name cannot be empty')
    .isLength({ max: 100 })
    .withMessage('Name cannot exceed 100 characters'),
  validateRequest
];

exports.resetPasswordValidation = [
  param('userId')
    .isMongoId()
    .withMessage('Invalid user ID format'),
  body()
    .custom((body) => {
      const pass = body.password || body.newPassword;
      if (!pass || pass.length < 6) {
        throw new Error('Password must be at least 6 characters long');
      }
      return true;
    }),
  validateRequest
];

exports.reassignMemberValidation = [
  param('userId')
    .isMongoId()
    .withMessage('Invalid user ID format'),
  body('managerId')
    .notEmpty()
    .withMessage('Target manager ID is required')
    .isMongoId()
    .withMessage('Invalid target manager ID format'),
  validateRequest
];
