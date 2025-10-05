const { createClient } = require('@supabase/supabase-js');
const User = require('../models/User');

// These are read from the Vercel Environment Variables you just set
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("CRITICAL ERROR: Supabase variables are missing from Vercel environment.");
}

const supabase = createClient(supabaseUrl, supabaseKey);

const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      
      // 1. Use Supabase to verify the token from the frontend
      const { data: { user: supabaseUser }, error } = await supabase.auth.getUser(token);
      
      if (error || !supabaseUser) {
        return res.status(401).json({ message: 'Not authorized, token is invalid.' });
      }

      // 2. Find the matching user in your MongoDB database via email
      const mongoUser = await User.findOne({ email: supabaseUser.email });
      
      if (!mongoUser) {
        return res.status(401).json({ message: `User not found in local database.` });
      }
      
      // 3. Attach the correct user from MongoDB to the request
      req.user = mongoUser;
      next();
    } catch (error) {
      console.error('Error in auth middleware:', error);
      res.status(401).json({ message: 'Not authorized.' });
    }
  } else {
    res.status(401).json({ message: 'Not authorized, no token.' });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: `User role is not authorized.` });
    }
    next();
  };
};

module.exports = { protect, authorize };