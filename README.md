# Smart Attendance Backend (AttendTrack)

Backend service for Smart Attendance System. Provides auth sync with Supabase, role-based APIs for admin/faculty/HOD/coordinator/student, MongoDB persistence, and face enrollment using face-api.js with TensorFlow WASM.

## Features
- Supabase auth token verification and user sync
- Role-based access control (admin, hod, faculty, program_coordinator, student)
- Face enrollment using face descriptors stored in MongoDB
- Attendance tracking for students and faculty
- Course session lifecycle for live attendance marking
- CORS configured for Vercel preview and local dev

## Tech Stack
- Node.js + Express
- MongoDB + Mongoose
- Supabase Auth (JWT verification)
- @vladmandic/face-api + TensorFlow.js (WASM)

## Project Structure
- server.js: app bootstrap, CORS, model loading, route wiring
- config/: database and Supabase client
- middleware/: auth and role authorization
- controllers/: request handlers
- routes/: API routes by role
- models/: Mongoose schemas
- face-models/: face-api model weights

## Setup
### Prerequisites
- Node.js 18+ (recommended)
- MongoDB connection string
- Supabase project with Auth enabled

### Install
```bash
npm install
```

### Environment Variables
Create a .env file in the project root.

```bash
PORT=8000
MONGO_URI=your_mongodb_connection_string
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_role_key
```

Notes:
- SUPABASE_SERVICE_KEY is required for admin routes that create users.
- SUPABASE_ANON_KEY is used to validate Bearer tokens.

### Run
```bash
npm run dev
```

## Face Models
Face recognition uses the model files in face-models/. Make sure the folder contains the weight manifests and binaries. The server loads:
- ssdMobilenetv1
- faceLandmark68Net
- faceRecognitionNet

The TensorFlow WASM backend is used for compatibility in Node.js.

## Authentication Flow
1. Frontend signs in with Supabase.
2. Frontend sends the Supabase access token as Bearer token.
3. API validates token with Supabase and syncs the user into MongoDB if missing.

## API Overview
Base URL: /api

### Auth Routes
- POST /api/auth/sync
  - Body: { email, id, user_metadata }
  - Creates user in MongoDB if not found.
- GET /api/auth/me
  - Auth: Bearer token
  - Returns current user.
- POST /api/auth/enroll-face
  - Auth: Bearer token
  - Body: { image: base64DataUrl }
  - Stores face descriptor for user.
- GET /api/auth/status
  - Auth: Bearer token
  - Returns { isFaceEnrolled }.

### Admin Routes
All admin routes require admin role unless stated.
- POST /api/admin/faculty
  - Creates faculty user in Supabase + MongoDB.
- GET /api/admin/faculty
  - List all faculty.
- POST /api/admin/hod
  - Creates HOD user in Supabase + MongoDB.
- GET /api/admin/hod-attendance
  - HOD attendance for today.
- GET /api/admin/students
  - List all students with course.
- GET /api/admin/reports/tree
  - Attendance tree data (faculty today).
- GET /api/admin/users/role/:role
  - Roles: admin, hod
  - List users by role (id, name).

### Faculty Routes
All faculty routes require faculty role.
- GET /api/faculty/me/courses
  - Assigned courses with students.
- POST /api/faculty/courses/:courseId/start-session
  - Starts course session and marks faculty present.
- POST /api/faculty/courses/:courseId/recognize
  - Placeholder for face recognition.
- POST /api/faculty/courses/:courseId/attendance
  - Body: { studentIds: [], lectureNumber }
  - Stores present/absent for all students in course.

### HOD Routes
All HOD routes require hod role.
- GET /api/hod/faculty-attendance/today
  - Faculty attendance status for today.
- GET /api/hod/faculty-reports
  - Placeholder report data.
- GET /api/hod/notifications
  - Placeholder notifications.

### Coordinator Routes
All routes require program_coordinator role.
- POST /api/coordinator/add-student
  - Body: { name, email, rollNo, courseId }
  - Creates student in MongoDB and assigns to course.

### Student Routes
All student routes require student role.
- GET /api/student/me/attendance
  - Attendance history for current student.
- GET /api/student/me/active-sessions
  - Active sessions for enrolled courses.
- POST /api/student/sessions/:sessionId/mark-attendance
  - Marks attendance for active session.

### Course Routes
- GET /api/courses
  - Returns all courses; falls back to sample data if none exist.

## Data Models (Mongoose)
- User: name, email, password, role, department, subject, course, faceDescriptor
- Course: name, code, faculty, students
- Attendance: course, student, faculty, date, status, lectureNumber
- CourseSession: course, faculty, startTime, endTime, isActive
- FacultyAttendance: faculty, date, status, checkInTime
- AdminHodAttendance: hod, department, checkInTime

## CORS
Allowed origins include:
- https://smart-attendance-frontend-seven.vercel.app
- Vercel preview URLs for the frontend project
- http://localhost:5173

## Scripts
- npm run dev: start with nodemon
- npm start: start with node

## Troubleshooting
- Face models not loading: ensure face-models/ exists and contains all weights.
- Unauthorized errors: verify SUPABASE_URL and SUPABASE_ANON_KEY.
- Admin user creation fails: verify SUPABASE_SERVICE_KEY.

## License
MIT
