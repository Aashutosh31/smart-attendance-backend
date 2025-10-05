const { createClient } = require('@supabase/supabase-js');
const User = require('../models/User');

// IMPORTANT: Make sure these variables are in your backend's .env file
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("CRITICAL ERROR: Supabase URL or Key is missing in the backend .env file.");
}

const supabase = createClient(supabaseUrl, supabaseKey);

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];
      
      // 1. Use Supabase's own function to verify the token and get the user
      const { data: { user: supabaseUser }, error } = await supabase.auth.getUser(token);
      
      if (error || !supabaseUser) {
        // This will correctly handle invalid or expired Supabase tokens
        return res.status(401).json({ message: 'Not authorized, token is invalid or expired.' });
      }

      // 2. Find the corresponding user in your MongoDB database using their email
      const mongoUser = await User.findOne({ email: supabaseUser.email });
      
      if (!mongoUser) {
        // This is the error you are seeing. It means the user exists in Supabase
        // but their record is missing from your MongoDB 'users' collection.
        // Ensure you have created the faculty/user in your system's admin panel.
        return res.status(401).json({ message: `User with email ${supabaseUser.email} not found in local database.` });
      }
      
      // 3. Attach the full, correct user document from MongoDB to the request
      req.user = mongoUser;
      
      next();
    } catch (error) {
      console.error('Error in authentication middleware:', error);
      res.status(401).json({ message: 'Not authorized, an unexpected error occurred.' });
    }
  } else {
    res.status(401).json({ message: 'Not authorized, no token provided.' });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: `User role ${req.user ? req.user.role : 'unknown'} is not authorized to access this route.` 
      });
    }
    next();
  };
};  

module.exports = { protect, authorize };   