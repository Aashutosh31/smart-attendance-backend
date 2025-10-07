const express = require('express');
const router = express.Router();
const {
  getAllUsers,
  getFaculty, // The function that's causing the issue
  getHODs,
  assignHOD,
  getStudents,
  getCoordinators,
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.get('/users', protect, authorize('admin'), getAllUsers);
router.get('/students', protect, authorize('admin', 'hod'), getStudents);

// THIS IS THE LINE TO CHANGE
router.get('/faculty', protect, authorize('admin', 'hod'), getFaculty); // Add 'hod' to the authorize middleware

router.get('/hods', protect, authorize('admin'), getHODs);
router.post('/assign-hod', protect, authorize('admin'), assignHOD);
router.get(
  '/coordinators',
  protect,
  authorize('admin', 'hod'),
  getCoordinators
);

module.exports = router;