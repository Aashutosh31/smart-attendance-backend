const mongoose = require('mongoose');

const LectureSchema = new mongoose.Schema({
  subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  faculty: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  classroom: { type: mongoose.Schema.Types.ObjectId, ref: 'Classroom' },
  startTime: { type: String, required: true }, // HH:mm format
  endTime: { type: String, required: true },   // HH:mm format
}, { timestamps: true });

module.exports = mongoose.model('Lecture', LectureSchema);
