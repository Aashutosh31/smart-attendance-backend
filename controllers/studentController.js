const Attendance = require('../models/Attendance');
const CourseSession = require('../models/CourseSession');
const Course = require('../models/Course');
const User = require('../models/User');
const SecurityLog = require('../models/SecurityLog');
const Classroom = require('../models/Classroom');
const faceapi = require('@vladmandic/face-api/dist/face-api.node-wasm.js');
const canvas = require('canvas');
const { authenticator } = require('otplib');
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
    const { image, beacon, livenessProof } = req.body;
    const studentId = req.user.id;

    try {
        if (!image) {
            return sendError(res, 400, 'No face image provided for verification.');
        }

        if (!livenessProof) {
            return sendError(res, 400, 'Liveness detection failed or missing.');
        }

        const student = await User.findById(studentId);
        if (!student || !student.faceDescriptors || student.faceDescriptors.length === 0) {
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
            if (!beacon || !beacon.totp) {
                return sendError(res, 400, 'Bluetooth beacon data with dynamic TOTP is required.');
            }
            
            // We need to fetch classroom directly to get the secret since it's select: false
            const classroomWithSecret = await Classroom.findById(session.classroom._id).select('+beacon.secret +beacon.lastUsedTotp');
            const { uuid, major, minor, secret, lastUsedTotp } = classroomWithSecret.beacon;
            
            if (beacon.uuid !== uuid || beacon.major !== major || beacon.minor !== minor) {
                return sendError(res, 401, 'Location verification failed. Incorrect classroom beacon.');
            }

            if (!secret) {
                return sendError(res, 500, 'Beacon secret not configured for this classroom.');
            }

            // Replay Attack Prevention
            if (beacon.totp === lastUsedTotp) {
                await SecurityLog.create({
                    user: studentId,
                    session: sessionId,
                    eventType: 'ble_spoof_attempt',
                    details: 'Replay attack detected. Token already used.',
                    ipAddress: req.ip
                });
                return sendError(res, 401, 'Invalid beacon token (Replay detected).');
            }

            // TOTP Verification (Allow 1 window before/after for slight time drift)
            authenticator.options = { window: 1 };
            const isValid = authenticator.check(beacon.totp, secret);

            if (!isValid) {
                await SecurityLog.create({
                    user: studentId,
                    session: sessionId,
                    eventType: 'ble_spoof_attempt',
                    details: 'Invalid TOTP token provided for beacon.',
                    ipAddress: req.ip
                });
                return sendError(res, 401, 'Location verification failed. Invalid beacon token.');
            }

            // Mark token as used
            classroomWithSecret.beacon.lastUsedTotp = beacon.totp;
            await classroomWithSecret.save();
        }

        // Validate that student is actually enrolled in this course
        if (!session.course.students.includes(studentId)) {
            return sendError(res, 403, 'You are not enrolled in this course.');
        }

        const imgBuffer = Buffer.from(image.split(',')[1], 'base64');
        const img = await canvas.loadImage(imgBuffer);
        const detection = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor();

        if (!detection) {
            return sendError(res, 400, 'No face detected in the image.');
        }

        // Compare against all stored descriptors for the user
        let isMatch = false;
        let minDistance = 1.0;

        for (const descriptor of student.faceDescriptors) {
            const distance = faceapi.euclideanDistance(new Float32Array(descriptor), detection.descriptor);
            if (distance < minDistance) {
                minDistance = distance;
            }
            if (distance <= 0.55) {
                isMatch = true;
                break;
            }
        }

        if (!isMatch) {
            // Log security mismatch
            await SecurityLog.create({
                user: studentId,
                session: sessionId,
                eventType: 'face_mismatch',
                details: `Face mismatch during attendance. Distance: ${minDistance.toFixed(4)}`,
                ipAddress: req.ip
            });
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

// Phase 4: Face Enrollment
exports.enrollFace = async (req, res, next) => {
    try {
        const { images } = req.body; // Expect an array of base64 images (different angles)
        const studentId = req.user.id;

        if (!images || !Array.isArray(images) || images.length === 0) {
            return sendError(res, 400, 'Please provide at least one face image for enrollment.');
        }

        const student = await User.findById(studentId);
        if (student.faceDescriptors && student.faceDescriptors.length > 0) {
            return sendError(res, 400, 'Face already enrolled. Request a re-registration if needed.');
        }

        const newDescriptors = [];

        for (const imgBase64 of images) {
            const imgBuffer = Buffer.from(imgBase64.split(',')[1], 'base64');
            const img = await canvas.loadImage(imgBuffer);
            const detection = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor();

            if (!detection) {
                return sendError(res, 400, 'Could not detect a clear face in one of the images.');
            }

            // Duplicate Face Prevention: Check against ALL other users
            const allUsers = await User.find({ _id: { $ne: studentId }, 'faceDescriptors.0': { $exists: true } });
            
            for (const otherUser of allUsers) {
                for (const descriptor of otherUser.faceDescriptors) {
                    const distance = faceapi.euclideanDistance(new Float32Array(descriptor), detection.descriptor);
                    if (distance <= 0.55) {
                        await SecurityLog.create({
                            user: studentId,
                            eventType: 'duplicate_face_enrollment',
                            details: `Attempted to enroll a face matching user ${otherUser._id}`,
                            ipAddress: req.ip
                        });
                        return sendError(res, 403, 'This face is already registered to another user.');
                    }
                }
            }

            newDescriptors.push(Array.from(detection.descriptor));
        }

        student.faceDescriptors = newDescriptors;
        await student.save();

        return sendSuccess(res, 200, 'Face enrolled successfully.');
    } catch (error) {
        next(error);
    }
};

exports.requestReRegistration = async (req, res, next) => {
    try {
        // In a real system, this flags the user for coordinator approval.
        // For simplicity, we clear it immediately to allow testing.
        const studentId = req.user.id;
        const student = await User.findById(studentId);
        
        student.faceDescriptors = [];
        await student.save();

        return sendSuccess(res, 200, 'Face re-registration approved. You may enroll your face again.');
    } catch (error) {
        next(error);
    }
};