const { createClient } = require('@supabase/supabase-js');
const User = require('../models/User');

// Correctly initialize the Supabase client using createClient
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Middleware to protect routes by verifying a Supabase JWT.
 */
const protect = async (req, res, next) => {
  let token;

  // Check for a token in the Authorization header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Extract the token from the "Bearer <token>" string
      token = req.headers.authorization.split(' ')[1];

      // Verify the token with Supabase
      const { data: { user }, error } = await supabase.auth.getUser(token);

      // If Supabase returns an error or no user, the token is invalid
      if (error || !user) {
        return res.status(401).json({ message: 'Not authorized, token failed or is invalid' });
      }

      // **Important Fix**: Look up the user in MongoDB using their Supabase ID, not the Mongo _id
      req.user = await User.findOne({ supabaseId: user.id }).select('-password');

      // If the user exists in Supabase but not in your local database
      if (!req.user) {
        return res.status(401).json({ message: 'Not authorized, user not found in application' });
      }

      // If everything is successful, proceed to the protected route
      next();

    } catch (error) {
      console.error('Authentication error:', error);
      return res.status(401).json({ message: 'Not authorized, token processing failed' });
    }
  } else {
    // **THE CRITICAL FIX**: This block runs if no 'Authorization' header is found.
    // It immediately sends a 401 Unauthorized response, preventing the timeout crash.
    return res.status(401).json({ message: 'Not authorized, no token provided' });
  }
};


// --- Role-based authorization middleware (No changes needed here) ---

const admin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: 'Forbidden: Access is restricted to administrators' });
  }
};

const hod = (req, res, next) => {
  if (req.user && req.user.role === 'hod') {
    next();
  } else {
    res.status(403).json({ message: 'Forbidden: Access is restricted to HODs' });
  }
};

const faculty = (req, res, next) => {
    if (req.user && req.user.role === 'faculty') {
      next();
    } else {
      res.status(403).json({ message: 'Forbidden: Access is restricted to faculty' });
    }
  };

const student = (req, res, next) => {
    if (req.user && req.user.role === 'student') {
        next();
    } else {
        res.status(403).json({ message: 'Forbidden: Access is restricted to students' });
    }
};

module.exports = { protect, admin, hod, faculty, student };