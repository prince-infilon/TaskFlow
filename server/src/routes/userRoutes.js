const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate } = require('../middleware/authMiddleware');

router.use(authenticate);

router.get('/me', (req, res) => {
  res.status(200).json({ success: true, data: { user: req.user } });
});

router.get('/me/dashboard', userController.getDashboardData);
router.get('/me/tasks', userController.getMyTasks);
router.get('/me/search', userController.globalSearch);

module.exports = router;
