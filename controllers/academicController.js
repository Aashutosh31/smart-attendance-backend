const Department = require('../models/Department');
const Semester = require('../models/Semester');
const Section = require('../models/Section');
const Subject = require('../models/Subject');
const Classroom = require('../models/Classroom');
const { sendSuccess, sendError } = require('../utils/responseHandler');

// --- DEPARTMENTS ---
exports.getDepartments = async (req, res, next) => {
    try {
        const deps = await Department.find().populate('hod', 'name email');
        return sendSuccess(res, 200, 'Departments fetched', deps);
    } catch (err) { next(err); }
};

exports.createDepartment = async (req, res, next) => {
    try {
        const { name, code, hod } = req.body;
        const dep = await Department.create({ name, code, hod });
        return sendSuccess(res, 201, 'Department created', dep);
    } catch (err) { next(err); }
};

exports.updateDepartment = async (req, res, next) => {
    try {
        const dep = await Department.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!dep) return sendError(res, 404, 'Department not found');
        return sendSuccess(res, 200, 'Department updated', dep);
    } catch (err) { next(err); }
};

exports.deleteDepartment = async (req, res, next) => {
    try {
        const dep = await Department.findByIdAndDelete(req.params.id);
        if (!dep) return sendError(res, 404, 'Department not found');
        return sendSuccess(res, 200, 'Department deleted');
    } catch (err) { next(err); }
};

// --- SEMESTERS ---
exports.getSemesters = async (req, res, next) => {
    try {
        const sems = await Semester.find().populate('department', 'name code');
        return sendSuccess(res, 200, 'Semesters fetched', sems);
    } catch (err) { next(err); }
};

exports.createSemester = async (req, res, next) => {
    try {
        const { name, number, department } = req.body;
        const sem = await Semester.create({ name, number, department });
        return sendSuccess(res, 201, 'Semester created', sem);
    } catch (err) { next(err); }
};

// --- SECTIONS ---
exports.getSections = async (req, res, next) => {
    try {
        const sections = await Section.find().populate('semester', 'name number');
        return sendSuccess(res, 200, 'Sections fetched', sections);
    } catch (err) { next(err); }
};

exports.createSection = async (req, res, next) => {
    try {
        const { name, semester } = req.body;
        const section = await Section.create({ name, semester });
        return sendSuccess(res, 201, 'Section created', section);
    } catch (err) { next(err); }
};

// --- SUBJECTS ---
exports.getSubjects = async (req, res, next) => {
    try {
        const subs = await Subject.find().populate('semester').populate('department');
        return sendSuccess(res, 200, 'Subjects fetched', subs);
    } catch (err) { next(err); }
};

exports.createSubject = async (req, res, next) => {
    try {
        const { name, code, semester, department } = req.body;
        const sub = await Subject.create({ name, code, semester, department });
        return sendSuccess(res, 201, 'Subject created', sub);
    } catch (err) { next(err); }
};

// --- CLASSROOMS ---
exports.getClassrooms = async (req, res, next) => {
    try {
        const rooms = await Classroom.find();
        return sendSuccess(res, 200, 'Classrooms fetched', rooms);
    } catch (err) { next(err); }
};

exports.createClassroom = async (req, res, next) => {
    try {
        const { name, building, capacity, beacon } = req.body;
        const room = await Classroom.create({ name, building, capacity, beacon });
        return sendSuccess(res, 201, 'Classroom created', room);
    } catch (err) { next(err); }
};
