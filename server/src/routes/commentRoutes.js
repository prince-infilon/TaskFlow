const express = require('express');
const router = express.Router({ mergeParams: true });
const { getComments, createComment, updateComment, deleteComment } = require('../controllers/commentController');

// Mounted at /api/boards/:boardId/tasks/:taskId/comments
// Protected by authorizeBoard in taskRoutes

router.get('/', getComments);
router.post('/', createComment);
router.patch('/:commentId', updateComment);
router.delete('/:commentId', deleteComment);

module.exports = router;
