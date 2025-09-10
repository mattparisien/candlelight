const mongoose = require('mongoose');

// MongoDB Schema for plugins
const pluginSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/ // Validate kebab-case format
  },
  displayName: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  version: {
    type: String,
    default: '1.0.0'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  bundlePath: {
    type: String,
    required: true
  },
  treeConfig: {
    type: mongoose.Schema.Types.Mixed, // Can store either string selector or object config
    required: false
  },
  password: {
    type: String,
    required: true,
    minlength: 16,
    maxlength: 32
  },
  supportedPlatforms: [{
    type: String,
    enum: ['desktop', 'mobile', 'tablet'],
    default: ['desktop']
  }],
  squarespaceVersions: [{
    type: String,
    enum: ['7.0', '7.1'],
    default: ['7.1']
  }],
  defaultOptions: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

const Plugin = mongoose.model('Plugin', pluginSchema);

module.exports = Plugin;
