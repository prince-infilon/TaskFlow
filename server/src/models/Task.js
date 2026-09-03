const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  board: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Board',
    required: true
  },
  column: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Column',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  dueDate: {
    type: String,
    trim: true,
    default: ''
  },
  assignee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'low'
  },
  position: {
    type: Number,
    required: true,
    default: 0
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, { timestamps: true });

module.exports = mongoose.model('Task', taskSchema);
