// tests/helpers/authHelper.js
// Authentication helper utilities for testing JWT tokens and user sessions

const jwt = require('jsonwebtoken');

class AuthHelper {
  constructor() {
    this.testSecret = process.env.JWT_TEST_SECRET || 'test-jwt-secret-key-for-testing-only';
    this.defaultExpiry = '24h';
  }

  /**
   * Generate test JWT tokens for different user roles and scenarios
   */
  async generateTestTokens(testData) {
    const tokens = {};

    // Warehouse staff token
    tokens.warehouseStaff = this.generateToken({
      id: testData.testUser.id,
      email: testData.testUser.email,
      role: 'warehouse_staff',
      permissions: ['inventory.read', 'inventory.write', 'preadmissions.read', 'preadmissions.write']
    });

    // Supervisor token
    tokens.supervisor = this.generateToken({
      id: testData.testUser.id + '-supervisor',
      email: 'supervisor@test.com',
      role: 'supervisor',
      permissions: ['inventory.read', 'inventory.write', 'inventory.void', 'preadmissions.read', 'preadmissions.write', 'reports.read']
    });

    // Admin token
    tokens.admin = this.generateToken({
      id: testData.testUser.id + '-admin',
      email: 'admin@test.com',
      role: 'admin',
      permissions: ['*'] // All permissions
    });

    // Read-only user token
    tokens.readOnlyUser = this.generateToken({
      id: testData.testUser.id + '-readonly',
      email: 'readonly@test.com',
      role: 'viewer',
      permissions: ['inventory.read', 'preadmissions.read', 'reports.read']
    });

    // Customer-restricted user token
    tokens.customerRestrictedUser = this.generateToken({
      id: testData.testUser.id + '-restricted',
      email: 'restricted@test.com',
      role: 'warehouse_staff',
      permissions: ['inventory.read', 'preadmissions.read'],
      customerRestrictions: [testData.testCustomer.id]
    });

    // Restricted user with minimal permissions
    tokens.restrictedUser = this.generateToken({
      id: testData.testUser.id + '-minimal',
      email: 'minimal@test.com',
      role: 'limited_user',
      permissions: ['dashboard.read']
    });

    return tokens;
  }

  /**
   * Generate a JWT token with specified payload
   */
  generateToken(payload, options = {}) {
    const defaultPayload = {
      iss: 'icrs-sparc-test',
      aud: 'icrs-sparc-app',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
    };

    const tokenPayload = {
      ...defaultPayload,
      ...payload
    };

    const tokenOptions = {
      algorithm: 'HS256',
      ...options
    };

    return jwt.sign(tokenPayload, this.testSecret, tokenOptions);
  }

  /**
   * Generate an expired token for testing token validation
   */
  generateExpiredToken(payload = {}) {
    const expiredPayload = {
      id: 'test-user-expired',
      email: 'expired@test.com',
      role: 'warehouse_staff',
      iat: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
      exp: Math.floor(Date.now() / 1000) - 1800, // Expired 30 minutes ago
      ...payload
    };

    return jwt.sign(expiredPayload, this.testSecret, { algorithm: 'HS256' });
  }

  /**
   * Generate a token with invalid signature
   */
  generateInvalidSignatureToken(payload = {}) {
    const tokenPayload = {
      id: 'test-user-invalid',
      email: 'invalid@test.com',
      role: 'warehouse_staff',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
      ...payload
    };

    return jwt.sign(tokenPayload, 'wrong-secret-key', { algorithm: 'HS256' });
  }

  /**
   * Generate a malformed token
   */
  generateMalformedToken() {
    return 'this.is.not.a.valid.jwt.token.format';
  }

