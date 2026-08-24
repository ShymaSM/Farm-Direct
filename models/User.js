const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['farmer', 'buyer'], required: true },
  
  // Farmer specific
  farmName: { type: String },
  
  // Business specific
  businessName: { type: String },
  businessType: { type: String },
  
  // Location
  location: { type: String, required: true },
  district: { type: String, required: true },
  state: { type: String, required: true },
  
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);
