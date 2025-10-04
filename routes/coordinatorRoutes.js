const express = require('express');
const router = express.Router();
const { addStudent } = require('../controllers/coordinatorController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect, authorize('program_coordinator'));
router.route('/add-student').post(addStudent);

module.exports = router;