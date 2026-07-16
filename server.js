const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const connectDB = require('./config/db');
const path = require('path');
const { errorHandler } = require('./middleware/errorMiddleware');


// --- THE CRITICAL FIX ---
// This specific path forces Node.js to load the JavaScript-only version.
const faceapi = require('@vladmandic/face-api/dist/face-api.node-wasm.js'); 
const tf = require('@tensorflow/tfjs-core');
const { setWasmPaths } = require('@tensorflow/tfjs-backend-wasm');

dotenv.config();
connectDB();

const app = express();

// --- SECURITY MIDDLEWARE ---
app.use(helmet());
app.use(mongoSanitize());
app.use(xss());
app.use(morgan('combined'));

// --- RATE LIMITING ---
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Reduced limit to prevent DoS (5mb is enough for face base64)
app.use(express.json({ limit: '5mb' }));


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

// Global Error Handler (must be after routes)
app.use(errorHandler);

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));