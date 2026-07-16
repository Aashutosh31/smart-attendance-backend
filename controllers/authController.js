const User = require('../models/User');
const faceapi = require('@vladmandic/face-api/dist/face-api.node-wasm.js');
const canvas = require('canvas');
const { sendSuccess, sendError } = require('../utils/responseHandler'); // --- ADD THIS LINE ---

// --- Make face-api.js use the canvas environment ---
const { Canvas, Image, ImageData } = canvas;
faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

const enrollFace = async (req, res) => {
  try {
    const { image } = req.body;
    const userId = req.user.id;

    if (!image) {
      return res.status(400).json({ message: 'No image provided.' });
    }

    // --- Convert base64 image to buffer and load it with canvas ---
    const imgBuffer = Buffer.from(image.split(',')[1], 'base64');
    const img = await canvas.loadImage(imgBuffer); // --- THIS REPLACES tf.node.decodeImage ---

    // --- Detect face using the loaded image ---
    const detection = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor();

    if (!detection) {
      return res.status(400).json({ message: 'No face detected in the image.' });
    }

    // --- Save the descriptor to the user's document ---
    const user = await User.findById(userId);
    if (!user) {
      return sendError(res, 404, 'User not found.');
    }

    user.faceDescriptor = Array.from(detection.descriptor);
    await user.save();

    return sendSuccess(res, 200, 'Face enrolled successfully!');

  } catch (error) {
    console.error('Error in enrollFace:', error);
    next(error); // Pass to global error handler
  }
};

const syncSupabaseUser = async (req, res, next) => {
  const { email, id, user_metadata } = req.body;

  try {
    let user = await User.findOne({ supabaseId: id });

    if (!user) {
      user = new User({
        email,
        supabaseId: id,
        name: user_metadata?.name || 'New User',
        role: user_metadata?.role || 'student', // Default role
      });
      await user.save();
      return sendSuccess(res, 201, 'User synchronized successfully.', user);
    }

    return sendSuccess(res, 200, 'User already synchronized.', user);

  } catch (error) {
    console.error('Error syncing Supabase user:', error);
    next(error);
  }
};

const getMe = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) {
            return sendError(res, 404, 'User not found.');
        }
        return sendSuccess(res, 200, 'Profile fetched successfully', user);
    } catch (error) {
        console.error('Error fetching user profile:', error);
        next(error);
    }
};

const getFaceEnrollmentStatus = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return sendError(res, 404, 'User not found.');
    }

    const isFaceEnrolled = user.faceDescriptor && user.faceDescriptor.length > 0;
    // Keeping raw json response here because AuthStore.jsx expects { isFaceEnrolled } directly.
    res.status(200).json({ isFaceEnrolled });

  } catch (error) {
    console.error('Error fetching face enrollment status:', error);
    next(error);
  }
};


module.exports = { syncSupabaseUser, getMe, enrollFace, getFaceEnrollmentStatus };