const express = require('express');
const router = express.Router({ mergeParams: true });
const { getBoardActivity, getGlobalActivity } = require('../controllers/activityController');
const { authenticate } = require('../middleware/authMiddleware');

router.use(authenticate);

router.get('/', (req, res, next) => {
  if (req.params.boardId) {
    return getBoardActivity(req, res, next);
  }
  return getGlobalActivity(req, res, next);
});

module.exports = router;
