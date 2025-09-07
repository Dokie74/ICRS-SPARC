// src/backend/api/routes/auth.js
// Authentication routes for ICRS SPARC API - Foreign Trade Zone operations
// Integrates with Supabase Auth and AuthService for comprehensive auth management

const express = require('express');
const { asyncHandler } = require('../middleware/error-handler');
const { authMiddleware, optionalAuthMiddleware } = require('../middleware/auth');
const supabaseClient = require('../../db/supabase-client');
const authService = require('../../services/auth/AuthService');

const router = express.Router();

/**
 * POST /api/auth/login
 * Authenticate user with email and password
 * Includes profile fetching and last login tracking for FTZ operations
 */
router.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Basic validation
  if (!email || !password) {
    return res.status(400).json({
      success: false,
      error: 'Email and password are required'
    });
  }

  try {
    // Use Supabase authentication for all users
    const { data, error } = await supabaseClient.anonClient.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      console.error('Supabase auth error:', error);
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
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
}));

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 */
router.post('/refresh', asyncHandler(async (req, res) => {
  const { refresh_token } = req.body;

  if (!refresh_token) {
    return res.status(400).json({
      success: false,
      error: 'Refresh token is required'
    });
  }


  try {
    const { data, error } = await supabaseClient.anonClient.auth.refreshSession({
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
}));

/**
 * POST /api/auth/logout
 * Sign out user and invalidate session
 * Maintains audit trail for FTZ compliance
 */
router.post('/logout', optionalAuthMiddleware, asyncHandler(async (req, res) => {
  const result = await authService.logout(req.accessToken);

  // Always return success for logout (even if token was already invalid)
  res.json({
    success: true,
    data: { message: result.success ? 'Successfully logged out' : 'Logged out (session may have been expired)' }
  });
}));

/**
 * GET /api/auth/me
 * Get current user information with profile data
 * Critical for role-based UI rendering in FTZ operations
 */
router.get('/me', authMiddleware, asyncHandler(async (req, res) => {
  // Auth middleware has already validated the user and set req.user
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
  }

  // Use the auth service for profile fetching
  try {
    const profileResult = await authService.getUserProfile(req.user.id, {
      accessToken: req.accessToken
    });

    res.json({
      success: true,
      data: {
        id: req.user.id,
        email: req.user.email,
        email_confirmed: req.user.email_confirmed_at !== null,
        last_sign_in: req.user.last_sign_in_at,
        created_at: req.user.created_at,
        profile: profileResult.success ? profileResult.data : null
      }
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    // Return basic user info if profile fetch fails
    res.json({
      success: true,
      data: {
        id: req.user.id,
        email: req.user.email,
        email_confirmed: req.user.email_confirmed_at !== null,
        last_sign_in: req.user.last_sign_in_at,
        created_at: req.user.created_at,
        profile: null
      }
    });
  }
}));

/**
 * POST /api/auth/change-password
 * Change user password with current password verification
 * Maintains security audit for FTZ access control
 */
router.post('/change-password', authMiddleware, asyncHandler(async (req, res) => {
  const { current_password, new_password } = req.body;

  if (!current_password || !new_password) {
    return res.status(400).json({
      success: false,
      error: 'Current password and new password are required'
    });
  }

  // Verify current password by re-authenticating
  const userResult = await authService.getCurrentUser(req.accessToken);
  if (!userResult.success || !userResult.data?.email) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
  }

  const verifyResult = await authService.login(userResult.data.email, current_password);
  if (!verifyResult.success) {
    return res.status(400).json({
      success: false,
      error: 'Current password is incorrect'
    });
  }

  // Update password using AuthService
  const updateResult = await authService.updatePassword(new_password, req.accessToken);
  
  if (!updateResult.success) {
    return res.status(400).json(updateResult);
  }

  res.json({
    success: true,
    data: { message: 'Password updated successfully' }
  });
}));

/**
 * POST /api/auth/reset-password
 * Request password reset via email
 */
router.post('/reset-password', asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({
      success: false,
      error: 'Email is required'
    });
  }

  const result = await authService.resetPassword(email);
  
  // Always return success for security (don't reveal if email exists)
  res.json({
    success: true,
    data: { message: 'If the email exists, a password reset link has been sent' }
  });
}));

