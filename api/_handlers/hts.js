// api/hts/index.js - Consolidated HTS API router for Vercel
const { setCorsHeaders, handleOptions } = require('../_utils/cors');
const { requireAuth } = require('../_utils/auth');

// Import all HTS data and utilities
const { COUNTRIES_DATA, getCountrySpecificInfo, getCountryName } = require('../../src/data/hts/countries-data');
const { POPULAR_HTS_CODES } = require('../../src/data/hts/popular-codes-data');
const { HTS_CODES_DATABASE } = require('../../src/data/hts/search-data');
const { HTS_BROWSE_DATA } = require('../../src/data/hts/browse-data');
const { DUTY_RATE_DATA, TRADE_AGREEMENTS } = require('../../src/data/hts/duty-rate-data');

async function handler(req, res) {
  // Handle CORS
  setCorsHeaders(res, req.headers.origin);
  if (handleOptions(req, res)) return;

  try {
    const { action } = req.query;
    
    if (!action) {
      return res.status(400).json({
        success: false,
        error: 'Action parameter is required. Available actions: countries, popular, status, search, browse, duty-rate, refresh',
        available_actions: ['countries', 'popular', 'status', 'search', 'browse', 'code', 'duty-rate', 'refresh']
      });
    }

    switch (action) {
      case 'countries':
        return await handleCountries(req, res);
      case 'popular':
        return await handlePopular(req, res);
      case 'status':
        return await handleStatus(req, res);
      case 'search':
        return await handleSearch(req, res);
      case 'browse':
        return await handleBrowse(req, res);
      case 'code':
        return await handleCodeLookup(req, res);
      case 'duty-rate':
        return await handleDutyRate(req, res);
      case 'refresh':
        return await handleRefresh(req, res);
      default:
        return res.status(400).json({
          success: false,
          error: `Unknown action: ${action}. Available actions: countries, popular, status, search, browse, code, duty-rate, refresh`
        });
    }
  } catch (error) {
    console.error('HTS API error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      action: req.query.action
    });
  }
}

// Handle countries endpoint
async function handleCountries(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: `Method ${req.method} not allowed` });
  }

  const { region, trade_agreement_only, search } = req.query;
  
  let filteredCountries = [...COUNTRIES_DATA];
  
  if (region) {
    filteredCountries = filteredCountries.filter(country => 
      country.region.toLowerCase() === region.toLowerCase()
    );
  }
  
  if (trade_agreement_only === 'true') {
    filteredCountries = filteredCountries.filter(country => 
      country.trade_agreement !== null
    );
  }
  
  if (search) {
    const searchTerm = search.toLowerCase();
    filteredCountries = filteredCountries.filter(country =>
      country.name.toLowerCase().includes(searchTerm) ||
      country.code.toLowerCase().includes(searchTerm)
    );
  }
  
  filteredCountries.sort((a, b) => a.name.localeCompare(b.name));
  
  res.json({
    success: true,
    data: filteredCountries,
    meta: {
      total: filteredCountries.length,
      available_regions: [...new Set(COUNTRIES_DATA.map(c => c.region))],
      trade_agreements: [...new Set(COUNTRIES_DATA.map(c => c.trade_agreement).filter(Boolean))]
    }
  });
}

