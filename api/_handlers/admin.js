// api/admin/employees.js - Vercel serverless employee management endpoint
const { setCorsHeaders, handleOptions } = require('../_utils/cors');
const { requireAuth } = require('../_utils/auth');
const { SupabaseClient } = require('../_utils/db');

async function handler(req, res) {
  // Handle CORS
  setCorsHeaders(res, req.headers.origin);
  if (handleOptions(req, res)) return;

  const supabaseClient = new SupabaseClient(req.accessToken);

  try {
    if (req.method === 'GET') {
      // Get all employees with optional filtering
      const { search, role, department, status, limit, offset } = req.query;
      
      let options = {
        select: 'id, name, email, role, department, phone, status, is_active, created_at, updated_at',
        limit: limit ? parseInt(limit) : 50,
        offset: offset ? parseInt(offset) : 0
      };

      // Build filters object (SupabaseClient expects key-value pairs)
      const filters = {};
      if (role) filters.role = role;
      if (department) filters.department = department;
      if (status) filters.status = status;
      if (search) {
        // For search, use OR condition on name and email
        filters.or = `name.ilike.%${search}%,email.ilike.%${search}%`;
      }

      if (Object.keys(filters).length > 0) {
        options.filters = filters;
      }

      const result = await supabaseClient.getAll('employees', options);
      
      if (result.success) {
        res.json({
          success: true,
          data: result.data,
          count: result.count
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error
        });
      }
    } else if (req.method === 'POST') {
      // Create new employee
      const { name, email, role, department, phone, status = 'active' } = req.body;
      
      // Validation
      if (!name || !email || !role) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: name, email, role'
        });
      }

      // Check if email already exists
      const existingEmployee = await supabaseClient.getAll(
        'employees',
        {
          filters: { email: email },
          limit: 1
        }
      );

      if (existingEmployee.success && existingEmployee.data.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'Employee with this email already exists'
        });
      }

      const employeeData = {
        name,
        email,
        role,
        department,
        phone,
        status,
        is_active: status === 'active',
        email_confirmed: true,
        must_change_password: false
      };

      const result = await supabaseClient.create('employees', employeeData);
      
      if (result.success) {
        res.status(201).json({
          success: true,
          data: result.data
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error
        });
      }
    } else if (req.method === 'PUT') {
      // Update employee - extract ID from URL path
      const pathParts = req.url.split('/');
      const id = pathParts[pathParts.length - 1];
      
      if (!id || id === 'employees') {
        return res.status(400).json({
          success: false,
          error: 'Employee ID is required for updates'
        });
      }

      const updateData = { ...req.body };
      
      // Remove fields that shouldn't be updated directly
      delete updateData.id;
      delete updateData.created_at;
      delete updateData.created_by;
      delete updateData.user_id; // Don't allow changing user_id
      
      // Sync status and is_active (the trigger will also handle this)
      if (updateData.status) {
        updateData.is_active = updateData.status === 'active';
      }
      
      // Add audit fields
      updateData.updated_at = new Date().toISOString();

      const result = await supabaseClient.update('employees', id, updateData);
      
      if (result.success) {
        res.json({
          success: true,
          data: result.data
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error
        });
      }
    } else if (req.method === 'DELETE') {
      // Delete employee - extract ID from URL path
      const pathParts = req.url.split('/');
      const id = pathParts[pathParts.length - 1];
      
      if (!id || id === 'employees') {
        return res.status(400).json({
          success: false,
          error: 'Employee ID is required for deletion'
        });
      }

      // Soft delete by updating status and is_active
      const result = await supabaseClient.update(
        'employees', 
        id, 
        { 
          status: 'inactive',
          is_active: false,
          updated_at: new Date().toISOString()
        }
      );
      
      if (result.success) {
        res.json({
          success: true,
          message: 'Employee deactivated successfully'
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error
        });
      }
    } else {
      res.status(405).json({
        success: false,
        error: `Method ${req.method} not allowed`
      });
    }
  } catch (error) {
    console.error('Employees API error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}

module.exports = requireAuth(handler);