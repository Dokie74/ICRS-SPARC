// src/backend/api/routes/inventory.js
// Inventory management routes for ICRS SPARC API
// Preserves transaction-based quantity calculations and lot tracking

const express = require('express');
const { asyncHandler } = require('../middleware/error-handler');
const { requireStaff, requireManager } = require('../middleware/auth');
const supabaseClient = require('../../db/supabase-client');
const { isDemoToken, mockInventoryLots } = require('../../utils/mock-data');

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

  const accessToken = req.headers.authorization?.replace('Bearer ', '') || req.accessToken;

  // Use mock data for demo tokens
  if (isDemoToken(accessToken)) {
    let filteredLots = [...mockInventoryLots];

    // Apply filters
    if (customer_id && customer_id !== 'undefined') {
      filteredLots = filteredLots.filter(lot => lot.customer_id === customer_id);
    }
    if (part_id && part_id !== 'undefined') {
      filteredLots = filteredLots.filter(lot => lot.part_id === part_id);
    }
    if (storage_location_id && storage_location_id !== 'undefined') {
      filteredLots = filteredLots.filter(lot => lot.storage_location_id === storage_location_id);
    }
    if (active_only === 'true') {
      filteredLots = filteredLots.filter(lot => lot.active === true);
    }

    // Apply sorting
    filteredLots.sort((a, b) => {
      const aVal = a[orderBy] || a.created_at;
      const bVal = b[orderBy] || b.created_at;
      const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return ascending === 'true' ? comparison : -comparison;
    });

    // Apply pagination
    const start = parseInt(offset) || 0;
    const count = parseInt(limit) || 100;
    const paginatedLots = filteredLots.slice(start, start + count);

    // Transform mock data to match expected format
    const transformedData = paginatedLots.map(lot => ({
      ...lot,
      current_quantity: lot.quantity,
      part_description: lot.parts?.description,
      customer_name: lot.customers?.name,
      customer_code: lot.customers?.code,
      location_code: lot.storage_locations?.location_code,
      location_description: lot.storage_locations?.description
    }));

    return res.json({
      success: true,
      data: transformedData,
      count: filteredLots.length,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: filteredLots.length
      }
    });
  }

  try {
    const options = {
      select: `
        *,
        parts:part_id(id, description, material, unit_of_measure),
        customers:customer_id(id, name, code),
        storage_locations:storage_location_id(id, location_code, description),
        transactions(quantity)
      `,
      orderBy: {
        column: orderBy,
        ascending: ascending === 'true'
      },
      limit: parseInt(limit),
      offset: parseInt(offset),
      accessToken: accessToken
    };

    // Add filters
    const filters = [];
    if (customer_id) filters.push({ column: 'customer_id', value: customer_id });
    if (part_id) filters.push({ column: 'part_id', value: part_id });
    if (storage_location_id) filters.push({ column: 'storage_location_id', value: storage_location_id });
    if (active_only === 'true') filters.push({ column: 'active', value: true });

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
        customer_code: lot.customers?.code,
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
          parts:part_id(id, description, material, unit_of_measure, customs_value),
          customers:customer_id(id, name, code, country),
          storage_locations:storage_location_id(id, location_code, description, zone, aisle, level, position),
          transactions(id, quantity, transaction_type, transaction_date, reference_number, notes, created_at)
        `,
        accessToken: req.accessToken
      }
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
        new Date(b.transaction_date) - new Date(a.transaction_date)
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
    lot_number,
    part_id,
    customer_id,
    storage_location_id,
    initial_quantity,
    unit_value,
    unit_of_measure,
    customs_value,
    entry_date,
    expiration_date,
    notes
  } = req.body;

  if (!lot_number || !part_id || !customer_id || !storage_location_id || !initial_quantity) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: lot_number, part_id, customer_id, storage_location_id, initial_quantity'
    });
  }

  try {
    const lotData = {
      lot_number,
      part_id,
      customer_id,
      storage_location_id,
      quantity: initial_quantity,
      unit_value: unit_value || 0,
      total_value: (initial_quantity * (unit_value || 0)),
      unit_of_measure,
      customs_value,
      entry_date: entry_date || new Date().toISOString(),
      expiration_date,
      notes,
      active: true,
      created_by: req.user.id
    };

    const result = await supabaseClient.create(
      'inventory_lots',
      lotData,
      { accessToken: req.accessToken }
    );

    if (!result.success) {
      return res.status(500).json(result);
    }

    // Create initial transaction record
    const transactionData = {
      lot_id: result.data.id,
      quantity: initial_quantity,
      transaction_type: 'receipt',
      transaction_date: lotData.entry_date,
      reference_number: 'INITIAL',
      notes: `Initial lot creation - ${lot_number}`,
      created_by: req.user.id
    };

    await supabaseClient.create(
      'inventory_transactions',
      transactionData,
      { accessToken: req.accessToken }
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

  // Add audit fields
  updateData.updated_at = new Date().toISOString();
  updateData.updated_by = req.user.id;

  try {
    const result = await supabaseClient.update(
      'inventory_lots',
      id,
      updateData,
      { accessToken: req.accessToken }
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
 * Soft delete inventory lot (set active = false)
 */
router.delete('/lots/:id', requireManager, asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    const result = await supabaseClient.update(
      'inventory_lots',
      id,
      { 
        active: false,
        updated_at: new Date().toISOString(),
        updated_by: req.user.id
      },
      { accessToken: req.accessToken }
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
    if (transaction_type) filters.push({ column: 'transaction_type', value: transaction_type });
    if (start_date) filters.push({ column: 'transaction_date', value: start_date, operator: 'gte' });
    if (end_date) filters.push({ column: 'transaction_date', value: end_date, operator: 'lte' });

    const options = {
      select: `
        *,
        inventory_lots:lot_id(id, lot_number, parts:part_id(description), customers:customer_id(name))
      `,
      filters: filters.length > 0 ? filters : undefined,
      orderBy: { column: 'transaction_date', ascending: false },
      limit: parseInt(limit),
      offset: parseInt(offset),
      accessToken: req.accessToken
    };

    const result = await supabaseClient.getAll('inventory_transactions', options);

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
    transaction_date,
    reference_number,
    notes
  } = req.body;

  if (!lot_id || !quantity || !transaction_type) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: lot_id, quantity, transaction_type'
    });
  }

  try {
    const transactionData = {
      lot_id,
      quantity: parseFloat(quantity),
      transaction_type,
      transaction_date: transaction_date || new Date().toISOString(),
      reference_number,
      notes,
      created_by: req.user.id
    };

    const result = await supabaseClient.create(
      'inventory_transactions',
      transactionData,
      { accessToken: req.accessToken }
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