// api/_utils/cors.js - CORS utility for Vercel functions
function setCorsHeaders(res, origin) {
  const allowedOrigins = [
    // Local development
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
    'https://localhost:3000',
    // Production domains
    'https://icrs-sparc.vercel.app',
    'https://icrs-sparc-david-okonoskis-projects.vercel.app',
    'https://icrs-sparc-git-main-david-okonoskis-projects.vercel.app',
    process.env.FRONTEND_URL,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null
  ].filter(Boolean);

  // In development, allow all origins for easier testing
  if (process.env.NODE_ENV === 'development') {
    res.setHeader('Access-Control-Allow-Origin', '*');
  } else {
    // In production, only allow specific origins
    const corsOrigin = allowedOrigins.includes(origin) ? origin : allowedOrigins[0];
    res.setHeader('Access-Control-Allow-Origin', corsOrigin);
  }

  // Standard CORS headers
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  // Security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  // Content Security Policy for API responses
  if (process.env.NODE_ENV === 'production') {
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'none'; frame-ancestors 'none';"
    );
  }
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