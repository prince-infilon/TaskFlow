const express = require('express');
const { body } = require('express-validator');
const boardController = require('../controllers/boardController');
const { authenticate } = require('../middleware/authMiddleware');
const { authorizeBoard } = require('../middleware/boardMiddleware');
const { validateRequest } = require('../middleware/validateRequest');
const columnRoutes = require('./columnRoutes');
const taskRoutes = require('./taskRoutes');
const activityRoutes = require('./activityRoutes');
const automationController = require('../controllers/automationController');

const { requireOrganization } = require('../middleware/orgMiddleware');

const router = express.Router();

// Require authentication for all board routes
router.use(authenticate);
router.use(requireOrganization);

// Validation schemas
const createBoardValidation = [
  body('name').trim().notEmpty().withMessage('Board name is required'),
  validateRequest
];

const addMemberValidation = [
  body('email').trim().isEmail().withMessage('Please provide a valid email'),
  body('role').optional().isIn(['manager', 'member']).withMessage('Invalid role'),
  validateRequest
];

const updateRoleValidation = [
  body('role').isIn(['manager', 'member']).withMessage('Invalid role'),
  validateRequest
];

// Board CRUD
router.post('/', createBoardValidation, boardController.createBoard);
router.get('/', boardController.getBoards);

router.get('/:boardId', authorizeBoard(), boardController.getBoardById);
router.patch('/:boardId', authorizeBoard('manager'), boardController.updateBoard);
router.delete('/:boardId', authorizeBoard('manager'), boardController.deleteBoard);

// Board Members
router.post('/:boardId/members', authorizeBoard('manager'), addMemberValidation, boardController.addMember);
router.get('/:boardId/members', authorizeBoard(), boardController.getMembers);
router.patch('/:boardId/members/:userId', authorizeBoard('manager'), updateRoleValidation, boardController.updateMemberRole);
router.delete('/:boardId/members/:userId', authorizeBoard('manager'), boardController.removeMember);

// --- Sub-resources (Columns & Tasks) ---
// We mount them under /:boardId/columns and /:boardId/tasks
// We enforce authentication and board membership generically first.
router.use('/:boardId/columns', authorizeBoard(), columnRoutes);
router.use('/:boardId/tasks', authorizeBoard(), taskRoutes);
router.use('/:boardId/activity', authorizeBoard(), activityRoutes);

// Automations
router.get('/:boardId/automations', authorizeBoard(), automationController.getAutomations);
router.post('/:boardId/automations', authorizeBoard(), automationController.createAutomation);
router.patch('/:boardId/automations/:automationId', authorizeBoard(), automationController.toggleAutomation);
router.delete('/:boardId/automations/:automationId', authorizeBoard(), automationController.deleteAutomation);

// Analytics
router.get('/:boardId/analytics', authorizeBoard(), boardController.getBoardAnalytics);

module.exports = router;
