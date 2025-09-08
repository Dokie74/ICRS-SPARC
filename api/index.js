// api/index.js - Vercel serverless API documentation endpoint
const { setCorsHeaders, handleOptions } = require('./_utils/cors');

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

  res.json({
    success: true,
    data: {
      name: 'ICRS SPARC API',
      description: 'Foreign Trade Zone Operations API - Serverless on Vercel',
      version: '1.0.0',
      platform: 'vercel',
      endpoints: {
        auth: '/api/auth/login, /api/auth/refresh',
        dashboard: '/api/dashboard/stats',
        health: '/api/health'
      },
      features: [
        'Serverless Functions',
        'Row Level Security (RLS) integration', 
        'Foreign Trade Zone compliance',
        'Standardized response patterns'
      ]
    }
  });
}