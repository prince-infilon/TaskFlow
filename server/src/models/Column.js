const mongoose = require('mongoose');

const columnSchema = new mongoose.Schema({
  board: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Board',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  position: {
    type: Number,
    required: true,
    default: 0
  }
}, { timestamps: true });

// Prevent duplicate column names in the same board
columnSchema.index({ board: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Column', columnSchema);
