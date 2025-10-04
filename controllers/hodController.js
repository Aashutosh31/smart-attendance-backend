const User = require('../models/User');
const Attendance = require('../models/Attendance');

exports.getFacultyAttendanceToday = async (req, res) => {
    try {
        // This is a simplified query. A real one would be more complex.
        const faculty = await User.find({ role: 'faculty' });
        // Simulate who is present/absent for the demo
        const attendanceList = faculty.map((f, i) => ({
            id: f._id,
            name: f.name,
            title: 'Professor',
            status: i % 2 === 0 ? 'present' : 'absent',
            checkInTime: i % 2 === 0 ? '09:00 AM' : null
        }));
        res.json(attendanceList);
    } catch (err) {
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