// Handle popular codes endpoint
async function handlePopular(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: `Method ${req.method} not allowed` });
  }

  const { 
    limit = 20, 
    category, 
    usage_frequency,
    search 
  } = req.query;
  
  let filteredCodes = [...POPULAR_HTS_CODES];
  
  if (category) {
    filteredCodes = filteredCodes.filter(code => 
      code.category.toLowerCase() === category.toLowerCase()
    );
  }
  
  if (usage_frequency) {
    filteredCodes = filteredCodes.filter(code => 
      code.usage_frequency.toLowerCase() === usage_frequency.toLowerCase()
    );
  }
  
  if (search) {
    const searchTerm = search.toLowerCase();
    filteredCodes = filteredCodes.filter(code =>
      code.hts_code.includes(searchTerm) ||
      code.description.toLowerCase().includes(searchTerm) ||
      code.category.toLowerCase().includes(searchTerm)
    );
  }
  
  // Sort by usage frequency
  const frequencyOrder = { 'Very High': 3, 'High': 2, 'Medium': 1 };
  filteredCodes.sort((a, b) => {
    const freqDiff = frequencyOrder[b.usage_frequency] - frequencyOrder[a.usage_frequency];
    if (freqDiff !== 0) return freqDiff;
    return a.hts_code.localeCompare(b.hts_code);
  });
  
  const limitNum = parseInt(limit);
  if (limitNum > 0) {
    filteredCodes = filteredCodes.slice(0, limitNum);
  }
  
  res.json({
    success: true,
    data: filteredCodes,
    meta: {
      total: filteredCodes.length,
      available_categories: [...new Set(POPULAR_HTS_CODES.map(c => c.category))],
      available_frequencies: [...new Set(POPULAR_HTS_CODES.map(c => c.usage_frequency))],
      total_available: POPULAR_HTS_CODES.length
    }
  });
}

// Handle status endpoint
async function handleStatus(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: `Method ${req.method} not allowed` });
  }

  const currentTime = new Date().toISOString();
  
  const status = {
    service: 'HTS Lookup Service',
    status: 'operational',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'production',
    timestamp: currentTime,
    uptime: process.uptime(),
    endpoints: {
      countries: {
        status: 'operational',
        total_countries: COUNTRIES_DATA.length,
        last_updated: '2024-09-01T00:00:00.000Z'
      },
      popular_codes: {
        status: 'operational',
        total_codes: POPULAR_HTS_CODES.length,
        last_updated: '2024-09-01T00:00:00.000Z'
      },
      search: {
        status: 'operational',
        total_codes: HTS_CODES_DATABASE.length,
        description: 'Search functionality available'
      },
      duty_calculation: {
        status: 'operational',
        description: 'Basic duty rate calculation available'
      }
    },
    features: {
      code_lookup: true,
      description_search: true,
      duty_rates: true,
      country_filtering: true,
      popular_codes: true,
      caching: false,
      real_time_updates: false
    },
    limits: {
      max_search_results: 100,
      rate_limit: '1000 requests per hour',
      cache_duration: '15 minutes'
    }
  };
  
  res.json({
    success: true,
    data: status
  });
}

// Handle search endpoint
async function handleSearch(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: `Method ${req.method} not allowed` });
  }

  const { 
    q: searchTerm,
    type = 'description',
    limit = 100,
    countryOfOrigin,
    category
  } = req.query;
  
  if (!searchTerm || searchTerm.trim().length < 2) {
    return res.json({
      success: true,
      data: [],
      meta: {
        total: 0,
        search_term: searchTerm,
        search_type: type
      }
    });
  }
  
  const cleanSearchTerm = searchTerm.trim().toLowerCase();
  let results = [];
  
  if (type === 'code') {
    results = HTS_CODES_DATABASE.filter(item =>
      item.hts_code.toLowerCase().includes(cleanSearchTerm) ||
      item.hts_code.replace(/\./g, '').toLowerCase().includes(cleanSearchTerm.replace(/\./g, ''))
    );
  } else {
    results = HTS_CODES_DATABASE.filter(item =>
      item.description.toLowerCase().includes(cleanSearchTerm) ||
      item.category.toLowerCase().includes(cleanSearchTerm)
    );
  }
  
  if (category) {
    results = results.filter(item =>
      item.category.toLowerCase() === category.toLowerCase()
    );
  }
  
  // Sort results by relevance
  results = results.sort((a, b) => {
    if (type === 'code') {
      const aExact = a.hts_code.toLowerCase() === cleanSearchTerm;
      const bExact = b.hts_code.toLowerCase() === cleanSearchTerm;
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;
    } else {
      const aStartsWith = a.description.toLowerCase().startsWith(cleanSearchTerm);
      const bStartsWith = b.description.toLowerCase().startsWith(cleanSearchTerm);
      if (aStartsWith && !bStartsWith) return -1;
      if (!aStartsWith && bStartsWith) return 1;
    }
    return a.hts_code.localeCompare(b.hts_code);
  });
  
  const limitNum = parseInt(limit);
  if (limitNum > 0 && limitNum < results.length) {
    results = results.slice(0, limitNum);
  }
  
  // Add country-specific rates if requested
  if (countryOfOrigin) {
    results = results.map(item => ({
      ...item,
      country_specific_rate: getCountrySpecificRate(item.hts_code, countryOfOrigin)
    }));
  }
  
  res.json({
    success: true,
    data: results,
    meta: {
      total: results.length,
      search_term: searchTerm,
      search_type: type,
      country_of_origin: countryOfOrigin,
      available_categories: [...new Set(HTS_CODES_DATABASE.map(c => c.category))],
      total_database_entries: HTS_CODES_DATABASE.length
    }
  });
}

