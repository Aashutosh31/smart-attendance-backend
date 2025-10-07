// controllers/facultyController.js
const Course = require('../models/Course');
const Attendance = require('../models/Attendance');
const User = require('../models/User');
const FacultyAttendance = require('../models/FacultyAttendance');
const CourseSession = require('../models/CourseSession');

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

exports.startCourseSession = async (req, res) => {
    try {
        // In a real application, you would perform facial recognition here.
        // For now, we'll assume the faculty is verified.

        const facultyId = req.user.id;
        const { courseId } = req.params;

        // Mark faculty as present for the day
        await FacultyAttendance.findOneAndUpdate(
            { faculty: facultyId, date: { $gte: new Date().setHours(0, 0, 0, 0) } },
            {
                faculty: facultyId,
                date: new Date(),
                status: 'present',
                checkInTime: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
            },
            { upsert: true, new: true }
        );

        // Create a new course session
        const session = new CourseSession({
            course: courseId,
            faculty: facultyId,
        });
        await session.save();

        res.status(200).json({ message: 'Session started successfully', session });

    } catch (error) {
        console.error("Error starting session:", error);
        res.status(500).json({ message: 'Server Error' });
    }
};