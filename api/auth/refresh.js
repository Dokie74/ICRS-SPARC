// api/auth/refresh.js - Vercel serverless token refresh endpoint
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

  const { refresh_token } = req.body;

  if (!refresh_token) {
    return res.status(400).json({
      success: false,
      error: 'Refresh token is required'
    });
  }

  try {
    const { data, error } = await supabase.auth.refreshSession({
      refresh_token
    });

    if (error) throw error;

    res.json({
      success: true,
      data: {
        session: {
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
          expires_at: data.session.expires_at,
          expires_in: data.session.expires_in
        }
      }
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(401).json({
      success: false,
      error: 'Invalid or expired refresh token'
    });
  }
}