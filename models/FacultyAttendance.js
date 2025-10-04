const mongoose = require('mongoose');

const FacultyAttendanceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  subject: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    required: true,
    default: 'faculty',
  },
  checkInTime: {
    type: Date,
    default: Date.now,
  },
}, { timestamps: true });

module.exports = mongoose.model('FacultyAttendance', FacultyAttendanceSchema);
