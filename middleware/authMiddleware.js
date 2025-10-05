const jwt = require('jsonwebtoken');
const User = require('../models/User.js');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];

            // Verify token with Supabase
            const { data: { user: supabaseUser }, error } = await supabase.auth.getUser(token);

            if (error) {
                return res.status(401).json({ message: 'Not authorized, token failed' });
            }

            if (supabaseUser) {
                // Check if user exists in your MongoDB
                let mongoUser = await User.findOne({ email: supabaseUser.email });

                if (!mongoUser) {
                    // --- THE FIX IS HERE ---
                    // If user doesn't exist, create them in MongoDB
                    // 1. Get the role from the Supabase user's app_metadata.
                    // 2. If the role isn't defined in metadata, default to 'student'.
                    const role = supabaseUser.app_metadata?.role || 'student';

                    mongoUser = new User({
                        supabaseId: supabaseUser.id,
                        email: supabaseUser.email,
                        name: supabaseUser.user_metadata.name || supabaseUser.email,
                        role: role, // Use the role from Supabase!
                    });
                    await mongoUser.save();
                }

                // Attach the combined user object (Mongo + Supabase) to the request
                req.user = { ...mongoUser.toObject(), id: mongoUser._id }; 
            }

            next();
        } catch (error) {
            console.error(error);
            res.status(401).json({ message: 'Not authorized, token failed' });
        }
    }

    if (!token) {
        res.status(401).json({ message: 'Not authorized, no token' });
    }
};

const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ message: `User role ${req.user.role} is not authorized to access this route` });
        }
        next();
    };
};

module.exports = { protect, authorize };