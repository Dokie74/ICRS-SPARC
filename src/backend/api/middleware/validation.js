// src/backend/api/middleware/validation.js
// Request validation middleware for ICRS SPARC API

const validateRequest = (req, res, next) => {
  next();
};

const validateHtsSearch = (req, res, next) => {
  const { query, type, limit } = req.query;
  
  if (!query || query.trim().length < 1 || query.trim().length > 200) {
    return res.status(400).json({
      success: false,
      error: 'Search query must be between 1 and 200 characters'
    });
  }
  
  if (type && !['description', 'code'].includes(type)) {
    return res.status(400).json({
      success: false,
      error: 'Search type must be either "description" or "code"'
    });
  }
  
  if (limit && (isNaN(limit) || limit < 1 || limit > 100)) {
    return res.status(400).json({
      success: false,
      error: 'Limit must be between 1 and 100'
    });
  }
  
  next();
};

const validateHtsCode = (req, res, next) => {
  const { htsCode } = req.params;
  
  if (!htsCode || !/^\d{4,10}(\.\d{2,8})?$/.test(htsCode)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid HTS code format'
    });
  }
  
  next();
};

const validateDutyRate = (req, res, next) => {
  const { htsCode, countryOfOrigin } = req.query;
  
  if (!htsCode || !/^\d{4,10}(\.\d{2,8})?$/.test(htsCode)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid HTS code format'
    });
  }
  
  if (countryOfOrigin && (countryOfOrigin.length !== 2 || !/^[A-Za-z]{2}$/.test(countryOfOrigin))) {
    return res.status(400).json({
      success: false,
      error: 'Country of origin must be a 2-letter country code'
    });
  }
  
  next();
};

module.exports = {
  validateRequest,
  validateHtsSearch,
  validateHtsCode,
  validateDutyRate
};