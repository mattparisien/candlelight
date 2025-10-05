const mongoose = require('mongoose');

// MongoDB Schema for plugin orders
const orderSchema = new mongoose.Schema({
  orderId: {
    type: String,
    required: true,
    unique: true
  },
  plugin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Plugin',
    required: true
  },
  clientEmail: {
    type: String,
    required: true,
    lowercase: true
  },
  clientName: {
    type: String
  },
  amount: {
    type: Number
  },
  currency: {
    type: String,
    default: 'USD'
  },
  purchaseDate: {
    type: Date,
    default: Date.now
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;
