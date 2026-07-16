const Attendance = require('../models/Attendance');
const CourseSession = require('../models/CourseSession');
const Course = require('../models/Course');
const User = require('../models/User');
const faceapi = require('@vladmandic/face-api/dist/face-api.node-wasm.js');
const canvas = require('canvas');
const { sendSuccess, sendError } = require('../utils/responseHandler');

exports.getStudentAttendance = async (req, res, next) => {
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

        return sendSuccess(res, 200, 'Attendance fetched successfully', formattedAttendance);
    } catch (err) {
        next(err);
    }
};

exports.getActiveSessions = async (req, res, next) => {
    try {
        // Find courses the student is enrolled in
        const studentCourses = await Course.find({ students: req.user.id });
        const courseIds = studentCourses.map(c => c._id);

        // Find active sessions for those courses
        const activeSessions = await CourseSession.find({
            course: { $in: courseIds },
            isActive: true
        }).populate('course', 'name code');

        return sendSuccess(res, 200, 'Active sessions fetched', activeSessions);
    } catch (error) {
        console.error("Error fetching active sessions:", error);
        next(error);
    }
};

exports.markStudentAttendance = async (req, res, next) => {
    const { sessionId } = req.params;
    const { image, beacon } = req.body;
    const studentId = req.user.id;

    try {
        if (!image) {
            return sendError(res, 400, 'No face image provided for verification.');
        }

        const student = await User.findById(studentId);
        if (!student || !student.faceDescriptor || student.faceDescriptor.length === 0) {
            return sendError(res, 400, 'Your face is not enrolled yet. Please enroll first.');
        }

        const session = await CourseSession.findById(sessionId)
            .populate('course')
            .populate('classroom');
        if (!session || session.status !== 'live' || !session.isActive) {
            return sendError(res, 404, 'Session not found or is no longer live.');
        }

        // --- BLE Beacon Verification ---
        if (session.classroom && session.classroom.beacon) {
            if (!beacon) {
                return sendError(res, 400, 'Bluetooth beacon data is required for this classroom.');
            }
            const { uuid, major, minor } = session.classroom.beacon;
            if (beacon.uuid !== uuid || beacon.major !== major || beacon.minor !== minor) {
                return sendError(res, 401, 'Location verification failed. You are not in the correct classroom.');
            }
        }

        // Validate that student is actually enrolled in this course
        if (!session.course.students.includes(studentId)) {
            return sendError(res, 403, 'You are not enrolled in this course.');
        }

        // --- Face Verification Check ---
        const imgBuffer = Buffer.from(image.split(',')[1], 'base64');
        const img = await canvas.loadImage(imgBuffer);
        const detection = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor();

        if (!detection) {
            return sendError(res, 400, 'No face detected in the image.');
        }

        const distance = faceapi.euclideanDistance(student.faceDescriptor, detection.descriptor);
        // Distance threshold for SSD Mobilenetv1
        if (distance > 0.55) {
            return sendError(res, 401, 'Face mismatch. Attendance denied.');
        }

        // Check if attendance has already been marked for this session
        const existingAttendance = await Attendance.findOne({
            student: studentId,
            session: sessionId // Check specific session instead of just the date
        });

        if (existingAttendance) {
            return sendError(res, 400, 'Attendance already marked for this lecture.');
        }


        const attendance = new Attendance({
            course: session.course._id,
            session: sessionId,
            student: studentId,
            faculty: session.faculty,
            status: 'present',
            lectureNumber: 1, // You might want to make this dynamic
        });

        await attendance.save();

        // Emit realtime event to the session and course rooms
        const io = req.app.get('io');
        if (io) {
            io.to(sessionId).to(session.course._id.toString()).emit('newAttendance', {
                studentId,
                studentName: student.name, // Useful for the frontend dashboard
                courseId: session.course._id,
                date: attendance.date,
                status: attendance.status
            });
        }

        return sendSuccess(res, 201, 'Attendance marked successfully.');

    } catch (error) {
        console.error("Error marking attendance:", error);
        next(error);
    }
};