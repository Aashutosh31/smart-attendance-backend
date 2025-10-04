// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const { enrollAndVerifyFace, getUserStatus } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

// Route for first-time face scanning.
router.post('/enroll-face', protect, enrollAndVerifyFace);

// Route to check if the logged-in user has already enrolled their face.
router.get('/status', protect, getUserStatus);

module.exports = router;