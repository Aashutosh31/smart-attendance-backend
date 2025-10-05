const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./config/db.js');
const cors = require('cors');

// Route files
const authRoutes = require('./routes/authRoutes.js');
const adminRoutes = require('./routes/adminRoutes.js');
const hodRoutes = require('./routes/hodRoutes.js');
const facultyRoutes = require('./routes/facultyRoutes.js');
const studentRoutes = require('./routes/studentRoutes.js');
// Missing courseRoutes import in original file

dotenv.config();

connectDB();

const app = express();

app.use(express.json());

// A flexible CORS policy to allow requests from your frontend domains
app.use(cors({
    origin: [
        'http://localhost:5173', // Local dev
        'http://localhost:5174', // Another local dev port
        'https://smart-attendance-frontend-seven.vercel.app', // Your Vercel deployment
    ],
    credentials: true,
}));


// Mount routers
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/hod', hodRoutes);
app.use('/api/faculty', facultyRoutes);
app.use('/api/student', studentRoutes);


const PORT = process.env.PORT || 8000;

app.listen(
    PORT,
    console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`)
);

module.exports = app;