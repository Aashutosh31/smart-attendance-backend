const express = require('express');
const router = express.Router();
const {
    getUsersByRole,
    addFaculty,
    getAllFaculty,
    getAllStudents,
    addHod,
    getHodAttendance,
    getReportsTree
} = require('../controllers/adminController.js');
const { protect, authorize } = require('../middleware/authMiddleware.js');


// Faculty management
router.post('/faculty', protect, authorize('admin'), addFaculty);
router.get('/faculty', protect, authorize('admin'), getAllFaculty);

// HOD management
router.post('/hod', protect, authorize('admin'), addHod);
router.get('/hod-attendance', protect, authorize('admin'), getHodAttendance);

// Student management
router.get('/students', protect, authorize('admin'), getAllStudents);

// Reports
router.get('/reports/tree', protect, authorize('admin'), getReportsTree);

// --- NEW ROUTE ---
// This route will allow admins and HODs to get a list of users by their role.
// We will use it to fetch the list of faculty for the dropdown.
router.route('/users/role/:role').get(protect, authorize('admin', 'hod'), getUsersByRole);

module.exports = router;