const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true
    },
    passwordHash: {
      type: String,
      required: false // Optional for OAuth users
    },
    providers: [
      {
        provider: { type: String, enum: ['google', 'github', 'microsoft'] },
        providerId: { type: String }
      }
    ],
    // MFA Fields
    twoFactorSecret: { type: String },
    isTwoFactorEnabled: { type: Boolean, default: false },
    backupCodes: [{ type: String }],
    // Lockout Fields
    failedLoginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date },
    globalRole: {
      type: String,
      enum: ['admin', 'manager', 'member'],
      default: 'member'
    },
    avatarUrl: {
      type: String,
      default: null
    },
    isActive: {
      type: Boolean,
      default: true
    },
    managerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Performance indexes for role and manager hierarchy
userSchema.index({ globalRole: 1 });
userSchema.index({ managerId: 1 });

// We want to avoid returning the passwordHash in JSON responses accidentally
userSchema.set('toJSON', {
  transform: function (doc, ret, options) {
    delete ret.passwordHash;
    delete ret.twoFactorSecret;
    delete ret.backupCodes;
    return ret;
  }
});

module.exports = mongoose.model('User', userSchema);

