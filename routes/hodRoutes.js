const express = require('express');
const router = express.Router();
const { getFacultyAttendanceToday, getFacultyReports, getHodNotifications } = require('../controllers/hodController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect, authorize('hod'));
router.route('/faculty-attendance/today').get(getFacultyAttendanceToday);
router.route('/faculty-reports').get(getFacultyReports);
router.route('/notifications').get(getHodNotifications);

module.exports = router;