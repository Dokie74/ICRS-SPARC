// api/_handlers/env-check.js - Environment diagnostic endpoint
const { setCorsHeaders, handleOptions } = require('../_utils/cors');

module.exports = async function handler(req, res) {
  // Handle CORS
  setCorsHeaders(res, req.headers.origin);
  if (handleOptions(req, res)) return;

  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: `Method ${req.method} not allowed`
    });
  }

  try {
    // Check environment variables (safely)
    const envCheck = {
      supabase_url: {
        exists: !!process.env.SUPABASE_URL,
        length: process.env.SUPABASE_URL ? process.env.SUPABASE_URL.length : 0,
        preview: process.env.SUPABASE_URL ? process.env.SUPABASE_URL.substring(0, 30) + '...' : 'NOT_SET'
      },
      supabase_anon_key: {
        exists: !!process.env.SUPABASE_ANON_KEY,
        length: process.env.SUPABASE_ANON_KEY ? process.env.SUPABASE_ANON_KEY.length : 0,
        preview: process.env.SUPABASE_ANON_KEY ? process.env.SUPABASE_ANON_KEY.substring(0, 20) + '...' : 'NOT_SET'
      },
      node_env: process.env.NODE_ENV || 'not_set',
      vercel_env: process.env.VERCEL_ENV || 'not_set',
      vercel_url: process.env.VERCEL_URL || 'not_set'
    };

    // Test Supabase client creation
    let clientTest = {
      creation: false,
      error: null
    };

    try {
      const { createClient } = require('@supabase/supabase-js');
      const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_ANON_KEY
      );
      clientTest.creation = true;
    } catch (error) {
      clientTest.error = error.message;
    }

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      environment: envCheck,
      supabase_client_test: clientTest,
      deployment: {
        vercel_env: process.env.VERCEL_ENV,
        vercel_url: process.env.VERCEL_URL,
        node_env: process.env.NODE_ENV
      }
    });
  } catch (error) {
    console.error('Environment check error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check environment',
      details: error.message
    });
  }
}