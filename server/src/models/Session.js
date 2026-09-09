const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  refreshTokenHash: {
    type: String,
    required: true
  },
  userAgent: {
    type: String,
    default: 'Unknown Device'
  },
  ipAddress: {
    type: String,
    default: 'Unknown IP'
  },
  lastActive: {
    type: Date,
    default: Date.now
  },
  isValid: {
    type: Boolean,
    default: true
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expires: 0 } // TTL index so MongoDB automatically cleans up expired sessions
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Session', sessionSchema);
