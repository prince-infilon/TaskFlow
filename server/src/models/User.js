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
      required: true
    },
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
    }
  },
  {
    timestamps: true
  }
);

// We want to avoid returning the passwordHash in JSON responses accidentally
userSchema.set('toJSON', {
  transform: function (doc, ret, options) {
    delete ret.passwordHash;
    return ret;
  }
});

module.exports = mongoose.model('User', userSchema);
