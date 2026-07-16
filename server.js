const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
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

const frontendUrls = process.env.FRONTEND_URL 
  ? process.env.FRONTEND_URL.split(',').map(url => url.trim())
  : ['http://localhost:5173'];

// --- THE CRITICAL FIX ---
// This specific path forces Node.js to load the JavaScript-only version.
const faceapi = require('@vladmandic/face-api/dist/face-api.node-wasm.js'); 
const tf = require('@tensorflow/tfjs-core');
const { setWasmPaths } = require('@tensorflow/tfjs-backend-wasm');

dotenv.config();
connectDB();

const app = express();
const server = http.createServer(app);

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


const allowedOrigins = [
  ...frontendUrls
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

// --- SOCKET.IO SETUP ---
const io = new Server(server, { cors: corsOptions });
app.set('io', io);

io.on('connection', (socket) => {
    console.log(`🔌 New real-time client connected: ${socket.id}`);
    
    socket.on('joinSession', (sessionId) => {
        socket.join(sessionId);
        console.log(`Socket ${socket.id} joined session room: ${sessionId}`);
    });

    socket.on('disconnect', () => {
        console.log(`🔌 Client disconnected: ${socket.id}`);
    });
});
// --- END SOCKET.IO SETUP ---

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
app.use('/api/hod', require('./routes/hodRoutes.js'));
app.use('/api/coordinator', require('./routes/coordinatorRoutes.js'));
app.use('/api/faculty', require('./routes/facultyRoutes.js'));
app.use('/api/student', require('./routes/studentRoutes.js'));
app.use('/api/courses', require('./routes/courseRoutes.js'));
app.use('/api/academic', require('./routes/academicRoutes.js'));
app.use('/api/timetable', require('./routes/timetableRoutes.js'));

// Global Error Handler (must be after routes)
app.use(errorHandler);

const PORT = process.env.PORT || 8000;
server.listen(PORT, () => console.log(`✅ Server & Socket.IO running on port ${PORT}`));