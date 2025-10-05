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
        res.json(notifications);
    } catch (err) {
        res.status(500).json({ message: 'Server Error' });
    }
};