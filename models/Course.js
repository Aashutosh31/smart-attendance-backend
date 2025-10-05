// models/Course.js
const mongoose = require('mongoose');

const CourseSchema = new mongoose.Schema({
  name: { type: String, required: true },
  code: { type: String, required: true, unique: true },
  // FIX: Changed type from ObjectId to String to match the User model's UUID _id
  faculty: { type: String, ref: 'User' },
  students: [{ type: String, ref: 'User' }] 
}, { timestamps: true });

module.exports = mongoose.model('Course', CourseSchema);