/**
 * GET /api/auth/check-permission
 * Check if user has specific permission
 * Critical for FTZ operational access control
 */
router.get('/check-permission/:permission', authMiddleware, asyncHandler(async (req, res) => {
  const { permission } = req.params;

  if (!permission) {
    return res.status(400).json({
      success: false,
      error: 'Permission parameter is required'
    });
  }

  const result = await authService.checkPermission(permission, req.accessToken);
  
  res.json(result);
}));

/**
 * GET /api/auth/user-role
 * Get user's role for authorization decisions
 */
router.get('/user-role', authMiddleware, asyncHandler(async (req, res) => {
  const result = await authService.getUserRole(req.accessToken);
  res.json(result);
}));

/**
 * GET /api/auth/is-admin
 * Check if user has admin privileges
 */
router.get('/is-admin', authMiddleware, asyncHandler(async (req, res) => {
  const result = await authService.isAdmin(req.accessToken);
  res.json(result);
}));

/**
 * GET /api/auth/is-manager
 * Check if user has manager level access
 */
router.get('/is-manager', authMiddleware, asyncHandler(async (req, res) => {
  const result = await authService.isManager(req.accessToken);
  res.json(result);
}));

/**
 * GET /api/auth/validate-session
 * Validate session token
 */
router.get('/validate-session', asyncHandler(async (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Authorization token required'
    });
  }

  const result = await authService.validateSession(token);
  
  if (!result.success) {
    return res.status(401).json(result);
  }

  res.json(result);
}));

/**
 * POST /api/auth/update-profile
 * Update user profile information
 * Admin only - for employee profile management
 */
router.post('/update-profile/:userId', authMiddleware, asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const profileData = req.body;

  // Check if user has admin access for profile updates
  const isAdminResult = await authService.isAdmin(req.accessToken);
  if (!isAdminResult.success || !isAdminResult.data) {
    return res.status(403).json({
      success: false,
      error: 'Admin access required for profile updates'
    });
  }

  const result = await authService.updateUserProfile(userId, profileData, {
    accessToken: req.accessToken,
    userId: req.user?.id
  });

  res.json(result);
}));

/**
 * GET /api/auth/users
 * Get all users (admin only)
 * For user management in FTZ operations
 */
router.get('/users', authMiddleware, asyncHandler(async (req, res) => {
  // Check admin access
  const isAdminResult = await authService.isAdmin(req.accessToken);
  if (!isAdminResult.success || !isAdminResult.data) {
    return res.status(403).json({
      success: false,
      error: 'Admin access required'
    });
  }

  const { page = 1, limit = 50, active = true } = req.query;
  
  const options = {
    accessToken: req.accessToken,
    limit: parseInt(limit),
    offset: (parseInt(page) - 1) * parseInt(limit)
  };

  if (active !== undefined) {
    options.filters = [];
  }

  const result = await authService.getAllUsers(options);
  res.json(result);
}));

/**
 * POST /api/auth/deactivate-user/:userId
 * Deactivate user account (admin only)
 */
router.post('/deactivate-user/:userId', authMiddleware, asyncHandler(async (req, res) => {
  const { userId } = req.params;

  // Check admin access
  const isAdminResult = await authService.isAdmin(req.accessToken);
  if (!isAdminResult.success || !isAdminResult.data) {
    return res.status(403).json({
      success: false,
      error: 'Admin access required'
    });
  }

  const result = await authService.deactivateUser(userId, {
    accessToken: req.accessToken,
    userId: req.user?.id
  });

  res.json(result);
}));

/**
 * POST /api/auth/reactivate-user/:userId
 * Reactivate user account (admin only)
 */
router.post('/reactivate-user/:userId', authMiddleware, asyncHandler(async (req, res) => {
  const { userId } = req.params;

  // Check admin access
  const isAdminResult = await authService.isAdmin(req.accessToken);
  if (!isAdminResult.success || !isAdminResult.data) {
    return res.status(403).json({
      success: false,
      error: 'Admin access required'
    });
  }

  const result = await authService.reactivateUser(userId, {
    accessToken: req.accessToken,
    userId: req.user?.id
  });

  res.json(result);
}));

module.exports = router;