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
      
      // 1. Verify the token with Supabase to get the user's details
      const { data: { user: supabaseUser }, error } = await supabase.auth.getUser(token);
      
      if (error || !supabaseUser) {
        return res.status(401).json({ message: 'Not authorized, token is invalid.' });
      }

      // 2. Try to find the user in your MongoDB database
      let mongoUser = await User.findOne({ email: supabaseUser.email });
      
      // --- THE SMART FIX IS HERE ---
      // 3. If the user doesn't exist in MongoDB, create them now
      if (!mongoUser) {
        console.log(`User not found in MongoDB. Creating new user for: ${supabaseUser.email}`);
        
        // Generate a random, unusable password because Supabase is handling the actual login.
        // This is only to satisfy the 'required' constraint in your User model.
        const randomPassword = Math.random().toString(36).slice(-8);
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(randomPassword, salt);

        mongoUser = new User({
          // Supabase often stores the full name in user_metadata
          name: supabaseUser.user_metadata?.full_name || 'New User', 
          email: supabaseUser.email,
          password: hashedPassword,
          // Assign a default role. 'student' is a safe default for new sign-ups.
          role: 'student', 
        });
        await mongoUser.save();
        console.log(`Successfully created and saved new user: ${mongoUser.email}`);
      }
      
      // 4. Attach the user document (either found or newly created) to the request
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