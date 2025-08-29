// tests/backend/api/routes/auth.test.js  
// Integration tests for Auth API routes
// Verifies proper integration with AuthService and middleware

const request = require('supertest');
const express = require('express');
const authRoutes = require('../../../../src/backend/api/routes/auth');

// Mock the AuthService
jest.mock('../../../../src/backend/services/auth/AuthService', () => ({
  login: jest.fn(),
  logout: jest.fn(), 
  getCurrentUser: jest.fn(),
  getUserProfile: jest.fn(),
  updatePassword: jest.fn(),
  resetPassword: jest.fn(),
  checkPermission: jest.fn(),
  getUserRole: jest.fn(),
  isAdmin: jest.fn(),
  isManager: jest.fn(),
  validateSession: jest.fn(),
  updateLastLogin: jest.fn(),
  updateUserProfile: jest.fn(),
  getAllUsers: jest.fn(),
  deactivateUser: jest.fn(),
  reactivateUser: jest.fn()
}));

// Mock middleware
jest.mock('../../../../src/backend/api/middleware/auth', () => ({
  authMiddleware: (req, res, next) => {
    req.user = { id: 'test-user-id', email: 'test@example.com' };
    req.accessToken = 'mock-token';
    next();
  },
  optionalAuthMiddleware: (req, res, next) => {
    req.user = { id: 'test-user-id', email: 'test@example.com' };
    req.accessToken = 'mock-token';
    next();
  }
}));

const authService = require('../../../../src/backend/services/auth/AuthService');

