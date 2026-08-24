const mongoose = require('mongoose');

const buyerRequestSchema = new mongoose.Schema({
  cropId: { type: mongoose.Schema.Types.ObjectId, ref: 'Crop', required: true },
  farmerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  buyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  requestedQuantity: { type: Number, required: true },
  offeredPrice: { type: Number, required: true },
  deliveryDate: { type: Date, required: true },
  message: { type: String },
  status: { type: String, default: 'Pending', enum: ['Pending', 'Accepted', 'Rejected', 'Completed'] },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('BuyerRequest', buyerRequestSchema);
