const express = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const { validateRequest } = require('../middleware/validateRequest');

const router = express.Router();

const registerValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').trim().isEmail().withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long'),
  validateRequest
];

const loginValidation = [
  body('email').trim().notEmpty().withMessage('Email is required'),
  body('password').notEmpty().withMessage('Password is required'),
  validateRequest
];

router.post('/register', registerValidation, authController.register);
router.post('/login', loginValidation, authController.login);
router.post('/logout', authController.logout);
router.post('/refresh', authController.refresh);

module.exports = router;
