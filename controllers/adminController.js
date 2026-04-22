const User = require('../models/User.js');
const Course = require('../models/Course.js');
const Attendance = require('../models/Attendance.js');
const bcrypt = require('bcryptjs');
const { createClient } = require('@supabase/supabase-js');
const { randomUUID } = require('crypto');

const getSupabaseAdminClient = () => {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
        return null;
    }
    return createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_KEY,
        { auth: { autoRefreshToken: false, persistSession: false } }
    );
};

exports.createCollegeAdmin = async (req, res) => {
    const { collegeName, collegeId, fullName, email, password } = req.body;

    if (!collegeName || !collegeId || !fullName || !email || !password) {
        return res.status(400).json({ message: 'Missing required fields.' });
    }

    if (password.length < 6) {
        return res.status(400).json({ message: 'Password must be at least 6 characters.' });
    }

    const supabaseAdmin = getSupabaseAdminClient();
    if (!supabaseAdmin) {
        return res.status(500).json({ message: 'Backend Supabase admin credentials are not configured.' });
    }

    const collegeUuid = randomUUID();

    try {
        const { error: collegeError } = await supabaseAdmin
            .from('colleges')
            .insert({
                id: collegeUuid,
                name: collegeName,
                college_id_text: collegeId,
                contact_email: email,
                created_by: null,
            });

        if (collegeError) throw collegeError;

        const { data: authCreateData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: {
                full_name: fullName,
                role: 'admin',
                college_id: collegeUuid,
            },
            app_metadata: {
                role: 'admin',
            },
        });

        if (authError || !authCreateData?.user?.id) {
            await supabaseAdmin.from('colleges').delete().eq('id', collegeUuid);
            throw authError || new Error('Failed to create admin user.');
        }

        const userId = authCreateData.user.id;

        // Keep profile tables immediately consistent for frontend pages.
        await supabaseAdmin.from('profiles').upsert({
            id: userId,
            email,
            full_name: fullName,
            role: 'admin',
            college_id: collegeUuid,
        }, { onConflict: 'id' });

        await supabaseAdmin.from('users').upsert({
            id: userId,
            email,
            full_name: fullName,
            role: 'admin',
            college_id: collegeUuid,
        }, { onConflict: 'id' });

        return res.status(201).json({
            message: 'College and admin account created successfully.',
            collegeId: collegeUuid,
            adminUserId: userId,
        });
    } catch (error) {
        console.error('Error creating college admin:', error);
        if (error?.code === '23505') {
            return res.status(409).json({ message: 'College ID or email already exists.' });
        }
        return res.status(500).json({ message: error?.message || 'Failed to create college admin.' });
    }
};

exports.getUsersByRole = async (req, res) => {
    try {
        const { role } = req.params;
        const users = await User.find({ role: role }).select('id name');
        res.status(200).json(users);
    } catch (error) {
        console.error(`Error fetching users by role: ${error.message}`);
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.getAllFaculty = async (req, res) => {
    try {
        const faculty = await User.find({ role: 'faculty' }).select('-password');
        res.json(faculty);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

exports.addFaculty = async (req, res) => {
    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
    const { name, email, department } = req.body;
    const temporaryPassword = Math.random().toString(36).slice(-12);

    if (!name || !email || !department) {
        return res.status(400).json({ message: 'Please provide name, email, and department.' });
    }
    try {
        const { data: { user }, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: email,
            password: temporaryPassword,
            email_confirm: true,
            app_metadata: { role: 'faculty', name: name }
        });
        if (authError) throw new Error(authError.message);

        const newFaculty = new User({
            supabaseId: user.id, name, email, department, role: 'faculty'
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

exports.addHod = async (req, res) => {
    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
    const { name, email, department, courseId } = req.body;
    const temporaryPassword = Math.random().toString(36).slice(-12);

    if (!name || !email || !department) {
        return res.status(400).json({ message: 'Please provide name, email, and department.' });
    }
    try {
        const { data: { user }, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: email,
            password: temporaryPassword,
            email_confirm: true,
            app_metadata: { role: 'hod', name: name }
        });
        if (authError) throw new Error(authError.message);

        const newHod = new User({
            supabaseId: user.id, name, email, department, course: courseId, role: 'hod'
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

exports.getAllStudents = async (req, res) => {
    try {
        const students = await User.find({ role: 'student' })
            .populate('course', 'name').select('name email rollNo course');
        res.json(students);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

exports.getHodAttendance = async (req, res) => {
    try {
        const AdminHodAttendance = require('../models/AdminHodAttendance');
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const records = await AdminHodAttendance.find({
            checkInTime: { $gte: today }
        }).populate('hod', 'name department');

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

exports.getReportsTree = async (req, res) => {
    try {
        const FacultyAttendance = require('../models/FacultyAttendance');
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const facultyRecords = await FacultyAttendance.find({
            checkInTime: { $gte: today }
        });

        const facultyAttendance = facultyRecords.map(record => ({
            id: record._id,
            name: record.name,
            email: record.email,
            subject: record.subject,
            checkInTime: record.checkInTime
        }));
        res.json({
            hods: [], faculty: facultyAttendance, students: [],
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};