// Handle browse endpoint
async function handleBrowse(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: `Method ${req.method} not allowed` });
  }

  const { 
    offset = 0,
    limit = 50,
    includeHeaders = 'true',
    level,
    chapter,
    heading,
    subheading
  } = req.query;
  
  let filteredData = [...HTS_BROWSE_DATA];
  
  if (level) {
    filteredData = filteredData.filter(item => item.level === level);
  }
  
  if (chapter) {
    filteredData = filteredData.filter(item => 
      item.chapter === chapter || item.code === chapter
    );
  }
  
  if (heading) {
    filteredData = filteredData.filter(item =>
      item.heading === heading || item.code === heading
    );
  }
  
  if (subheading) {
    filteredData = filteredData.filter(item =>
      item.subheading === subheading || item.code === subheading  
    );
  }
  
  if (includeHeaders === 'false') {
    filteredData = filteredData.filter(item => item.type === 'tariff_line');
  }
  
  // Sort by code
  filteredData.sort((a, b) => {
    const aCode = a.hts_code || a.code;
    const bCode = b.hts_code || b.code;
    return aCode.localeCompare(bCode);
  });
  
  // Apply pagination
  const offsetNum = parseInt(offset);
  const limitNum = parseInt(limit);
  const total = filteredData.length;
  
  if (limitNum > 0) {
    filteredData = filteredData.slice(offsetNum, offsetNum + limitNum);
  }
  
  res.json({
    success: true,
    data: filteredData,
    meta: {
      total: total,
      offset: offsetNum,
      limit: limitNum,
      returned: filteredData.length,
      has_more: offsetNum + filteredData.length < total,
      filters_applied: { level, chapter, heading, subheading, include_headers: includeHeaders === 'true' },
      available_levels: ['chapter', 'heading', 'subheading', 'tariff_line'],
      available_chapters: [...new Set(HTS_BROWSE_DATA.filter(item => item.chapter).map(item => item.chapter))].sort()
    }
  });
}

// Handle code lookup endpoint
async function handleCodeLookup(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: `Method ${req.method} not allowed` });
  }

  const { htsCode, countryOfOrigin } = req.query;
  
  if (!htsCode) {
    return res.status(400).json({
      success: false,
      error: 'HTS code is required (use ?htsCode=XXXX.XX.XXXX)'
    });
  }
  
  const normalizedCode = htsCode.replace(/\./g, '');
  const searchCode = htsCode.toLowerCase();
  
  const htsData = HTS_CODES_DATABASE.find(item =>
    item.hts_code.toLowerCase() === searchCode ||
    item.hts_code.replace(/\./g, '').toLowerCase() === normalizedCode.toLowerCase()
  );
  
  if (!htsData) {
    return res.status(404).json({
      success: false,
      error: `HTS code '${htsCode}' not found`
    });
  }
  
  let responseData = {
    ...htsData,
    found: true,
    lookup_date: new Date().toISOString(),
    notes: []
  };
  
  if (countryOfOrigin) {
    const countryInfo = getCountrySpecificInfo(htsCode, countryOfOrigin);
    responseData.country_specific = countryInfo;
    
    if (countryInfo.applicable_rate !== responseData.general_rate) {
      responseData.notes.push(`Special rate applies for ${countryOfOrigin}: ${countryInfo.applicable_rate}`);
    }
  }
  
  if (responseData.general_rate === '0%') {
    responseData.notes.push('This item is duty-free under general rates');
  }
  
  res.json({
    success: true,
    data: responseData
  });
}

