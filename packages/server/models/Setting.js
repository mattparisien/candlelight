const mongoose = require('mongoose');

// MongoDB Schema for application settings
const settingSchema = new mongoose.Schema({
  section: {
    type: String,
    required: true
  },
  key: {
    type: String,
    required: true
  },
  value: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

// Create a compound index to ensure unique combination of section + key
settingSchema.index({ section: 1, key: 1 }, { unique: true });

const Setting = mongoose.model('Setting', settingSchema);

module.exports = Setting;
