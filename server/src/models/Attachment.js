const mongoose = require('mongoose');

const attachmentSchema = new mongoose.Schema({
  task: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
    required: true
  },
  board: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Board',
    required: true
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  originalFilename: {
    type: String,
    required: true
  },
  storedFilename: {
    type: String,
    required: true
  },
  path: {
    type: String,
    required: true
  },
  mimeType: {
    type: String,
    required: true
  },
  fileSize: {
    type: Number,
    required: true
  }
}, { timestamps: true });

module.exports = mongoose.model('Attachment', attachmentSchema);
