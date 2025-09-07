// src/backend/api/routes/customers.js
// Customer management routes for ICRS SPARC API

const express = require('express');
const { asyncHandler } = require('../middleware/error-handler');
const { requireStaff, requireManager } = require('../middleware/auth');
const supabaseClient = require('../../db/supabase-client');

const router = express.Router();

/**
 * GET /api/customers
 * Get all customers with filtering and pagination
 */
router.get('/', asyncHandler(async (req, res) => {
  const { 
    limit = 100,
    offset = 0,
    search,
    country,
    orderBy = 'name',
    ascending = 'true'
  } = req.query;

  // REMOVED: Demo token bypass to force real database access
  // Now all requests will use the real Supabase database with admin client

  try {
    const options = {
      select: '*',
      orderBy: {
        column: orderBy,
        ascending: ascending === 'true'
      },
      limit: parseInt(limit),
      offset: parseInt(offset),
      accessToken: req.accessToken
    };

    // Add filters
    const filters = [];
    if (country) filters.push({ column: 'country', value: country });

    // Handle search functionality
    if (search) {
      filters.push({ 
        column: 'name', 
        value: `%${search}%`, 
        operator: 'ilike' 
      });
    }

    if (filters.length > 0) {
      options.filters = filters;
    }

    const result = await supabaseClient.getAll('customers', options);

    res.json({
      success: true,
      data: result.data,
      count: result.count,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: result.count
      }
    });
  } catch (error) {
    console.error('Get customers error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve customers'
    });
  }
}));

/**
 * GET /api/customers/:id
 * Get specific customer by ID
 */
router.get('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    const result = await supabaseClient.getById(
      'customers',
      id,
      {
        select: `
          *,
          inventory_lots(id, quantity, total_value),
          preadmissions(id, container_number, status)
        `,
        accessToken: req.accessToken
      },
      false  // Use RLS
    );

    if (!result.success) {
      return res.status(500).json(result);
    }

    if (!result.data) {
      return res.status(404).json({
        success: false,
        error: 'Customer not found'
      });
    }

    // Calculate customer summary statistics
    const customer = result.data;
    const inventory_summary = customer.inventory_lots.reduce((acc, lot) => {
      acc.total_lots += 1;
      acc.total_quantity += lot.quantity || 0;
      acc.total_value += lot.total_value || 0;
      return acc;
    }, { total_lots: 0, total_quantity: 0, total_value: 0 });

    const preadmission_summary = customer.preadmissions.reduce((acc, pa) => {
      acc.total_containers += 1;
      acc.status_counts[pa.status] = (acc.status_counts[pa.status] || 0) + 1;
      return acc;
    }, { total_containers: 0, status_counts: {} });

    res.json({
      success: true,
      data: {
        ...customer,
        summary: {
          inventory: inventory_summary,
          preadmissions: preadmission_summary
        }
      }
    });
  } catch (error) {
    console.error('Get customer error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve customer'
    });
  }
}));

/**
 * POST /api/customers
 * Create new customer
 */
router.post('/', requireStaff, asyncHandler(async (req, res) => {
  const {
    name,
    code,
    contact_person,
    email,
    phone,
    address,
    city,
    state,
    postal_code,
    country,
    tax_id,
    customs_broker,
    notes
  } = req.body;

  if (!name || !code) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: name, code'
    });
  }

  try {
    // Check if customer code already exists
    const existingCustomer = await supabaseClient.getAll(
      'customers',
      {
        filters: [{ column: 'code', value: code }],
        limit: 1,
        accessToken: req.accessToken
      },
      false  // Use RLS
    );

    if (existingCustomer.success && existingCustomer.data.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Customer code already exists'
      });
    }

    const customerData = {
      name,
      code,
      contact_person,
      email,
      phone,
      address,
      city,
      state,
      postal_code,
      country,
      tax_id,
      customs_broker,
      notes,
      created_by: req.user.id
    };

    const result = await supabaseClient.create(
      'customers',
      customerData,
      { accessToken: req.accessToken },
      false  // Use RLS
    );

    res.status(201).json(result);
  } catch (error) {
    console.error('Create customer error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create customer'
    });
  }
}));

