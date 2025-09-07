// src/backend/services/auth/AuthService.js
// Enhanced Authentication service for ICRS SPARC - transferred from original ICRS
// Maintains all business logic while adapting to SPARC backend architecture
// Enhanced with JWT token management and comprehensive role-based permissions

const EnhancedBaseService = require('../enhanced/EnhancedBaseService');
const supabaseClient = require('../../db/supabase-client');

class AuthService extends EnhancedBaseService {
  constructor(serviceRegistry, eventEmitter, monitoring) {
    super('auth', serviceRegistry, eventEmitter, monitoring);
  }

  /**
   * Login with email and password
   * Enhanced with comprehensive authentication flow and JWT token management
   */
  async login(email, password) {
    return this.executeWithErrorHandling(
      'login',
      async () => {
        // Validate required fields
        const validation = this.validateRequiredEnhanced({ email, password }, ['email', 'password']);
        if (!validation.success) {
          throw new Error(validation.error);
        }

        // Use Supabase Auth for authentication
        const { data, error } = await supabaseClient.anonClient.auth.signInWithPassword({
          email,
          password
        });

        if (error) throw error;

        // Get user profile after successful login (original pattern preserved)
        const profileResponse = await this.getUserProfile(data.user.id);
        
        // Get user permissions
        const permissionsResponse = await this.getUserPermissions(data.user.id);
        
        const loginResult = {
          user: data.user,
          session: data.session,
          profile: profileResponse.data,
          permissions: permissionsResponse.data || [],
          token: data.session.access_token,
          refresh_token: data.session.refresh_token,
          expires_at: data.session.expires_at
        };

        // Emit login event
        this.emitEvent('user.logged_in', {
          user_id: data.user.id,
          email: data.user.email,
          role: profileResponse.data?.role
        });

        // Record login metric
        this.recordMetric('user_login', 1, {
          role: profileResponse.data?.role || 'unknown',
          success: 'true'
        });

        return loginResult;
      },
      { email }
    );
  }

