const express = require('express');
const router = express.Router();
const { syncSupabaseUser, getMe } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/sync', syncSupabaseUser);
router.get('/me', protect, getMe);

module.exports = router;