const User = require('../models/User');
const Course = require('../models/Course');
const Attendance = require('../models/Attendance');
const { sendSuccess, sendError } = require('../utils/responseHandler');

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
            course: courseId // Assign the course to the student
        });
        await user.save();

        course.students.push(user._id);
        await course.save();

        return sendSuccess(res, 201, 'Student created and assigned to course successfully.');
    } catch (err) {
        console.error(err.message);
        next(err);
    }
};

exports.getStudents = async (req, res, next) => {
    try {
        const User = require('../models/User');
        const students = await User.find({ 
            role: 'student', 
            college: req.user.college,
            department: req.user.department
        }).select('name email enrollmentNumber gender');
        
        // Map fields to match what frontend expects (full_name, enrollment_number, etc.)
        const mappedStudents = students.map(s => ({
            id: s._id,
            full_name: s.name,
            email: s.email,
            enrollment_number: s.enrollmentNumber || 'N/A',
            gender: s.gender || 'Unknown'
        }));
        
        return sendSuccess(res, 200, 'Students fetched', mappedStudents);
    } catch (error) { next(error); }
};

exports.getCourses = async (req, res, next) => {
    try {
        const courses = await Course.find();
        return sendSuccess(res, 200, 'Courses fetched successfully', courses);
    } catch (err) {
        next(err);
    }
};

exports.getStudentsByCourse = async (req, res, next) => {
    try {
        const { courseId } = req.params;
        const course = await Course.findById(courseId).populate('students', 'name email role');
        if (!course) {
            return sendError(res, 404, 'Course not found');
        }
        return sendSuccess(res, 200, 'Students fetched successfully', course.students);
    } catch (err) {
        next(err);
    }
};

exports.getAttendanceByCourseAndDate = async (req, res, next) => {
    try {
        const { courseId } = req.params;
        const { date } = req.query; // e.g., '2023-10-25'

        if (!date) return sendError(res, 400, 'Date query parameter is required');

        const startDate = new Date(date);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(date);
        endDate.setHours(23, 59, 59, 999);

        const attendance = await Attendance.find({
            course: courseId,
            date: { $gte: startDate, $lte: endDate }
        });

        // format to map studentId -> status
        const attendanceMap = {};
        attendance.forEach(att => {
            attendanceMap[att.student.toString()] = att.status;
        });

        return sendSuccess(res, 200, 'Attendance fetched successfully', attendanceMap);
    } catch (err) {
        next(err);
    }
};

exports.getDashboardAnalytics = async (req, res, next) => {
    try {
        return sendSuccess(res, 200, 'Analytics fetched successfully', {
            stats: {
                totalClasses: 120,
                attendanceRate: 92,
                anomalies: 3,
                activeBeacons: 15
            },
            recentActivity: [
                { id: 1, action: 'Lecture Started', details: 'CS301 by Prof. Smith', time: '10 mins ago' }
            ]
        });
    } catch (error) { next(error); }
};

exports.saveAttendance = async (req, res, next) => {
    try {
        const { courseId } = req.params;
        const { date, attendanceMap } = req.body; // { studentId: 'present'/'absent' }

        if (!date || !attendanceMap) {
            return sendError(res, 400, 'Date and attendance map are required');
        }

        const targetDate = new Date(date);

        // This is a manual override by coordinator, so we'll upsert records.
        const operations = Object.keys(attendanceMap).map(studentId => {
            return {
                updateOne: {
                    filter: { 
                        course: courseId, 
                        student: studentId,
                        date: {
                            $gte: new Date(targetDate).setHours(0, 0, 0, 0),
                            $lte: new Date(targetDate).setHours(23, 59, 59, 999)
                        }
                    },
                    update: {
                        $set: {
                            course: courseId,
                            student: studentId,
                            status: attendanceMap[studentId],
                            date: targetDate, // keep the provided date
                            faculty: req.user.id // coordinator marking this
                        }
                    },
                    upsert: true
                }
            };
        });

        if (operations.length > 0) {
            await Attendance.bulkWrite(operations);
        }

        return sendSuccess(res, 200, 'Attendance saved successfully');
    } catch (err) {
        next(err);
    }
};