const express = require('express');
const router = express.Router();
const { getFacultyAttendanceToday, getFacultyReports, getHodNotifications, getDashboardAnalytics } = require('../controllers/hodController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect, authorize('hod'));
router.route('/faculty-attendance/today').get(getFacultyAttendanceToday);
router.route('/faculty-reports').get(getFacultyReports);
router.route('/student-reports').get(getFacultyReports); // alias for now
router.route('/notifications').get(getHodNotifications);
router.route('/analytics').get(getDashboardAnalytics);
router.route('/overview-stats').get(getDashboardAnalytics);

const { getUsersByRole, addFaculty } = require('../controllers/adminController');
// Coordinators
router.route('/coordinators').get(getUsersByRole).post(addFaculty); // simplified mapping for demo
// Faculty
router.route('/faculty').get(getUsersByRole).post(addFaculty);

module.exports = router;