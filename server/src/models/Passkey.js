const mongoose = require('mongoose');

const passkeySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  credentialID: {
    type: String,
    required: true,
    unique: true
  },
  credentialPublicKey: {
    type: Buffer,
    required: true
  },
  counter: {
    type: Number,
    required: true,
    default: 0
  },
  transports: {
    type: [String]
  },
  deviceType: {
    type: String,
    enum: ['singleDevice', 'multiDevice']
  },
  backedUp: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Passkey', passkeySchema);
