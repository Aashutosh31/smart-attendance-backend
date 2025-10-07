const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const faceapi = require('face-api.js');
const canvas = require('canvas');
const connectDB = require('./config/db');

// Load env vars
dotenv.config();

// --- VITAL: Set up face-api.js environment before anything else ---
const { Canvas, Image, ImageData } = canvas;
faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

// Initialize express app
const app = express();

// --- Middleware ---
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// --- API Routes ---
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const hodRoutes = require('./routes/hodRoutes');
const facultyRoutes = require('./routes/facultyRoutes');
const studentRoutes = require('./routes/studentRoutes');
const coordinatorRoutes = require('./routes/coordinatorRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/hod', hodRoutes);
app.use('/api/faculty', facultyRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/coordinator', coordinatorRoutes);

// --- Create a single startup function ---
const startServer = async () => {
  try {
    // 1. Connect to the database
    await connectDB();
    console.log('MongoDB Connected... ✅');

    // 2. Load face models and WAIT for them to finish
    const modelPath = path.join(__dirname, 'face-models');
    console.log('Loading face models from:', modelPath);
    await Promise.all([
      faceapi.nets.ssdMobilenetv1.loadFromDisk(modelPath),
      faceapi.nets.faceLandmark68Net.loadFromDisk(modelPath),
      faceapi.nets.faceRecognitionNet.loadFromDisk(modelPath)
    ]);
    console.log('Face models loaded successfully ✅');

    // Return the configured app instance
    return app;
  } catch (error) {
    console.error('💥 Critical startup error:', error);
    // Exit the process with a failure code if startup fails. This provides clear logs in Vercel.
    process.exit(1); 
  }
};

// --- Export a promise that resolves with the app ---
// Vercel will await this promise before starting the server.
// This is the correct pattern for serverless functions with async startup tasks.
module.exports = startServer();