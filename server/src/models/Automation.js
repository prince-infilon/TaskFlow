const mongoose = require('mongoose');

const automationSchema = new mongoose.Schema({
  board: { type: mongoose.Schema.Types.ObjectId, ref: 'Board', required: true },
  trigger: {
    type: String, 
    enum: ['task_moved', 'task_created'],
    required: true
  },
  condition: {
    columnId: { type: mongoose.Schema.Types.ObjectId, ref: 'Column' } // The column that triggers this (e.g. "Done" column)
  },
  action: {
    type: String, 
    enum: ['set_priority', 'mark_complete', 'unassign'],
    required: true
  },
  actionPayload: { 
    type: mongoose.Schema.Types.Mixed // e.g. { priority: 'low' }
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  isActive: { type: Boolean, default: true }
}, {
  timestamps: true
});

module.exports = mongoose.model('Automation', automationSchema);
