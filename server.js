const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./config/db.js');
const cors = require('cors');

const authRoutes = require('./routes/authRoutes.js');
const adminRoutes = require('./routes/adminRoutes.js');
const hodRoutes = require('./routes/hodRoutes.js');
const facultyRoutes = require('./routes/facultyRoutes.js');
const studentRoutes = require('./routes/studentRoutes.js');
const courseRoutes = require('./routes/courseRoutes.js');

dotenv.config();
connectDB();

const app = express();
app.use(express.json());

app.use(cors({
    origin: [
        'http://localhost:5173',
        'http://localhost:5174',
        'https://smart-attendance-frontend-swart.vercel.app',
        'https://smart-attendance-frontend-seven.vercel.app'
    ],
    credentials: true,
}));

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/hod', hodRoutes);
app.use('/api/faculty', facultyRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/courses', courseRoutes);

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`));

module.exports = app;