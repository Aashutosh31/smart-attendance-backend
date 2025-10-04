// models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { 
    type: String, 
    // THE FIX IS HERE: Added 'coordinator' to the list of accepted roles.
    enum: ['student', 'faculty', 'admin', 'hod', 'program_coordinator', 'coordinator'], 
    required: true 
  },
  department: { type: String },
  subject: { type: String },
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' }, 
  faceDescriptor: { type: [Number] }, 
  isFaceEnrolled: { type: Boolean, default: false },
}, { timestamps: true });

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  const bcrypt = require('bcryptjs');
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

module.exports = mongoose.model('User', userSchema);