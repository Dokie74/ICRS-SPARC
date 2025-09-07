// src/backend/services/auth/UserService.js
// User and employee management service for ICRS SPARC - transferred from original ICRS
// Maintains all FTZ operational requirements and business logic

const BaseService = require('../BaseService');
const DatabaseService = require('../../db/supabase-client');
const AuthService = require('./AuthService');

class UserService extends BaseService {
  constructor() {
    super('users');
  }

  /**
   * Get all employees with proper permissions
   * Preserves FTZ employee hierarchy and role structure
   */
  async getAllEmployees(options = {}) {
    try {
      const { filters, orderBy, limit, offset } = options;

      const query = {
        select: `
          id, 
          user_id, 
          name, 
          email, 
          job_title, 
          role, 
          department, 
          manager_id, 
          is_active, 
          is_admin, 
          created_at, 
          last_login
        `,
        orderBy: orderBy || 'created_at.desc',
        limit,
        offset
      };

      if (filters && filters.length > 0) {
        query.filters = filters;
      }

      const result = await DatabaseService.getAll('employees', query);
      
      if (result.success) {
        // Add email_confirmed field based on user_id existence (preserves original logic)
        const enrichedData = result.data.map(employee => ({
          ...employee,
          email_confirmed: employee.user_id !== null
        }));
        return { success: true, data: enrichedData };
      }
      
      return result;
    } catch (error) {
      console.error('Error fetching employees:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Create new employee with auth user
   * Preserves FTZ user creation workflow with validation
   */
  async createEmployee(employeeData, options = {}) {
    try {
      // Validate employee data (preserves original validation logic)
      const validationResult = this.validateEmployeeData(employeeData);
      if (!validationResult.isValid) {
        return { 
          success: false, 
          error: 'Validation failed', 
          validationErrors: validationResult.errors 
        };
      }

      // Sanitize input data and adapt to Edge Function format (preserves original pattern)
      const sanitizedData = {
        email: this.sanitizeInput(employeeData.email),
        firstName: this.sanitizeInput(employeeData.name).split(' ')[0] || employeeData.name,
        lastName: this.sanitizeInput(employeeData.name).split(' ').slice(1).join(' ') || 'User',
        department: employeeData.department || 'warehouse',
        role: employeeData.role || 'employee',
        sendEmail: true,
        customPassword: employeeData.temp_password || null
      };

      // Call Edge Function to create both auth user and employee record
      const { data, error } = await DatabaseService.callEdgeFunction(
        'create-employee-with-auth',
        sanitizedData,
        options
      );

      if (error) {
        console.error('Edge Function error:', error);
        return { success: false, error: error.message || 'Failed to create employee with auth user' };
      }

      if (data.error) {
        console.error('Employee creation error:', data.error);
        return { success: false, error: data.error };
      }

      // Return success with employee data and temporary password (preserves original response)
      return { 
        success: true, 
        data: {
          employee: data.employee,
          temporaryPassword: data.temporaryPassword,
          authUserId: data.auth_user_id
        }
      };
    } catch (error) {
      console.error('Error creating employee:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update employee
   * Preserves FTZ employee update logic with validation
   */
  async updateEmployee(employeeId, updateData, options = {}) {
    try {
      // Validate updated data (preserves original validation)
      const validationResult = this.validateEmployeeData(updateData);
      if (!validationResult.isValid) {
        return { 
          success: false, 
          error: 'Validation failed', 
          validationErrors: validationResult.errors 
        };
      }

      // Sanitize input data (preserves original sanitization)
      const sanitizedData = {
        name: this.sanitizeInput(updateData.name),
        job_title: this.sanitizeInput(updateData.job_title),
        role: updateData.role,
        manager_id: updateData.manager_id || null,
        department: updateData.department,
        is_active: updateData.is_active !== undefined ? updateData.is_active : true
      };

      // Use RPC function to update employee (preserves original pattern)
      const result = await DatabaseService.rpc('update_employee', {
        p_employee_id: employeeId,
        p_name: sanitizedData.name,
        p_job_title: sanitizedData.job_title,
        p_role: sanitizedData.role,
        p_manager_id: sanitizedData.manager_id,
        p_department: sanitizedData.department,
        p_is_active: sanitizedData.is_active
      }, options);

      return result;
    } catch (error) {
      console.error('Error updating employee:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Deactivate employee
   * Preserves FTZ user deactivation workflow
   */
  async deactivateEmployee(employeeId, options = {}) {
    try {
      const result = await DatabaseService.rpc('deactivate_employee', {
        p_employee_id: employeeId
      }, options);

      return result;
    } catch (error) {
      console.error('Error deactivating employee:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get current employee profile
   * Maintains FTZ employee profile integration
   */
  async getCurrentEmployee(options = {}) {
    try {
      const result = await DatabaseService.rpc('get_current_employee', {}, options);
      
      if (result.success && result.data && result.data.length > 0) {
        return { success: true, data: result.data[0] };
      }
      
      return { success: false, error: 'Employee profile not found' };
    } catch (error) {
      console.error('Error fetching current employee:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get managers for dropdown
   * Preserves FTZ management hierarchy
   */
  async getManagers(options = {}) {
    try {
      const result = await DatabaseService.getAll('employees', {
        select: 'id, name, email',
        filters: [
          { column: 'role', value: 'manager' },
          { column: 'is_active', value: true }
        ],
        orderBy: 'name.asc',
        ...options
      });

      return result;
    } catch (error) {
      console.error('Error fetching managers:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get available roles
   * Maintains FTZ role hierarchy (warehouse_staff, manager, admin)
   */
  async getAvailableRoles() {
    try {
      // FTZ role hierarchy (preserves original roles)
      const roles = [
        { value: 'warehouse_staff', label: 'Warehouse Staff' },
        { value: 'manager', label: 'Manager' },
        { value: 'admin', label: 'Administrator' }
      ];

      return { success: true, data: roles };
    } catch (error) {
      console.error('Error fetching roles:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Check if account is locked
   * Preserves FTZ security policies
   */
  async isAccountLocked(email, options = {}) {
    try {
      const result = await DatabaseService.rpc('is_account_locked', {
        p_email: email
      }, options);

      return { success: true, isLocked: result.data || false };
    } catch (error) {
      console.error('Error checking account lock status:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Track login attempt
   * Maintains FTZ audit trail requirements
   */
  async trackLoginAttempt(email, success, userAgent, ipAddress = null, options = {}) {
    try {
      const result = await DatabaseService.rpc('track_login_attempt', {
        p_email: email,
        p_success: success,
        p_user_agent: userAgent,
        p_ip_address: ipAddress
      }, options);

      return result;
    } catch (error) {
      console.error('Error tracking login attempt:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update last login timestamp
   * Preserves FTZ login tracking
   */
  async updateLastLogin(userId = null, options = {}) {
    try {
      const result = await DatabaseService.rpc('update_last_login', {
        p_user_id: userId
      }, options);
      return result;
    } catch (error) {
      console.error('Error updating last login:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Create auth user with temporary password
   * Preserves FTZ user creation with security
   */
  async createAuthUser(email, password, employeeId, options = {}) {
    try {
      const result = await DatabaseService.callEdgeFunction('create-auth-user', {
        email,
        password,
        employee_id: employeeId
      }, options);

      return result;
    } catch (error) {
      console.error('Error creating auth user:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Invite user
   * Maintains FTZ invitation workflow
   */
  async inviteUser(email, role, employeeId, options = {}) {
    try {
      const result = await DatabaseService.callEdgeFunction('invite-user', {
        email,
        role,
        employee_id: employeeId
      }, options);

      return result;
    } catch (error) {
      console.error('Error inviting user:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Batch create users
   * Preserves FTZ bulk user operations
   */
  async batchCreateUsers(userData, options = {}) {
    try {
      const result = await DatabaseService.callEdgeFunction('batch-create-users', {
        userData
      }, options);

      return result;
    } catch (error) {
      console.error('Error batch creating users:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Subscribe to user changes
   * Maintains real-time FTZ user updates
   */
  subscribeToUserChanges(callback, options = {}) {
    return DatabaseService.subscribe('users', callback, options);
  }

  /**
   * Subscribe to employee changes
   * Maintains real-time FTZ employee updates
   */
  subscribeToEmployeeChanges(callback, options = {}) {
    return DatabaseService.subscribe('employees', callback, options);
  }

  /**
   * Validate employee data
   * Preserves original validation logic for FTZ requirements
   */
  validateEmployeeData(employeeData) {
    const errors = [];

    if (!employeeData.name || employeeData.name.trim().length < 2) {
      errors.push('Name must be at least 2 characters long');
    }

    if (!employeeData.email || !this.isValidEmail(employeeData.email)) {
      errors.push('Valid email is required');
    }

    if (!employeeData.role || !['warehouse_staff', 'manager', 'admin'].includes(employeeData.role)) {
      errors.push('Valid role is required (warehouse_staff, manager, or admin)');
    }

    if (!employeeData.department || employeeData.department.trim().length < 2) {
      errors.push('Department is required');
    }

    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }

  /**
   * Helper methods (preserving original utility functions)
   */
  sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    return input.trim().replace(/[<>]/g, '');
  }

  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}

module.exports = new UserService();