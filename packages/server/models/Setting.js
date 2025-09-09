const mongoose = require('mongoose');

// MongoDB Schema for application settings
const settingSchema = new mongoose.Schema({
  settingSection: {
    type: String,
    required: true
  },
  settingKey: {
    type: String,
    required: true
  },
  settingValue: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

// Create a compound index to ensure unique combination of section + key
settingSchema.index({ settingSection: 1, settingKey: 1 }, { unique: true });

const Setting = mongoose.model('Setting', settingSchema);

module.exports = Setting;
