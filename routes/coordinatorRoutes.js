const express = require('express');
const router = express.Router();
const { 
    addStudent,
    getStudents,
    getCourses,
    getStudentsByCourse,
    getAttendanceByCourseAndDate,
    saveAttendance,
    getDashboardAnalytics
} = require('../controllers/coordinatorController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.post('/students', protect, authorize('program_coordinator', 'admin'), addStudent);
router.get('/students', protect, authorize('program_coordinator', 'admin'), getStudents);
router.get('/courses', protect, authorize('program_coordinator', 'admin'), getCourses);
router.get('/courses/:courseId/students', protect, authorize('program_coordinator', 'admin'), getStudentsByCourse);
router.get('/courses/:courseId/attendance', protect, authorize('program_coordinator', 'admin'), getAttendanceByCourseAndDate);
router.post('/courses/:courseId/attendance', protect, authorize('program_coordinator', 'admin'), saveAttendance);
router.get('/analytics', protect, authorize('program_coordinator', 'admin'), getDashboardAnalytics);

module.exports = router;