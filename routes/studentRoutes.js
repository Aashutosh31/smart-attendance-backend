// routes/studentRoutes.js
const express = require('express');
const router = express.Router();
const { getStudentAttendance, getActiveSessions, markStudentAttendance } = require('../controllers/studentController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect, authorize('student'));
router.route('/me/attendance').get(getStudentAttendance);
router.route('/me/active-sessions').get(getActiveSessions); // New Route
router.route('/sessions/:sessionId/mark-attendance').post(markStudentAttendance); // New Route


module.exports = router;