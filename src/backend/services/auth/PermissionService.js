// src/backend/services/auth/PermissionService.js
// Comprehensive Permission Service Bridge Layer for ICRS SPARC
// Transferred from original ICRS - maintains all FTZ granular permission logic
// Connects granular permission schema with frontend components

const BaseService = require('../BaseService');
const DatabaseService = require('../../db/supabase-client');
const AuthService = require('./AuthService');

/**
 * PermissionService - Comprehensive bridge layer for granular permissions
 * 
 * Provides methods for:
 * - Checking user permissions (module + action level)
 * - Managing user permissions (grant/revoke)
 * - Role template application
 * - Permission inheritance tracking
 * - Audit trail management
 * 
 * Maintains compatibility with existing page-level permissions during transition
 * Follows ICRS service patterns (success/data/error response format)
 */
class PermissionService extends BaseService {
  constructor() {
    super('user_permissions');
    
    // Cache for performance optimization
    this.permissionCache = new Map();
    this.currentUser = null;
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  // =============================================================================
  // CACHE MANAGEMENT
  // =============================================================================

  /**
   * Clear cache when user changes or permissions are updated
   */
  clearCache() {
    this.permissionCache.clear();
    this.currentUser = null;
  }

  /**
   * Clear specific user's cache
   */
  clearUserCache(userId) {
    const keysToDelete = [];
    for (const [key] of this.permissionCache.entries()) {
      if (key.startsWith(`${userId}-`)) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach(key => this.permissionCache.delete(key));
  }

  // =============================================================================
  // CORE PERMISSION CHECKING METHODS
  // =============================================================================

  /**
   * Check if user has specific module action permission
   * Preserves FTZ granular permission checking
   */
  async hasModulePermission(userId, moduleCode, action, options = {}) {
    const cacheKey = `${userId}-${moduleCode}-${action}`;
    
    // Check cache first (preserves performance optimization)
    const cachedResult = this.permissionCache.get(cacheKey);
    if (cachedResult && cachedResult.timestamp > Date.now() - this.cacheTimeout) {
      return cachedResult.value;
    }

    try {
      const result = await DatabaseService.rpc('user_has_module_permission', {
        p_user_id: userId,
        p_module_code: moduleCode,
        p_action: action
      }, options);

      if (result.success && result.data !== undefined) {
        const hasPermission = result.data === true;
        // Cache the result (preserves caching pattern)
        this.permissionCache.set(cacheKey, {
          value: hasPermission,
          timestamp: Date.now()
        });
        return hasPermission;
      }
      
      return false;
    } catch (error) {
      console.error('Error checking module permission:', error);
      return false;
    }
  }

  /**
   * Check current user's module permission
   * Maintains FTZ current user context
   */
  async currentUserHasPermission(moduleCode, action, options = {}) {
    const user = await this.getCurrentUser(options);
    if (!user) return false;
    return this.hasModulePermission(user.id, moduleCode, action, options);
  }

  /**
   * Check if user has any of the specified permissions
   * Preserves FTZ permission logic flexibility
   */
  async hasAnyPermission(userId, permissions, options = {}) {
    const checks = await Promise.all(
      permissions.map(perm => this.hasModulePermission(userId, perm.moduleCode, perm.action, options))
    );
    return checks.some(hasPermission => hasPermission);
  }

  /**
   * Check if user has all specified permissions
   * Maintains FTZ strict permission enforcement
   */
  async hasAllPermissions(userId, permissions, options = {}) {
    const checks = await Promise.all(
      permissions.map(perm => this.hasModulePermission(userId, perm.moduleCode, perm.action, options))
    );
    return checks.every(hasPermission => hasPermission);
  }

  // =============================================================================
  // USER PERMISSION MANAGEMENT
  // =============================================================================

  /**
   * Get all user permissions for modules
   * Preserves FTZ comprehensive permission tracking
   */
  async getUserPermissions(userId, moduleCode = null, options = {}) {
    try {
      const result = await DatabaseService.rpc('get_user_module_permissions', {
        p_user_id: userId,
        p_module_code: moduleCode
      }, options);

      if (result.success) {
        return {
          success: true,
          data: result.data || []
        };
      }

      return {
        success: false,
        error: result.error || 'Failed to get user permissions',
        data: []
      };
    } catch (error) {
      console.error('Error getting user permissions:', error);
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  }

  /**
   * Grant permission to user
   * Maintains FTZ permission granting with audit trail
   */
  async grantPermission(userId, moduleCode, action, grantedBy, permissionOptions = {}, dbOptions = {}) {
    try {
      const { data, error } = await DatabaseService.upsert('user_permissions', {
        user_id: userId,
        module_code: moduleCode,
        action: action,
        granted: true,
        granted_by: grantedBy,
        granted_at: new Date().toISOString(),
        expires_at: permissionOptions.expires_at || null,
        is_inherited: false,
        notes: permissionOptions.notes || null
      }, dbOptions);

      if (error) throw error;

      // Clear cache for this user (preserves cache invalidation)
      this.clearUserCache(userId);

      return {
        success: true,
        data,
        message: 'Permission granted successfully'
      };
    } catch (error) {
      console.error('Error granting permission:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Revoke permission from user
   * Preserves FTZ permission revocation logic
   */
  async revokePermission(userId, moduleCode, action, options = {}) {
    try {
      const { data, error } = await DatabaseService.update('user_permissions', {
        granted: false, 
        updated_at: new Date().toISOString()
      }, {
        filters: [
          { column: 'user_id', value: userId },
          { column: 'module_code', value: moduleCode },
          { column: 'action', value: action }
        ],
        single: true,
        ...options
      });

      if (error) throw error;

      // Clear cache for this user
      this.clearUserCache(userId);

      return {
        success: true,
        data,
        message: 'Permission revoked successfully'
      };
    } catch (error) {
      console.error('Error revoking permission:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Bulk update user permissions
   * Maintains FTZ bulk permission management
   */
  async bulkUpdatePermissions(userId, permissions, changedBy, reason = null, options = {}) {
    try {
      const result = await DatabaseService.rpc('bulk_update_user_permissions', {
        p_user_id: userId,
        p_permissions: JSON.stringify(permissions),
        p_changed_by: changedBy,
        p_reason: reason
      }, options);

      if (result.success) {
        // Clear cache for this user
        this.clearUserCache(userId);
        
        return {
          success: true,
          data: result.data,
          message: `${result.data || permissions.length} permissions updated successfully`
        };
      }

      return {
        success: false,
        error: result.error || 'Failed to update permissions'
      };
    } catch (error) {
      console.error('Error bulk updating permissions:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // =============================================================================
  // ROLE TEMPLATE MANAGEMENT
  // =============================================================================

  /**
   * Apply role template permissions to user
   * Preserves FTZ role-based permission templates
   */
  async applyRoleTemplate(userId, role, options = {}) {
    try {
      const result = await DatabaseService.rpc('apply_role_template_permissions', {
        p_user_id: userId,
        p_role: role
      }, options);

      if (result.success) {
        // Clear cache for this user
        this.clearUserCache(userId);
        
        return {
          success: true,
          data: result.data,
          message: `Role template ${role} applied successfully (${result.data || 0} permissions)`
        };
      }

      return {
        success: false,
        error: result.error || 'Failed to apply role template'
      };
    } catch (error) {
      console.error('Error applying role template:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get role template permissions
   * Maintains FTZ role template structure
   */
  async getRoleTemplate(role, options = {}) {
    try {
      const { data, error } = await DatabaseService.getAll('permission_templates', {
        select: `
          module_code,
          action,
          default_granted,
          description,
          permission_modules (
            module_name,
            module_category,
            description
          )
        `,
        filters: [{ column: 'role', value: role }],
        orderBy: 'module_code.asc',
        ...options
      });

      if (error) throw error;

      return {
        success: true,
        data: data || []
      };
    } catch (error) {
      console.error('Error getting role template:', error);
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  }

  // =============================================================================
  // PERMISSION MODULES MANAGEMENT
  // =============================================================================

  /**
   * Get all permission modules
   * Preserves FTZ module structure
   */
  async getPermissionModules(options = {}) {
    try {
      const { data, error } = await DatabaseService.getAll('permission_modules', {
        filters: [{ column: 'is_active', value: true }],
        orderBy: 'display_order.asc',
        ...options
      });

      if (error) throw error;

      return {
        success: true,
        data: data || []
      };
    } catch (error) {
      console.error('Error getting permission modules:', error);
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  }

  /**
   * Get module with available actions
   * Maintains FTZ module details
   */
  async getModule(moduleCode, options = {}) {
    try {
      const { data, error } = await DatabaseService.getAll('permission_modules', {
        filters: [
          { column: 'module_code', value: moduleCode },
          { column: 'is_active', value: true }
        ],
        single: true,
        ...options
      });

      if (error) throw error;

      return {
        success: true,
        data
      };
    } catch (error) {
      console.error('Error getting module:', error);
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  // =============================================================================
  // AUDIT TRAIL MANAGEMENT
  // =============================================================================

  /**
   * Get permission audit log for user
   * Preserves FTZ comprehensive audit trails
   */
  async getUserAuditLog(userId, limit = 50, options = {}) {
    try {
      const { data, error } = await DatabaseService.getAll('permission_audit_log', {
        select: `
          *,
          employees!permission_audit_log_changed_by_fkey (
            name,
            email
          )
        `,
        filters: [{ column: 'user_id', value: userId }],
        orderBy: 'created_at.desc',
        limit,
        ...options
      });

      if (error) throw error;

      return {
        success: true,
        data: data || []
      };
    } catch (error) {
      console.error('Error getting user audit log:', error);
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  }

  /**
   * Get system-wide permission audit log
   * Maintains FTZ system audit capabilities
   */
  async getSystemAuditLog(limit = 100, filters = {}, options = {}) {
    try {
      const queryFilters = [];
      
      // Apply filters (preserves original filtering logic)
      if (filters.changeType) {
        queryFilters.push({ column: 'change_type', value: filters.changeType });
      }
      if (filters.moduleCode) {
        queryFilters.push({ column: 'module_code', value: filters.moduleCode });
      }
      if (filters.changedBy) {
        queryFilters.push({ column: 'changed_by', value: filters.changedBy });
      }

      const { data, error } = await DatabaseService.getAll('permission_audit_log', {
        select: `
          *,
          employees!permission_audit_log_user_id_fkey (
            name,
            email
          ),
          employees!permission_audit_log_changed_by_fkey (
            name,
            email
          )
        `,
        filters: queryFilters,
        orderBy: 'created_at.desc',
        limit,
        dateRange: filters.dateFrom && filters.dateTo ? {
          column: 'created_at',
          from: filters.dateFrom,
          to: filters.dateTo
        } : null,
        ...options
      });

      if (error) throw error;

      return {
        success: true,
        data: data || []
      };
    } catch (error) {
      console.error('Error getting system audit log:', error);
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  }

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  /**
   * Get current user profile
   * Maintains FTZ user context
   */
  async getCurrentUser(options = {}) {
    if (this.currentUser) {
      return this.currentUser;
    }

    try {
      const session = await AuthService.getCurrentSession();
      if (!session.success || !session.data) {
        return null;
      }

      const { data, error } = await DatabaseService.getAll('employees', {
        filters: [{ column: 'user_id', value: session.data.user.id }],
        single: true,
        ...options
      });

      if (error || !data) {
        return null;
      }

      this.currentUser = data;
      return this.currentUser;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }

  /**
   * Get user's permission inheritance info
   * Preserves FTZ inheritance tracking
   */
  async getUserInheritanceInfo(userId, options = {}) {
    try {
      const { data, error } = await DatabaseService.getAll('permission_inheritance', {
        filters: [{ column: 'user_id', value: userId }],
        ...options
      });

      if (error) throw error;

      return {
        success: true,
        data: data || []
      };
    } catch (error) {
      console.error('Error getting inheritance info:', error);
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  }

  // =============================================================================
  // BACKWARD COMPATIBILITY METHODS
  // =============================================================================

  /**
   * Check legacy page-based permission (for compatibility during transition)
   * Preserves original FTZ permission checking during migration
   */
  async hasLegacyPermission(permission, options = {}) {
    const user = await this.getCurrentUser(options);
    if (!user) return false;

    // Map legacy permissions to module/action combinations (preserves mapping)
    const permissionMap = {
      'manage_users': { moduleCode: 'user_management', action: 'manage' },
      'view_reports': { moduleCode: 'reporting', action: 'view' },
      'manage_inventory': { moduleCode: 'inventory', action: 'manage' },
      'manage_shipments': { moduleCode: 'shipping', action: 'manage' },
      'view_dashboard': { moduleCode: 'dashboard', action: 'view' },
      'manage_preadmissions': { moduleCode: 'preadmissions', action: 'manage' },
      'manage_preshipments': { moduleCode: 'preshipments', action: 'manage' },
      'view_hts_browser': { moduleCode: 'hts_browser', action: 'view' },
      'manage_entry_summaries': { moduleCode: 'entry_summaries', action: 'manage' }
    };

    const mapped = permissionMap[permission];
    if (mapped) {
      return this.hasModulePermission(user.id, mapped.moduleCode, mapped.action, options);
    }

    // Fallback to role-based check for unmapped permissions (preserves role hierarchy)
    const rolePermissions = {
      'admin': ['manage_users', 'view_reports', 'manage_inventory', 'manage_shipments', 'manage_preadmissions', 'manage_preshipments', 'manage_entry_summaries'],
      'manager': ['view_reports', 'manage_inventory', 'manage_shipments', 'manage_preadmissions', 'manage_preshipments'],
      'warehouse_staff': ['view_dashboard', 'view_hts_browser']
    };

    const userPermissions = rolePermissions[user.role] || [];
    return userPermissions.includes(permission);
  }

  // =============================================================================
  // REAL-TIME SUBSCRIPTION METHODS
  // =============================================================================

  /**
   * Subscribe to user permission changes
   * Maintains FTZ real-time permission updates
   */
  subscribeToUserPermissions(userId, callback, options = {}) {
    return DatabaseService.subscribe('user_permissions', (payload) => {
      // Clear cache for this user when permissions change
      this.clearUserCache(userId);
      callback(payload);
    }, {
      filter: `user_id=eq.${userId}`,
      ...options
    });
  }

  /**
   * Subscribe to permission audit log changes
   * Preserves FTZ audit trail monitoring
   */
  subscribeToAuditLog(callback, options = {}) {
    return DatabaseService.subscribe('permission_audit_log', callback, {
      event: 'INSERT',
      ...options
    });
  }
}

module.exports = new PermissionService();