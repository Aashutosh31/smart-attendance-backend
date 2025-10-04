const express = require('express');
const router = express.Router();
const { getAssignedCourses, recognizeStudentFace, saveAttendance } = require('../controllers/facultyController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect, authorize('faculty'));
router.route('/me/courses').get(getAssignedCourses);
router.route('/courses/:courseId/recognize').post(recognizeStudentFace);
router.route('/courses/:courseId/attendance').post(saveAttendance);

module.exports = router;