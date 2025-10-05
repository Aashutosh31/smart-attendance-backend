// routes/facultyRoutes.js
const express = require('express');
const router = express.Router();
const { getAssignedCourses, recognizeStudentFace, saveAttendance, startCourseSession } = require('../controllers/facultyController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect, authorize('faculty'));
router.route('/me/courses').get(getAssignedCourses);
router.route('/courses/:courseId/recognize').post(recognizeStudentFace);
router.route('/courses/:courseId/attendance').post(saveAttendance);
router.route('/courses/:courseId/start-session').post(startCourseSession); // New Route

module.exports = router;