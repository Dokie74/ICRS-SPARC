// src/backend/api/routes/receiving.js
// Receiving management routes for ICRS SPARC API
// Handles dock audits, FTZ compliance verification, and photo capture

const express = require('express');
const multer = require('multer');
const { asyncHandler } = require('../middleware/error-handler');
const { requireStaff, requireManager } = require('../middleware/auth');
const ReceivingService = require('../../services/business/ReceivingService');

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 10 // Maximum 10 files per upload
  },
  fileFilter: (req, file, cb) => {
    // Only allow image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

const router = express.Router();

/**
 * GET /api/receiving
 * Get all receivables (preadmissions) with filtering and pagination
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
    orderBy = 'arrival_date',
    ascending = 'false'
  } = req.query;

  const accessToken = req.headers.authorization?.replace('Bearer ', '') || req.accessToken;


  try {
    const options = {
      orderBy: orderBy ? {
        column: orderBy,
        ascending: ascending === 'true'
      } : undefined,
      limit: parseInt(limit),
      offset: parseInt(offset),
      accessToken: accessToken
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
      filters.push({ column: 'arrival_date', value: start_date, operator: 'gte' });
    }
    if (end_date) {
      filters.push({ column: 'arrival_date', value: end_date, operator: 'lte' });
    }

    if (filters.length > 0) {
      options.filters = filters;
    }

    const result = await ReceivingService.getAllReceivables(options);

    if (!result.success) {
      return res.status(500).json(result);
    }

    // Transform data to include customer information
    const transformedData = result.data.map(receivable => {
      return {
        ...receivable,
        customer_name: receivable.customers?.name,
        customer_code: receivable.customers?.ein
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
    console.error('Get receivables error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve receivables'
    });
  }
}));

/**
 * GET /api/receiving/:id
 * Get specific receivable by ID with full details
 */
router.get('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    const result = await ReceivingService.getById(id, {
      accessToken: req.accessToken
    });

    if (!result.success) {
      return res.status(500).json(result);
    }

    if (!result.data) {
      return res.status(404).json({
        success: false,
        error: 'Receivable not found'
      });
    }

    res.json({
      success: true,
      data: result.data
    });
  } catch (error) {
    console.error('Get receivable error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve receivable'
    });
  }
}));

/**
 * GET /api/receiving/status/:status
 * Get receivables by status for workflow management
 */
router.get('/status/:status', asyncHandler(async (req, res) => {
  const { status } = req.params;
  const { limit = 50, offset = 0 } = req.query;

  try {
    const result = await ReceivingService.getReceivablesByStatus(status, {
      limit: parseInt(limit),
      offset: parseInt(offset),
      accessToken: req.accessToken
    });

    res.json({
      success: true,
      data: result.data || [],
      count: result.count || 0,
      status: status
    });
  } catch (error) {
    console.error('Get receivables by status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve receivables by status'
    });
  }
}));

/**
 * POST /api/receiving/:id/dock-audit
 * Submit dock audit for receivable with photo upload
 */
