// src/backend/api/routes/locations.js
// Locations management routes for ICRS SPARC API
// Handles warehouse locations for Foreign Trade Zone operations

const express = require('express');
const { asyncHandler } = require('../middleware/error-handler');
const supabaseClient = require('../../db/supabase-client');

const router = express.Router();

/**
 * GET /api/locations
 * Get all locations with filtering and pagination
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
    options.filters.push({ column: 'is_active', value: active === 'true' || active === true });
  }

  // Search filter
  if (search) {
    options.filters.push({
      column: 'name',
      operator: 'ilike',
      value: `%${search}%`
    });
  }

  const result = await supabaseClient.getAll('storage_locations', options);

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
 * GET /api/locations/:id
 * Get specific location by ID
 */
router.get('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const accessToken = req.headers.authorization?.replace('Bearer ', '');

  const options = { accessToken };

  const result = await supabaseClient.getById('storage_locations', id, options);

  if (!result.success) {
    return res.status(404).json(result);
  }

  res.json({
    success: true,
    data: result.data
  });
}));

/**
 * POST /api/locations
 * Create new location
 */
router.post('/', asyncHandler(async (req, res) => {
  const accessToken = req.headers.authorization?.replace('Bearer ', '');
  const locationData = {
    ...req.body,
    active: req.body.active !== undefined ? req.body.active : true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const result = await supabaseClient.create('storage_locations', locationData, { accessToken });

  if (!result.success) {
    return res.status(400).json(result);
  }

  res.status(201).json({
    success: true,
    data: result.data
  });
}));

/**
 * PUT /api/locations/:id
 * Update location
 */
router.put('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const accessToken = req.headers.authorization?.replace('Bearer ', '');
  
  const updateData = {
    ...req.body,
    updated_at: new Date().toISOString()
  };

  const result = await supabaseClient.update('storage_locations', id, updateData, { accessToken });

  if (!result.success) {
    return res.status(400).json(result);
  }

  res.json({
    success: true,
    data: result.data
  });
}));

/**
 * DELETE /api/locations/:id
 * Delete location (soft delete by setting active = false)
 */
router.delete('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const accessToken = req.headers.authorization?.replace('Bearer ', '');

  // Soft delete by setting active = false
  const result = await supabaseClient.update('storage_locations', id, { 
    active: false,
    updated_at: new Date().toISOString()
  }, { accessToken });

  if (!result.success) {
    return res.status(400).json(result);
  }

  res.json({
    success: true,
    message: 'Location deactivated successfully'
  });
}));

module.exports = router;