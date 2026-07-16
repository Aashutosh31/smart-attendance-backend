const User = require('../models/User');
const Course = require('../models/Course');
const Attendance = require('../models/Attendance');
const { sendSuccess, sendError } = require('../utils/responseHandler');

exports.addStudent = async (req, res, next) => {
    const { createClient } = require('@supabase/supabase-js');
    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
    const { name, email, rollNo, courseId, password } = req.body;
    if (!password) {
        return res.status(400).json({ message: 'Please provide a password.' });
    }
    const finalPassword = password;

    try {
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ message: 'Student with this email already exists.' });
        }

        const course = await Course.findById(courseId);
        if (!course) {
            return res.status(404).json({ message: 'Course not found.' });
        }
        
        const { data: authCreateData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: email,
            password: finalPassword,
            email_confirm: true,
            user_metadata: { full_name: name, role: 'student', college_id: req.user.college },
            app_metadata: { role: 'student' }
        });
        if (authError) throw new Error(authError.message);

        await supabaseAdmin.from('profiles').upsert({
            id: authCreateData.user.id,
            email,
            full_name: name,
            role: 'student',
            college_id: req.user.college,
        });

        user = new User({
            supabaseId: authCreateData.user.id,
            name,
            email,
            enrollmentNumber: rollNo,
            role: 'student',
            college: req.user.college,
            department: req.user.department,
            course: courseId
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
        const User = require('../models/User');
        
        const collegeId = req.user.college;
        const deptId = req.user.department;

        // Total Students
        const students = await User.find({ role: 'student', college: collegeId, department: deptId });
        const totalStudents = students.length;

        // Calculate attendance per student
        const allAttendances = await Attendance.find({}).populate({
            path: 'course',
            match: { department: deptId }
        });
        
        const validAttendances = allAttendances.filter(att => att.course !== null);
        
        let totalPresents = 0;
        const studentStats = {};
        
        validAttendances.forEach(att => {
            if (att.status === 'present') totalPresents++;
            const sid = att.student.toString();
            if (!studentStats[sid]) {
                studentStats[sid] = { total: 0, present: 0 };
            }
            studentStats[sid].total++;
            if (att.status === 'present') studentStats[sid].present++;
        });

        const averageAttendance = validAttendances.length > 0 
            ? Math.round((totalPresents / validAttendances.length) * 100) 
            : 0;

        let atRiskStudentsCount = 0;
        const lowAttendanceStudents = [];

        for (const student of students) {
            const stats = studentStats[student._id.toString()];
            let percentage = 0;
            if (stats && stats.total > 0) {
                percentage = Math.round((stats.present / stats.total) * 100);
            }
            if (percentage < 75) {
                atRiskStudentsCount++;
                if (lowAttendanceStudents.length < 5) {
                    lowAttendanceStudents.push({
                        id: student._id,
                        name: student.name,
                        rollNo: student.enrollmentNumber || 'N/A',
                        attendancePercentage: percentage
                    });
                }
            }
        }

        // Generate trend data (last 7 days) from validAttendances
        const attendanceTrend = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            d.setHours(0, 0, 0, 0);
            const nextD = new Date(d);
            nextD.setDate(d.getDate() + 1);

            const dayAttendances = validAttendances.filter(att => 
                att.date >= d && att.date < nextD
            );

            let dayPresents = 0;
            dayAttendances.forEach(att => {
                if (att.status === 'present') dayPresents++;
            });

            const dayPercentage = dayAttendances.length > 0 
                ? Math.round((dayPresents / dayAttendances.length) * 100) 
                : 0;

            attendanceTrend.push({
                day: d.toLocaleDateString('en-US', { weekday: 'short' }),
                percentage: dayPercentage
            });
        }

        return sendSuccess(res, 200, 'Analytics fetched successfully', {
            averageAttendance,
            totalStudents,
            atRiskStudentsCount,
            lowAttendanceStudents,
            attendanceTrend
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