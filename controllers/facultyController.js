// controllers/facultyController.js
const Course = require('../models/Course');
const Attendance = require('../models/Attendance');
const User = require('../models/User');
const FacultyAttendance = require('../models/FacultyAttendance');
const CourseSession = require('../models/CourseSession');
const { sendSuccess, sendError } = require('../utils/responseHandler');

exports.getAssignedCourses = async (req, res, next) => {
    try {
        const courses = await Course.find({ faculty: req.user.id }).populate('students', 'name');
        return sendSuccess(res, 200, 'Assigned courses fetched', courses);
    } catch (err) { next(err); }
};

exports.recognizeStudentFace = async (req, res, next) => {
    // This remains a dummy function as facial recognition is a complex service.
    const mockStudent = { id: `mockStudent_${Date.now()}`, name: 'Scanned Student' };
    return sendSuccess(res, 200, 'Student scanned (mock)', mockStudent);
};

exports.saveAttendance = async (req, res, next) => {
    const { studentIds, lectureNumber } = req.body; // These are the PRESENT students
    const { courseId } = req.params;

    try {
        const course = await Course.findById(courseId);
        if (!course) {
            return sendError(res, 404, 'Course not found');
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
        return sendSuccess(res, 201, 'Attendance processed for all students in the course.');

    } catch (err) {
        next(err);
    }
};

exports.getTodayLectures = async (req, res, next) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const sessions = await CourseSession.find({
            faculty: req.user.id,
            date: today
        }).populate('course', 'name code').populate('classroom', 'name');

        return sendSuccess(res, 200, 'Today lectures fetched', sessions);
    } catch (error) { next(error); }
};

exports.getDashboardStats = async (req, res, next) => {
    try {
        const facultyId = req.user.id;
        
        // Active Courses count
        const totalCourses = await Course.countDocuments({ faculty: facultyId });
        
        // Students count (sum of students in all courses)
        const courses = await Course.find({ faculty: facultyId });
        let totalStudents = 0;
        courses.forEach(c => {
            totalStudents += c.students.length;
        });

        // Today's lectures
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const upcomingClasses = await CourseSession.countDocuments({
            faculty: facultyId,
            date: today,
            status: 'scheduled'
        });

        // Attendance rate (last 30 days) - mock implementation for speed, can be real later
        const attendanceRate = 85; 
        
        // Recent activities (Mocked for now since Activity Log model is not fully built for general activities)
        const recentActivities = [
            { id: 1, activity: 'New session scheduled', time: '1 hour ago', type: 'course' },
            { id: 2, activity: 'Lecture completed', time: 'Yesterday', type: 'attendance' }
        ];

        return sendSuccess(res, 200, 'Stats fetched', {
            stats: {
                totalStudents,
                totalCourses,
                attendanceRate,
                upcomingClasses
            },
            recentActivities
        });
    } catch (error) { next(error); }
};

exports.startLecture = async (req, res, next) => {
    try {
        const { sessionId } = req.params;

        const session = await CourseSession.findById(sessionId);
        if (!session) return sendError(res, 404, 'Session not found');
        if (session.faculty.toString() !== req.user.id) {
            return sendError(res, 403, 'Not authorized to start this lecture');
        }
        
        session.status = 'live';
        session.isActive = true;
        session.actualStartTime = new Date();
        await session.save();

        const io = req.app.get('io');
        if (io) {
            io.to(session.course.toString()).emit('lectureStatusChanged', { sessionId, status: 'live' });
        }

        return sendSuccess(res, 200, 'Lecture started (LIVE)', session);
    } catch (error) { next(error); }
};

exports.endLecture = async (req, res, next) => {
    try {
        const { sessionId } = req.params;

        const session = await CourseSession.findById(sessionId);
        if (!session) return sendError(res, 404, 'Session not found');
        if (session.faculty.toString() !== req.user.id) {
            return sendError(res, 403, 'Not authorized to end this lecture');
        }
        
        session.status = 'completed';
        session.isActive = false;
        session.actualEndTime = new Date();
        await session.save();

        const io = req.app.get('io');
        if (io) {
            io.to(session.course.toString()).emit('lectureStatusChanged', { sessionId, status: 'completed' });
        }

        return sendSuccess(res, 200, 'Lecture completed', session);
    } catch (error) { next(error); }
};