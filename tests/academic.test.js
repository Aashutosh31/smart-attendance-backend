const mongoose = require('mongoose');
const { connectDB, closeDB, clearDB } = require('./setup');
const Department = require('../models/Department');
const { getDepartments, createDepartment } = require('../controllers/academicController');
const httpMocks = require('node-mocks-http');

describe('Academic Controller Tests', () => {
    beforeAll(async () => await connectDB());
    afterEach(async () => await clearDB());
    afterAll(async () => await closeDB());

    describe('createDepartment', () => {
        it('should create a department successfully', async () => {
            const req = httpMocks.createRequest({
                method: 'POST',
                url: '/api/academic/departments',
                body: { name: 'Computer Science', code: 'CS', hod: new mongoose.Types.ObjectId() }
            });
            const res = httpMocks.createResponse();
            const next = jest.fn();

            await createDepartment(req, res, next);

            const responseData = JSON.parse(res._getData());
            expect(res._getStatusCode()).toBe(201);
            expect(responseData.success).toBe(true);
            expect(responseData.data.name).toBe('Computer Science');

            const dbDep = await Department.findOne({ code: 'CS' });
            expect(dbDep).toBeTruthy();
        });
    });

    describe('getDepartments', () => {
        it('should fetch all departments', async () => {
            await Department.create({ name: 'Mathematics', code: 'MATH' });

            const req = httpMocks.createRequest({ method: 'GET', url: '/api/academic/departments' });
            const res = httpMocks.createResponse();
            const next = jest.fn();

            await getDepartments(req, res, next);

            const responseData = JSON.parse(res._getData());
            expect(res._getStatusCode()).toBe(200);
            expect(responseData.success).toBe(true);
            expect(responseData.data.length).toBe(1);
            expect(responseData.data[0].name).toBe('Mathematics');
        });
    });
});
