// src/backend/api/routes/material-pricing.js
// Material pricing API routes for ICRS SPARC quarterly pricing adjustments
// Provides endpoints for material indices and pricing adjustment management

const express = require('express');
const rateLimit = require('express-rate-limit');
const { authMiddleware, requireAdmin, requireManager } = require('../middleware/auth');
const materialIndexService = require('../../services/pricing/MaterialIndexService');
const router = express.Router();

// Rate limiting for material pricing endpoints
const materialPricingRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: { success: false, error: 'Too many material pricing requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false
});

// Apply rate limiting to all material pricing routes
router.use(materialPricingRateLimit);

// ===========================================
// MATERIAL INDICES ENDPOINTS
// ===========================================

/**
 * @route   GET /api/material-pricing/indices
 * @desc    Get material indices with optional filtering
 * @access  Private (Manager+)
 * @params  ?material={material}&startDate={date}&endDate={date}&indexSource={source}&limit={number}
 */
router.get('/indices', 
  authMiddleware, 
  requireManager,
  async (req, res) => {
    try {
      const { 
        material, 
        startDate, 
        endDate, 
        indexSource, 
        limit = 100 
      } = req.query;

      const options = {
        material,
        startDate,
        endDate,
        indexSource,
        limit: parseInt(limit),
        accessToken: req.accessToken
      };

      const result = await materialIndexService.getAllMaterialIndices(options);

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.json({
        success: true,
        data: result.data,
        meta: {
          material: material || 'all',
          dateRange: {
            start: startDate || null,
            end: endDate || null
          },
          indexSource: indexSource || 'all',
          limit: parseInt(limit),
          resultCount: result.data.length
        }
      });
    } catch (error) {
      console.error('Material indices fetch error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error fetching material indices'
      });
    }
  }
);

/**
 * @route   POST /api/material-pricing/indices
 * @desc    Add new material index price
 * @access  Private (Admin only)
 * @body    { material: string, price_usd_per_mt: number, price_date: string, index_source?: string, data_period?: string, fx_rate_cny_usd?: number }
 */
router.post('/indices',
  authMiddleware,
  requireAdmin,
  async (req, res) => {
    try {
      const indexData = req.body;
      
      const options = {
        accessToken: req.accessToken,
        userId: req.user.id
      };

      const result = await materialIndexService.addMaterialIndex(indexData, options);

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.status(201).json({
        success: true,
        data: result.data,
        message: result.message || 'Material index added successfully'
      });
    } catch (error) {
      console.error('Add material index error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error adding material index'
      });
    }
  }
);

/**
 * @route   POST /api/material-pricing/indices/batch
 * @desc    Add multiple material indices in batch
 * @access  Private (Admin only)
 * @body    { indices: [{ material, price_usd_per_mt, price_date, ... }] }
 */
router.post('/indices/batch',
  authMiddleware,
  requireAdmin,
  async (req, res) => {
    try {
      const { indices } = req.body;
      
      if (!Array.isArray(indices) || indices.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Indices array is required and must not be empty'
        });
      }

      const options = {
        accessToken: req.accessToken,
        userId: req.user.id
      };

      const result = await materialIndexService.batchAddMaterialIndices(indices, options);

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.status(201).json({
        success: true,
        data: result.data,
        message: result.message || 'Material indices batch added successfully'
      });
    } catch (error) {
      console.error('Batch add material indices error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error adding material indices batch'
      });
    }
  }
);

/**
 * @route   GET /api/material-pricing/indices/latest
 * @desc    Get latest price for each material
 * @access  Private (Manager+)
 */
