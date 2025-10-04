const mongoose = require('mongoose');

const AdminHodAttendanceSchema = new mongoose.Schema({
  hod: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  department: {
    type: String,
    required: true,
  },
  checkInTime: {
    type: Date,
    required: true,
    default: Date.now,
  },
}, { timestamps: true });

module.exports = mongoose.model('AdminHodAttendance', AdminHodAttendanceSchema);