describe('Auth Routes', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/auth', authRoutes);
    
    // Reset mocks
    jest.clearAllMocks();
  });

  describe('POST /api/auth/login', () => {
    test('should handle successful login', async () => {
      const mockLoginResponse = {
        success: true,
        data: {
          user: { id: 'user-123', email: 'test@example.com' },
          session: { access_token: 'token-123', refresh_token: 'refresh-123' },
          profile: { role: 'admin', name: 'Test User' }
        }
      };

      authService.login.mockResolvedValue(mockLoginResponse);
      authService.updateLastLogin.mockResolvedValue({ success: true });

      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'password123' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('session');
      expect(authService.login).toHaveBeenCalledWith('test@example.com', 'password123');
      expect(authService.updateLastLogin).toHaveBeenCalled();
    });

    test('should handle login failure', async () => {
      authService.login.mockResolvedValue({
        success: false,
        error: 'Invalid credentials'
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'wrongpassword' });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid credentials');
    });
  });

  describe('POST /api/auth/logout', () => {
    test('should handle logout', async () => {
      authService.logout.mockResolvedValue({ success: true });

      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', 'Bearer mock-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(authService.logout).toHaveBeenCalledWith('mock-token');
    });
  });

  describe('GET /api/auth/me', () => {
    test('should return current user info', async () => {
      authService.getCurrentUser.mockResolvedValue({
        success: true,
        data: { 
          id: 'user-123', 
          email: 'test@example.com',
          created_at: '2024-01-01T00:00:00Z'
        }
      });

      authService.getUserProfile.mockResolvedValue({
        success: true,
        data: { role: 'admin', first_name: 'Test', last_name: 'User' }
      });

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer mock-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('email');
      expect(response.body.data).toHaveProperty('profile');
    });
  });

  describe('POST /api/auth/change-password', () => {
    test('should change password successfully', async () => {
      authService.getCurrentUser.mockResolvedValue({
        success: true,
        data: { id: 'user-123', email: 'test@example.com' }
      });

      authService.login.mockResolvedValue({ success: true });
      authService.updatePassword.mockResolvedValue({ success: true });

      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', 'Bearer mock-token')
        .send({ 
          current_password: 'currentpass', 
          new_password: 'newpassword123' 
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(authService.updatePassword).toHaveBeenCalledWith('newpassword123', 'mock-token');
    });

    test('should reject invalid current password', async () => {
      authService.getCurrentUser.mockResolvedValue({
        success: true,
        data: { id: 'user-123', email: 'test@example.com' }
      });

      authService.login.mockResolvedValue({ 
        success: false, 
        error: 'Invalid credentials' 
      });

      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', 'Bearer mock-token')
        .send({ 
          current_password: 'wrongpass', 
          new_password: 'newpassword123' 
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Current password is incorrect');
    });
  });

  describe('POST /api/auth/reset-password', () => {
    test('should request password reset', async () => {
      authService.resetPassword.mockResolvedValue({ success: true });

      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({ email: 'test@example.com' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toContain('reset link has been sent');
    });
  });

  describe('Permission and Role Routes', () => {
    test('should check user permissions', async () => {
      authService.checkPermission.mockResolvedValue({ 
        success: true, 
        data: true 
      });

      const response = await request(app)
        .get('/api/auth/check-permission/inventory.read')
        .set('Authorization', 'Bearer mock-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(authService.checkPermission).toHaveBeenCalledWith('inventory.read', 'mock-token');
    });

    test('should get user role', async () => {
      authService.getUserRole.mockResolvedValue({ 
        success: true, 
        data: 'manager' 
      });

      const response = await request(app)
        .get('/api/auth/user-role')
        .set('Authorization', 'Bearer mock-token');

      expect(response.status).toBe(200);
      expect(response.body.data).toBe('manager');
    });

    test('should check admin status', async () => {
      authService.isAdmin.mockResolvedValue({ 
        success: true, 
        data: true 
      });

      const response = await request(app)
        .get('/api/auth/is-admin')
        .set('Authorization', 'Bearer mock-token');

      expect(response.status).toBe(200);
      expect(response.body.data).toBe(true);
    });

    test('should check manager status', async () => {
      authService.isManager.mockResolvedValue({ 
        success: true, 
        data: true 
      });

      const response = await request(app)
        .get('/api/auth/is-manager')
        .set('Authorization', 'Bearer mock-token');

      expect(response.status).toBe(200);
      expect(response.body.data).toBe(true);
    });
  });

  describe('Admin Routes', () => {
    beforeEach(() => {
      // Mock admin access for admin-only routes
      authService.isAdmin.mockResolvedValue({ success: true, data: true });
    });

    test('should get all users (admin only)', async () => {
      const mockUsers = [
        { id: '1', email: 'user1@example.com', role: 'manager' },
        { id: '2', email: 'user2@example.com', role: 'warehouse_staff' }
      ];

      authService.getAllUsers.mockResolvedValue({
        success: true,
        data: mockUsers
      });

      const response = await request(app)
        .get('/api/auth/users')
        .set('Authorization', 'Bearer mock-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
    });

    test('should update user profile (admin only)', async () => {
      authService.updateUserProfile.mockResolvedValue({
        success: true,
        data: { id: 'user-123', first_name: 'Updated' }
      });

      const response = await request(app)
        .post('/api/auth/update-profile/user-123')
        .set('Authorization', 'Bearer mock-token')
        .send({ first_name: 'Updated', last_name: 'Name' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('should deactivate user (admin only)', async () => {
      authService.deactivateUser.mockResolvedValue({ success: true });

      const response = await request(app)
        .post('/api/auth/deactivate-user/user-123')
        .set('Authorization', 'Bearer mock-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('should reactivate user (admin only)', async () => {
      authService.reactivateUser.mockResolvedValue({ success: true });

      const response = await request(app)
        .post('/api/auth/reactivate-user/user-123')
        .set('Authorization', 'Bearer mock-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('Session Validation', () => {
    test('should validate session token', async () => {
      authService.validateSession.mockResolvedValue({
        success: true,
        data: { id: 'user-123', email: 'test@example.com' }
      });

      const response = await request(app)
        .get('/api/auth/validate-session')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(authService.validateSession).toHaveBeenCalledWith('valid-token');
    });

    test('should reject invalid session token', async () => {
      authService.validateSession.mockResolvedValue({
        success: false,
        error: 'Invalid token'
      });

      const response = await request(app)
        .get('/api/auth/validate-session')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Error Handling', () => {
    test('should handle missing required fields', async () => {
      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', 'Bearer mock-token')
        .send({ current_password: 'test' }); // missing new_password

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('required');
    });

    test('should handle missing authorization token', async () => {
      const response = await request(app)
        .get('/api/auth/validate-session');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('token required');
    });
  });
});