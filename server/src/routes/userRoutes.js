const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate } = require('../middleware/authMiddleware');
const {
  requireAdminOrManager,
  requireAdmin,
  authorizeTargetUser
} = require('../middleware/userHierarchyMiddleware');
const {
  createUserValidation,
  updateUserValidation,
  resetPasswordValidation,
  reassignMemberValidation
} = require('../middleware/validation/userValidation');

router.use(authenticate);

// Current user routes
router.get('/me', (req, res) => {
  res.status(200).json({ success: true, data: { user: req.user } });
});

router.get('/me/dashboard', userController.getDashboardData);
router.get('/me/tasks', userController.getMyTasks);
router.get('/me/search', userController.globalSearch);

// ==============================================================================
// Hierarchical User Management Routes (Admin & Manager)
// ==============================================================================

// List users according to hierarchy (Admin sees all; Manager sees ONLY own members)
router.get('/', requireAdminOrManager, userController.getUsers);

// Admin helper to get list of active managers for dropdowns
router.get('/managers', requireAdmin, userController.getActiveManagers);
router.get('/active-managers', requireAdmin, userController.getActiveManagers);

// Provision new user
router.post('/', requireAdminOrManager, createUserValidation, userController.createUser);

// Get specific user details
router.get('/:userId', requireAdminOrManager, authorizeTargetUser, userController.getUserById);

// Update user details
router.patch('/:userId', requireAdminOrManager, authorizeTargetUser, updateUserValidation, userController.updateUser);
router.put('/:userId', requireAdminOrManager, authorizeTargetUser, updateUserValidation, userController.updateUser);

// Reassign member to another manager (Admin-only)
router.patch('/:userId/reassign', requireAdmin, authorizeTargetUser, reassignMemberValidation, userController.reassignMember);

// Activate / Deactivate user status
router.patch('/:userId/status', requireAdminOrManager, authorizeTargetUser, userController.toggleUserStatus);

// Reset user password
router.post('/:userId/reset-password', requireAdminOrManager, authorizeTargetUser, resetPasswordValidation, userController.resetUserPassword);

module.exports = router;
