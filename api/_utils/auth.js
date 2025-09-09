// api/_utils/auth.js - Authentication utilities for Vercel functions
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function verifyToken(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('No valid authorization token provided');
  }

  const token = authHeader.replace('Bearer ', '');
  
  try {
    const { data, error } = await supabase.auth.getUser(token);
    if (error) throw error;
    
    return {
      user: data.user,
      accessToken: token
    };
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
}

function requireAuth(handler) {
  return async (req, res) => {
    try {
      const auth = await verifyToken(req.headers.authorization);
      req.user = auth.user;
      req.accessToken = auth.accessToken;
      
      return handler(req, res);
    } catch (error) {
      res.status(401).json({
        success: false,
        message: error.message
      });
    }
  };
}

module.exports = { verifyToken, requireAuth };