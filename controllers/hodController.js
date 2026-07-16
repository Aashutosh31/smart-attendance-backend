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

exports.getFacultyReports = async (req, res) => {
    try {
        // This is a placeholder. A real report would query the Attendance model for faculty.
        const faculty = await User.find({ role: 'faculty' }).limit(5);
        const reports = faculty.map(f => ({
            id: f._id,
            name: f.name,
            department: f.department || 'Computer Science',
            date: new Date(),
            status: 'present',
            checkInTime: '09:05 AM'
        }));
        res.json(reports);
    } catch (err) {
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.getHodNotifications = async (req, res) => {
    try {
        // Dummy notification logic
        const notifications = [
            { id: 1, message: "Dr. Evans has been absent for 3 consecutive days.", date: new Date() },
        ];
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

        return sendSuccess(res, 200, 'Analytics fetched successfully', {
            stats: {
                totalStudents,
                totalFaculty,
                activeCourses,
                averageAttendance: 88 // Mock
            },
            recentAlerts: [
                { id: 1, type: 'warning', message: 'Low attendance in CS201', time: '2 hours ago' }
            ]
        });
    } catch (error) { next(error); }
};