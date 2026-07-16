const express = require('express');
const router = express.Router();
const { 
    addStudent,
    getCourses,
    getStudentsByCourse,
    getAttendanceByCourseAndDate,
    saveAttendance
} = require('../controllers/coordinatorController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.post('/add-student', protect, authorize('program_coordinator', 'admin'), addStudent);
router.get('/courses', protect, authorize('program_coordinator', 'admin'), getCourses);
router.get('/courses/:courseId/students', protect, authorize('program_coordinator', 'admin'), getStudentsByCourse);
router.get('/courses/:courseId/attendance', protect, authorize('program_coordinator', 'admin'), getAttendanceByCourseAndDate);
router.post('/courses/:courseId/attendance', protect, authorize('program_coordinator', 'admin'), saveAttendance);

module.exports = router;