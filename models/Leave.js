const mongoose = require('mongoose');

const LeaveSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Student or Faculty
  reason: { type: String, required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  documentUrl: { type: String } // Medical certificate etc.
}, { timestamps: true });

module.exports = mongoose.model('Leave', LeaveSchema);
