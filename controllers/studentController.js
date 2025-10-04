const Attendance = require('../models/Attendance');

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