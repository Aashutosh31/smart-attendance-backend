// controllers/studentController.js
const Attendance = require('../models/Attendance');
const CourseSession = require('../models/CourseSession');
const Course = require('../models/Course');

exports.getStudentAttendance = async (req, res) => {
    try {
        const attendance = await Attendance.find({ student: req.user.id })
            .populate('course', 'name')
            .sort({ date: -1 });

        const formattedAttendance = attendance.map(att => ({
            id: att._id,
            date: att.date,
            courseName: att.course.name,
            status: att.status
        }));

        res.json(formattedAttendance);
    } catch (err) {
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.getActiveSessions = async (req, res) => {
    try {
        // Find courses the student is enrolled in
        const studentCourses = await Course.find({ students: req.user.id });
        const courseIds = studentCourses.map(c => c._id);

        // Find active sessions for those courses
        const activeSessions = await CourseSession.find({
            course: { $in: courseIds },
            isActive: true
        }).populate('course', 'name code');

        res.json(activeSessions);
    } catch (error) {
        console.error("Error fetching active sessions:", error);
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.markStudentAttendance = async (req, res) => {
    const { sessionId } = req.params;
    const studentId = req.user.id;

    try {
        // Here you would perform facial recognition of the student
        // For now, we'll assume it's successful

        const session = await CourseSession.findById(sessionId);
        if (!session || !session.isActive) {
            return res.status(404).json({ message: 'Session not found or is no longer active.' });
        }

        // Check if attendance has already been marked for this session
        const existingAttendance = await Attendance.findOne({
            student: studentId,
            course: session.course,
            date: { $gte: new Date().setHours(0, 0, 0, 0) } // Check for today's date
        });

        if (existingAttendance) {
            return res.status(400).json({ message: 'Attendance already marked for this course today.' });
        }


        const attendance = new Attendance({
            course: session.course,
            student: studentId,
            faculty: session.faculty,
            status: 'present',
            lectureNumber: 1, // You might want to make this dynamic
        });

        await attendance.save();

        res.status(201).json({ message: 'Attendance marked successfully.' });

    } catch (error) {
        console.error("Error marking attendance:", error);
        res.status(500).json({ message: 'Server Error' });
    }
};