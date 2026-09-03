const express = require('express');
const router = express.Router({ mergeParams: true });
const { getBoardActivity } = require('../controllers/activityController');

// Mounted at /api/boards/:boardId/activity
// Protected by authorizeBoard in boardRoutes.js

router.get('/', getBoardActivity);

module.exports = router;
