const mongoose = require('mongoose');

const orgMemberSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  role: {
    type: String,
    enum: ['admin', 'manager', 'member'],
    default: 'member'
  }
}, { _id: false, timestamps: { createdAt: 'joinedAt', updatedAt: false } });

const organizationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  members: [orgMemberSchema],
  subscription: {
    stripeCustomerId: { type: String },
    stripeSubscriptionId: { type: String },
    plan: {
      type: String,
      enum: ['free', 'pro', 'enterprise'],
      default: 'free'
    },
    status: {
      type: String,
      enum: ['active', 'past_due', 'canceled', 'unpaid', 'incomplete', 'incomplete_expired', 'trialing'],
      default: 'active'
    },
    currentPeriodEnd: { type: Date }
  }
}, { timestamps: true });

// Membership and Stripe lookup performance indexes
organizationSchema.index({ 'members.user': 1 });
organizationSchema.index({ 'subscription.stripeCustomerId': 1 });
organizationSchema.index({ owner: 1 });

module.exports = mongoose.model('Organization', organizationSchema);

