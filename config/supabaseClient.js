const { createClient } = require('@supabase/supabase-js');

// Ensure your Vercel project has these environment variables set
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL and Anon Key must be provided.');
}

// Correctly initialize Supabase client using createClient for v2
const supabase = createClient(supabaseUrl, supabaseAnonKey);

module.exports = supabase;