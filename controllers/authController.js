const User = require('../models/User');
const faceapi = require('face-api.js');
const canvas = require('canvas');
const path = require('path');
const { Canvas, Image, ImageData } = canvas;

// Setup face-api.js
faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

const loadModels = async () => {
    const modelPath = path.join(__dirname, '..', 'face-models');
    await Promise.all([
        faceapi.nets.ssdMobilenetv1.loadFromDisk(modelPath),
        faceapi.nets.faceLandmark68Net.loadFromDisk(modelPath),
        faceapi.nets.faceRecognitionNet.loadFromDisk(modelPath),
    ]);
};
loadModels();

// Get auth status and check face enrollment
exports.getAuthStatus = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json({
            isLoggedIn: true,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                isFaceEnrolled: user.faceDescriptor ? true : false,
            },
        });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// Enroll a user's face
exports.enrollFace = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }
        if (!req.file) {
            return res.status(400).json({ message: 'No image file uploaded.' });
        }

        const image = await canvas.loadImage(req.file.buffer);
        const detections = await faceapi.detectSingleFace(image).withFaceLandmarks().withFaceDescriptor();

        if (!detections) {
            return res.status(400).json({ message: 'No face detected in the image.' });
        }

        user.faceDescriptor = Array.from(detections.descriptor);
        await user.save();

        res.status(200).json({ message: 'Face enrolled successfully.' });
    } catch (error) {
        console.error('Face enrollment error:', error);
        res.status(500).json({ message: 'Server error during face enrollment.' });
    }
};

// Verify a user's face
exports.verifyFace = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user || !user.faceDescriptor) {
            return res.status(404).json({ message: 'User not found or face not enrolled.' });
        }
        if (!req.file) {
            return res.status(400).json({ message: 'No image file uploaded for verification.' });
        }

        const image = await canvas.loadImage(req.file.buffer);
        const detection = await faceapi.detectSingleFace(image).withFaceLandmarks().withFaceDescriptor();

        if (!detection) {
            return res.status(400).json({ message: 'No face detected in the verification image.' });
        }

        const faceMatcher = new faceapi.FaceMatcher([new Float32Array(user.faceDescriptor)]);
        const bestMatch = faceMatcher.findBestMatch(detection.descriptor);

        if (bestMatch.label === 'unknown') {
            return res.status(401).json({ message: 'Face verification failed.' });
        }

        res.status(200).json({ message: 'Face verified successfully.' });
    } catch (error) {
        console.error('Face verification error:', error);
        res.status(500).json({ message: 'Server error during face verification.' });
    }
};