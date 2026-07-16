const express = require('express');
const router = express.Router();
const {
    syncSupabaseUser,
    getMe,
    enrollFace,
    getFaceEnrollmentStatus
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const validate = require('../middleware/validate');
const { syncUserSchema, enrollFaceSchema } = require('../validations/auth.validation');

router.post('/sync', validate(syncUserSchema), syncSupabaseUser);
router.get('/me', protect, getMe);
router.post('/enroll-face', protect, validate(enrollFaceSchema), enrollFace);

// ADD THIS NEW ROUTE
router.get('/status', protect, getFaceEnrollmentStatus);

module.exports = router;