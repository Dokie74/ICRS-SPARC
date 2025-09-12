// src/backend/api/routes/preadmission.js
// Pre-admission management routes for ICRS SPARC API
// Handles customs documentation workflow

const express = require('express');
const { asyncHandler } = require('../middleware/error-handler');
const { requireStaff, requireManager } = require('../middleware/auth');
const supabaseClient = require('../../db/supabase-client');
const preadmissionService = require('../../services/business/PreadmissionService');

const router = express.Router();

/**
 * GET /api/preadmission
 * Get all preadmissions with filtering and pagination
 */
router.get('/', asyncHandler(async (req, res) => {
  const { 
    limit = 100,
    offset = 0,
    status,
    customer_id,
    container_number,
    start_date,
    end_date,
    orderBy = 'created_at',
    ascending = 'false'
  } = req.query;


  try {
    const options = {
      select: `
        *,
        customers:customer_id(id, name, ein)
      `,
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
    if (status) {
      filters.push({ column: 'status', value: status });
    }
    if (customer_id) filters.push({ column: 'customer_id', value: customer_id });
    if (container_number) {
      filters.push({ 
        column: 'container_number', 
        value: `%${container_number}%`, 
        operator: 'ilike' 
      });
    }
    if (start_date) {
      filters.push({ column: 'created_at', value: start_date, operator: 'gte' });
    }
    if (end_date) {
      filters.push({ column: 'created_at', value: end_date, operator: 'lte' });
    }

    if (filters.length > 0) {
      options.filters = filters;
    }

    const result = await supabaseClient.getAll('preadmissions', options);

    // Transform data to include calculated totals
    const transformedData = (result.data || []).map(pa => {
      const lineItems = pa.items || [];
      const totals = lineItems.reduce((acc, item) => {
        acc.total_quantity += item.quantity || 0;
        acc.total_value += item.total_value || 0;
        acc.line_count += 1;
        return acc;
      }, { total_quantity: 0, total_value: 0, line_count: 0 });

      return {
        ...pa,
        line_items_summary: totals,
        customer_name: pa.customers?.name,
        customer_code: pa.customers?.ein
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
    console.error('Get preadmissions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve preadmissions'
    });
  }
}));

/**
 * GET /api/preadmission/:id
 * Get specific preadmission by ID with full details
 */
router.get('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    const result = await supabaseClient.getById(
      'preadmissions',
      id,
      {
        select: `
          *,
          customers:customer_id(id, name, ein, contact_email)
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
        error: 'Preadmission not found'
      });
    }

    // Calculate totals and organize data
    const preadmission = result.data;
    const lineItems = preadmission.items || [];
    
    const totals = lineItems.reduce((acc, item) => {
      acc.total_quantity += item.quantity || 0;
      acc.total_value += item.total_value || 0;
      acc.line_count += 1;
      return acc;
    }, { total_quantity: 0, total_value: 0, line_count: 0 });

    res.json({
      success: true,
      data: {
        ...preadmission,
        line_items: lineItems,
        totals
      }
    });
  } catch (error) {
    console.error('Get preadmission error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve preadmission'
    });
  }
}));

/**
 * POST /api/preadmission
 * Create new preadmission
 */
router.post('/', requireStaff, asyncHandler(async (req, res) => {
  try {
    // Use the PreadmissionService to create preadmission with proper field mapping
    const result = await preadmissionService.createPreadmission(req.body);
    
    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Error creating preadmission:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}));

/**
 * PUT /api/preadmission/:id
 * Update preadmission
 */
router.put('/:id', requireStaff, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updateData = { ...req.body };

  // Remove fields that shouldn't be updated directly
  delete updateData.id;
  delete updateData.created_at;
  delete updateData.created_by;
  delete updateData.line_items; // Line items updated separately

  // Add audit fields
  updateData.updated_at = new Date().toISOString();
  updateData.updated_by = req.user.id;

  try {
    const result = await supabaseClient.update(
      'preadmissions',
      id,
      updateData,
      { accessToken: req.accessToken },
      false  // Use RLS
    );

    res.json(result);
  } catch (error) {
    console.error('Update preadmission error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update preadmission'
    });
  }
}));

/**
 * PUT /api/preadmission/:id/status
 * Update preadmission status
 */
router.put('/:id/status', requireStaff, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, notes } = req.body;

  const validStatuses = ['pending', 'in_progress', 'completed', 'cancelled', 'released'];
  
  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
    });
  }

  try {
    const updateData = {
      status,
      updated_at: new Date().toISOString(),
      updated_by: req.user.id
    };

    if (notes) {
      updateData.status_notes = notes;
    }

    // Set release date if status is being set to released
    if (status === 'released') {
      updateData.release_date = new Date().toISOString();
    }

    const result = await supabaseClient.update(
      'preadmissions',
      id,
      updateData,
      { accessToken: req.accessToken },
      false  // Use RLS
    );

    res.json(result);
  } catch (error) {
    console.error('Update preadmission status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update preadmission status'
    });
  }
}));

/**
 * DELETE /api/preadmission/:id
 * Delete preadmission (hard delete if no related data)
 */
router.delete('/:id', requireManager, asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    // Delete the preadmission (items are stored as JSONB, no separate line items table)
    const result = await supabaseClient.delete(
      'preadmissions',
      id,
      { accessToken: req.accessToken },
      false  // Use RLS
    );

    res.json(result);
  } catch (error) {
    console.error('Delete preadmission error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete preadmission'
    });
  }
}));

/**
 * GET /api/preadmission/statuses
 * Get available preadmission statuses
 */
router.get('/reference/statuses', asyncHandler(async (req, res) => {
  const statuses = [
    { value: 'pending', label: 'Pending', description: 'Awaiting processing' },
    { value: 'in_progress', label: 'In Progress', description: 'Currently being processed' },
    { value: 'completed', label: 'Completed', description: 'Processing completed' },
    { value: 'released', label: 'Released', description: 'Released from customs' },
    { value: 'cancelled', label: 'Cancelled', description: 'Cancelled or rejected' }
  ];

  res.json({
    success: true,
    data: statuses
  });
}));

module.exports = router;