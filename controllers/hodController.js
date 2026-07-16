// controllers/hodController.js
const User = require('../models/User');
const Attendance = require('../models/Attendance');
const FacultyAttendance = require('../models/FacultyAttendance');


exports.getFacultyAttendanceToday = async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const attendanceRecords = await FacultyAttendance.find({ date: { $gte: today } })
            .populate('faculty', 'name');

        const allFaculty = await User.find({ role: 'faculty' });

        const attendanceMap = new Map(attendanceRecords.map(rec => [rec.faculty._id.toString(), rec]));

        const attendanceList = allFaculty.map(faculty => {
            const record = attendanceMap.get(faculty._id.toString());
            return {
                id: faculty._id,
                name: faculty.name,
                title: 'Professor',
                status: record ? record.status : 'absent',
                checkInTime: record ? record.checkInTime : null,
            };
        });


        res.json(attendanceList);
    } catch (err) {
        console.error("HOD Error:", err)
        res.status(500).json({ message: 'Server Error' });
    }
};

const { sendSuccess } = require('../utils/responseHandler');

exports.getFacultyReports = async (req, res, next) => {
    try {
        const faculty = await User.find({ role: 'faculty', department: req.user.department });
        const facultyIds = faculty.map(f => f._id);
        const attendanceRecords = await FacultyAttendance.find({ faculty: { $in: facultyIds } })
            .populate('faculty', 'name department')
            .sort({ date: -1 })
            .limit(20);
            
        const reports = attendanceRecords.map(rec => ({
            id: rec._id,
            name: rec.faculty.name,
            department: rec.faculty.department || 'General',
            date: rec.date,
            status: rec.status,
            checkInTime: rec.checkInTime || 'N/A'
        }));
        
        return sendSuccess(res, 200, 'Faculty reports fetched', reports);
    } catch (err) {
        next(err);
    }
};

exports.getStudentReports = async (req, res, next) => {
    try {
        const User = require('../models/User');
        const students = await User.find({ role: 'student', department: req.user.department }).populate('course', 'name');
        const studentIds = students.map(s => s._id);
        
        const attendances = await Attendance.find({ student: { $in: studentIds } });
        
        const reports = students.map(student => {
            const studentAtts = attendances.filter(a => a.student.toString() === student._id.toString());
            let presents = 0;
            let absences = 0;
            studentAtts.forEach(a => {
                if (a.status === 'present') presents++;
                else absences++;
            });
            const total = presents + absences;
            const attendancePercentage = total > 0 ? Math.round((presents / total) * 100) : 0;
            
            return {
                id: student._id,
                name: student.name,
                rollNo: student.email, // using email or real rollNo
                courseName: student.course ? student.course.name : 'N/A',
                attendancePercentage,
                totalAbsences: absences
            };
        });
        
        return sendSuccess(res, 200, 'Student reports fetched', reports);
    } catch (err) {
        next(err);
    }
};

exports.getHodNotifications = async (req, res, next) => {
    try {
        const SecurityLog = require('../models/SecurityLog');
        const logs = await SecurityLog.find({}).sort({ timestamp: -1 }).limit(5); // In a real scenario, filter by department users
        const notifications = logs.map(l => ({
            id: l._id,
            message: `Security Event: ${l.eventType} - ${l.details}`,
            date: l.timestamp
        }));
        return sendSuccess(res, 200, 'HOD notifications fetched', notifications);
    } catch (error) { next(error); }
};

exports.getDashboardAnalytics = async (req, res, next) => {
    try {
        const User = require('../models/User');
        const Course = require('../models/Course');
        const Department = require('../models/Department');
        
        const hodDeptId = req.user.department;
        const collegeId = req.user.college;

        const totalStudents = await User.countDocuments({ role: 'student', college: collegeId, department: hodDeptId });
        const totalCoordinators = await User.countDocuments({ role: 'program_coordinator', college: collegeId, department: hodDeptId });
        const totalCourses = await Course.countDocuments({ college: collegeId, department: hodDeptId });

        const courses = await Course.find({ college: collegeId, department: hodDeptId }).populate('faculty', 'name');
        const courseStats = courses.map(c => ({
            course: c.name,
            status: 'active',
            students: c.students ? c.students.length : 0,
            coordinator: c.faculty ? c.faculty.name : 'N/A'
        }));
            
        const SecurityLog = require('../models/SecurityLog');
        const recentAlerts = await SecurityLog.find({}).sort({ timestamp: -1 }).limit(3).then(logs => logs.map(l => ({
            id: l._id,
            type: 'warning',
            action: l.details,
            time: new Date(l.timestamp).toLocaleTimeString()
        })));

        return sendSuccess(res, 200, 'Analytics fetched successfully', {
            totalCourses,
            totalCoordinators,
            totalStudents,
            pendingVerifications: 0,
            courseStats,
            recentActivity: recentAlerts
        });
    } catch (error) { next(error); }
};

exports.getCourses = async (req, res, next) => {
    try {
        const Course = require('../models/Course');
        const courses = await Course.find({ department: req.user.department }).populate('faculty', 'name email');
        const mappedCourses = courses.map(c => ({
            id: c._id,
            name: c.name,
            code: c.code,
            faculty: c.faculty ? { name: c.faculty.name } : null
        }));
        return sendSuccess(res, 200, 'Courses fetched', mappedCourses);
    } catch (err) {
        next(err);
    }
};

exports.addCourse = async (req, res, next) => {
    try {
        const Course = require('../models/Course');
        const { name, code, facultyId } = req.body;
        if (!name || !code || !facultyId) {
            return res.status(400).json({ message: 'Name, code, and faculty are required.' });
        }
        
        const newCourse = new Course({
            name,
            code,
            college: req.user.college,
            department: req.user.department,
            faculty: facultyId,
            students: []
        });
        await newCourse.save();
        
        await newCourse.populate('faculty', 'name');
        
        return sendSuccess(res, 201, 'Course added', {
            id: newCourse._id,
            name: newCourse.name,
            code: newCourse.code,
            faculty: newCourse.faculty ? { name: newCourse.faculty.name } : null
        });
    } catch (err) {
        next(err);
    }
};

exports.deleteCourse = async (req, res, next) => {
    try {
        const Course = require('../models/Course');
        const course = await Course.findById(req.params.id);
        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }
        if (course.department.toString() !== req.user.department.toString()) {
            return res.status(403).json({ message: 'Not authorized' });
        }
        await Course.findByIdAndDelete(req.params.id);
        return sendSuccess(res, 200, 'Course deleted');
    } catch (err) {
        next(err);
    }
};