const User = require('../models/User');
const faceapi = require('@vladmandic/face-api/dist/face-api.node-wasm.js');
const tf = require('@tensorflow/tfjs-core');
const { setWasmPaths } = require('@tensorflow/tfjs-backend-wasm');
const path = require('path');


const enrollFace = async (req, res) => {
  try {
    const { image } = req.body;
    const userId = req.user.id;

    if (!image) {
      return res.status(400).json({ message: 'No image provided.' });
    }

    const imgBuffer = Buffer.from(image.split(',')[1], 'base64');
    const tensor = tf.node.decodeImage(imgBuffer, 3);

    const detection = await faceapi.detectSingleFace(tensor).withFaceLandmarks().withFaceDescriptor();
    if (!detection) {
      return res.status(400).json({ message: 'No face detected in the image.' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    user.faceDescriptor = Array.from(detection.descriptor);
    await user.save();

    res.status(200).json({ message: 'Face enrolled successfully!' });

  } catch (error) {
    console.error('Error in enrollFace:', error);
    res.status(500).json({ message: 'Server error during face enrollment.' });
  }
};

// Sync Supabase user data to MongoDB
const syncSupabaseUser = async (req, res) => {
  const { email, id, user_metadata } = req.body;

  if (!email || !id) {
    return res.status(400).json({ message: 'Email and Supabase ID are required.' });
  }

  try {
    // Find user by Supabase ID first
    let user = await User.findOne({ supabaseId: id });

    // If user doesn't exist, create a new one
    if (!user) {
      user = new User({
        email,
        supabaseId: id,
        name: user_metadata?.name || 'New User',
        role: user_metadata?.role || 'student', // Default role
      });
      await user.save();
      return res.status(201).json({ message: 'User synchronized successfully.', user });
    }

    // If user exists, just confirm synchronization
    return res.status(200).json({ message: 'User already synchronized.', user });

  } catch (error) {
    console.error('Error syncing Supabase user:', error);
    return res.status(500).json({ message: 'Server error during user synchronization.' });
  }
};

// Get the currently authenticated user's profile
const getMe = async (req, res) => {
    try {
        // The user object is attached to req by the 'protect' middleware
        const user = await User.findById(req.user.id).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }
        res.status(200).json(user);
    } catch (error) {
        console.error('Error fetching user profile:', error);
        res.status(500).json({ message: 'Server error.' });
    }
};


module.exports = { syncSupabaseUser, getMe, enrollFace };