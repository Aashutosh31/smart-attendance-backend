const User = require('../models/User');
const Course = require('../models/Course');

exports.addStudent = async (req, res) => {
    const { name, email, rollNo, courseId } = req.body;
    try {
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ message: 'Student with this email already exists.' });
        }

        const course = await Course.findById(courseId);
        if (!course) {
            return res.status(404).json({ message: 'Course not found.' });
        }
        
        const temporaryPassword = Math.random().toString(36).slice(-8);

        user = new User({
            name,
            email,
            password: temporaryPassword,
            role: 'student',
            courses: [courseId] // Assign the course to the student
        });
        await user.save();

        // Add the student to the course's student list
        course.students.push(user._id);
        await course.save();

        console.log(`Created student ${email} with temporary password: ${temporaryPassword}`);
        res.status(201).json({ message: 'Student created and assigned to course successfully.' });

    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Server Error' });
    }
};