const Course = require('../models/Course');

exports.getAllCourses = async (req, res) => {
    try {
        const courses = await Course.find();
        if (courses.length === 0) {
            return res.json([
                { id: 'course1', name: 'Web Development', code: 'CS301' },
                { id: 'course2', name: 'Database Systems', code: 'CS302' },
            ]);
        }
        res.json(courses);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};