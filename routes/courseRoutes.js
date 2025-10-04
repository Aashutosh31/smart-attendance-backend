const express = require('express');
const router = express.Router();
const { getAllCourses } = require('../controllers/courseController');
const { protect } = require('../middleware/authMiddleware');

router.route('/').get(protect, getAllCourses);

module.exports = router;