/**
 * PUT /api/customers/:id
 * Update customer
 */
router.put('/:id', requireStaff, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updateData = { ...req.body };

  // Remove fields that shouldn't be updated directly
  delete updateData.id;
  delete updateData.created_at;
  delete updateData.created_by;

  // Check if code is being changed and ensure uniqueness
  if (updateData.code) {
    const existingCustomer = await supabaseClient.getAll(
      'customers',
      {
        filters: [
          { column: 'code', value: updateData.code },
          { column: 'id', value: id, operator: 'neq' }
        ],
        limit: 1,
        accessToken: req.accessToken
      },
      false  // Use RLS
    );

    if (existingCustomer.success && existingCustomer.data.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Customer code already exists'
      });
    }
  }

  // Add audit fields
  updateData.updated_at = new Date().toISOString();
  updateData.updated_by = req.user.id;

  try {
    const result = await supabaseClient.update(
      'customers',
      id,
      updateData,
      { accessToken: req.accessToken },
      false  // Use RLS
    );

    res.json(result);
  } catch (error) {
    console.error('Update customer error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update customer'
    });
  }
}));

/**
 * DELETE /api/customers/:id
 * Soft delete customer
 */
router.delete('/:id', requireManager, asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    // Check if customer has active inventory lots
    const inventoryCheck = await supabaseClient.getAll(
      'inventory_lots',
      {
        filters: [
          { column: 'customer_id', value: id }
        ],
        limit: 1,
        accessToken: req.accessToken
      },
      false  // Use RLS
    );

    if (inventoryCheck.success && inventoryCheck.data.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete customer with active inventory lots'
      });
    }

    const result = await supabaseClient.update(
      'customers',
      id,
      {
        updated_at: new Date().toISOString(),
        updated_by: req.user.id
      },
      { accessToken: req.accessToken },
      false  // Use RLS
    );

    res.json(result);
  } catch (error) {
    console.error('Delete customer error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete customer'
    });
  }
}));

/**
 * GET /api/customers/:id/inventory
 * Get inventory lots for specific customer
 */
router.get('/:id/inventory', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { limit = 100, offset = 0 } = req.query;

  try {
    const filters = [{ column: 'customer_id', value: id }];

    const result = await supabaseClient.getAll(
      'inventory_lots',
      {
        filters,
        select: `
          id, quantity, unit_value, total_value,
          parts:part_id(description, material),
          storage_locations:storage_location_id(location_code)
        `,
        orderBy: { column: 'created_at', ascending: false },
        limit: parseInt(limit),
        offset: parseInt(offset),
        accessToken: req.accessToken
      },
      false  // Use RLS
    );

    // Calculate totals
    const totals = result.data.reduce((acc, lot) => {
      acc.total_quantity += lot.quantity || 0;
      acc.total_value += lot.total_value || 0;
      acc.lot_count += 1;
      return acc;
    }, { total_quantity: 0, total_value: 0, lot_count: 0 });

    res.json({
      success: true,
      data: {
        lots: result.data,
        summary: totals,
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset),
          total: result.count
        }
      }
    });
  } catch (error) {
    console.error('Get customer inventory error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve customer inventory'
    });
  }
}));

/**
 * GET /api/customers/:id/preadmissions
 * Get preadmissions for specific customer
 */
router.get('/:id/preadmissions', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, limit = 100, offset = 0 } = req.query;

  try {
    const filters = [{ column: 'customer_id', value: id }];
    if (status) {
      filters.push({ column: 'status', value: status });
    }

    const result = await supabaseClient.getAll(
      'preadmissions',
      {
        filters,
        select: 'id, container_number, status, arrival_date',
        orderBy: { column: 'created_at', ascending: false },
        limit: parseInt(limit),
        offset: parseInt(offset),
        accessToken: req.accessToken
      },
      false  // Use RLS
    );

    res.json({
      success: true,
      data: result.data,
      count: result.count,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: result.count
      }
    });
  } catch (error) {
    console.error('Get customer preadmissions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve customer preadmissions'
    });
  }
}));

module.exports = router;