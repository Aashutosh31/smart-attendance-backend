const { createClient } = require('@supabase/supabase-js');
const User = require('../models/User');

// It's better practice to initialize Supabase once and export the client.
// Ensure your environment variables are correctly set in Vercel.
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Middleware to protect routes.
 * Verifies Supabase JWT from the Authorization header.
 * Attaches the corresponding MongoDB user document to req.user.
 */
const protect = async (req, res, next) => {
  let token;

  // Check for Bearer token in the Authorization header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Extract token from "Bearer <token>"
      token = req.headers.authorization.split(' ')[1];

      // Verify the token with Supabase
      const { data: { user }, error } = await supabase.auth.getUser(token);

      // Handle token verification errors or if no user is found for the token
      if (error || !user) {
        console.error('Supabase auth error:', error?.message || 'User not found for token');
        return res.status(401).json({ message: 'Not authorized, token failed or invalid' });
      }

      // Token is valid, find the user in your MongoDB database via the Supabase ID
      req.user = await User.findOne({ supabaseId: user.id }).select('-password'); // Exclude password from the user object

      // Handle case where user exists in Supabase but not in your local DB
      if (!req.user) {
        console.error(`User with Supabase ID ${user.id} not found in MongoDB.`);
        return res.status(401).json({ message: 'Not authorized, user not found in application database' });
      }

      // User is authenticated and found, proceed to the next middleware/controller
      next();

    } catch (error) {
      console.error('Critical error in protect middleware:', error);
      return res.status(500).json({ message: 'An internal server error occurred during authentication' });
    }
  } else {
    // **THE FIX**: This block handles requests that are missing the token.
    // It immediately sends a 401 response, preventing the timeout.
    return res.status(401).json({ message: 'Not authorized, no token provided' });
  }
};

/**
 * Middleware to authorize users based on their role.
 * Should be used *after* the `protect` middleware.
 */
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