// controllers/authController.js
const User = require('../models/User.js');
const faceapi = require('@vladmandic/face-api/dist/face-api.node-wasm.js');
const canvas = require('canvas');

const { Canvas, Image, ImageData } = canvas;
faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

// Handles the one-time face enrollment process
exports.enrollAndVerifyFace = async (req, res) => {
    const { image } = req.body;
    const userId = req.user.id;

    try {
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }
        

        if (user.isFaceEnrolled) {
            return res.status(400).json({ message: "Face has already been enrolled." });
        }

        const detections = await faceapi.detectSingleFace(await canvas.loadImage(image)).withFaceLandmarks().withFaceDescriptor();
        if (!detections) {
            return res.status(400).json({ message: "No face detected. Please try again." });
        }
        
        user.faceDescriptor = Array.from(detections.descriptor);
        user.isFaceEnrolled = true;
        await user.save();

        return res.status(200).json({ 
            message: "Face enrolled successfully!",
            isFaceEnrolled: true 
        });

    } catch (error) {
        console.error("Face Enrollment Error:", error);
        res.status(500).json({ message: 'Server error during face enrollment.' });
    }
};

// Checks the enrollment status of the logged-in user
exports.getUserStatus = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('isFaceEnrolled');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json({ isFaceEnrolled: user.isFaceEnrolled });
    } catch (error) {
        console.error("Get User Status Error:", error);
        res.status(500).json({ message: 'Server error' });
    }
};