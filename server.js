const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');
const path = require('path');
const faceapi = require('face-api.js');
const canvas = require('canvas');

// Load env vars
dotenv.config();

// Connect to database
connectDB();

// Initialize express app
const app = express();

// Set up face-api.js to work in a Node.js environment
const { Canvas, Image, ImageData } = canvas;
faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

// --- Model Loading ---
const modelPath = path.join(__dirname, 'face-models');
console.log('Loading face models from:', modelPath);

const loadModels = async () => {
  try {
    await Promise.all([
      faceapi.nets.ssdMobilenetv1.loadFromDisk(modelPath),
      faceapi.nets.faceLandmark68Net.loadFromDisk(modelPath),
      // FIXED: Corrected 'model_path' to 'modelPath'
      faceapi.nets.faceRecognitionNet.loadFromDisk(modelPath), 
    ]);
    console.log('Face models loaded successfully ✅');
  } catch (error) {
    console.error('Error loading face models: ❌', error);
  }
};
// It's better to await the model loading so the server doesn't start handling 
// requests before the face-api is ready.
// For serverless, this will run during the function's cold start.
loadModels();


// --- Middleware ---
app.use(cors());
// Increased payload limit for face descriptor data
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


// --- REMOVED app.listen ---
// The app.listen() block is not needed for Vercel's serverless environment.
// Vercel handles the server creation and port listening automatically.
// const PORT = process.env.PORT || 8000;
// app.listen(PORT, () => {
//   console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
// });


// --- Export the app for Vercel ---
// This is the only part needed to expose your app to the Vercel platform.
module.exports = app;