  /**
   * Logout current user
   * Preserves original logout logic
   */
  async logout(accessToken = null) {
    try {

      const { error } = await supabaseClient.anonClient.auth.signOut();
      
      if (error) throw error;
      
      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get current user session
   * Maintains original session management patterns
   */
  async getCurrentSession() {
    try {
      const { data: { session }, error } = await supabaseClient.anonClient.auth.getSession();
      
      if (error) throw error;
      
      return { success: true, data: session };
    } catch (error) {
      console.error('Error getting current session:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get current user
   * Preserves original user retrieval logic
   */
  async getCurrentUser(accessToken = null) {
    try {

      const client = accessToken ? supabaseClient.getClientForUser(accessToken) : supabaseClient.anonClient;
      const { data: { user }, error } = await client.auth.getUser(accessToken);
      
      if (error) throw error;
      
      return { success: true, data: user };
    } catch (error) {
      console.error('Error getting current user:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get user profile from employees table
   * Maintains original profile integration with FTZ operations
   */
  async getUserProfile(userId, options = {}) {
    try {

      // Query employees table for user profile (preserves original business logic)
      const profileResult = await supabaseClient.getAll('employees', {
        filters: [{ column: 'user_id', value: userId }],
        limit: 1,
        ...options
      });

      if (!profileResult.success) {
        throw new Error(profileResult.error);
      }

      const data = profileResult.data && profileResult.data.length > 0 ? profileResult.data[0] : null;
      const error = !data ? new Error('Employee profile not found') : null;

      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update user password
   * Preserves original password management
   */
  async updatePassword(newPassword) {
    try {
      const { error } = await supabaseClient.anonClient.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error('Error updating password:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Reset password
   * Maintains original reset flow for FTZ users
   */
  async resetPassword(email) {
    try {
      const { error } = await supabaseClient.anonClient.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.FRONTEND_URL}/reset-password`
      });

      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error('Error resetting password:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Check if user has specific permission
   * Preserves FTZ permission system for customs operations
   */
  async checkPermission(permission, userId = null) {
    try {
      let targetUserId = userId;
      
      if (!targetUserId) {
        const userResponse = await this.getCurrentUser();
        if (!userResponse.success) throw new Error('User not authenticated');
        targetUserId = userResponse.data.id;
      }

      // Use RPC function for permission checking (preserves original logic)
      const rpcResult = await supabaseClient.callFunction('check_user_permission', {
        required_permission: permission,
        user_id: targetUserId
      });
      
      if (!rpcResult.success) {
        throw new Error(rpcResult.error);
      }
      
      const data = rpcResult.data;
      const error = null;

      if (error) throw error;

      return { success: true, data: data };
    } catch (error) {
      console.error('Error checking permission:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get user role
   * Maintains FTZ role hierarchy (admin, manager, warehouse_staff)
   */
  async getUserRole(userId = null) {
    try {
      let targetUserId = userId;
      
      if (!targetUserId) {
        const userResponse = await this.getCurrentUser();
        if (!userResponse.success) throw new Error('User not authenticated');
        targetUserId = userResponse.data.id;
      }

      const profileResponse = await this.getUserProfile(targetUserId);
      if (!profileResponse.success) throw new Error('Could not fetch user profile');

      return { 
        success: true, 
        data: profileResponse.data.role 
      };
    } catch (error) {
      console.error('Error getting user role:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Check if user is admin
   * Preserves admin role checking for FTZ operations
   */
  async isAdmin(userId = null) {
    try {
      const roleResponse = await this.getUserRole(userId);
      if (!roleResponse.success) return { success: false, data: false };

      return { 
        success: true, 
        data: roleResponse.data === 'admin' 
      };
    } catch (error) {
      console.error('Error checking admin status:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Check if user is manager
   * Preserves manager role hierarchy for FTZ workflows
   */
  async isManager(userId = null) {
    try {
      const roleResponse = await this.getUserRole(userId);
      if (!roleResponse.success) return { success: false, data: false };

      return { 
        success: true, 
        data: ['admin', 'manager'].includes(roleResponse.data) 
      };
    } catch (error) {
      console.error('Error checking manager status:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Listen for auth state changes
   * Maintains real-time authentication patterns
   */
  onAuthStateChange(callback) {
    return supabaseClient.anonClient.auth.onAuthStateChange(callback);
  }

  /**
   * Validate session token
   * Preserves token validation for API authentication
   */
  async validateSession(token) {
    try {
      const { data: { user }, error } = await supabaseClient.anonClient.auth.getUser(token);
      
      if (error) throw error;
      
      return { success: true, data: user };
    } catch (error) {
      console.error('Error validating session:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get user permissions for role
   * Enhanced with comprehensive permission system
   */
  async getUserPermissions(userId = null) {
    return this.executeWithErrorHandling(
      'getUserPermissions',
      async () => {
        let targetUserId = userId;
        
        if (!targetUserId) {
          const userResponse = await this.getCurrentUser();
          if (!userResponse.success) throw new Error('User not authenticated');
          targetUserId = userResponse.data.id;
        }

        // Get employee profile for role-based permissions
        const profileResponse = await this.getUserProfile(targetUserId);
        if (!profileResponse.success) {
          throw new Error('Could not fetch user profile');
        }

        const employee = profileResponse.data;
        
        // Get user-specific page permissions (preserves granular FTZ access control)
        const permissionsResult = await supabaseClient.getAll('user_page_permissions', {
          filters: [
            { column: 'user_id', value: targetUserId },
            { column: 'is_active', value: true }
          ]
        });
        
        const pagePermissions = permissionsResult.success ? permissionsResult.data : [];
        const error = !permissionsResult.success ? new Error(permissionsResult.error) : null;

        if (error) throw error;

        // Combine role-based and user-specific permissions
        const permissions = {
          role: employee.role,
          employee: employee,
          pages: pagePermissions || [],
          capabilities: this.getRoleCapabilities(employee.role)
        };

        return permissions;
      },
      { userId }
    );
  }

  /**
   * Get role-based capabilities
   */
  getRoleCapabilities(role) {
    const roleCapabilities = {
      admin: [
        'users.create', 'users.read', 'users.update', 'users.delete',
        'customers.create', 'customers.read', 'customers.update', 'customers.delete',
        'parts.create', 'parts.read', 'parts.update', 'parts.delete',
        'inventory.create', 'inventory.read', 'inventory.update', 'inventory.delete',
        'preadmissions.create', 'preadmissions.read', 'preadmissions.update', 'preadmissions.process',
        'preshipments.create', 'preshipments.read', 'preshipments.update', 'preshipments.process',
        'reports.generate', 'reports.export', 'system.settings', 'audit.view'
      ],
      manager: [
        'customers.create', 'customers.read', 'customers.update',
        'parts.create', 'parts.read', 'parts.update',
        'inventory.create', 'inventory.read', 'inventory.update',
        'preadmissions.create', 'preadmissions.read', 'preadmissions.update', 'preadmissions.process',
        'preshipments.create', 'preshipments.read', 'preshipments.update', 'preshipments.process',
        'reports.generate', 'reports.export'
      ],
      warehouse_staff: [
        'customers.read',
        'parts.read',
        'inventory.read', 'inventory.update',
        'preadmissions.read', 'preadmissions.update',
        'preshipments.read', 'preshipments.update'
      ]
    };

    return roleCapabilities[role] || [];
  }

  /**
   * Check if user has specific capability
   */
  async checkCapability(capability, userId = null) {
    return this.executeWithErrorHandling(
      'checkCapability',
      async () => {
        const permissionsResponse = await this.getUserPermissions(userId);
        
        if (!permissionsResponse.success) {
          throw new Error('Could not fetch user permissions');
        }

        const { capabilities } = permissionsResponse.data;
        return capabilities.includes(capability);
      },
      { capability, userId }
    );
  }

  /**
   * Refresh JWT token
   */
  async refreshToken(refreshToken) {
    return this.executeWithErrorHandling(
      'refreshToken',
      async () => {
        if (!refreshToken) {
          throw new Error('Refresh token is required');
        }

        const { data, error } = await supabaseClient.anonClient.auth.refreshSession({
          refresh_token: refreshToken
        });

        if (error) throw error;

        // Emit token refresh event
        this.emitEvent('token.refreshed', {
          user_id: data.user.id,
          new_expires_at: data.session.expires_at
        });

        return {
          token: data.session.access_token,
          refresh_token: data.session.refresh_token,
          expires_at: data.session.expires_at,
          user: data.user
        };
      },
      { hasRefreshToken: true }
    );
  }

  /**
   * Validate and decode JWT token
   */
  async validateToken(token) {
    return this.executeWithErrorHandling(
      'validateToken',
      async () => {
        if (!token) {
          throw new Error('Token is required');
        }

        const { data: { user }, error } = await supabaseClient.anonClient.auth.getUser(token);
        
        if (error) throw error;
        if (!user) throw new Error('Invalid token');

        // Get fresh user permissions
        const permissionsResponse = await this.getUserPermissions(user.id);
        
        return {
          user,
          permissions: permissionsResponse.data,
          isValid: true,
          validatedAt: new Date().toISOString()
        };
      },
      { hasToken: true }
    );
  }

  /**
   * Check if token is expired
   */
  isTokenExpired(expiresAt) {
    if (!expiresAt) return true;
    
    const expirationTime = new Date(expiresAt * 1000); // Convert Unix timestamp to Date
    const now = new Date();
    
    return now >= expirationTime;
  }

  /**
   * Get token expiration info
   */
  getTokenExpirationInfo(expiresAt) {
    if (!expiresAt) {
      return {
        isExpired: true,
        timeUntilExpiration: 0,
        willExpireSoon: true
      };
    }
    
    const expirationTime = new Date(expiresAt * 1000);
    const now = new Date();
    const timeUntilExpiration = expirationTime.getTime() - now.getTime();
    
    return {
      isExpired: timeUntilExpiration <= 0,
      timeUntilExpiration: Math.max(0, timeUntilExpiration),
      willExpireSoon: timeUntilExpiration <= 5 * 60 * 1000, // 5 minutes
      expiresAt: expirationTime.toISOString()
    };
  }

  /**
   * Update user password with access token
   */
  async updatePassword(newPassword, accessToken) {
    try {

      const client = supabaseClient.getClientForUser(accessToken);
      const { error } = await client.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error('Error updating password:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get user role with access token
   */
  async getUserRole(accessToken) {
    try {

      const userResult = await this.getCurrentUser(accessToken);
      if (!userResult.success) {
        throw new Error('User not authenticated');
      }

      const profileResult = await this.getUserProfile(userResult.data.id, { accessToken });
      if (!profileResult.success) {
        throw new Error('Could not fetch user profile');
      }

      return { 
        success: true, 
        data: profileResult.data?.role || 'warehouse_staff'
      };
    } catch (error) {
      console.error('Error getting user role:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Check if user is admin with access token
   */
  async isAdmin(accessToken) {
    try {

      const roleResult = await this.getUserRole(accessToken);
      if (!roleResult.success) {
        return { success: false, data: false };
      }

      return { 
        success: true, 
        data: roleResult.data === 'admin' 
      };
    } catch (error) {
      console.error('Error checking admin status:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Check if user is manager with access token
   */
  async isManager(accessToken) {
    try {

      const roleResult = await this.getUserRole(accessToken);
      if (!roleResult.success) {
        return { success: false, data: false };
      }

      return { 
        success: true, 
        data: ['admin', 'manager'].includes(roleResult.data) 
      };
    } catch (error) {
      console.error('Error checking manager status:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Check permission with access token
   */
  async checkPermission(permission, accessToken) {
    try {

      const userResult = await this.getCurrentUser(accessToken);
      if (!userResult.success) {
        throw new Error('User not authenticated');
      }

      // Use RPC function for permission checking (preserves original logic)
      const rpcResult = await supabaseClient.callFunction('check_user_permission', {
        required_permission: permission,
        user_id: userResult.data.id
      }, { accessToken });
      
      if (!rpcResult.success) {
        // Fallback to role-based permission check
        const roleResult = await this.getUserRole(accessToken);
        if (roleResult.success) {
          const capabilities = this.getRoleCapabilities(roleResult.data);
          return { success: true, data: capabilities.includes(permission) };
        }
        throw new Error(rpcResult.error);
      }
      
      return { success: true, data: rpcResult.data };
    } catch (error) {
      console.error('Error checking permission:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Validate session with access token
   */
  async validateSession(accessToken) {
    try {

      const { data: { user }, error } = await supabaseClient.anonClient.auth.getUser(accessToken);
      
      if (error) throw error;
      
      return { success: true, data: user };
    } catch (error) {
      console.error('Error validating session:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get all users (admin only)
   */
  async getAllUsers(options = {}) {
    try {
      const result = await supabaseClient.getAll('employees', options);
      return result;
    } catch (error) {
      console.error('Error getting all users:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update user profile (admin only)
   */
  async updateUserProfile(userId, profileData, options = {}) {
    try {
      const result = await supabaseClient.update('employees', userId, profileData, options);
      return result;
    } catch (error) {
      console.error('Error updating user profile:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Deactivate user account (admin only)
   */
  async deactivateUser(userId, options = {}) {
    try {
      const result = await supabaseClient.update('employees', userId, { active: false }, options);
      return result;
    } catch (error) {
      console.error('Error deactivating user:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Reactivate user account (admin only)
   */
  async reactivateUser(userId, options = {}) {
    try {
      const result = await supabaseClient.update('employees', userId, { active: true }, options);
      return result;
    } catch (error) {
      console.error('Error reactivating user:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new AuthService();