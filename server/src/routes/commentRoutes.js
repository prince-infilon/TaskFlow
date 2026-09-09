const express = require('express');
const router = express.Router({ mergeParams: true });
const { getComments, createComment, updateComment, deleteComment } = require('../controllers/commentController');
const { createCommentValidation, updateCommentValidation } = require('../middleware/validation/commentValidation');

// Mounted at /api/boards/:boardId/tasks/:taskId/comments
// Protected by authorizeBoard in taskRoutes

router.get('/', getComments);
router.post('/', createCommentValidation, createComment);
router.patch('/:commentId', updateCommentValidation, updateComment);
router.delete('/:commentId', deleteComment);

module.exports = router;
