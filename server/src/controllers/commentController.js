const Comment = require('../models/Comment');
const Task = require('../models/Task');
const { logActivity } = require('../services/activityService');
const { broadcastBoardEvent } = require('../socket');

// Helper to verify task belongs to board
const getValidatedTask = async (taskId, boardId) => {
  const task = await Task.findOne({ _id: taskId, board: boardId });
  return task;
};

exports.getComments = async (req, res, next) => {
  try {
    const { boardId, taskId } = req.params;
    
    if (!(await getValidatedTask(taskId, boardId))) {
      return res.status(404).json({ success: false, error: { message: 'Task not found' } });
    }

    const comments = await Comment.find({ task: taskId, board: boardId })
      .populate('author', 'name email avatarUrl')
      .sort({ createdAt: 1 }); // chronological

    res.status(200).json({ success: true, data: { comments } });
  } catch (error) {
    next(error);
  }
};

exports.createComment = async (req, res, next) => {
  try {
    const { boardId, taskId } = req.params;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, error: { message: 'Content is required' } });
    }

    if (!(await getValidatedTask(taskId, boardId))) {
      return res.status(404).json({ success: false, error: { message: 'Task not found' } });
    }

    const comment = new Comment({
      task: taskId,
      board: boardId,
      author: req.user._id,
      content: content.trim()
    });

    await comment.save();
    
    // Populate for response
    await comment.populate('author', 'name email avatarUrl');

    await logActivity({
      boardId,
      userId: req.user._id,
      action: 'comment_created',
      entityType: 'comment',
      entityId: comment._id,
      metadata: { taskId }
    });

    const populatedComment = await Comment.findById(comment._id).populate('author', 'name email avatarUrl');
    
    broadcastBoardEvent(boardId, 'comment_created', { taskId, comment: populatedComment });
    res.status(201).json({ success: true, data: { comment: populatedComment } });
  } catch (error) {
    next(error);
  }
};

exports.updateComment = async (req, res, next) => {
  try {
    const { boardId, taskId, commentId } = req.params;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, error: { message: 'Content is required' } });
    }

    const comment = await Comment.findOne({ _id: commentId, task: taskId, board: boardId });
    if (!comment) {
      return res.status(404).json({ success: false, error: { message: 'Comment not found' } });
    }

    // RBAC: only author can edit their comment
    if (comment.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, error: { message: 'Forbidden: You can only edit your own comments' } });
    }

    comment.content = content.trim();
    await comment.save();
    await comment.populate('author', 'name email avatarUrl');

    res.status(200).json({ success: true, data: { comment } });
  } catch (error) {
    next(error);
  }
};

exports.deleteComment = async (req, res, next) => {
  try {
    const { boardId, taskId, commentId } = req.params;

    const comment = await Comment.findOne({ _id: commentId, task: taskId, board: boardId });
    if (!comment) {
      return res.status(404).json({ success: false, error: { message: 'Comment not found' } });
    }

    // RBAC: author can delete, OR manager/admin can delete
    const isAuthor = comment.author.toString() === req.user._id.toString();
    const isManagerOrAdmin = req.user.globalRole === 'admin' || req.boardRole === 'manager';

    if (!isAuthor && !isManagerOrAdmin) {
      return res.status(403).json({ success: false, error: { message: 'Forbidden: Cannot delete this comment' } });
    }

    await Comment.deleteOne({ _id: commentId });
    
    await logActivity({
      boardId,
      userId: req.user._id,
      action: 'comment_deleted',
      entityType: 'comment',
      entityId: commentId,
      metadata: { taskId }
    });

    broadcastBoardEvent(boardId, 'comment_deleted', { taskId, commentId });
    res.status(200).json({ success: true, data: { message: 'Comment deleted' } });
  } catch (error) {
    next(error);
  }
};
