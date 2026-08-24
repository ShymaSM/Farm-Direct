const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, required: true }, // e.g., 'BuyerRequest', 'RequestAccepted'
  title: { type: String, required: true },
  message: { type: String, required: true },
  relatedRequestId: { type: mongoose.Schema.Types.ObjectId, ref: 'BuyerRequest' },
  isRead: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Notification', notificationSchema);
