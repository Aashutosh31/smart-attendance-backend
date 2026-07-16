// routes/studentRoutes.js
const express = require('express');
const router = express.Router();
const { 
    getStudentAttendance, 
    getActiveSessions, 
    markStudentAttendance,
    enrollFace,
    requestReRegistration
} = require('../controllers/studentController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect, authorize('student'));
router.route('/me/attendance').get(getStudentAttendance);
router.route('/sessions/active').get(getActiveSessions);
router.route('/sessions/:sessionId/attendance').post(markStudentAttendance);
router.route('/enroll-face').post(enrollFace);
router.route('/re-register-face').post(requestReRegistration);

module.exports = router;