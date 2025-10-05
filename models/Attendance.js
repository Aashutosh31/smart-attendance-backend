// models/Attendance.js
const mongoose = require('mongoose');

const AttendanceSchema = new mongoose.Schema({
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true,
  },
  // FIX: Changed type from string to ObjectId
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  // FIX: Changed type from string to ObjectId
  faculty: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  date: {
    type: Date,
    required: true,
    default: Date.now,
  },
  status: {
    type: String,
    enum: ['present', 'absent'],
    required: true,
  },
  lectureNumber: {
    type: Number,
    required: true,
  },
}, { timestamps: true });

module.exports = mongoose.model('Attendance', AttendanceSchema);