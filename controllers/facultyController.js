const Course = require('../models/Course');
const Attendance = require('../models/Attendance');
const User = require('../models/User');
const FacultyAttendance = require('../models/FacultyAttendance');
const CourseSession = require('../models/CourseSession');


exports.getAssignedCourses = async (req, res) => {
    try {
        // --- DEBUGGING STEP ---
        // 1. Log the user object from the token to see who is making the request.
        console.log('--- Debugging /api/faculty/me/courses ---');
        console.log('User making request (from token):', req.user);

        if (!req.user || !req.user.id) {
            console.log('Error: User ID not found on request object.');
            return res.status(400).json({ message: 'User ID not found, cannot query courses.' });
        }

        const facultyId = req.user.id;
        console.log(`Searching for courses assigned to faculty with ID: ${facultyId}`);
        
        // 2. Execute the database query.
        const courses = await Course.find({ faculty: facultyId }).populate('students', 'name');
        
        // 3. Log the result of the query.
        console.log(`Found ${courses.length} courses for this faculty.`);
        if (courses.length > 0) {
            console.log('Courses found:', courses);
        }
        console.log('------------------------------------------');
        // --- END DEBUGGING STEP ---

        res.json(courses);
    } catch (err) {
        // Log any unexpected errors during the process
        console.error('--- Error in getAssignedCourses ---');
        console.error(err);
        console.error('------------------------------------');
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.recognizeStudentFace = async (req, res) => {
    // This remains a dummy function as facial recognition is a complex service.
    const mockStudent = { id: `mockStudent_${Date.now()}`, name: 'Scanned Student' };
    res.json(mockStudent);
};

exports.saveAttendance = async (req, res) => {
    const { studentIds, lectureNumber } = req.body; // These are the PRESENT students
    const { courseId } = req.params;

    try {
        const course = await Course.findById(courseId);
        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }

        const allStudentIdsInCourse = course.students.map(id => id.toString());
        const presentStudentIds = studentIds.map(id => id.toString());

        const records = allStudentIdsInCourse.map(studentId => {
            const isPresent = presentStudentIds.includes(studentId);
            return {
                course: courseId,
                student: studentId,
                faculty: req.user.id,
                date: new Date(),
                status: isPresent ? 'present' : 'absent',
                lectureNumber: lectureNumber || 1,
            };
        });

        await Attendance.insertMany(records);
        res.status(201).json({ message: 'Attendance processed for all students in the course.' });

    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.startCourseSession = async (req, res) => {
    try {
        const facultyId = req.user.id;
        const { courseId } = req.params;

        await FacultyAttendance.findOneAndUpdate(
            { faculty: facultyId, date: { $gte: new Date().setHours(0, 0, 0, 0) } },
            {
                faculty: facultyId,
                date: new Date(),
                status: 'present',
                checkInTime: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
            },
            { upsert: true, new: true }
        );

        const session = new CourseSession({
            course: courseId,
            faculty: facultyId,
        });
        await session.save();

        res.status(200).json({ message: 'Session started successfully', session });

    } catch (error) {
        console.error("Error starting session:", error);
        res.status(500).json({ message: 'Server Error' });
    }
};