const mongoose = require('mongoose');

// MongoDB Schema for authorized domains
const authorizedDomainSchema = new mongoose.Schema({
  websiteUrl: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  pluginsAllowed: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Plugin'
  }],
  status: {
    type: String,
    enum: ['active', 'expired', 'suspended'],
    default: 'active'
  },
  purchaseDate: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    default: null // null means no expiration
  },
  customerEmail: String,
  notes: String
}, {
  timestamps: true
});

const AuthorizedDomain = mongoose.model('AuthorizedDomain', authorizedDomainSchema);

module.exports = AuthorizedDomain;
