const express = require('express');
const router = express.Router({ mergeParams: true });
const { getTasks, createTask, getTaskById, updateTask, deleteTask, moveTask } = require('../controllers/taskController');
const commentRoutes = require('./commentRoutes');
const attachmentRoutes = require('./attachmentRoutes');

// All task routes are protected by authorizeBoard in boardRoutes.js, so members and managers can access them.
// Fine-grained RBAC (can edit/delete) is handled inside the taskController based on assignment/creator logic.

router.get('/', getTasks);
router.post('/', createTask);
router.get('/:taskId', getTaskById);
router.patch('/:taskId', updateTask);
router.delete('/:taskId', deleteTask);
router.patch('/:taskId/move', moveTask);

router.use('/:taskId/comments', commentRoutes);
router.use('/:taskId/attachments', attachmentRoutes);

module.exports = router;
