const User = require('../models/User.js');
const Course = require('../models/Course.js');
const Attendance = require('../models/Attendance.js');
const bcrypt = require('bcryptjs');
const { createClient } = require('@supabase/supabase-js');

// --- NEW FUNCTION ---
// Fetches all users that match a specific role
exports.getUsersByRole = async (req, res) => {
    try {
        const { role } = req.params;
        const users = await User.find({ role: role }).select('id name'); // Select only the ID and name
        res.status(200).json(users);
    } catch (error) {
        console.error(`Error fetching users by role: ${error.message}`);
        res.status(500).json({ message: 'Server Error' });
    }
};

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
    // FIX: Initialize Supabase Admin Client INSIDE the function
    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { name, email, department } = req.body;
    const temporaryPassword = 'password123';

    if (!name || !email || !department) {
        return res.status(400).json({ message: 'Please provide name, email, and department.' });
    }

    try {
        // Step 1: Create user in Supabase
        const { data: { user }, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: email,
            password: temporaryPassword,
            email_confirm: true,
            app_metadata: { role: 'faculty', name: name }
        });

        if (authError) throw new Error(authError.message);

        // Step 2: Create user in MongoDB
        const newFaculty = new User({
            supabaseId: user.id,
            name,
            email,
            department,
            role: 'faculty'
        });
        await newFaculty.save();

        res.status(201).json({ message: "Faculty created in Supabase and MongoDB.", user: newFaculty });

    } catch (error) {
        console.error(`Error adding faculty: ${error.message}`);
        if (error.message.includes('already registered')) {
            return res.status(409).json({ message: 'A user with this email is already registered.' });
        }
        res.status(500).json({ message: 'Server error while adding faculty.' });
    }
};

// Add a new HOD
exports.addHod = async (req, res) => {
    // FIX: Initialize Supabase Admin Client INSIDE the function
    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { name, email, department, courseId } = req.body;
    const temporaryPassword = 'password123';

    if (!name || !email || !department) {
        return res.status(400).json({ message: 'Please provide name, email, and department.' });
    }

    try {
        // Step 1: Create HOD in Supabase
        const { data: { user }, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: email,
            password: temporaryPassword,
            email_confirm: true,
            app_metadata: { role: 'hod', name: name }
        });

        if (authError) throw new Error(authError.message);

        // Step 2: Create HOD in MongoDB
        const newHod = new User({
            supabaseId: user.id,
            name,
            email,
            department,
            course: courseId, // Assign the course ID
            role: 'hod'
        });
        await newHod.save();

        res.status(201).json({ message: "HOD created successfully in Supabase and MongoDB.", user: newHod });

    } catch (error) {
        console.error(`Error adding HOD: ${error.message}`);
        if (error.message.includes('already registered')) {
            return res.status(409).json({ message: 'A user with this email is already registered.' });
        }
        res.status(500).json({ message: 'Server error while adding HOD.' });
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