const mongoose = require('mongoose');

const cropSchema = new mongoose.Schema({
  farmerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  cropName: { type: String, required: true },
  quantity: { type: Number, required: true },
  pricePerKg: { type: Number, required: true },
  harvestDate: { type: Date, required: true },
  availableFrom: { type: Date, required: true },
  location: { type: String, required: true },
  quality: { type: String },
  description: { type: String },
  image: { type: String },
  status: { type: String, default: 'Available', enum: ['Available', 'Sold', 'Pending'] },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Crop', cropSchema);
