const Attendance = require('../models/Attendance');
const CourseSession = require('../models/CourseSession');
const Course = require('../models/Course');
const User = require('../models/User');
const faceapi = require('@vladmandic/face-api/dist/face-api.node-wasm.js');
const canvas = require('canvas');

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

exports.getActiveSessions = async (req, res) => {
    try {
        // Find courses the student is enrolled in
        const studentCourses = await Course.find({ students: req.user.id });
        const courseIds = studentCourses.map(c => c._id);

        // Find active sessions for those courses
        const activeSessions = await CourseSession.find({
            course: { $in: courseIds },
            isActive: true
        }).populate('course', 'name code');

        res.json(activeSessions);
    } catch (error) {
        console.error("Error fetching active sessions:", error);
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.markStudentAttendance = async (req, res) => {
    const { sessionId } = req.params;
    const { image, beacon } = req.body;
    const studentId = req.user.id;

    try {
        if (!image) {
            return res.status(400).json({ message: 'No face image provided for verification.' });
        }

        const student = await User.findById(studentId);
        if (!student || !student.faceDescriptor || student.faceDescriptor.length === 0) {
            return res.status(400).json({ message: 'Your face is not enrolled yet. Please enroll first.' });
        }

        const session = await CourseSession.findById(sessionId)
            .populate('course')
            .populate('classroom');
        if (!session || !session.isActive) {
            return res.status(404).json({ message: 'Session not found or is no longer active.' });
        }

        // --- BLE Beacon Verification ---
        if (session.classroom && session.classroom.beacon) {
            if (!beacon) {
                return res.status(400).json({ message: 'Bluetooth beacon data is required for this classroom.' });
            }
            const { uuid, major, minor } = session.classroom.beacon;
            if (beacon.uuid !== uuid || beacon.major !== major || beacon.minor !== minor) {
                return res.status(401).json({ message: 'Location verification failed. You are not in the correct classroom.' });
            }
        }

        // Validate that student is actually enrolled in this course
        if (!session.course.students.includes(studentId)) {
            return res.status(403).json({ message: 'You are not enrolled in this course.' });
        }

        // --- Face Verification Check ---
        const imgBuffer = Buffer.from(image.split(',')[1], 'base64');
        const img = await canvas.loadImage(imgBuffer);
        const detection = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor();

        if (!detection) {
            return res.status(400).json({ message: 'No face detected in the image.' });
        }

        const distance = faceapi.euclideanDistance(student.faceDescriptor, detection.descriptor);
        // Distance threshold for SSD Mobilenetv1
        if (distance > 0.55) {
            return res.status(401).json({ message: 'Face mismatch. Attendance denied.' });
        }

        // Check if attendance has already been marked for this session
        const existingAttendance = await Attendance.findOne({
            student: studentId,
            course: session.course._id,
            date: { $gte: new Date().setHours(0, 0, 0, 0) } // Check for today's date
        });

        if (existingAttendance) {
            return res.status(400).json({ message: 'Attendance already marked for this course today.' });
        }


        const attendance = new Attendance({
            course: session.course._id,
            student: studentId,
            faculty: session.faculty,
            status: 'present',
            lectureNumber: 1, // You might want to make this dynamic
        });

        await attendance.save();

        res.status(201).json({ message: 'Attendance marked successfully.' });

    } catch (error) {
        console.error("Error marking attendance:", error);
        res.status(500).json({ message: 'Server Error' });
    }
};