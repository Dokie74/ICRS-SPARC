// src/backend/api/routes/inventory.js
// Inventory management routes for ICRS SPARC API
// Preserves transaction-based quantity calculations and lot tracking

const express = require('express');
const { asyncHandler } = require('../middleware/error-handler');
const { requireStaff, requireManager } = require('../middleware/auth');
const supabaseClient = require('../../db/supabase-client');

const router = express.Router();

/**
 * GET /api/inventory/lots
 * Get all inventory lots with calculated quantities from transactions
 */
router.get('/lots', asyncHandler(async (req, res) => {
  const { 
    limit = 100, 
    offset = 0, 
    orderBy = 'created_at', 
    ascending = 'false',
    customer_id,
    part_id,
    storage_location_id,
    active_only = 'true'
  } = req.query;

  // REMOVED: Demo token bypass to force real database access
  // Now all requests will use the real Supabase database with admin client

  try {
    const options = {
      select: `
        *,
        parts:part_id(id, description, material, unit_of_measure),
        customers(id, name, ein),
        storage_locations:storage_location_id(id, location_code, description),
        transactions(quantity)
      `,
      orderBy: {
        column: orderBy,
        ascending: ascending === 'true'
      },
      limit: parseInt(limit),
      offset: parseInt(offset),
      accessToken: req.accessToken
    };

    // Add filters - handle undefined/null values properly
    const filters = [];
    if (customer_id && customer_id !== 'undefined' && customer_id !== 'null') {
      filters.push({ column: 'customer_id', value: customer_id });
    }
    if (part_id && part_id !== 'undefined' && part_id !== 'null') {
      filters.push({ column: 'part_id', value: part_id });
    }
    if (storage_location_id && storage_location_id !== 'undefined' && storage_location_id !== 'null') {
      filters.push({ column: 'storage_location_id', value: storage_location_id });
    }

    if (filters.length > 0) {
      options.filters = filters;
    }

    const result = await supabaseClient.getAll('inventory_lots', options);

    if (!result.success) {
      return res.status(500).json(result);
    }

    // Transform data to calculate current quantities and match original format
    const transformedData = result.data.map(lot => {
      // Calculate current quantity from transactions
      const currentQuantity = lot.transactions.reduce((sum, transaction) => {
        return sum + (transaction.quantity || 0);
      }, 0);

      return {
        ...lot,
        current_quantity: currentQuantity,
        // Maintain compatibility with both old and new schema
        quantity: lot.quantity || currentQuantity,
        unit_value: lot.unit_value || 0,
        total_value: lot.total_value || (currentQuantity * (lot.unit_value || 0)),
        part_description: lot.parts?.description,
        customer_name: lot.customers?.name,
        customer_code: lot.customers?.ein,
        location_code: lot.storage_locations?.location_code,
        location_description: lot.storage_locations?.description
      };
    });

    res.json({
      success: true,
      data: transformedData,
      count: result.count,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: result.count
      }
    });
  } catch (error) {
    console.error('Get inventory lots error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve inventory lots'
    });
  }
}));

/**
 * GET /api/inventory/lots/:id
 * Get specific inventory lot by ID
 */
