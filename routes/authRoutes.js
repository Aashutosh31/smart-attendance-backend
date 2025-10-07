const express = require('express');
const router = express.Router();
const {
    syncSupabaseUser,
    getMe,
    enrollFace,
    getFaceEnrollmentStatus // import the new function
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/sync', syncSupabaseUser);
router.get('/me', protect, getMe);
router.post('/enroll-face', protect, enrollFace);

// ADD THIS NEW ROUTE
router.get('/status', protect, getFaceEnrollmentStatus);

module.exports = router;