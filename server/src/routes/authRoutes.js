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

const mfaController = require('../controllers/mfaController');
const { authenticate } = require('../middleware/authMiddleware');

router.post('/register', registerValidation, authController.register);
router.post('/login', loginValidation, authController.login);
router.post('/logout', authController.logout);
router.post('/refresh', authController.refresh);

// MFA Routes
router.post('/mfa/setup', authenticate, mfaController.setupMFA);
router.post('/mfa/verify', authenticate, mfaController.verifyAndEnableMFA);
router.post('/mfa/disable', authenticate, mfaController.disableMFA);
router.post('/mfa/challenge', authController.mfaChallenge);

const passport = require('passport');

// OAuth Routes
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/google/callback', passport.authenticate('google', { session: false }), authController.oauthCallback);

router.get('/github', passport.authenticate('github', { scope: ['user:email'] }));
router.get('/github/callback', passport.authenticate('github', { session: false }), authController.oauthCallback);

router.get('/microsoft', passport.authenticate('microsoft', { scope: ['user.read'] }));
router.get('/microsoft/callback', passport.authenticate('microsoft', { session: false }), authController.oauthCallback);

module.exports = router;
