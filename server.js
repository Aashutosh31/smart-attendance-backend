const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const faceapi = require('face-api.js');
const canvas = require('canvas');
const connectDB = require('./config/db');

// --- Initialization ---
dotenv.config();

// Patch face-api.js for Node.js environment
const { Canvas, Image, ImageData } = canvas;
faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

const app = express();

// --- Core Middleware ---
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

// --- Asynchronous Startup Function ---
const startServer = async () => {
  try {
    // 1. Connect to MongoDB and wait for it to succeed
    await connectDB();
    console.log('MongoDB Connected Successfully ✅');

    // 2. Load all face-api.js models and wait for them to finish
    const modelPath = path.join(__dirname, 'face-models');
    console.log(`Loading face models from: ${modelPath}`);
    await Promise.all([
      faceapi.nets.ssdMobilenetv1.loadFromDisk(modelPath),
      faceapi.nets.faceLandmark68Net.loadFromDisk(modelPath),
      faceapi.nets.faceRecognitionNet.loadFromDisk(modelPath),
    ]);
    console.log('Face Models Loaded Successfully ✅');

    // Return the fully initialized app
    return app;
  } catch (error) {
    console.error('💥 FATAL STARTUP ERROR 💥:', error);
    // If startup fails, exit the process. This is crucial for Vercel logs.
    process.exit(1);
  }
};

// --- Export for Vercel ---
// Vercel will await the promise resolved by startServer(), ensuring
// the app is fully ready before handling any requests.
module.exports = startServer();