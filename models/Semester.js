const mongoose = require('mongoose');

const SemesterSchema = new mongoose.Schema({
  name: { type: String, required: true },
  number: { type: Number, required: true },
  department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true }
}, { timestamps: true });

module.exports = mongoose.model('Semester', SemesterSchema);