router.post('/:id/dock-audit', requireStaff, upload.array('photos', 10), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    audit_status,
    audit_notes,
    rejection_reason,
    seal_number,
    seal_intact,
    container_condition,
    skid_count,
    damage_reported,
    damage_description,
    admitted_items,
    ftz_compliance,
    temperature_check,
    weight_verified,
    documentation_complete
  } = req.body;

  const validAuditStatuses = ['Accepted', 'Rejected', 'Partial Accept', 'Pending Review'];
  
  if (!audit_status || !validAuditStatuses.includes(audit_status)) {
    return res.status(400).json({
      success: false,
      error: `Invalid audit status. Must be one of: ${validAuditStatuses.join(', ')}`
    });
  }

  try {
    // Process uploaded photos
    const photos = [];
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        photos.push({
          filename: file.originalname,
          data: file.buffer,
          size: file.size,
          content_type: file.mimetype,
          description: `Dock audit photo for ${id}`,
          photo_type: 'dock_audit'
        });
      });
    }

    // Parse admitted_items if it's a JSON string
    let parsedAdmittedItems = [];
    if (admitted_items) {
      try {
        parsedAdmittedItems = typeof admitted_items === 'string' 
          ? JSON.parse(admitted_items) 
          : admitted_items;
      } catch (e) {
        return res.status(400).json({
          success: false,
          error: 'Invalid admitted_items format. Must be valid JSON array.'
        });
      }
    }

    // Parse FTZ compliance data if provided
    let parsedFTZCompliance = null;
    if (ftz_compliance) {
      try {
        parsedFTZCompliance = typeof ftz_compliance === 'string' 
          ? JSON.parse(ftz_compliance) 
          : ftz_compliance;
      } catch (e) {
        return res.status(400).json({
          success: false,
          error: 'Invalid ftz_compliance format. Must be valid JSON object.'
        });
      }
    }

    const auditData = {
      admission_id: id,
      audit_status,
      audit_notes,
      rejection_reason,
      audited_by: req.user.user_metadata?.full_name || req.user.email,
      seal_number,
      seal_intact: seal_intact === 'true' || seal_intact === true,
      container_condition,
      skid_count: skid_count ? parseInt(skid_count) : null,
      damage_reported: damage_reported === 'true' || damage_reported === true,
      damage_description,
      admitted_items: parsedAdmittedItems,
      ftz_compliance: parsedFTZCompliance,
      temperature_check,
      weight_verified: weight_verified === 'true' || weight_verified === true,
      documentation_complete: documentation_complete === 'true' || documentation_complete === true,
      photos
    };

    const result = await ReceivingService.submitDockAudit(
      id, 
      auditData, 
      { accessToken: req.accessToken, userId: req.user.id }
    );

    if (result.success) {
      res.status(200).json({
        success: true,
        data: {
          ...result.data,
          message: 'Dock audit submitted successfully',
          photos_uploaded: photos.length
        }
      });
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Submit dock audit error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit dock audit'
    });
  }
}));

/**
 * POST /api/receiving/:id/ftz-compliance
 * Verify FTZ compliance for receivable
 */
router.post('/:id/ftz-compliance', requireStaff, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    documentation_complete,
    container_seal_verified,
    customs_inspection_passed,
    manifest_matches_cargo,
    hts_codes_verified,
    country_of_origin_verified,
    value_declaration_verified,
    special_requirements_met,
    notes
  } = req.body;

  if (typeof documentation_complete !== 'boolean' || 
      typeof container_seal_verified !== 'boolean' || 
      typeof customs_inspection_passed !== 'boolean') {
    return res.status(400).json({
      success: false,
      error: 'Missing required compliance fields: documentation_complete, container_seal_verified, customs_inspection_passed'
    });
  }

  try {
    const complianceData = {
      documentation_complete,
      container_seal_verified,
      customs_inspection_passed,
      manifest_matches_cargo: manifest_matches_cargo || false,
      hts_codes_verified: hts_codes_verified || false,
      country_of_origin_verified: country_of_origin_verified || false,
      value_declaration_verified: value_declaration_verified || false,
      special_requirements_met: special_requirements_met || false,
      verified_by: req.user.user_metadata?.full_name || req.user.email,
      notes
    };

    const result = await ReceivingService.verifyFTZCompliance(
      id, 
      complianceData, 
      { accessToken: req.accessToken, userId: req.user.id }
    );

    if (result.success) {
      res.status(200).json({
        success: true,
        data: {
          ...result.data,
          message: 'FTZ compliance verification completed'
        }
      });
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Verify FTZ compliance error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify FTZ compliance'
    });
  }
}));

/**
 * GET /api/receiving/pending
 * Get pending receivables awaiting dock audit
 */
router.get('/workflow/pending', asyncHandler(async (req, res) => {
  const { limit = 50, offset = 0 } = req.query;

  try {
    const result = await ReceivingService.getPendingReceivables({
      limit: parseInt(limit),
      offset: parseInt(offset),
      accessToken: req.accessToken
    });

    res.json({
      success: true,
      data: result.data || [],
      count: result.count || 0
    });
  } catch (error) {
    console.error('Get pending receivables error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve pending receivables'
    });
  }
}));

