const express = require('express');
const router = express.Router();
const {
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


module.exports = router;