const Attachment = require('../models/Attachment');
const Task = require('../models/Task');
const { logActivity } = require('../services/activityService');
const { broadcastBoardEvent } = require('../socket');
const fs = require('fs');
const path = require('path');

// Helper to verify task belongs to board
const getValidatedTask = async (taskId, boardId) => {
  const task = await Task.findOne({ _id: taskId, board: boardId });
  return task;
};

exports.uploadAttachment = async (req, res, next) => {
  try {
    const { boardId, taskId } = req.params;
    
    if (!req.file) {
      return res.status(400).json({ success: false, error: { message: 'No file uploaded' } });
    }

    if (!(await getValidatedTask(taskId, boardId))) {
      // Clean up uploaded file if task invalid
      await fs.promises.unlink(req.file.path).catch(() => {});
      return res.status(404).json({ success: false, error: { message: 'Task not found' } });
    }

    const attachment = new Attachment({
      task: taskId,
      board: boardId,
      uploadedBy: req.user._id,
      originalFilename: req.file.originalname,
      storedFilename: req.file.filename,
      path: req.file.path,
      mimeType: req.file.mimetype,
      fileSize: req.file.size
    });

    await attachment.save();
    await attachment.populate('uploadedBy', 'name email avatarUrl');

    await logActivity({
      boardId,
      userId: req.user._id,
      action: 'attachment_uploaded',
      entityType: 'attachment',
      entityId: attachment._id,
      metadata: { taskId, originalFilename: attachment.originalFilename }
    });

    const populatedAttachment = await Attachment.findById(attachment._id).populate('uploadedBy', 'name email avatarUrl');
    
    broadcastBoardEvent(boardId, 'attachment_uploaded', { taskId, attachment: populatedAttachment });
    res.status(201).json({ success: true, data: { attachment: populatedAttachment } });
  } catch (error) {
    if (req.file) {
      await fs.promises.unlink(req.file.path).catch(() => {});
    }
    next(error);
  }
};

exports.getAttachments = async (req, res, next) => {
  try {
    const { boardId, taskId } = req.params;
    
    if (!(await getValidatedTask(taskId, boardId))) {
      return res.status(404).json({ success: false, error: { message: 'Task not found' } });
    }

    const attachments = await Attachment.find({ task: taskId, board: boardId })
      .populate('uploadedBy', 'name email avatarUrl')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: { attachments } });
  } catch (error) {
    next(error);
  }
};

exports.downloadAttachment = async (req, res, next) => {
  try {
    const { boardId, taskId, attachmentId } = req.params;

    const attachment = await Attachment.findOne({ _id: attachmentId, task: taskId, board: boardId });
    if (!attachment) {
      return res.status(404).json({ success: false, error: { message: 'Attachment not found' } });
    }

    const safePath = path.resolve(attachment.path);
    // basic sanity check
    if (!safePath.startsWith(path.resolve('uploads'))) {
       return res.status(403).json({ success: false, error: { message: 'Invalid file path' } });
    }

    try {
      await fs.promises.access(safePath, fs.constants.F_OK);
    } catch {
      return res.status(404).json({ success: false, error: { message: 'Physical file missing on server' } });
    }

    res.download(safePath, attachment.originalFilename);
  } catch (error) {
    next(error);
  }
};

exports.deleteAttachment = async (req, res, next) => {
  try {
    const { boardId, taskId, attachmentId } = req.params;

    const attachment = await Attachment.findOne({ _id: attachmentId, task: taskId, board: boardId });
    if (!attachment) {
      return res.status(404).json({ success: false, error: { message: 'Attachment not found' } });
    }

    // RBAC: author can delete, OR manager/admin can delete
    const isUploader = attachment.uploadedBy.toString() === req.user._id.toString();
    const isManagerOrAdmin = req.user.globalRole === 'admin' || req.boardRole === 'manager';

    if (!isUploader && !isManagerOrAdmin) {
      return res.status(403).json({ success: false, error: { message: 'Forbidden: Cannot delete this attachment' } });
    }

    // Remove file physically
    const safePath = path.resolve(attachment.path);
    if (safePath.startsWith(path.resolve('uploads'))) {
      await fs.promises.unlink(safePath).catch(() => {});
    }

    await Attachment.deleteOne({ _id: attachmentId });
    
    await logActivity({
      boardId,
      userId: req.user._id,
      action: 'attachment_deleted',
      entityType: 'attachment',
      entityId: attachmentId,
      metadata: { taskId, originalFilename: attachment.originalFilename }
    });

    broadcastBoardEvent(boardId, 'attachment_deleted', { taskId, attachmentId });
    res.status(200).json({ success: true, data: { message: 'Attachment deleted' } });
  } catch (error) {
    next(error);
  }
};
