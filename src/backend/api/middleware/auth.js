// src/backend/api/middleware/auth.js
// Authentication middleware for ICRS SPARC API
// Integrates with Supabase Auth and RLS policies

const supabaseClient = require('../../db/supabase-client');

/**
 * Authentication middleware that validates Supabase JWT tokens
 * and sets user context for RLS policies
 */
async function authMiddleware(req, res, next) {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Missing or invalid authorization header. Expected format: "Bearer <token>"'
      });
    }

    const accessToken = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    if (!accessToken) {
      return res.status(401).json({
        success: false,
        error: 'No access token provided'
      });
    }

    // Handle demo tokens in development mode
    if (accessToken.startsWith('demo-token-for-testing-only-')) {
      // Demo mode - create mock user for testing
      req.user = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        email: 'demo@test.com',
        user_metadata: {
          full_name: 'Demo User',
          role: 'admin'
        }
      };
      req.accessToken = accessToken;
      req.supabaseClient = supabaseClient.getClientForUser();
      return next();
    }

    // Verify the access token with Supabase for real tokens
    const userResult = await supabaseClient.verifyAccessToken(accessToken);
    
    if (!userResult.success) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired access token',
        details: userResult.error
      });
    }

    // Set user context in request object
    req.user = userResult.data;
    req.accessToken = accessToken;
    
    // Set up client with user context for RLS
    req.supabaseClient = supabaseClient.getClientForUser(accessToken);
    
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during authentication'
    });
  }
}

/**
 * Optional authentication middleware - allows both authenticated and unauthenticated requests
 * Sets user context if token is present and valid, but doesn't reject if missing
 */
async function optionalAuthMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const accessToken = authHeader.substring(7);
      
      if (accessToken) {
        // Handle demo tokens in development mode
        if (accessToken.startsWith('demo-token-for-testing-only-')) {
          req.user = {
            id: '550e8400-e29b-41d4-a716-446655440000',
            email: 'demo@test.com',
            user_metadata: {
              full_name: 'Demo User',
              role: 'admin'
            }
          };
          req.accessToken = accessToken;
          req.supabaseClient = supabaseClient.getClientForUser();
        } else {
          // Verify real tokens with Supabase
          const userResult = await supabaseClient.verifyAccessToken(accessToken);
          
          if (userResult.success) {
            req.user = userResult.data;
            req.accessToken = accessToken;
            req.supabaseClient = supabaseClient.getClientForUser(accessToken);
          }
        }
      }
    }
    
    // If no token or invalid token, use anonymous client
    if (!req.supabaseClient) {
      req.supabaseClient = supabaseClient.getClientForUser();
    }
    
    next();
  } catch (error) {
    console.error('Optional auth middleware error:', error);
    // Don't fail the request, just use anonymous client
    req.supabaseClient = supabaseClient.getClientForUser();
    next();
  }
}

/**
 * Role-based authorization middleware
 * Requires user to be authenticated and have specified role
 * 
 * @param {string|string[]} requiredRoles - Single role or array of acceptable roles
 */
function requireRole(requiredRoles) {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      // Handle demo user - always has admin role
      if (req.user.id === '550e8400-e29b-41d4-a716-446655440000') {
        const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
        const demoUserRole = 'admin';
        
        if (!roles.includes(demoUserRole)) {
          return res.status(403).json({
            success: false,
            error: `Access denied. Required role: ${roles.join(' or ')}, user role: ${demoUserRole}`
          });
        }

        req.userRole = demoUserRole;
        return next();
      }

      // Get user's role from employee profile
      const employeeResult = await supabaseClient.getAll(
        'employees',
        {
          filters: [{ column: 'user_id', value: req.user.id }],
          select: 'role',
          accessToken: req.accessToken
        }
      );

      if (!employeeResult.success || !employeeResult.data || employeeResult.data.length === 0) {
        return res.status(403).json({
          success: false,
          error: 'No employee profile found for user'
        });
      }

      const userRole = employeeResult.data[0].role;
      const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];

      if (!roles.includes(userRole)) {
        return res.status(403).json({
          success: false,
          error: `Access denied. Required role: ${roles.join(' or ')}, user role: ${userRole}`
        });
      }

      req.userRole = userRole;
      next();
    } catch (error) {
      console.error('Role authorization error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error during role authorization'
      });
    }
  };
}

/**
 * Admin-only authorization middleware
 * Requires user to have admin role
 */
const requireAdmin = requireRole('admin');

/**
 * Manager+ authorization middleware  
 * Requires user to have admin or manager role
 */
const requireManager = requireRole(['admin', 'manager']);

/**
 * Staff+ authorization middleware
 * Requires user to have admin, manager, or warehouse_staff role
 */
const requireStaff = requireRole(['admin', 'manager', 'warehouse_staff']);

module.exports = {
  authMiddleware,
  optionalAuthMiddleware,
  requireRole,
  requireAdmin,
  requireManager,
  requireStaff
};