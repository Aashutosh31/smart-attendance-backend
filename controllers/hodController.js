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
        const totalFaculty = await User.countDocuments({ role: 'faculty', college: collegeId, department: hodDeptId });
        const activeCourses = await Course.countDocuments({ college: collegeId, department: hodDeptId });

        // Calculate average attendance for this department
        const allAttendances = await Attendance.find({}).populate('course');
        const deptAttendances = allAttendances.filter(att => att.course && att.course.department && att.course.department.toString() === hodDeptId.toString());
        
        let totalPresents = 0;
        deptAttendances.forEach(att => {
            if (att.status === 'present') totalPresents++;
        });
        const averageAttendance = deptAttendances.length > 0 
            ? Math.round((totalPresents / deptAttendances.length) * 100) 
            : 0;
            
        const SecurityLog = require('../models/SecurityLog');
        const recentAlerts = await SecurityLog.find({}).sort({ timestamp: -1 }).limit(3).then(logs => logs.map(l => ({
            id: l._id,
            type: 'warning',
            message: l.details,
            time: new Date(l.timestamp).toLocaleTimeString()
        })));

        return sendSuccess(res, 200, 'Analytics fetched successfully', {
            stats: {
                totalStudents,
                totalFaculty,
                activeCourses,
                averageAttendance
            },
            recentAlerts
        });
    } catch (error) { next(error); }
};