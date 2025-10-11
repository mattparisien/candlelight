const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  name: {
    type: String
  },
  firstname: {
    type: String
  },
  lastname: {
    type: String
  },
  address1: {
    type: String
  },
  address2: {
    type: String
  },
  city: {
    type: String,
    default: 'Mont-Royal'
  },
  state: {
    type: String,
    default: 'QC'
  },
  countryCode: {
    type: String,
    default: 'CA'
  },
  postalCode: {
    type: String,
    default: 'H3R 2R2'
  },
  phone: {
    type: String,
    default: ''
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

const Client = mongoose.model('Client', clientSchema);
module.exports = Client;
