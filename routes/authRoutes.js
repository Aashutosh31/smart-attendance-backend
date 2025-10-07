const express = require('express');
const router = express.Router();
const {
  syncSupabaseUser,
  getMe,
  enrollFace
} = require('../controllers/authController');
const {
  protect
} = require('../middleware/authMiddleware');

router.post('/sync', syncSupabaseUser);
router.get('/me', protect, getMe);
router.post('/enroll-face', protect, enrollFace); // --- THIS IS THE NEW ROUTE ---

module.exports = router;