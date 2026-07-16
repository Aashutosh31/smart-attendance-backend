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
        
        const studentIds = courses.reduce((acc, course) => {
            return acc.concat(course.students);
        }, []);
        const totalStudents = new Set(studentIds).size; // Unique students

        // Today's lectures
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const upcomingClasses = await CourseSession.countDocuments({
            faculty: facultyId,
            date: today,
            status: 'scheduled'
        });

        const courseIds = courses.map(c => c._id);
        const allAttendances = await Attendance.find({ course: { $in: courseIds } });
        let totalPresents = 0;
        allAttendances.forEach(att => {
            if (att.status === 'present') totalPresents++;
        });
        const attendanceRate = allAttendances.length > 0 
            ? Math.round((totalPresents / allAttendances.length) * 100) 
            : 0;
            
        const recentSessions = await CourseSession.find({ faculty: facultyId, status: 'completed' })
            .sort({ actualEndTime: -1 }).limit(3).populate('course', 'name');
            
        const recentActivities = recentSessions.map(sess => ({
            id: sess._id,
            activity: `Lecture completed for ${sess.course.name}`,
            time: new Date(sess.actualEndTime).toLocaleTimeString(),
            type: 'attendance'
        }));

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