const mongoose = require('mongoose');

const SecurityLogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  session: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CourseSession'
  },
  eventType: {
    type: String,
    enum: ['face_mismatch', 'liveness_failed', 'ble_spoof_attempt', 'duplicate_face_enrollment'],
    required: true
  },
  details: {
    type: String,
    required: true
  },
  ipAddress: String,
  userAgent: String
}, { timestamps: true });

module.exports = mongoose.model('SecurityLog', SecurityLogSchema);
