const jwt = require('jsonwebtoken');
const User = require('../models/User.js');
const { createClient } = require('@supabase/supabase-js');

const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            
            // CORRECT: Initialize Supabase client inside the function
            const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

            // Verify token with Supabase
            const { data: { user: supabaseUser }, error } = await supabase.auth.getUser(token);

            if (error) {
                return res.status(401).json({ message: 'Not authorized, token failed' });
            }

            if (supabaseUser) {
                // Find the user in your local MongoDB
                let mongoUser = await User.findOne({ email: supabaseUser.email });

                // If user doesn't exist in Mongo, create them
                if (!mongoUser) {
                    mongoUser = new User({
                        supabaseId: supabaseUser.id,
                        email: supabaseUser.email,
                        name: supabaseUser.user_metadata.name || supabaseUser.email,
                        role: supabaseUser.email.endsWith('.admin') ? 'admin' : 'student', 
                    });
                    await mongoUser.save();
                }
                
                req.user = { ...mongoUser.toObject(), ...supabaseUser };
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
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ message: `User role ${req.user.role} is not authorized to access this route` });
        }
        next();
    };
};

module.exports = { protect, authorize };