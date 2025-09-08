// api/_utils/cors.js - CORS utility for Vercel functions
function setCorsHeaders(res, origin) {
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001', 
    'http://localhost:3002',
    'https://localhost:3000',
    process.env.FRONTEND_URL,
    // Add your Vercel deployment URLs here
  ].filter(Boolean);

  const corsOrigin = process.env.NODE_ENV === 'development' 
    ? '*' 
    : (allowedOrigins.includes(origin) ? origin : allowedOrigins[0]);

  res.setHeader('Access-Control-Allow-Origin', corsOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
}

function handleOptions(req, res) {
  if (req.method === 'OPTIONS') {
    setCorsHeaders(res, req.headers.origin);
    res.status(200).end();
    return true;
  }
  return false;
}

module.exports = { setCorsHeaders, handleOptions };