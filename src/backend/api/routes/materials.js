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

  // Filter by active status
  if (active !== undefined) {
    options.filters.push({
      column: 'active',
      operator: 'eq',
      value: active === 'true'
    });
  }

  // Search filter
  if (search) {
    options.filters.push({
      column: 'name',
      operator: 'ilike',
      value: `%${search}%`
    });
  }

  // Check if materials table exists, fallback to parts
  let result = await supabaseClient.getAll('materials', options);
  
  // If materials table doesn't exist, use parts table as fallback
  if (!result.success && result.error?.includes('Could not find the table')) {
    result = await supabaseClient.getAll('parts', options);
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

  let result = await supabaseClient.getById('materials', id, options);
  
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

  const result = await supabaseClient.create('materials', materialData, { accessToken });

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

  const result = await supabaseClient.update('materials', id, updateData, { accessToken });

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

  // Soft delete by setting active = false
  const result = await supabaseClient.update('materials', id, { 
    active: false,
    updated_at: new Date().toISOString()
  }, { accessToken });

  if (!result.success) {
    return res.status(400).json(result);
  }

  res.json({
    success: true,
    message: 'Material deactivated successfully'
  });
}));

module.exports = router;