const mongoose = require('mongoose');

const TimetableSchema = new mongoose.Schema({
  department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
  semester: { type: mongoose.Schema.Types.ObjectId, ref: 'Semester', required: true },
  section: { type: mongoose.Schema.Types.ObjectId, ref: 'Section', required: true },
  dayOfWeek: { type: String, enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'], required: true },
  lectures: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Lecture' }]
}, { timestamps: true });

module.exports = mongoose.model('Timetable', TimetableSchema);
