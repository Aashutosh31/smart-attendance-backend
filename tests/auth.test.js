const mongoose = require('mongoose');
const { connectDB, closeDB, clearDB } = require('./setup');
const User = require('../models/User');
// We need to mock the express app or test the controller directly since server.js calls app.listen()
const { syncSupabaseUser } = require('../controllers/authController');
const httpMocks = require('node-mocks-http');

describe('Auth Controller Tests', () => {
    beforeAll(async () => await connectDB());
    afterEach(async () => await clearDB());
    afterAll(async () => await closeDB());

    describe('syncSupabaseUser', () => {
        it('should create a new user if it does not exist', async () => {
            const req = httpMocks.createRequest({
                method: 'POST',
                url: '/api/auth/sync',
                body: {
                    email: 'test@example.com',
                    id: 'supa123',
                    user_metadata: { name: 'Test User', role: 'student' }
                }
            });
            const res = httpMocks.createResponse();
            const next = jest.fn();

            await syncSupabaseUser(req, res, next);

            const responseData = JSON.parse(res._getData());
            expect(res._getStatusCode()).toBe(201);
            expect(responseData.success).toBe(true);
            expect(responseData.message).toBe('User synchronized successfully.');
            expect(responseData.data.email).toBe('test@example.com');

            const dbUser = await User.findOne({ email: 'test@example.com' });
            expect(dbUser).toBeTruthy();
            expect(dbUser.role).toBe('student');
        });

        it('should return existing user if already synced', async () => {
            // Seed DB
            await User.create({
                email: 'existing@example.com',
                supabaseId: 'supa456',
                name: 'Existing User',
                role: 'faculty'
            });

            const req = httpMocks.createRequest({
                method: 'POST',
                url: '/api/auth/sync',
                body: {
                    email: 'existing@example.com',
                    id: 'supa456',
                    user_metadata: { name: 'Existing User', role: 'faculty' }
                }
            });
            const res = httpMocks.createResponse();
            const next = jest.fn();

            await syncSupabaseUser(req, res, next);

            const responseData = JSON.parse(res._getData());
            expect(res._getStatusCode()).toBe(200);
            expect(responseData.success).toBe(true);
            expect(responseData.message).toBe('User already synchronized.');
        });
    });
});
