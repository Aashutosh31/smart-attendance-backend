// models/CourseSession.js
const mongoose = require('mongoose');

const CourseSessionSchema = new mongoose.Schema({
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true,
  },
  faculty: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  classroom: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Classroom',
    required: false, // Optional for backward compatibility, but recommended for BLE
  },
  date: {
    type: Date,
    required: true,
  },
  scheduledStartTime: {
    type: String, // HH:mm
    required: true,
  },
  scheduledEndTime: {
    type: String, // HH:mm
    required: true,
  },
  actualStartTime: {
    type: Date,
  },
  actualEndTime: {
    type: Date,
  },
  status: {
    type: String,
    enum: ['scheduled', 'live', 'completed', 'cancelled'],
    default: 'scheduled',
  },
  // Keep isActive for backward compatibility temporarily, but tie it to status === 'live'
  isActive: {
    type: Boolean,
    default: false,
  },
}, { timestamps: true });

module.exports = mongoose.model('CourseSession', CourseSessionSchema);