const { body, param } = require('express-validator');
const { validateRequest } = require('../validateRequest');

exports.createOrgValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Organization name is required')
    .isLength({ max: 100 })
    .withMessage('Organization name cannot exceed 100 characters'),
  validateRequest
];

exports.inviteMemberValidation = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email address'),
  body('role')
    .optional()
    .isIn(['admin', 'manager', 'member'])
    .withMessage('Role must be admin, manager, or member'),
  validateRequest
];

exports.updateMemberRoleValidation = [
  param('userId')
    .isMongoId()
    .withMessage('Invalid user ID format'),
  body('role')
    .notEmpty()
    .withMessage('Role is required')
    .isIn(['admin', 'manager', 'member'])
    .withMessage('Role must be admin, manager, or member'),
  validateRequest
];
