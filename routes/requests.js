const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const BuyerRequest = require('../models/BuyerRequest');
const Crop = require('../models/Crop');
const User = require('../models/User');
const Notification = require('../models/Notification');
const sendEmail = require('../utils/sendEmail');

// POST /api/requests
// Send a requirement to a farmer (Business only)
router.post('/', auth, async (req, res) => {
  try {
    if (req.user.role !== 'buyer') {
      return res.status(403).json({ message: 'Only buyers can send requests' });
    }

    const { cropId, requestedQuantity, offeredPrice, deliveryDate, message } = req.body;

    const crop = await Crop.findById(cropId);
    if (!crop) {
      return res.status(404).json({ message: 'Crop not found' });
    }

    const farmer = await User.findById(crop.farmerId);
    if (!farmer) {
      return res.status(404).json({ message: 'Farmer not found' });
    }

    const buyer = await User.findById(req.user.id);

    const newRequest = new BuyerRequest({
      cropId,
      farmerId: crop.farmerId,
      buyerId: req.user.id,
      requestedQuantity,
      offeredPrice,
      deliveryDate,
      message
    });

    const savedRequest = await newRequest.save();

    // Create Notification
    const notification = new Notification({
      recipientId: farmer.id,
      senderId: buyer.id,
      type: 'BuyerRequest',
      title: 'New Buyer Request!',
      message: `${buyer.businessName} is interested in your ${crop.cropName} listing.`,
      relatedRequestId: savedRequest.id
    });

    await notification.save();

    // Send Email
    const emailMessage = `
Hello ${farmer.name},

You have received a new buyer request.

Business: ${buyer.businessName}
Crop: ${crop.cropName}
Requested Quantity: ${requestedQuantity} KG
Offered Price: ₹${offeredPrice} per KG
Required Delivery Date: ${new Date(deliveryDate).toLocaleDateString()}

Message:
"${message}"

Please log in to FarmDirect to accept or reject this request.

Regards,
FarmDirect Team
    `;

    await sendEmail({
      email: farmer.email,
      subject: 'New Buyer Request for Your Crop – FarmDirect',
      message: emailMessage
    });

    res.json(savedRequest);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// GET /api/requests/me
// Get my requests (For both roles)
router.get('/me', auth, async (req, res) => {
  try {
    let requests;
    if (req.user.role === 'farmer') {
      requests = await BuyerRequest.find({ farmerId: req.user.id })
                                   .populate('buyerId', ['name', 'businessName', 'location'])
                                   .populate('cropId', ['cropName'])
                                   .sort({ createdAt: -1 });
    } else {
      requests = await BuyerRequest.find({ buyerId: req.user.id })
                                   .populate('farmerId', ['name', 'farmName', 'location'])
                                   .populate('cropId', ['cropName'])
                                   .sort({ createdAt: -1 });
    }
    res.json(requests);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// PUT /api/requests/:id
// Accept or reject request (Farmer only)
router.put('/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'farmer') {
      return res.status(403).json({ message: 'Only farmers can update requests' });
    }

    const { status } = req.body;
    
    let request = await BuyerRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: 'Request not found' });
    if (request.farmerId.toString() !== req.user.id) {
      return res.status(401).json({ message: 'User not authorized' });
    }

    request.status = status;
    await request.save();

    // Create notification for buyer
    const notification = new Notification({
      recipientId: request.buyerId,
      senderId: req.user.id,
      type: 'RequestUpdate',
      title: 'Request Updated',
      message: `Your request has been ${status}.`,
      relatedRequestId: request.id
    });
    await notification.save();

    res.json(request);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;
