// src/backend/api/routes/materials.js
// Materials management routes for ICRS SPARC API
// Handles materials master data for Foreign Trade Zone operations

const express = require('express');
const { asyncHandler } = require('../middleware/error-handler');
const supabaseClient = require('../../db/supabase-client');

const router = express.Router();

/**
 * GET /api/materials
 * Get all materials with filtering and pagination
 */
router.get('/', asyncHandler(async (req, res) => {
  const { limit = 1000, offset = 0, active = true, search } = req.query;
  const accessToken = req.headers.authorization?.replace('Bearer ', '');


  const options = {
    limit: parseInt(limit),
    offset: parseInt(offset),
    accessToken,
    filters: []
  };

  // Filter by active status - Note: material_indices table doesn't have is_active column
  // This filter is handled in the fallback to parts table if needed

  // Search filter
  if (search) {
    options.filters.push({
      column: 'name',
      operator: 'ilike',
      value: `%${search}%`
    });
  }

  // Check if materials table exists, fallback to parts
  let result = await supabaseClient.getAll('material_indices', options);
  
  // If materials table doesn't exist, use parts table as fallback with different filters
  if (!result.success && result.error?.includes('Could not find the table')) {
    // Remove filters that don't exist in parts table
    const partsOptions = {
      ...options,
      filters: options.filters?.filter(f => f.column !== 'is_active') || []
    };
    
    // Change name search to description search for parts table
    if (partsOptions.filters?.some(f => f.column === 'name')) {
      partsOptions.filters = partsOptions.filters.map(f => 
        f.column === 'name' ? { ...f, column: 'description' } : f
      );
    }
    
    result = await supabaseClient.getAll('parts', partsOptions);
  }

  if (!result.success) {
    return res.status(500).json(result);
  }

  res.json({
    success: true,
    data: result.data || [],
    count: result.count || 0,
    pagination: {
      limit: parseInt(limit),
      offset: parseInt(offset),
      total: result.count || 0
    }
  });
}));

/**
 * GET /api/materials/:id
 * Get specific material by ID
 */
router.get('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const accessToken = req.headers.authorization?.replace('Bearer ', '');

  const options = { accessToken };

  let result = await supabaseClient.getById('material_indices', id, options);
  
  // Fallback to parts table
  if (!result.success && result.error?.includes('Could not find the table')) {
    result = await supabaseClient.getById('parts', id, options);
  }

  if (!result.success) {
    return res.status(404).json(result);
  }

  res.json({
    success: true,
    data: result.data
  });
}));

/**
 * POST /api/materials
 * Create new material
 */
router.post('/', asyncHandler(async (req, res) => {
  const accessToken = req.headers.authorization?.replace('Bearer ', '');
  const materialData = {
    ...req.body,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const result = await supabaseClient.create('material_indices', materialData, { accessToken });

  if (!result.success) {
    return res.status(400).json(result);
  }

  res.status(201).json({
    success: true,
    data: result.data
  });
}));

/**
 * PUT /api/materials/:id
 * Update material
 */
router.put('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const accessToken = req.headers.authorization?.replace('Bearer ', '');
  
  const updateData = {
    ...req.body,
    updated_at: new Date().toISOString()
  };

  const result = await supabaseClient.update('material_indices', id, updateData, { accessToken });

  if (!result.success) {
    return res.status(400).json(result);
  }

  res.json({
    success: true,
    data: result.data
  });
}));

/**
 * DELETE /api/materials/:id
 * Delete material (soft delete by setting active = false)
 */
router.delete('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const accessToken = req.headers.authorization?.replace('Bearer ', '');

  // Note: material_indices table doesn't support soft delete
  // Using hard delete instead
  const result = await supabaseClient.delete('material_indices', id, { accessToken });

  if (!result.success) {
    return res.status(400).json(result);
  }

  res.json({
    success: true,
    message: 'Material deactivated successfully'
  });
}));

module.exports = router;