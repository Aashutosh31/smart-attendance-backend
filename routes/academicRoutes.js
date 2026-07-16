const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const {
    getDepartments, createDepartment, updateDepartment, deleteDepartment,
    getSemesters, createSemester,
    getSections, createSection,
    getSubjects, createSubject,
    getClassrooms, createClassroom
} = require('../controllers/academicController');

// All academic management routes require authentication and admin/coordinator roles
router.use(protect, authorize('admin', 'program_coordinator'));

// Departments
router.route('/departments')
    .get(getDepartments)
    .post(createDepartment);
router.route('/departments/:id')
    .put(updateDepartment)
    .delete(deleteDepartment);

// Semesters
router.route('/semesters')
    .get(getSemesters)
    .post(createSemester);

// Sections
router.route('/sections')
    .get(getSections)
    .post(createSection);

// Subjects
router.route('/subjects')
    .get(getSubjects)
    .post(createSubject);

// Classrooms
router.route('/classrooms')
    .get(getClassrooms)
    .post(createClassroom);

module.exports = router;
