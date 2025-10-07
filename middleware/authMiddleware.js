const { createClient } = require('@supabase/supabase-js');
const User = require('../models/User');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];

      // Verify token with Supabase
      const { data: { user }, error } = await supabase.auth.getUser(token);

      if (error || !user) {
        // This handles invalid or expired tokens
        return res.status(401).json({ message: 'Not authorized, token failed' });
      }

      // Find user in MongoDB
      req.user = await User.findOne({ supabaseId: user.id }).select('-password');
      
      if (!req.user) {
        return res.status(401).json({ message: 'Not authorized, user not found' });
      }

      next();
    } catch (error) {
      console.error('Error in auth middleware:', error);
      return res.status(401).json({ message: 'Not authorized, token processing error' });
    }
  } else {
    // **THE FIX**: This block handles requests MISSING a token, preventing a timeout.
    return res.status(401).json({ message: 'Not authorized, no token provided' });
  }
};

// --- Role-based authorization middleware (no changes needed here) ---
const admin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') next();
  else res.status(403).json({ message: 'Forbidden: Admin access required' });
};
const hod = (req, res, next) => {
  if (req.user && (req.user.role === 'hod' || req.user.role === 'admin')) next();
  else res.status(403).json({ message: 'Forbidden: HOD access required' });
};
const faculty = (req, res, next) => {
    if (req.user && (req.user.role === 'faculty' || req.user.role === 'admin')) next();
    else res.status(403).json({ message: 'Forbidden: Faculty access required' });
};
const student = (req, res, next) => {
    if (req.user && (req.user.role === 'student' || req.user.role === 'admin')) next();
    else res.status(403).json({ message: 'Forbidden: Student access required' });
};

module.exports = { protect, admin, hod, faculty, student };