  /**
   * Verify a token (for testing purposes)
   */
  verifyToken(token) {
    try {
      return jwt.verify(token, this.testSecret);
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * Decode token without verification (for inspection)
   */
  decodeToken(token) {
    return jwt.decode(token, { complete: true });
  }

  /**
   * Generate session data for testing
   */
  generateSessionData(userPayload) {
    return {
      user: {
        id: userPayload.id,
        email: userPayload.email,
        role: userPayload.role
      },
      session: {
        access_token: this.generateToken(userPayload),
        token_type: 'Bearer',
        expires_in: 86400, // 24 hours
        expires_at: Math.floor(Date.now() / 1000) + 86400,
        refresh_token: this.generateRefreshToken(userPayload.id)
      },
      profile: {
        id: userPayload.id,
        employee_number: `EMP${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
        first_name: userPayload.email.split('@')[0],
        last_name: 'TestUser',
        role: userPayload.role,
        permissions: userPayload.permissions || [],
        active: true
      }
    };
  }

  /**
   * Generate refresh token
   */
  generateRefreshToken(userId) {
    return this.generateToken({
      id: userId,
      type: 'refresh',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) // 7 days
    });
  }

  /**
   * Generate tokens for different permission scenarios
   */
  generatePermissionTestTokens() {
    return {
      // Full inventory permissions
      inventoryFullAccess: this.generateToken({
        id: 'inv-full-user',
        email: 'inventory-full@test.com',
        role: 'warehouse_staff',
        permissions: [
          'inventory.read',
          'inventory.write',
          'inventory.adjust',
          'inventory.void',
          'inventory.transfer'
        ]
      }),

      // Read-only inventory permissions
      inventoryReadOnly: this.generateToken({
        id: 'inv-read-user',
        email: 'inventory-read@test.com',
        role: 'viewer',
        permissions: ['inventory.read']
      }),

      // Preadmission permissions
      preadmissionAccess: this.generateToken({
        id: 'pre-user',
        email: 'preadmission@test.com',
        role: 'warehouse_staff',
        permissions: [
          'preadmissions.read',
          'preadmissions.write',
          'preadmissions.process'
        ]
      }),

      // Reports access
      reportsAccess: this.generateToken({
        id: 'reports-user',
        email: 'reports@test.com',
        role: 'manager',
        permissions: [
          'reports.read',
          'reports.export',
          'analytics.read'
        ]
      }),

      // Admin access
      adminAccess: this.generateToken({
        id: 'admin-user',
        email: 'admin@test.com',
        role: 'admin',
        permissions: ['*']
      }),

      // No permissions
      noPermissions: this.generateToken({
        id: 'no-perm-user',
        email: 'noperm@test.com',
        role: 'guest',
        permissions: []
      })
    };
  }

  /**
   * Create auth headers for HTTP requests
   */
  createAuthHeaders(token) {
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }

  /**
   * Create auth headers with additional headers
   */
  createAuthHeadersWithExtras(token, extraHeaders = {}) {
    return {
      ...this.createAuthHeaders(token),
      ...extraHeaders
    };
  }

  /**
   * Mock auth context for React components
   */
  createMockAuthContext(userPayload) {
    const sessionData = this.generateSessionData(userPayload);
    
    return {
      user: sessionData.user,
      session: sessionData.session,
      profile: sessionData.profile,
      isAuthenticated: true,
      isLoading: false,
      signIn: jest.fn(),
      signOut: jest.fn(),
      updateProfile: jest.fn(),
      hasPermission: jest.fn((permission) => {
        if (sessionData.profile.permissions.includes('*')) return true;
        return sessionData.profile.permissions.includes(permission);
      }),
      hasRole: jest.fn((role) => sessionData.profile.role === role),
      getToken: jest.fn(() => sessionData.session.access_token),
      refreshSession: jest.fn()
    };
  }

  /**
   * Mock auth context for unauthenticated state
   */
  createUnauthenticatedAuthContext() {
    return {
      user: null,
      session: null,
      profile: null,
      isAuthenticated: false,
      isLoading: false,
      signIn: jest.fn(),
      signOut: jest.fn(),
      updateProfile: jest.fn(),
      hasPermission: jest.fn(() => false),
      hasRole: jest.fn(() => false),
      getToken: jest.fn(() => null),
      refreshSession: jest.fn()
    };
  }

  /**
   * Simulate auth loading state
   */
  createLoadingAuthContext() {
    return {
      user: null,
      session: null,
      profile: null,
      isAuthenticated: false,
      isLoading: true,
      signIn: jest.fn(),
      signOut: jest.fn(),
      updateProfile: jest.fn(),
      hasPermission: jest.fn(() => false),
      hasRole: jest.fn(() => false),
      getToken: jest.fn(() => null),
      refreshSession: jest.fn()
    };
  }

  /**
   * Create mock authentication responses for different scenarios
   */
  createMockAuthResponses() {
    return {
      validLogin: {
        success: true,
        data: this.generateSessionData({
          id: 'valid-user',
          email: 'valid@test.com',
          role: 'warehouse_staff',
          permissions: ['inventory.read', 'inventory.write']
        })
      },

      invalidCredentials: {
        success: false,
        error: 'Invalid email or password'
      },

      accountLocked: {
        success: false,
        error: 'Account is locked due to multiple failed login attempts'
      },

      sessionExpired: {
        success: false,
        error: 'Session has expired. Please log in again.'
      },

      insufficientPermissions: {
        success: false,
        error: 'Insufficient permissions to access this resource'
      },

      tokenRefreshSuccess: {
        success: true,
        data: {
          access_token: this.generateToken({
            id: 'refreshed-user',
            email: 'refreshed@test.com',
            role: 'warehouse_staff'
          }),
          expires_in: 86400
        }
      },

      tokenRefreshFailed: {
        success: false,
        error: 'Failed to refresh authentication token'
      }
    };
  }

  /**
   * Validate permission string format
   */
  isValidPermission(permission) {
    // Permission format: resource.action (e.g., inventory.read, preadmissions.write)
    const permissionRegex = /^[a-z_]+\.[a-z_]+$|^\*$/;
    return permissionRegex.test(permission);
  }

  /**
   * Check if user has specific permission
   */
  hasPermission(userPermissions, requiredPermission) {
    if (!userPermissions || !Array.isArray(userPermissions)) {
      return false;
    }

    // Admin wildcard permission
    if (userPermissions.includes('*')) {
      return true;
    }

    // Exact permission match
    if (userPermissions.includes(requiredPermission)) {
      return true;
    }

    // Check wildcard permissions (e.g., inventory.* matches inventory.read)
    const [resource, action] = requiredPermission.split('.');
    const wildcardPermission = `${resource}.*`;
    
    return userPermissions.includes(wildcardPermission);
  }

  /**
   * Generate test user data with realistic attributes
   */
  generateTestUserData(role = 'warehouse_staff') {
    const roleConfigs = {
      warehouse_staff: {
        permissions: ['inventory.read', 'inventory.write', 'preadmissions.read', 'preadmissions.write'],
        level: 'staff'
      },
      supervisor: {
        permissions: ['inventory.*', 'preadmissions.*', 'reports.read'],
        level: 'supervisor'
      },
      manager: {
        permissions: ['inventory.*', 'preadmissions.*', 'preshipments.*', 'reports.*'],
        level: 'manager'
      },
      admin: {
        permissions: ['*'],
        level: 'admin'
      }
    };

    const config = roleConfigs[role] || roleConfigs.warehouse_staff;
    const userId = `test-${role}-${Date.now()}`;

    return {
      id: userId,
      email: `${role}@test.com`,
      role: role,
      permissions: config.permissions,
      level: config.level,
      firstName: role.charAt(0).toUpperCase() + role.slice(1),
      lastName: 'TestUser',
      employeeNumber: `EMP${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
      active: true,
      lastLogin: new Date().toISOString(),
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days ago
    };
  }

  /**
   * Clean up method for test teardown
   */
  cleanup() {
    // Reset any persistent state if needed
    this.testSecret = process.env.JWT_TEST_SECRET || 'test-jwt-secret-key-for-testing-only';
  }
}

module.exports = new AuthHelper();