const mongoose = require('mongoose');

const memberSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  role: {
    type: String,
    enum: ['manager', 'member'],
    default: 'member'
  }
}, { _id: false, timestamps: { createdAt: 'joinedAt', updatedAt: false } });

const boardSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  members: [memberSchema]
}, { timestamps: true });

// Tenant and lookup performance indexes
boardSchema.index({ organizationId: 1 });
boardSchema.index({ owner: 1 });
boardSchema.index({ 'members.user': 1 });

module.exports = mongoose.model('Board', boardSchema);

