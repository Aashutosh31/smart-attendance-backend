// models/FacultyAttendance.js
const mongoose = require('mongoose');

const facultyAttendanceSchema = new mongoose.Schema({
    // FIX: Changed type from ObjectId to String
    faculty: {
        type: String,
        ref: 'User',
        required: true
    },
    date: {
        type: Date,
        required: true
    },
    status: {
        type: String,
        enum: ['present', 'absent'],
        required: true
    },
    checkInTime: {
        type: String
    },
}, { timestamps: true });

module.exports = mongoose.model('FacultyAttendance', facultyAttendanceSchema);