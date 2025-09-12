// api/_handlers/auth-test.js - Test Supabase authentication directly
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

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      error: 'Email and password are required for testing'
    });
  }

  try {
    console.log('Testing Supabase auth with:', { email, passwordLength: password.length });
    
    // Test Supabase authentication
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    console.log('Supabase response:', {
      hasData: !!data,
      hasSession: !!(data && data.session),
      hasUser: !!(data && data.user),
      hasError: !!error,
      errorDetails: error ? {
        message: error.message,
        status: error.status,
        code: error.code,
        details: error.details
      } : null
    });

    // Return detailed response for debugging
    res.json({
      success: true,
      test_result: {
        supabase_response: {
          has_data: !!data,
          has_session: !!(data && data.session),
          has_user: !!(data && data.user),
          session_expires_at: data && data.session ? data.session.expires_at : null,
          user_id: data && data.user ? data.user.id : null,
          user_email: data && data.user ? data.user.email : null
        },
        supabase_error: error ? {
          message: error.message,
          status: error.status,
          code: error.code,
          details: error.details
        } : null,
        environment: {
          supabase_url: process.env.SUPABASE_URL?.substring(0, 30) + '...',
          has_anon_key: !!process.env.SUPABASE_ANON_KEY,
          anon_key_length: process.env.SUPABASE_ANON_KEY?.length
        }
      }
    });
  } catch (error) {
    console.error('Auth test error:', error);
    res.status(500).json({
      success: false,
      error: 'Authentication test failed',
      details: error.message
    });
  }
}