/**
 * GET /api/receiving/in-progress
 * Get receivables with in-progress dock audits
 */
router.get('/workflow/in-progress', asyncHandler(async (req, res) => {
  const { limit = 50, offset = 0 } = req.query;

  try {
    const result = await ReceivingService.getInProgressAudits({
      limit: parseInt(limit),
      offset: parseInt(offset),
      accessToken: req.accessToken
    });

    res.json({
      success: true,
      data: result.data || [],
      count: result.count || 0
    });
  } catch (error) {
    console.error('Get in-progress audits error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve in-progress audits'
    });
  }
}));

/**
 * POST /api/receiving/search
 * Search receivables with filters
 */
router.post('/search', asyncHandler(async (req, res) => {
  const {
    search_term,
    filters = {},
    limit = 100,
    offset = 0
  } = req.body;

  try {
    const result = await ReceivingService.searchReceivables(
      search_term,
      filters,
      {
        limit: parseInt(limit),
        offset: parseInt(offset),
        accessToken: req.accessToken
      }
    );

    res.json({
      success: true,
      data: result.data || [],
      count: result.data?.length || 0,
      search_term,
      filters
    });
  } catch (error) {
    console.error('Search receivables error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search receivables'
    });
  }
}));

/**
 * GET /api/receiving/:id/photos
 * Get audit photos for a specific receivable
 */
router.get('/:id/photos', asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    const result = await ReceivingService.getAuditPhotos(id, {
      accessToken: req.accessToken
    });

    res.json({
      success: true,
      data: result.data || [],
      count: result.data?.length || 0
    });
  } catch (error) {
    console.error('Get audit photos error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve audit photos'
    });
  }
}));

/**
 * GET /api/receiving/statistics
 * Get receiving statistics for reporting
 */
router.get('/reports/statistics', requireManager, asyncHandler(async (req, res) => {
  const {
    start_date,
    end_date
  } = req.query;

  try {
    const dateRange = {};
    if (start_date) dateRange.startDate = start_date;
    if (end_date) dateRange.endDate = end_date;

    const result = await ReceivingService.getReceivingStatistics(
      dateRange,
      { accessToken: req.accessToken }
    );

    res.json({
      success: true,
      data: result.data || {},
      date_range: dateRange
    });
  } catch (error) {
    console.error('Get receiving statistics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve receiving statistics'
    });
  }
}));

/**
 * GET /api/receiving/reference/audit-statuses
 * Get available audit statuses
 */
router.get('/reference/audit-statuses', asyncHandler(async (req, res) => {
  const auditStatuses = [
    { value: 'Accepted', label: 'Accepted', description: 'Shipment fully accepted' },
    { value: 'Rejected', label: 'Rejected', description: 'Shipment rejected' },
    { value: 'Partial Accept', label: 'Partial Accept', description: 'Partial shipment accepted' },
    { value: 'Pending Review', label: 'Pending Review', description: 'Audit pending review' }
  ];

  res.json({
    success: true,
    data: auditStatuses
  });
}));

/**
 * GET /api/receiving/reference/container-conditions
 * Get available container condition options
 */
router.get('/reference/container-conditions', asyncHandler(async (req, res) => {
  const conditions = [
    { value: 'Excellent', label: 'Excellent', description: 'No damage or issues' },
    { value: 'Good', label: 'Good', description: 'Minor cosmetic issues only' },
    { value: 'Fair', label: 'Fair', description: 'Some damage but cargo protected' },
    { value: 'Poor', label: 'Poor', description: 'Significant damage, cargo may be affected' },
    { value: 'Damaged', label: 'Damaged', description: 'Severe damage, cargo compromised' }
  ];

  res.json({
    success: true,
    data: conditions
  });
}));

/**
 * Error handling middleware for multer
 */
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'File size too large. Maximum size is 10MB per file.'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        error: 'Too many files. Maximum 10 files per upload.'
      });
    }
  }
  
  if (error.message === 'Only image files are allowed') {
    return res.status(400).json({
      success: false,
      error: 'Only image files are allowed for photo uploads.'
    });
  }
  
  next(error);
});

module.exports = router;