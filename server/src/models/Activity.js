const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  board: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Board',
    required: true,
    index: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  action: {
    type: String,
    enum: [
      'board_created',
      'member_added',
      'member_role_changed',
      'member_removed',
      'task_created',
      'task_moved',
      'task_assigned',
      'task_updated',
      'task_deleted',
      'comment_created',
      'comment_deleted',
      'attachment_uploaded',
      'attachment_deleted'
    ],
    required: true,
    index: true
  },
  entityType: {
    type: String,
    enum: ['board', 'member', 'task', 'comment', 'attachment'],
    required: true
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, { timestamps: true });

// Compound index for chronological querying per board
activitySchema.index({ board: 1, createdAt: -1 });

module.exports = mongoose.model('Activity', activitySchema);
