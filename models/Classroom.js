const mongoose = require('mongoose');

const ClassroomSchema = new mongoose.Schema({
  name: { type: String, required: true },
  building: { type: String },
  capacity: { type: Number },
  beacon: {
    uuid: { type: String, required: true },
    major: { type: String, required: true },
    minor: { type: String, required: true }
  }
}, { timestamps: true });

module.exports = mongoose.model('Classroom', ClassroomSchema);
