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
    // NOTE: 'country' column doesn't exist in customers table
    // if (country) filters.push({ column: 'country', value: country });

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
  
  // NOTE: Mapping frontend fields to database columns
  // code -> ein, contact_person -> not in DB, email -> contact_email
  // city/state/postal_code/country -> not in DB, tax_id -> ein, customs_broker -> broker_name

  if (!name) {
    return res.status(400).json({
      success: false,
      error: 'Missing required field: name'
    });
  }

  try {
    // Check if customer EIN already exists (code maps to ein)
    if (code) {
      const existingCustomer = await supabaseClient.getAll(
        'customers',
        {
          filters: [{ column: 'ein', value: code }],
          limit: 1,
          accessToken: req.accessToken
        },
        false  // Use RLS
      );

      if (existingCustomer.success && existingCustomer.data.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'Customer EIN already exists'
        });
      }
    }

    const customerData = {
      name,
      ein: code || tax_id,  // Map code or tax_id to ein
      contact_email: email,  // Map email to contact_email
      phone,
      address,
      broker_name: customs_broker,  // Map customs_broker to broker_name
      notes
      // NOTE: contact_person, city, state, postal_code, country, created_by fields don't exist in customers table
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

  // Map frontend fields to database columns for update
  if (updateData.code) updateData.ein = updateData.code;
  if (updateData.email) updateData.contact_email = updateData.email;
  if (updateData.tax_id) updateData.ein = updateData.tax_id;
  if (updateData.customs_broker) updateData.broker_name = updateData.customs_broker;
  
  // Remove fields that don't exist in database
  delete updateData.code;
  delete updateData.contact_person;
  delete updateData.email;
  delete updateData.city;
  delete updateData.state;
  delete updateData.postal_code;
  delete updateData.country;
  delete updateData.tax_id;
  delete updateData.customs_broker;

  // Check if EIN is being changed and ensure uniqueness
  if (updateData.ein) {
    const existingCustomer = await supabaseClient.getAll(
      'customers',
      {
        filters: [
          { column: 'ein', value: updateData.ein },
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
        error: 'Customer EIN already exists'
      });
    }
  }

  // Add audit fields (only updated_at exists in customers table)
  updateData.updated_at = new Date().toISOString();
  // NOTE: updated_by field doesn't exist in customers table

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
 * Update customer status (no is_active field, using status instead)
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

    // Set status to inactive instead of hard delete (no is_active field)
    const result = await supabaseClient.update(
      'customers',
      id,
      {
        status: 'inactive',
        updated_at: new Date().toISOString()
        // NOTE: updated_by field doesn't exist in customers table
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