// middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const User = require('../models/User.js');

// --- A CRITICAL DEBUGGING STEP ---
// This line will print the JWT_SECRET to your console when the server starts.
// This allows you to verify that the correct secret is being loaded from the .env file.
console.log("🔑 [AuthMiddleware] JWT Secret Loaded:", process.env.JWT_SECRET);

const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // 1. Get and verify the token from the frontend
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // 2. Try to find the user in your MongoDB
            let userInDb = await User.findOne({ email: decoded.email });

            // 3. FAILSAFE: If the user is NOT found, create them instantly.
            // This permanently solves any race condition with the Supabase webhook.
            if (!userInDb) {
                console.log(`User ${decoded.email} not found in MongoDB. Creating record now...`);
                
                userInDb = new User({
                    email: decoded.email,
                    name: decoded.user_metadata?.full_name || decoded.email,
                    role: decoded.user_metadata?.role || 'student',
                    password: "password_managed_by_supabase",
                    isFaceEnrolled: false,
                });
                
                await userInDb.save();
                console.log(`✅ Successfully created new user record for ${userInDb.email}`);
            }

            // 4. Attach the user to the request object and proceed
            req.user = userInDb;
            next();
        } catch (error) {
            console.error('❌ [AuthMiddleware] Token verification failed:', error.message);
            res.status(401).json({ message: 'Not authorized, token failed' });
        }
    }

    if (!token) {
        res.status(401).json({ message: 'Not authorized, no token provided' });
    }
};

const authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ message: `User role '${req.user.role}' is not authorized` });
        }
        next();
    };
};

module.exports = { protect, authorize };