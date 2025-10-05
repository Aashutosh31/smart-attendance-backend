const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');
const path = require('path');

// Route files
const authRoutes = require('./routes/authRoutes.js');
const adminRoutes = require('./routes/adminRoutes.js');
const hodRoutes = require('./routes/hodRoutes.js');
const facultyRoutes = require('./routes/facultyRoutes.js');
const studentRoutes = require('./routes/studentRoutes.js');
const courseRoutes = require('./routes/courseRoutes.js');

// Mount routers
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/hod', hodRoutes);
app.use('/api/faculty', facultyRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/courses', courseRoutes); // Added the missing course router

// --- THE CRITICAL FIX ---
// This specific path forces Node.js to load the JavaScript-only version.
const faceapi = require('@vladmandic/face-api/dist/face-api.node-wasm.js'); 
const tf = require('@tensorflow/tfjs-core');
const { setWasmPaths } = require('@tensorflow/tfjs-backend-wasm');

dotenv.config();
connectDB();

const app = express();
app.use(express.json({ limit: '50mb' }));

// --- Flexible CORS Configuration ---
const allowedOrigins = [
  'https://smart-attendance-frontend-seven.vercel.app', // Your main frontend URL
  // This Regular Expression allows requests from any Vercel preview URL.
  /https:\/\/smart-attendance-frontend-.*-aashutosh31s-projects\.vercel\.app$/, 
  'http://localhost:5173' // For local development
];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests if the origin is in our list or if there's no origin (like from mobile apps or curl)
    if (!origin || allowedOrigins.some(o => o instanceof RegExp ? o.test(origin) : o === origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
};

app.use(cors(corsOptions));
// This handles pre-flight requests for all routes.
app.options('*', cors(corsOptions)); 
// --- END of CORS Configuration ---


// --- CORRECTED FACE-API MODEL LOADING ---
async function loadModels() {
  const wasmPath = path.join(__dirname, 'node_modules/@tensorflow/tfjs-backend-wasm/dist/');
  setWasmPaths(wasmPath);
  
  await tf.setBackend('wasm');
  await tf.ready();

  const modelPath = path.join(__dirname, 'face-models');
  console.log('⌛ Loading Face Recognition Models...');
  try {
    await faceapi.nets.ssdMobilenetv1.loadFromDisk(modelPath);
    await faceapi.nets.faceLandmark68Net.loadFromDisk(modelPath);
    await faceapi.nets.faceRecognitionNet.loadFromDisk(modelPath);
    console.log('✅ Face Recognition Models Loaded!');
  } catch (error) {
    console.error('❌ Error loading models:', error);
    process.exit(1);
  }
}
loadModels();
// --- END OF MODEL LOADING ---

app.get('/', (req, res) => { res.send('AttendTrack API is running...'); });

// --- ROUTES ---
app.use('/api/auth', require('./routes/authRoutes.js'));
app.use('/api/admin', require('./routes/adminRoutes.js'));
app.use('/api/faculty', require('./routes/facultyRoutes.js'));
app.use('/api/hod', require('./routes/hodRoutes.js'));
app.use('/api/coordinator', require('./routes/coordinatorRoutes.js'));
app.use('/api/student', require('./routes/studentRoutes.js'));
app.use('/api/courses', require('./routes/courseRoutes.js'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));