router.get('/indices/latest',
  authMiddleware,
  requireManager,
  async (req, res) => {
    try {
      const options = {
        accessToken: req.accessToken
      };

      const result = await materialIndexService.getLatestPrices(options);

      if (!result.success) {
        return res.status(500).json(result);
      }

      res.json({
        success: true,
        data: result.data,
        meta: {
          resultCount: result.data.length,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Latest prices fetch error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error fetching latest prices'
      });
    }
  }
);

/**
 * @route   POST /api/material-pricing/calculate-average
 * @desc    Calculate 3-month rolling average for material
 * @access  Private (Manager+)
 * @body    { material: string, month1: string, month2: string, month3: string }
 */
router.post('/calculate-average',
  authMiddleware,
  requireManager,
  async (req, res) => {
    try {
      const { material, month1, month2, month3 } = req.body;

      if (!material || !month1 || !month2 || !month3) {
        return res.status(400).json({
          success: false,
          error: 'Material and three months (YYYY-MM format) are required'
        });
      }

      const options = {
        accessToken: req.accessToken
      };

      const result = await materialIndexService.calculate3MonthAverage(
        material, month1, month2, month3, options
      );

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.json({
        success: true,
        data: result.data,
        meta: {
          calculation: '3_month_rolling',
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Calculate average error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error calculating 3-month average'
      });
    }
  }
);

// ===========================================
// PRICING ADJUSTMENTS ENDPOINTS
// ===========================================

/**
 * @route   GET /api/material-pricing/adjustments
 * @desc    Get pricing adjustments with optional filtering
 * @access  Private (Manager+)
 * @params  ?status={status}&material={material}&limit={number}
 */
router.get('/adjustments',
  authMiddleware,
  requireManager,
  async (req, res) => {
    try {
      const { status, material, limit = 50 } = req.query;

      const options = {
        status,
        material,
        limit: parseInt(limit),
        accessToken: req.accessToken
      };

      const result = await materialIndexService.getAllPricingAdjustments(options);

      if (!result.success) {
        return res.status(500).json(result);
      }

      res.json({
        success: true,
        data: result.data,
        meta: {
          status: status || 'all',
          material: material || 'all',
          limit: parseInt(limit),
          resultCount: result.data.length
        }
      });
    } catch (error) {
      console.error('Pricing adjustments fetch error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error fetching pricing adjustments'
      });
    }
  }
);

/**
 * @route   POST /api/material-pricing/adjustments
 * @desc    Create new pricing adjustment
 * @access  Private (Admin only)
 * @body    { adjustment_name, material, data_months, communication_month, effective_month, old_average_price, new_average_price, pricing_formula, ... }
 */
router.post('/adjustments',
  authMiddleware,
  requireAdmin,
  async (req, res) => {
    try {
      const adjustmentData = req.body;

      // Validate adjustment data
      const validation = materialIndexService.validatePricingAdjustmentData(adjustmentData);
      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: validation.errors
        });
      }

      const options = {
        accessToken: req.accessToken,
        userId: req.user.id
      };

      const result = await materialIndexService.createPricingAdjustment(adjustmentData, options);

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.status(201).json({
        success: true,
        data: result.data,
        message: result.message || 'Pricing adjustment created successfully'
      });
    } catch (error) {
      console.error('Create pricing adjustment error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error creating pricing adjustment'
      });
    }
  }
);

/**
 * @route   POST /api/material-pricing/adjustments/:id/apply
 * @desc    Apply pricing adjustment to parts
 * @access  Private (Admin only)
 */
router.post('/adjustments/:id/apply',
  authMiddleware,
  requireAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({
          success: false,
          error: 'Adjustment ID is required'
        });
      }

      const options = {
        accessToken: req.accessToken,
        userId: req.user.id
      };

      const result = await materialIndexService.applyPricingAdjustment(id, options);

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.json({
        success: true,
        data: result.data,
        message: result.message || 'Pricing adjustment applied successfully'
      });
    } catch (error) {
      console.error('Apply pricing adjustment error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error applying pricing adjustment'
      });
    }
  }
);

// ===========================================
// UTILITY ENDPOINTS
// ===========================================

/**
 * @route   GET /api/material-pricing/materials
 * @desc    Get supported materials list
 * @access  Private
 */
router.get('/materials',
  authMiddleware,
  async (req, res) => {
    try {
      const result = materialIndexService.getSupportedMaterials();
      res.json(result);
    } catch (error) {
      console.error('Supported materials fetch error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error fetching supported materials'
      });
    }
  }
);

/**
 * @route   GET /api/material-pricing/timeline
 * @desc    Get pricing timeline for current date
 * @access  Private (Manager+)
 * @params  ?currentDate={YYYY-MM-DD}
 */
router.get('/timeline',
  authMiddleware,
  requireManager,
  async (req, res) => {
    try {
      const { currentDate } = req.query;
      const date = currentDate ? new Date(currentDate) : new Date();

      if (currentDate && isNaN(date.getTime())) {
        return res.status(400).json({
          success: false,
          error: 'Invalid date format. Use YYYY-MM-DD'
        });
      }

      const timeline = materialIndexService.getPricingTimeline(date);

      res.json({
        success: true,
        data: timeline,
        meta: {
          referenceDate: date.toISOString().split('T')[0],
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Pricing timeline error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error generating pricing timeline'
      });
    }
  }
);

/**
 * @route   GET /api/material-pricing/status
 * @desc    Get material pricing service status
 * @access  Private
 */
router.get('/status',
  authMiddleware,
  async (req, res) => {
    try {
      // Get latest price count for each material
      const latestPricesResult = await materialIndexService.getLatestPrices({
        accessToken: req.accessToken
      });

      const materials = materialIndexService.getSupportedMaterials();

      res.json({
        success: true,
        data: {
          serviceName: 'Material Pricing Service',
          version: '1.0.0',
          supportedMaterials: materials.data,
          latestPricesAvailable: latestPricesResult.success ? latestPricesResult.data.length : 0,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Service status error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error retrieving service status'
      });
    }
  }
);

module.exports = router;