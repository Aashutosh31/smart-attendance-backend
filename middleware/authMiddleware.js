const { createClient } = require('@supabase/supabase-js');
const User = require('../models/User');
const bcrypt = require('bcryptjs');

// These are read from your Vercel Environment Variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("CRITICAL ERROR: Supabase variables are missing from the environment.");
}

const supabase = createClient(supabaseUrl, supabaseKey);

const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      
      const { data: { user: supabaseUser }, error } = await supabase.auth.getUser(token);
      
      if (error || !supabaseUser) {
        return res.status(401).json({ message: 'Not authorized, token is invalid.' });
      }

      let mongoUser = await User.findOne({ email: supabaseUser.email });
      
      // --- THE FIX IS HERE ---
      if (!mongoUser) {
        console.log(`User not found in MongoDB. Creating new user for: ${supabaseUser.email}`);
        
        const randomPassword = Math.random().toString(36).slice(-8);
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(randomPassword, salt);

        mongoUser = new User({
          name: supabaseUser.user_metadata?.full_name || 'New User', 
          email: supabaseUser.email,
          password: hashedPassword,
          // Fetch the role from Supabase metadata, defaulting to 'student' if not present
          role: supabaseUser.user_metadata?.role || 'student', 
        });
        await mongoUser.save();
        console.log(`Successfully created and saved new user: ${mongoUser.email} with role: ${mongoUser.role}`);
      }
      
      req.user = mongoUser;
      next();

    } catch (error) {
      console.error('Error in authentication middleware:', error);
      res.status(500).json({ message: 'An internal error occurred during authentication.' });
    }
  } else {
    res.status(401).json({ message: 'Not authorized, no token provided.' });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: `User role ${req.user.role} is not authorized for this resource.` 
      });
    }
    next();
  };
};

module.exports = { protect, authorize };