// routes/facultyRoutes.js
const express = require('express');
const router = express.Router();
const { getAssignedCourses, saveAttendance, getTodayLectures, startLecture, endLecture, getDashboardStats } = require('../controllers/facultyController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect, authorize('faculty', 'admin', 'program_coordinator')); // Also allow admins/coordinators to view
router.route('/dashboard/stats').get(getDashboardStats);
router.route('/me/courses').get(getAssignedCourses);
router.route('/lectures/today').get(getTodayLectures);
router.route('/lectures/:sessionId/start').post(startLecture);
router.route('/lectures/:sessionId/end').post(endLecture);

router.route('/courses/:courseId/attendance').post(saveAttendance);

module.exports = router;