router.get('/lots/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    const result = await supabaseClient.getById(
      'inventory_lots',
      id,
      {
        select: `
          *,
          parts:part_id(id, description, material, unit_of_measure),
          customers(id, name, ein),
          storage_locations:storage_location_id(id, location_code, description, zone, aisle, level, position),
          transactions(id, quantity, type, created_at, reference_number, notes)
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
        error: 'Inventory lot not found'
      });
    }

    // Calculate current quantity and transform data
    const lot = result.data;
    const currentQuantity = lot.transactions.reduce((sum, transaction) => {
      return sum + (transaction.quantity || 0);
    }, 0);

    const transformedData = {
      ...lot,
      current_quantity: currentQuantity,
      quantity: lot.quantity || currentQuantity,
      total_value: lot.total_value || (currentQuantity * (lot.unit_value || 0)),
      transaction_history: lot.transactions.sort((a, b) => 
        new Date(b.created_at) - new Date(a.created_at)
      )
    };

    res.json({
      success: true,
      data: transformedData
    });
  } catch (error) {
    console.error('Get inventory lot error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve inventory lot'
    });
  }
}));

/**
 * POST /api/inventory/lots
 * Create new inventory lot
 */
router.post('/lots', requireStaff, asyncHandler(async (req, res) => {
  const {
    part_id,
    customer_id,
    storage_location_id,
    initial_quantity,
    unit_value,
    // NOTE: unit_of_measure and expiration_date fields don't exist in inventory_lots table
    notes
  } = req.body;

  if (!part_id || !customer_id || !storage_location_id || !initial_quantity) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: part_id, customer_id, storage_location_id, initial_quantity'
    });
  }

  try {
    const lotData = {
      part_id,
      customer_id,
      storage_location_id,
      quantity: initial_quantity,
      unit_value: unit_value || 0,
      total_value: (initial_quantity * (unit_value || 0)),
      notes
      // NOTE: created_by field doesn't exist in inventory_lots table
      // NOTE: unit_of_measure and expiration_date fields don't exist in inventory_lots table
    };

    const result = await supabaseClient.create(
      'inventory_lots',
      lotData,
      { accessToken: req.accessToken },
      false  // Use RLS
    );

    if (!result.success) {
      return res.status(500).json(result);
    }

    // Create initial transaction record
    const transactionData = {
      lot_id: result.data.id,
      quantity: initial_quantity,
      type: 'receipt',
      reference_id: 'INITIAL',
      notes: `Initial lot creation - ${new Date().toISOString()}`,
      created_by: req.user.id
    };

    await supabaseClient.create(
      'transactions',
      transactionData,
      { accessToken: req.accessToken },
      false  // Use RLS
    );

    res.status(201).json({
      success: true,
      data: result.data
    });
  } catch (error) {
    console.error('Create inventory lot error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create inventory lot'
    });
  }
}));

/**
 * PUT /api/inventory/lots/:id
 * Update inventory lot
 */
router.put('/lots/:id', requireStaff, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updateData = { ...req.body };

  // Remove fields that shouldn't be updated directly
  delete updateData.id;
  delete updateData.created_at;
  delete updateData.created_by;
  delete updateData.current_quantity; // Calculated field

  // Add audit fields (only updated_at exists in inventory_lots table)
  updateData.updated_at = new Date().toISOString();
  // NOTE: updated_by field doesn't exist in inventory_lots table

  try {
    const result = await supabaseClient.update(
      'inventory_lots',
      id,
      updateData,
      { accessToken: req.accessToken },
      false  // Use RLS
    );

    res.json(result);
  } catch (error) {
    console.error('Update inventory lot error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update inventory lot'
    });
  }
}));

/**
 * DELETE /api/inventory/lots/:id
 * Hard delete inventory lot (no is_active field for soft delete)
 */
router.delete('/lots/:id', requireManager, asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    // Check if lot has transactions before deleting
    const transactionCheck = await supabaseClient.getAll(
      'transactions',
      {
        filters: [{ column: 'lot_id', value: id }],
        limit: 1,
        accessToken: req.accessToken
      }
    );

    if (transactionCheck.success && transactionCheck.data.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete inventory lot with existing transactions'
      });
    }

    const result = await supabaseClient.delete(
      'inventory_lots',
      id,
      { accessToken: req.accessToken },
      false  // Use RLS
    );

    res.json(result);
  } catch (error) {
    console.error('Delete inventory lot error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete inventory lot'
    });
  }
}));

/**
 * GET /api/inventory/transactions
 * Get inventory transactions with filtering
 */
router.get('/transactions', asyncHandler(async (req, res) => {
  const { 
    lot_id,
    transaction_type,
    start_date,
    end_date,
    limit = 100,
    offset = 0 
  } = req.query;

  try {
    const filters = [];
    if (lot_id) filters.push({ column: 'lot_id', value: lot_id });
    if (transaction_type) filters.push({ column: 'type', value: transaction_type });
    if (start_date) filters.push({ column: 'created_at', value: start_date, operator: 'gte' });
    if (end_date) filters.push({ column: 'created_at', value: end_date, operator: 'lte' });

    const options = {
      select: `
        *,
        inventory_lots(id, parts(description), customers(name))
      `,
      filters: filters.length > 0 ? filters : undefined,
      orderBy: { column: 'created_at', ascending: false },
      limit: parseInt(limit),
      offset: parseInt(offset),
      accessToken: req.accessToken
    };

    const result = await supabaseClient.getAll('transactions', options);

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
    console.error('Get inventory transactions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve inventory transactions'
    });
  }
}));

/**
 * POST /api/inventory/transactions
 * Create inventory transaction (receipt, shipment, adjustment)
 */
router.post('/transactions', requireStaff, asyncHandler(async (req, res) => {
  const {
    lot_id,
    quantity,
    transaction_type,
    reference_id,
    notes
  } = req.body;

  if (!lot_id || !quantity || !transaction_type) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: lot_id, quantity, type'
    });
  }

  try {
    const transactionData = {
      lot_id,
      quantity: parseFloat(quantity),
      type: transaction_type,
      reference_id,
      notes,
      created_by: req.user.id
    };

    const result = await supabaseClient.create(
      'transactions',
      transactionData,
      { accessToken: req.accessToken },
      false  // Use RLS
    );

    res.status(201).json(result);
  } catch (error) {
    console.error('Create inventory transaction error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create inventory transaction'
    });
  }
}));

module.exports = router;