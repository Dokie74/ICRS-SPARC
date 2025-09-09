// api/health.js - Vercel serverless health check
module.exports = async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const healthCheck = {
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'production',
      platform: 'vercel'
    }
  };

  // Check database connectivity
  try {
    const { createClient } = require('@supabase/supabase-js');
    if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
      const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
      await supabase.from('customers').select('count(*)', { count: 'exact', head: true });
      healthCheck.data.database = { status: 'connected' };
    } else {
      healthCheck.data.database = { status: 'not_configured' };
    }
  } catch (error) {
    healthCheck.data.database = { 
      status: 'error', 
      message: error.message 
    };
    healthCheck.success = false;
    healthCheck.data.status = 'unhealthy';
  }

  const statusCode = healthCheck.success ? 200 : 503;
  res.status(statusCode).json(healthCheck);
}