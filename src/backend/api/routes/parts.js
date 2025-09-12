// src/backend/api/routes/parts.js
// Parts management routes for ICRS SPARC API

const express = require('express');
const { asyncHandler } = require('../middleware/error-handler');
const { requireStaff, requireManager } = require('../middleware/auth');
const supabaseClient = require('../../db/supabase-client');

const router = express.Router();

/**
 * GET /api/parts
 * Get all parts with filtering and pagination
 */
router.get('/', asyncHandler(async (req, res) => {
  const { 
    limit = 100,
    offset = 0,
    search,
    material,
    orderBy = 'description',
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
    if (material) filters.push({ column: 'material', value: material });

    // Handle search functionality
    if (search) {
      // For search, we'll use ilike to search in description
      filters.push({ 
        column: 'description', 
        value: `%${search}%`, 
        operator: 'ilike' 
      });
    }

    if (filters.length > 0) {
      options.filters = filters;
    }

    const result = await supabaseClient.getAll('parts', options, true);

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
    console.error('Get parts error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve parts'
    });
  }
}));

/**
 * GET /api/parts/:id
 * Get specific part by ID
 */
router.get('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    const result = await supabaseClient.getById(
      'parts',
      id,
      {
        select: `
          *,
          inventory_lots:part_id(id, quantity)
        `,
        accessToken: req.accessToken
      },
      true  // Force admin client
    );

    if (!result.success) {
      return res.status(500).json(result);
    }

    if (!result.data) {
      return res.status(404).json({
        success: false,
        error: 'Part not found'
      });
    }

    res.json({
      success: true,
      data: result.data
    });
  } catch (error) {
    console.error('Get part error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve part'
    });
  }
}));

/**
 * POST /api/parts
 * Create new part
 */
router.post('/', requireStaff, asyncHandler(async (req, res) => {
  const {
    description,
    material,
    unit_of_measure,
    hts_code,
    country_of_origin,
    supplier,
    notes
  } = req.body;

  if (!description || !material) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: description, material'
    });
  }

  try {
    const partData = {
      description,
      material,
      unit_of_measure: unit_of_measure || 'EA',
      hts_code,
      country_of_origin,
      supplier,
      notes,
      created_by: req.user.id
    };

    const result = await supabaseClient.create(
      'parts',
      partData,
      { accessToken: req.accessToken },
      true  // Force admin client
    );

    res.status(201).json(result);
  } catch (error) {
    console.error('Create part error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create part'
    });
  }
}));

/**
 * PUT /api/parts/:id
 * Update part
 */
router.put('/:id', requireStaff, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updateData = { ...req.body };

  // Remove fields that shouldn't be updated directly
  delete updateData.id;
  delete updateData.created_at;
  delete updateData.created_by;

  // NOTE: parts table doesn't have audit fields (updated_at, updated_by) in current schema

  try {
    const result = await supabaseClient.update(
      'parts',
      id,
      updateData,
      { accessToken: req.accessToken },
      true  // Force admin client
    );

    res.json(result);
  } catch (error) {
    console.error('Update part error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update part'
    });
  }
}));

/**
 * DELETE /api/parts/:id
 * Hard delete part (parts table has no is_active field for soft delete)
 */
router.delete('/:id', requireManager, asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    // Check if part has active inventory lots
    const inventoryCheck = await supabaseClient.getAll(
      'inventory_lots',
      {
        filters: [
          { column: 'part_id', value: id }
        ],
        limit: 1,
        accessToken: req.accessToken
      },
      true  // Force admin client
    );

    if (inventoryCheck.success && inventoryCheck.data.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete part with active inventory lots'
      });
    }

    // Hard delete since parts table has no is_active field
    const result = await supabaseClient.delete(
      'parts',
      id,
      { accessToken: req.accessToken },
      true  // Force admin client
    );

    res.json(result);
  } catch (error) {
    console.error('Delete part error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete part'
    });
  }
}));

/**
 * GET /api/parts/materials
 * Get available material types
 */
router.get('/reference/materials', asyncHandler(async (req, res) => {
  try {
    // Get distinct materials from parts table
    const result = await supabaseClient.getAll('parts', {
      select: 'material',
      filters: [{ column: 'material', operator: 'neq', value: null }],
      accessToken: req.accessToken
    });

    if (!result.success) {
      // Fallback to hardcoded list if query fails
      const materials = [
        'aluminum', 'steel', 'stainless_steel', 'copper', 'brass', 'iron',
        'plastic', 'rubber', 'glass', 'ceramic', 'composite', 'other'
      ];
      
      return res.json({
        success: true,
        data: materials.map(material => ({ material }))
      });
    }

    // Get distinct materials from query results
    const distinctMaterials = [...new Set(result.data
      .map(p => p.material)
      .filter(material => material && material.trim())
    )].sort();

    res.json({
      success: true,
      data: distinctMaterials.map(material => ({ material }))
    });
  } catch (error) {
    console.error('Get materials error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve material types'
    });
  }
}));

/**
 * GET /api/parts/:id/inventory
 * Get inventory lots for specific part
 */
router.get('/:id/inventory', asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    const filters = [{ column: 'part_id', value: id }];

    const result = await supabaseClient.getAll(
      'inventory_lots',
      {
        filters,
        select: `
          id, quantity, unit_value, total_value,
          customers(name), 
          storage_locations:storage_location_id(location_code)
        `,
        orderBy: { column: 'created_at', ascending: false },
        accessToken: req.accessToken
      },
      true  // Force admin client
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
        summary: totals
      }
    });
  } catch (error) {
    console.error('Get part inventory error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve part inventory'
    });
  }
}));

module.exports = router;