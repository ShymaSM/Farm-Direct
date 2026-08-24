const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const Crop = require('../models/Crop');
const User = require('../models/User');

// POST /api/crops
// Add a new crop (Farmer only)
router.post('/', auth, async (req, res) => {
  try {
    if (req.user.role !== 'farmer') {
      return res.status(403).json({ message: 'Only farmers can add crops' });
    }

    const { cropName, quantity, pricePerKg, harvestDate, availableFrom, location, quality, description, image } = req.body;

    const newCrop = new Crop({
      farmerId: req.user.id,
      cropName,
      quantity,
      pricePerKg,
      harvestDate,
      availableFrom,
      location,
      quality,
      description,
      image
    });

    const crop = await newCrop.save();
    res.json(crop);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// GET /api/crops
// Get all available crops (For buyers)
router.get('/', auth, async (req, res) => {
  try {
    // We populate the farmer details to display in the marketplace
    const crops = await Crop.find({ status: 'Available' })
                            .populate('farmerId', ['name', 'farmName', 'location', 'district', 'state'])
                            .sort({ createdAt: -1 });
    res.json(crops);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// GET /api/crops/me
// Get my crops (For farmer)
router.get('/me', auth, async (req, res) => {
  try {
    const crops = await Crop.find({ farmerId: req.user.id }).sort({ createdAt: -1 });
    res.json(crops);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;
