// src/backend/api/routes/hts.js
// HTS (Harmonized Tariff Schedule) API routes for ICRS SPARC
// Provides endpoints for HTS code lookup, duty calculation, and data management

const express = require('express');
const rateLimit = require('express-rate-limit');
const htsService = require('../../services/reference/HTSService');
const { authenticateToken } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validation');
const router = express.Router();

// Rate limiting for HTS endpoints
const htsRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Limit each IP to 200 requests per windowMs
  message: { success: false, error: 'Too many HTS requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false
});

// Apply rate limiting to all HTS routes
router.use(htsRateLimit);

// Initialize HTS service on first request
router.use(async (req, res, next) => {
  if (!htsService.htsData) {
    try {
      await htsService.initialize();
    } catch (error) {
      console.error('Failed to initialize HTS service:', error);
    }
  }
  next();
});

/**
 * @route   GET /api/hts/search
 * @desc    Search HTS codes by description or number
 * @access  Private
 * @params  ?q={searchTerm}&type={description|code}&limit={number}&countryOfOrigin={countryCode}
 */
router.get('/search', authenticateToken, async (req, res) => {
  try {
    const { q: searchTerm, type = 'description', limit = 100, countryOfOrigin } = req.query;

    if (!searchTerm || searchTerm.trim().length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Search term must be at least 2 characters long'
      });
    }

    let result;
    if (type === 'code') {
      result = await htsService.searchByHtsNumber(searchTerm, parseInt(limit));
    } else {
      result = await htsService.searchByDescription(searchTerm, parseInt(limit));
    }

    if (!result.success) {
      return res.status(500).json(result);
    }

    // Add duty information if country of origin is specified
    if (countryOfOrigin && result.data) {
      result.data = result.data.map(entry => ({
        ...entry,
        dutyInfo: htsService.getDutyRate(entry, countryOfOrigin)
      }));
    }

    res.json({
      success: true,
      data: result.data,
      meta: {
        searchTerm,
        searchType: type,
        limit: parseInt(limit),
        resultCount: result.data.length,
        countryOfOrigin: countryOfOrigin || null
      }
    });

  } catch (error) {
    console.error('HTS search error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during HTS search'
    });
  }
});

/**
 * @route   GET /api/hts/code/:htsCode
 * @desc    Get specific HTS code information
 * @access  Private
 * @params  ?countryOfOrigin={countryCode}
 */
router.get('/code/:htsCode', authenticateToken, async (req, res) => {
  try {
    const { htsCode } = req.params;
    const { countryOfOrigin } = req.query;

    if (!htsCode) {
      return res.status(400).json({
        success: false,
        error: 'HTS code is required'
      });
    }

    const result = await htsService.getByHtsNumber(htsCode);

    if (!result.success) {
      return res.status(404).json(result);
    }

    // Add duty information if country of origin is specified
    let dutyInfo = null;
    if (countryOfOrigin) {
      dutyInfo = htsService.getDutyRate(result.data, countryOfOrigin);
    }

    res.json({
      success: true,
      data: {
        ...result.data,
        dutyInfo: dutyInfo
      }
    });

  } catch (error) {
    console.error('HTS code lookup error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during HTS code lookup'
    });
  }
});

/**
 * @route   POST /api/hts/duty-rate
 * @desc    Calculate duty rate for HTS code and country combination
 * @access  Private
 * @body    { htsCode: string, countryOfOrigin: string }
 */
router.post('/duty-rate', 
  authenticateToken,
  validateRequest([
    { field: 'htsCode', type: 'string', required: true },
    { field: 'countryOfOrigin', type: 'string', required: true, minLength: 2, maxLength: 2 }
  ]),
  async (req, res) => {
    try {
      const { htsCode, countryOfOrigin } = req.body;

      // Get HTS entry first
      const htsResult = await htsService.getByHtsNumber(htsCode);
      if (!htsResult.success) {
        return res.status(404).json({
          success: false,
          error: 'HTS code not found'
        });
      }

      // Calculate duty rate
      const dutyInfo = htsService.getDutyRate(htsResult.data, countryOfOrigin);

      res.json({
        success: true,
        data: {
          htsCode: htsCode,
          countryOfOrigin: countryOfOrigin,
          htsEntry: htsResult.data,
          dutyInfo: dutyInfo
        }
      });

    } catch (error) {
      console.error('Duty rate calculation error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error during duty rate calculation'
      });
    }
  }
);

/**
 * @route   GET /api/hts/popular
 * @desc    Get popular/commonly used HTS codes
 * @access  Private
 * @params  ?limit={number}
 */
router.get('/popular', authenticateToken, async (req, res) => {
  try {
    const { limit = 20 } = req.query;

    const result = await htsService.getPopularHtsCodes(parseInt(limit));

    if (!result.success) {
      return res.status(500).json(result);
    }

    res.json({
      success: true,
      data: result.data,
      meta: {
        limit: parseInt(limit),
        resultCount: result.data.length
      }
    });

  } catch (error) {
    console.error('Popular HTS codes error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error retrieving popular HTS codes'
    });
  }
});

/**
 * @route   GET /api/hts/countries
 * @desc    Get list of supported countries for duty calculations
 * @access  Private
 */
router.get('/countries', authenticateToken, async (req, res) => {
  try {
    const countries = htsService.getCountryList();

    res.json({
      success: true,
      data: countries,
      meta: {
        resultCount: countries.length
      }
    });

  } catch (error) {
    console.error('Countries list error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error retrieving countries list'
    });
  }
});

/**
 * @route   GET /api/hts/browse
 * @desc    Browse HTS codes with pagination
 * @access  Private
 * @params  ?offset={number}&limit={number}&includeHeaders={boolean}
 */
router.get('/browse', authenticateToken, async (req, res) => {
  try {
    const { 
      offset = 0, 
      limit = 50, 
      includeHeaders = true 
    } = req.query;

    const options = {
      offset: parseInt(offset),
      limit: parseInt(limit),
      includeHeaders: includeHeaders === 'true'
    };

    const result = await htsService.getAllHtsData(options);

    if (!result.success) {
      return res.status(500).json(result);
    }

    res.json({
      success: true,
      data: result.data,
      meta: {
        offset: result.offset,
        limit: result.limit,
        total: result.total,
        resultCount: result.data.length,
        includeHeaders: options.includeHeaders
      }
    });

  } catch (error) {
    console.error('HTS browse error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during HTS browse'
    });
  }
});

/**
 * @route   POST /api/hts/refresh
 * @desc    Refresh HTS data from USITC (admin only)
 * @access  Private (Admin)
 */
router.post('/refresh', 
  authenticateToken,
  async (req, res) => {
    try {
      // Check if user has admin permissions
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Admin privileges required for data refresh'
        });
      }

      const result = await htsService.refreshData();

      res.json({
        success: true,
        data: {
          refreshed: true,
          source: result.source,
          count: result.count || 0,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('HTS refresh error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error during HTS data refresh'
      });
    }
  }
);

/**
 * @route   GET /api/hts/status
 * @desc    Get HTS service status and cache information
 * @access  Private
 */
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const status = htsService.getDataStatus();

    res.json({
      success: true,
      data: {
        ...status,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('HTS status error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error retrieving HTS status'
    });
  }
});

module.exports = router;