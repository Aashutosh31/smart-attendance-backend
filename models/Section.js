const mongoose = require('mongoose');

const SectionSchema = new mongoose.Schema({
  name: { type: String, required: true }, // e.g., 'A', 'B'
  semester: { type: mongoose.Schema.Types.ObjectId, ref: 'Semester', required: true },
  students: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, { timestamps: true });

module.exports = mongoose.model('Section', SectionSchema);
