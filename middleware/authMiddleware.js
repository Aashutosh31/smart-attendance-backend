const { createClient } = require('@supabase/supabase-js');
const User = require('../models/User');

// Correctly initialize Supabase client for V2
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const protect = async (req, res, next) => {
  let token;

  // Check for Bearer token in headers
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];

      // Verify token with Supabase
      const { data: { user }, error } = await supabase.auth.getUser(token);

      if (error || !user) {
        return res.status(401).json({ message: 'Not authorized, token failed' });
      }

      // Find the user in *your* MongoDB via the Supabase ID
      req.user = await User.findOne({ supabaseId: user.id }).select('-password');

      if (!req.user) {
        return res.status(401).json({ message: 'Not authorized, user not found in database' });
      }

      next(); // Success: proceed to the next function
    } catch (error) {
      console.error('Auth Middleware Error:', error);
      return res.status(401).json({ message: 'Not authorized, token processing error' });
    }
  } else {
    // **THIS IS THE FIX FOR THE TIMEOUT**: If no token is present, reject immediately.
    return res.status(401).json({ message: 'Not authorized, no token provided' });
  }
};

const admin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: 'Forbidden: Admin access only' });
  }
};

const hod = (req, res, next) => {
  if (req.user && req.user.role === 'hod') {
    next();
  } else {
    res.status(403).json({ message: 'Forbidden: HOD access only' });
  }
};

const faculty = (req, res, next) => {
    if (req.user && req.user.role === 'faculty') {
      next();
    } else {
      res.status(403).json({ message: 'Forbidden: Faculty access only' });
    }
};

const student = (req, res, next) => {
    if (req.user && req.user.role === 'student') {
        next();
    } else {
        res.status(403).json({ message: 'Forbidden: Student access only' });
    }
};

module.exports = { protect, admin, hod, faculty, student };