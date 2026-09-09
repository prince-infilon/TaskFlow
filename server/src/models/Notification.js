const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  board: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Board',
    required: true
  },
  task: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
    default: null
  },
  type: {
    type: String,
    enum: ['comment_added', 'task_assigned', 'task_moved', 'attachment_added', 'task_created', 'status_changed', 'general'],
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  message: {
    type: String,
    required: true,
    trim: true
  },
  targetSection: {
    type: String,
    enum: ['comments', 'attachments', 'details'],
    default: 'details'
  },
  isRead: {
    type: Boolean,
    default: false,
    index: true
  }
}, { timestamps: true });

// Compound index for user notification feed queries
notificationSchema.index({ recipient: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
