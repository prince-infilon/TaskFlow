const { body, param } = require('express-validator');
const { validateRequest } = require('../validateRequest');

exports.createTaskValidation = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Task title is required')
    .isLength({ max: 255 })
    .withMessage('Title cannot exceed 255 characters'),
  body('column')
    .notEmpty()
    .withMessage('Column ID is required')
    .isMongoId()
    .withMessage('Invalid column ID format'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high'])
    .withMessage('Priority must be low, medium, or high'),
  body('description')
    .optional()
    .isString()
    .withMessage('Description must be a string'),
  body('startDate')
    .optional()
    .isString()
    .withMessage('Start date must be a valid date string'),
  body('dueDate')
    .optional()
    .isString()
    .withMessage('Due date must be a valid date string'),
  body('subtasks')
    .optional()
    .isArray()
    .withMessage('Subtasks must be an array'),
  body('subtasks.*.title')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Subtask title cannot be empty'),
  validateRequest
];

exports.updateTaskValidation = [
  param('taskId')
    .isMongoId()
    .withMessage('Invalid task ID format'),
  body('title')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Title cannot be empty')
    .isLength({ max: 255 })
    .withMessage('Title cannot exceed 255 characters'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high'])
    .withMessage('Priority must be low, medium, or high'),
  body('column')
    .optional()
    .isMongoId()
    .withMessage('Invalid column ID format'),
  body('assignee')
    .optional({ nullable: true })
    .custom((val) => {
      if (val === null || val === '') return true;
      const mongoose = require('mongoose');
      return mongoose.Types.ObjectId.isValid(val);
    })
    .withMessage('Invalid assignee ID format'),
  validateRequest
];

exports.moveTaskValidation = [
  param('taskId')
    .isMongoId()
    .withMessage('Invalid task ID format'),
  body('column')
    .optional()
    .isMongoId()
    .withMessage('Invalid column ID format'),
  body('columnId')
    .optional()
    .isMongoId()
    .withMessage('Invalid column ID format'),
  body().custom((value, { req }) => {
    if (!req.body.column && !req.body.columnId) {
      throw new Error('Destination column ID is required');
    }
    return true;
  }),
  body('position')
    .notEmpty()
    .withMessage('Position is required')
    .isNumeric()
    .withMessage('Position must be a number')
    .custom((val) => val >= 0)
    .withMessage('Position cannot be negative'),
  validateRequest
];
