const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const {
    createTimetable,
    getTimetables,
    createLectureTemplate,
    generateSessions
} = require('../controllers/timetableController');

// All scheduling requires coordinator or admin
router.use(protect, authorize('program_coordinator', 'admin'));

router.route('/')
    .get(getTimetables)
    .post(createTimetable);

router.post('/lectures', createLectureTemplate);
router.post('/generate', generateSessions);

module.exports = router;
