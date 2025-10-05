const User = require('../models/User.js');
const { createClient } = require('@supabase/supabase-js');

const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // Get token from header
            token = req.headers.authorization.split(' ')[1];

            // Verify token with Supabase
            const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
            const { data: { user: supabaseUser }, error } = await supabase.auth.getUser(token);

            if (error || !supabaseUser) {
                return res.status(401).json({ message: 'Not authorized, token failed' });
            }

            // Find user in MongoDB, or create if it doesn't exist
            let mongoUser = await User.findOne({ email: supabaseUser.email });

            if (!mongoUser) {
                const role = supabaseUser.app_metadata?.role || 'student';
                mongoUser = new User({
                    supabaseId: supabaseUser.id,
                    email: supabaseUser.email,
                    name: supabaseUser.user_metadata.name || supabaseUser.email,
                    role: role,
                });
                await mongoUser.save();
            }

            // Attach user to the request object
            req.user = mongoUser;
            next();
        } catch (error) {
            console.error(error);
            return res.status(401).json({ message: 'Not authorized, token processing error' });
        }
    } else {
        // If no token is present in the header
        return res.status(401).json({ message: 'Not authorized, no token' });
    }
};

const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({
                message: `User role '${req.user ? req.user.role : 'guest'}' is not authorized to access this route`
            });
        }
        next();
    };
};

module.exports = { protect, authorize };