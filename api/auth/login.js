// api/auth/login.js - Vercel serverless login endpoint
const { createClient } = require('@supabase/supabase-js');
const { setCorsHeaders, handleOptions } = require('../_utils/cors');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

module.exports = async function handler(req, res) {
  // Handle CORS
  setCorsHeaders(res, req.headers.origin);
  if (handleOptions(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: `Method ${req.method} not allowed`
    });
  }

  const { email, password } = req.body;

  // Basic validation
  if (!email || !password) {
    return res.status(400).json({
      success: false,
      error: 'Email and password are required'
    });
  }

  try {
    // Use Supabase authentication
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      console.error('Supabase auth error:', error);
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    if (!data.session || !data.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication failed - no session created'
      });
    }

    // Successful authentication
    res.json({
      success: true,
      data: {
        user: data.user,
        session: {
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
          expires_at: data.session.expires_at,
          expires_in: data.session.expires_in
        }
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Authentication service unavailable'
    });
  }
}