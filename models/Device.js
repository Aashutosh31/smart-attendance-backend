const mongoose = require('mongoose');

const DeviceSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  deviceId: { type: String, required: true, unique: true }, // e.g., IMEI or unique browser fingerprint
  deviceType: { type: String, enum: ['mobile', 'tablet', 'desktop'], default: 'mobile' },
  trusted: { type: Boolean, default: false },
  lastUsed: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Device', DeviceSchema);
