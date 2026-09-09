const mongoose = require('mongoose');

const authAuditLogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  action: {
    type: String,
    enum: ['login', 'logout', 'password_change', 'mfa_enabled', 'mfa_disabled', 'lockout', 'new_device', 'token_revoked', 'oauth_linked'],
    required: true
  },
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('AuthAuditLog', authAuditLogSchema);
