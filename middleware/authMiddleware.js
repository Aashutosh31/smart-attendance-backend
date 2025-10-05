// middleware/authMiddleware.js
const { createClient } = require('@supabase/supabase-js');
const User = require('../models/User');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Supabase URL or Key is missing. Check your .env file.");
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
      
      const { data: { user: supabaseUser }, error } = await supabase.auth.getUser(token);
      
      if (error || !supabaseUser) {
        return res.status(401).json({ message: 'Not authorized, token failed' });
      }

      // --- THE FIX IS HERE ---
      // Find the user in our MongoDB by their email from Supabase
      const mongoUser = await User.findOne({ email: supabaseUser.email });
      
      if (!mongoUser) {
        return res.status(401).json({ message: 'User not found in local database' });
      }
      
      // Attach the full Mongoose user document to the request object
      req.user = mongoUser;
      
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
      return res.status(403).json({ 
        message: `User role ${req.user ? req.user.role : 'unknown'} is not authorized to access this route` 
      });
    }
    next();
  };
};

module.exports = { protect, authorize };