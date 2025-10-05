// models/Course.js
const mongoose = require('mongoose');

const CourseSchema = new mongoose.Schema({
  name: { type: String, required: true },
  code: { type: String, required: true, unique: true },
  // This should be ObjectId
  faculty: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  students: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }] 
}, { timestamps: true });

module.exports = mongoose.model('Course', CourseSchema);