// Handle duty rate calculation
async function handleDutyRate(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: `Method ${req.method} not allowed` });
  }

  const { htsCode, countryOfOrigin } = req.body;
  
  if (!htsCode) {
    return res.status(400).json({
      success: false,
      error: 'HTS code is required'
    });
  }
  
  if (!countryOfOrigin) {
    return res.status(400).json({
      success: false,
      error: 'Country of origin is required'
    });
  }
  
  const normalizedHts = htsCode.trim().toUpperCase();
  const normalizedCountry = countryOfOrigin.trim().toUpperCase();
  
  const dutyData = DUTY_RATE_DATA[normalizedHts];
  
  if (!dutyData) {
    return res.status(404).json({
      success: false,
      error: `Duty rate data not available for HTS code: ${htsCode}`
    });
  }
  
  const applicableRate = dutyData.special_rates[normalizedCountry] || dutyData.special_rates.default || dutyData.general_rate;
  const tradeAgreement = TRADE_AGREEMENTS[normalizedCountry] || null;
  const isPreferential = applicableRate !== dutyData.general_rate && applicableRate.toLowerCase() !== dutyData.general_rate.toLowerCase();
  const isDutyFree = applicableRate.toLowerCase() === 'free' || applicableRate === '0%';
  
  const result = {
    hts_code: normalizedHts,
    country_of_origin: normalizedCountry,
    general_rate: dutyData.general_rate,
    applicable_rate: applicableRate,
    is_preferential: isPreferential,
    is_duty_free: isDutyFree,
    trade_agreement: tradeAgreement,
    calculation_date: new Date().toISOString(),
    notes: [],
    requirements: []
  };
  
  if (isPreferential) {
    result.notes.push(`Preferential rate available under ${tradeAgreement}`);
    result.requirements.push('Certificate of origin required');
    result.requirements.push('Must meet origin requirements');
  }
  
  if (isDutyFree) {
    result.notes.push('This product is duty-free from this country');
  }
  
  result.notes.push('Rates subject to change - verify current status before entry');
  
  res.json({
    success: true,
    data: result
  });
}

// Handle refresh endpoint (admin only)
async function handleRefresh(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: `Method ${req.method} not allowed` });
  }

  const refreshResult = {
    status: 'completed',
    started_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
    duration_ms: 1500,
    updates: {
      hts_codes_updated: 0,
      countries_updated: 0,
      duty_rates_updated: 0,
      new_codes_added: 0,
      deprecated_codes_removed: 0
    },
    data_sources: {
      primary: 'Static reference data',
      last_official_update: '2024-09-01T00:00:00.000Z',
      next_scheduled_update: 'Manual refresh required'
    },
    notes: [
      'This is a simulated refresh - no actual data was updated',
      'In production, this would sync with official HTS databases',
      'Admin privileges required for actual data refresh'
    ],
    cache_cleared: true,
    endpoints_affected: [
      '/api/hts?action=search',
      '/api/hts?action=countries', 
      '/api/hts?action=popular',
      '/api/hts?action=browse',
      '/api/hts?action=code',
      '/api/hts?action=duty-rate'
    ]
  };
  
  res.json({
    success: true,
    data: refreshResult
  });
}

// Helper function for country-specific rates
function getCountrySpecificRate(htsCode, countryCode) {
  const tradeAgreements = {
    'CA': 'Free', // USMCA
    'MX': 'Free', // USMCA
    'CN': 'Variable',
    'GB': 'Standard',
    'DE': 'Standard'
  };
  
  const agreement = tradeAgreements[countryCode?.toUpperCase()] || 'Standard';
  
  return {
    applicable_rate: agreement === 'Free' ? '0%' : 'See tariff schedule',
    trade_agreement: agreement,
    notes: agreement === 'Free' ? 'Duty-free under trade agreement' : 'Standard MFN rates apply'
  };
}

// Export with auth requirement for refresh endpoint only
module.exports = (req, res) => {
  if (req.query.action === 'refresh') {
    return requireAuth(handler)(req, res);
  }
  return handler(req, res);
};