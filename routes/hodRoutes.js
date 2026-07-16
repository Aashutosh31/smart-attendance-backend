const express = require('express');
const router = express.Router();
const { getFacultyAttendanceToday, getFacultyReports, getStudentReports, getHodNotifications, getDashboardAnalytics, getCourses, addCourse, deleteCourse } = require('../controllers/hodController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect, authorize('hod'));
router.route('/faculty-attendance/today').get(getFacultyAttendanceToday);
router.route('/faculty-reports').get(getFacultyReports);
router.route('/student-reports').get(getStudentReports);
router.route('/notifications').get(getHodNotifications);
router.route('/analytics').get(getDashboardAnalytics);
router.route('/overview-stats').get(getDashboardAnalytics);

const { getUsersByRole, addFaculty, addCoordinator } = require('../controllers/adminController');
// Coordinators
router.route('/coordinators')
    .get((req, res, next) => { req.params.role = 'program_coordinator'; return getUsersByRole(req, res, next); })
    .post(addCoordinator);
// Faculty
router.route('/faculty')
    .get((req, res, next) => { req.params.role = 'faculty'; return getUsersByRole(req, res, next); })
    .post(addFaculty);
    
// Courses
router.route('/courses')
    .get(getCourses)
    .post(addCourse);
router.route('/courses/:id')
    .delete(deleteCourse);

module.exports = router;