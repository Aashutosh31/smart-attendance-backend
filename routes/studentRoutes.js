const express = require('express');
const router = express.Router();
const { getStudentAttendance } = require('../controllers/studentController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect, authorize('student'));
router.route('/me/attendance').get(getStudentAttendance);

module.exports = router;