const User = require('../models/User.js');
const Course = require('../models/Course.js');
const Attendance = require('../models/Attendance.js');
const bcrypt = require('bcryptjs');

// Get all faculty members
exports.getAllFaculty = async (req, res) => {
    try {
        // Corrected to fetch only users with the 'faculty' role
        const faculty = await User.find({ role: 'faculty' }).select('-password');
        res.json(faculty);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Add a new faculty member
exports.addFaculty = async (req, res) => {
    const { name, email, department } = req.body;
    try {
        const password = await bcrypt.hash('password123', 10); // Default password
        const newFaculty = new User({ name, email, department, role: 'faculty', password });
        await newFaculty.save();
        res.status(201).json(newFaculty);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Add a new HOD
exports.addHod = async (req, res) => {
    const { name, email, department, courseId } = req.body;
    try {
        const password = await bcrypt.hash('password123', 10); // Default password
        const newHod = new User({
            name,
            email,
            department,
            course: courseId, // Assign the course ID
            role: 'hod',
            password
        });
        await newHod.save();
        res.status(201).json(newHod);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};


// Get all students
exports.getAllStudents = async (req, res) => {
    try {
        // Example of fetching students with basic details
        const students = await User.find({ role: 'student' })
            .populate('course', 'name') // Assuming students are linked to courses
            .select('name email rollNo course');
        res.json(students);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Get real-time attendance for all HODs
exports.getHodAttendance = async (req, res) => {
    try {
        const AdminHodAttendance = require('../models/AdminHodAttendance');
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Get all HOD attendance records for today
        const records = await AdminHodAttendance.find({
            checkInTime: { $gte: today }
        }).populate('hod', 'name department');

        // Format for admin dashboard
        const hodAttendance = records.map(record => ({
            id: record.hod._id,
            name: record.hod.name,
            department: record.department,
            checkInTime: record.checkInTime
        }));

        res.json(hodAttendance);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Placeholder for fetching tree-like report data for all roles
exports.getReportsTree = async (req, res) => {
    try {
        const FacultyAttendance = require('../models/FacultyAttendance');
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Get all Faculty attendance records for today
        const facultyRecords = await FacultyAttendance.find({
            checkInTime: { $gte: today }
        });

        // Format for admin dashboard
        const facultyAttendance = facultyRecords.map(record => ({
            id: record._id,
            name: record.name,
            email: record.email,
            subject: record.subject,
            checkInTime: record.checkInTime
        }));

        res.json({
            hods: [], // You can fill this if needed
            faculty: facultyAttendance,
            students: [], // You can fill this if needed
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};