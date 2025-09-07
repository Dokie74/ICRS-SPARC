// src/backend/api/routes/tariff.js
// Tariff lookup API routes for ICRS SPARC
// Provides HTS code tariff rate lookups for customs calculations

const express = require('express');
const { asyncHandler } = require('../middleware/async');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();

// Mock tariff data for development
// In production, this would integrate with CBP's API or a tariff database
const mockTariffData = {
  '8708.80.6590': {
    hts_code: '8708.80.6590',
    description: 'Suspension systems and parts thereof (including shock absorbers)',
    mfn_rate: 2.5,
    column2_rate: 35.0,
    antidumping_rate: 0,
    effective_date: '2024-01-01T00:00:00Z',
    source: 'CBP HTSUS'
  },
  '8708.50.8900': {
    hts_code: '8708.50.8900',
    description: 'Drive-axles with differential, non-driving axles, and parts',
    mfn_rate: 3.0,
    column2_rate: 35.0,
    antidumping_rate: 0,
    effective_date: '2024-01-01T00:00:00Z',
    source: 'CBP HTSUS'
  }
};

// GET /api/tariff/lookup - Lookup tariff rates for HTS code
router.get('/lookup', asyncHandler(async (req, res) => {
  const { hts_code, country } = req.query;
  
  // Validation
  if (!hts_code) {
    return res.status(400).json({
      success: false,
      error: 'HTS code is required'
    });
  }
  
  if (!country) {
    return res.status(400).json({
      success: false,
      error: 'Country is required'
    });
  }

  try {
    // Clean HTS code (remove dots, spaces, etc.)
    const cleanHtsCode = hts_code.replace(/[^\d]/g, '');
    const formattedHtsCode = `${cleanHtsCode.slice(0,4)}.${cleanHtsCode.slice(4,6)}.${cleanHtsCode.slice(6)}`;
    
    // Look up tariff data (currently using mock data)
    const tariffInfo = mockTariffData[hts_code] || mockTariffData[formattedHtsCode];
    
    if (!tariffInfo) {
      // Return default rates for unknown HTS codes
      return res.json({
        success: true,
        data: {
          hts_code: hts_code,
          description: 'Tariff information not available',
          mfn_rate: 0,
          column2_rate: 0,
          antidumping_rate: 0,
          effective_date: new Date().toISOString(),
          source: 'Default rates',
          country_specific_notes: country !== 'US' ? `Rates for ${country} origin` : null
        }
      });
    }

    // Apply country-specific adjustments if needed
    let adjustedRates = { ...tariffInfo };
    
    // Example: China might have different anti-dumping rates
    if (country.toLowerCase() === 'china') {
      // This would be based on actual trade policy
      if (hts_code.startsWith('8708')) {
        adjustedRates.antidumping_rate = 10.0; // Example AD rate for Chinese auto parts
      }
    }
    
    // Add country-specific information
    adjustedRates.country_specific_notes = country !== 'US' ? `Rates applied for ${country} origin` : null;

    return res.json({
      success: true,
      data: adjustedRates
    });
    
  } catch (error) {
    console.error('Tariff lookup error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to lookup tariff information'
    });
  }
}));

// GET /api/tariff/search - Search HTS codes by description
router.get('/search', asyncHandler(async (req, res) => {
  const { query, limit = 10 } = req.query;
  
  if (!query) {
    return res.status(400).json({
      success: false,
      error: 'Search query is required'
    });
  }

  try {
    // Mock search results - in production this would search a comprehensive HTS database
    const searchResults = Object.values(mockTariffData)
      .filter(item => 
        item.description.toLowerCase().includes(query.toLowerCase()) ||
        item.hts_code.includes(query)
      )
      .slice(0, parseInt(limit));

    return res.json({
      success: true,
      data: searchResults,
      meta: {
        total: searchResults.length,
        query: query,
        limit: parseInt(limit)
      }
    });
    
  } catch (error) {
    console.error('Tariff search error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to search tariff codes'
    });
  }
}));

// GET /api/tariff/validate/:hts_code - Validate HTS code format
router.get('/validate/:hts_code', asyncHandler(async (req, res) => {
  const { hts_code } = req.params;
  
  try {
    // Basic HTS code validation (US format: NNNN.NN.NNNN)
    const htsPattern = /^\d{4}\.\d{2}\.\d{4}$/;
    const isValid = htsPattern.test(hts_code);
    
    return res.json({
      success: true,
      data: {
        hts_code: hts_code,
        is_valid: isValid,
        format: 'NNNN.NN.NNNN',
        errors: isValid ? [] : ['Invalid HTS code format. Expected format: NNNN.NN.NNNN']
      }
    });
    
  } catch (error) {
    console.error('HTS validation error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to validate HTS code'
    });
  }
}));

module.exports = router;