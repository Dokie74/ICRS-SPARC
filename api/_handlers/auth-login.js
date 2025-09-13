// api/auth/login.js - Vercel serverless login endpoint
const { createClient } = require('@supabase/supabase-js');
const { setCorsHeaders, handleOptions } = require('../_utils/cors');

module.exports = async function handler(req, res) {
  // Handle CORS
  setCorsHeaders(res, req.headers.origin);
  if (handleOptions(req, res)) return;

  // Create Supabase client with ANON_KEY for user authentication
  // SERVICE_KEY should only be used for admin operations, not user login
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
  );

  // Check environment variables
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
    console.error('Missing Supabase environment variables:', {
      url: !!process.env.SUPABASE_URL,
      anon_key: !!process.env.SUPABASE_ANON_KEY
    });
    return res.status(500).json({
      success: false,
      error: 'Authentication service misconfigured'
    });
  }

  // Log basic configuration in development only
  if (process.env.NODE_ENV === 'development') {
    console.log('Supabase config:', {
      url: process.env.SUPABASE_URL?.substring(0, 30) + '...',
      using_anon_key: !!process.env.SUPABASE_ANON_KEY
    });
  }

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
        error: 'Invalid email or password',
        debug: {
          message: error.message,
          status: error.status,
          code: error.code || 'unknown'
        }
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