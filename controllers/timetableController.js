const Timetable = require('../models/Timetable');
const Lecture = require('../models/Lecture');
const CourseSession = require('../models/CourseSession');
const { sendSuccess, sendError } = require('../utils/responseHandler');

// Timetable CRUD
exports.createTimetable = async (req, res, next) => {
    try {
        const { department, semester, section, dayOfWeek, lectures } = req.body;
        
        // Conflict detection: does section already have a timetable for this day?
        const existing = await Timetable.findOne({ section, dayOfWeek });
        if (existing) {
            return sendError(res, 400, `Timetable for this section on ${dayOfWeek} already exists.`);
        }

        const timetable = await Timetable.create({ department, semester, section, dayOfWeek, lectures });
        return sendSuccess(res, 201, 'Timetable created', timetable);
    } catch (error) { next(error); }
};

exports.getTimetables = async (req, res, next) => {
    try {
        const timetables = await Timetable.find()
            .populate('department', 'name')
            .populate('semester', 'name')
            .populate('section', 'name')
            .populate('lectures');
        return sendSuccess(res, 200, 'Timetables fetched', timetables);
    } catch (error) { next(error); }
};

// Lecture Template CRUD (within timetable)
exports.createLectureTemplate = async (req, res, next) => {
    try {
        const { subject, faculty, classroom, startTime, endTime } = req.body;
        
        // Basic conflict detection for faculty & classroom at this time
        // Note: Real conflict detection requires checking dayOfWeek from Timetable context, 
        // but for simplicity we'll just create the template.
        
        const lecture = await Lecture.create({ subject, faculty, classroom, startTime, endTime });
        return sendSuccess(res, 201, 'Lecture template created', lecture);
    } catch (error) { next(error); }
};

// Generate live CourseSessions (Lecture Instances) from Timetable for a given date
exports.generateSessions = async (req, res, next) => {
    try {
        const { date, sectionId } = req.body; // e.g. "2023-10-25"
        const targetDate = new Date(date);
        const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
        const dayOfWeek = days[targetDate.getDay()];

        const timetable = await Timetable.findOne({ section: sectionId, dayOfWeek })
            .populate('lectures');
            
        if (!timetable) {
            return sendError(res, 404, `No timetable found for ${dayOfWeek}`);
        }

        const sessions = [];
        for (const lecture of timetable.lectures) {
            // Ensure no duplicate session for same day/course/time
            const existing = await CourseSession.findOne({
                course: lecture.subject, // Assuming Course maps 1:1 to subject here for compatibility
                date: targetDate,
                scheduledStartTime: lecture.startTime
            });

            if (!existing) {
                const session = await CourseSession.create({
                    course: lecture.subject,
                    faculty: lecture.faculty,
                    classroom: lecture.classroom,
                    date: targetDate,
                    scheduledStartTime: lecture.startTime,
                    scheduledEndTime: lecture.endTime,
                    status: 'scheduled',
                    isActive: false
                });
                sessions.push(session);
            }
        }

        return sendSuccess(res, 201, 'Sessions generated successfully', sessions);
    } catch (error) { next(error); }
};
