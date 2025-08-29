// src/backend/api/routes/demo.js
// Demo route for testing UI without authentication
// REMOVE IN PRODUCTION

const express = require('express');
const { asyncHandler } = require('../middleware/error-handler');

const router = express.Router();

/**
 * GET /api/demo/bypass-auth
 * Temporary route to test frontend without authentication
 * Returns mock user session for UI testing
 */
router.post('/bypass-auth', asyncHandler(async (req, res) => {
  // Mock user data for testing
  const mockUser = {
    id: 'demo-user-123',
    email: 'demo@icrs.com',
    user_metadata: {
      full_name: 'Demo User',
      role: 'admin'
    }
  };

  const mockSession = {
    access_token: 'demo-token-for-testing-only',
    token_type: 'bearer',
    expires_in: 3600,
    refresh_token: 'demo-refresh-token',
    user: mockUser
  };

  res.json({
    success: true,
    data: {
      user: mockUser,
      session: mockSession,
      profile: {
        id: mockUser.id,
        email: mockUser.email,
        full_name: mockUser.user_metadata.full_name,
        role: mockUser.user_metadata.role,
        permissions: ['read', 'write', 'admin']
      }
    }
  });
}));

/**
 * GET /api/demo/sample-data
 * Returns sample data for testing UI components
 */
router.get('/sample-data', asyncHandler(async (req, res) => {
  const sampleData = {
    customers: [
      { id: 1, name: 'Demo Customer 1', code: 'CUST001', active: true },
      { id: 2, name: 'Demo Customer 2', code: 'CUST002', active: true }
    ],
    parts: [
      { id: 1, part_number: 'PART001', description: 'Demo Part 1', active: true },
      { id: 2, part_number: 'PART002', description: 'Demo Part 2', active: true }
    ],
    inventory: [
      { id: 1, part_id: 1, quantity: 100, location: 'A1-01', status: 'available' },
      { id: 2, part_id: 2, quantity: 50, location: 'A1-02', status: 'available' }
    ]
  };

  res.json({
    success: true,
    data: sampleData
  });
}));

module.exports = router;