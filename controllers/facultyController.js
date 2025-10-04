const Course = require('../models/Course');
const Attendance = require('../models/Attendance');
const User = require('../models/User');

exports.getAssignedCourses = async (req, res) => {
    try {
        const courses = await Course.find({ faculty: req.user.id }).populate('students', 'name');
        res.json(courses);
    } catch (err) {
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.recognizeStudentFace = async (req, res) => {
    // This remains a dummy function as facial recognition is a complex service.
    const mockStudent = { id: `mockStudent_${Date.now()}`, name: 'Scanned Student' };
    res.json(mockStudent);
};

exports.saveAttendance = async (req, res) => {
    const { studentIds, lectureNumber } = req.body; // These are the PRESENT students
    const { courseId } = req.params;

    try {
        const course = await Course.findById(courseId);
        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }

        const allStudentIdsInCourse = course.students.map(id => id.toString());
        const presentStudentIds = studentIds.map(id => id.toString());
        
        const records = allStudentIdsInCourse.map(studentId => {
            const isPresent = presentStudentIds.includes(studentId);
            return {
                course: courseId,
                student: studentId,
                faculty: req.user.id,
                date: new Date(),
                status: isPresent ? 'present' : 'absent',
                lectureNumber: lectureNumber || 1,
            };
        });

        await Attendance.insertMany(records);
        res.status(201).json({ message: 'Attendance processed for all students in the course.' });

    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Server Error' });
    }
};