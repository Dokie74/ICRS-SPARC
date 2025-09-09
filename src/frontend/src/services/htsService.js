// src/frontend/src/services/htsService.js
// Frontend HTS service for ICRS SPARC
// Handles HTS code lookup, duty calculations, and data caching

import apiClient from './api-client';

class HTSService {
  constructor() {
    this.cache = new Map();
    this.cacheExpiry = 15 * 60 * 1000; // 15 minutes
    this.isInitializing = false;
    this.initPromise = null;
    this.countries = [];
    this.popularCodes = [];
  }

  // Initialize service with countries and popular codes
  async initialize() {
    if (this.isInitializing && this.initPromise) {
      return await this.initPromise;
    }

    if (this.countries.length > 0) {
      return { success: true, source: 'already_loaded' };
    }

    this.isInitializing = true;
    this.initPromise = this._doInitialize();
    
    try {
      const result = await this.initPromise;
      this.isInitializing = false;
      this.initPromise = null;
      return result;
    } catch (error) {
      this.isInitializing = false;
      this.initPromise = null;
      throw error;
    }
  }

  async _doInitialize() {
    try {
      // Load countries and popular codes in parallel
      const [countriesResult, popularResult] = await Promise.all([
        this.getCountries(),
        this.getPopularCodes()
      ]);

      if (countriesResult.success) {
        this.countries = countriesResult.data;
      }

      if (popularResult.success) {
        this.popularCodes = popularResult.data;
      }

      return { 
        success: true, 
        source: 'network',
        countriesLoaded: this.countries.length,
        popularCodesLoaded: this.popularCodes.length
      };
    } catch (error) {
      console.error('HTS service initialization failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Create cache key for requests
  _createCacheKey(endpoint, params = {}) {
    const paramString = Object.keys(params)
      .sort()
      .map(key => `${key}=${params[key]}`)
      .join('&');
    return `${endpoint}${paramString ? '?' + paramString : ''}`;
  }

  // Get cached data if valid
  _getCachedData(key) {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const now = Date.now();
    if (now - cached.timestamp > this.cacheExpiry) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  // Cache data with timestamp
  _setCachedData(key, data) {
    this.cache.set(key, {
      data: data,
      timestamp: Date.now()
    });
  }

  // Search HTS codes by description or number
  async search(searchTerm, type = 'description', options = {}) {
    if (!searchTerm || searchTerm.trim().length < 2) {
      return { success: true, data: [] };
    }

    const {
      limit = 100,
      countryOfOrigin = null
    } = options;

    const params = {
      q: searchTerm.trim(),
      type,
      limit,
      ...(countryOfOrigin && { countryOfOrigin })
    };

    const cacheKey = this._createCacheKey('/hts', { action: 'search', ...params });
    
    // Check cache first
    const cached = this._getCachedData(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const queryParams = { 
        action: 'search',
        q: params.q,
        type: params.type,
        limit: params.limit,
        ...(params.countryOfOrigin && { countryOfOrigin: params.countryOfOrigin })
      };
      const response = await apiClient.get('/hts', queryParams);
      
      const result = {
        success: true,
        data: response.data.data || [],
        meta: response.data.meta || {}
      };

      // Cache the result
      this._setCachedData(cacheKey, result);
      
      return result;
    } catch (error) {
      console.error('HTS search error:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Search failed'
      };
    }
  }

  // Search by description
  async searchByDescription(searchTerm, limit = 100, countryOfOrigin = null) {
    return this.search(searchTerm, 'description', { limit, countryOfOrigin });
  }

  // Search by HTS number/code
  async searchByCode(searchTerm, limit = 50, countryOfOrigin = null) {
    return this.search(searchTerm, 'code', { limit, countryOfOrigin });
  }

  // Get specific HTS code information
  async getByHtsCode(htsCode, countryOfOrigin = null) {
    if (!htsCode) {
      return { success: false, error: 'HTS code is required' };
    }

    const queryParams = { 
      action: 'code',
      htsCode,
      ...(countryOfOrigin && { countryOfOrigin })
    };
    const cacheKey = this._createCacheKey('/hts', queryParams);
    
    // Check cache first
    const cached = this._getCachedData(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const response = await apiClient.get('/hts', queryParams);
      
      const result = {
        success: true,
        data: response.data.data
      };

      // Cache the result
      this._setCachedData(cacheKey, result);
      
      return result;
    } catch (error) {
      console.error('HTS code lookup error:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'HTS code not found'
      };
    }
  }

  // Calculate duty rate for HTS code and country combination
  async calculateDutyRate(htsCode, countryOfOrigin) {
    if (!htsCode || !countryOfOrigin) {
      return { success: false, error: 'HTS code and country of origin are required' };
    }

    const cacheKey = this._createCacheKey('/hts', { action: 'duty-rate', htsCode, countryOfOrigin });
    
    // Check cache first
    const cached = this._getCachedData(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const response = await apiClient.post('/hts?action=duty-rate', {
        htsCode,
        countryOfOrigin
      });
      
      const result = {
        success: true,
        data: response.data.data
      };

      // Cache the result
      this._setCachedData(cacheKey, result);
      
      return result;
    } catch (error) {
      console.error('Duty rate calculation error:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Duty rate calculation failed'
      };
    }
  }

  // Get popular/commonly used HTS codes
  async getPopularCodes(limit = 20) {
    const queryParams = { action: 'popular', limit };
    const cacheKey = this._createCacheKey('/hts', queryParams);
    
    // Check cache first
    const cached = this._getCachedData(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const response = await apiClient.get('/hts', queryParams);
      
      const result = {
        success: true,
        data: response.data.data || []
      };

      // Cache the result
      this._setCachedData(cacheKey, result);
      
      return result;
    } catch (error) {
      console.error('Popular codes error:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to load popular codes'
      };
    }
  }

  // Get list of supported countries
  async getCountries() {
    const queryParams = { action: 'countries' };
    const cacheKey = this._createCacheKey('/hts', queryParams);
    
    // Check cache first
    const cached = this._getCachedData(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const response = await apiClient.get('/hts', queryParams);
      
      const result = {
        success: true,
        data: response.data.data || []
      };

      // Cache the result (longer cache for countries)
      this._setCachedData(cacheKey, result);
      
      return result;
    } catch (error) {
      console.error('Countries list error:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to load countries'
      };
    }
  }

  // Browse HTS codes with pagination
  async browse(options = {}) {
    const {
      offset = 0,
      limit = 50,
      includeHeaders = true
    } = options;

    const queryParams = { action: 'browse', offset, limit, includeHeaders };
    const cacheKey = this._createCacheKey('/hts', queryParams);
    
    // Check cache first
    const cached = this._getCachedData(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const response = await apiClient.get('/hts', queryParams);
      
      const result = {
        success: true,
        data: response.data.data || [],
        meta: response.data.meta || {}
      };

      // Cache the result
      this._setCachedData(cacheKey, result);
      
      return result;
    } catch (error) {
      console.error('HTS browse error:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Browse failed'
      };
    }
  }

  // Get HTS service status
  async getStatus() {
    try {
      const response = await apiClient.get('/hts', { action: 'status' });
      
      return {
        success: true,
        data: response.data.data
      };
    } catch (error) {
      console.error('HTS status error:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Status check failed'
      };
    }
  }

  // Refresh HTS data (admin only)
  async refreshData() {
    try {
      const response = await apiClient.post('/hts?action=refresh');
      
      // Clear cache after refresh
      this.cache.clear();
      
      return {
        success: true,
        data: response.data.data
      };
    } catch (error) {
      console.error('HTS refresh error:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Refresh failed'
      };
    }
  }

  // Get cached countries (after initialization)
  getCachedCountries() {
    return this.countries;
  }

  // Get cached popular codes (after initialization)
  getCachedPopularCodes() {
    return this.popularCodes;
  }

  // Find country by code
  findCountryByCode(countryCode) {
    return this.countries.find(c => c.code === countryCode);
  }

  // Clear cache
  clearCache() {
    this.cache.clear();
  }

  // Get cache size
  getCacheSize() {
    return this.cache.size;
  }

  // Get cache statistics
  getCacheStats() {
    const now = Date.now();
    let validEntries = 0;
    let expiredEntries = 0;

    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.cacheExpiry) {
        expiredEntries++;
      } else {
        validEntries++;
      }
    }

    return {
      total: this.cache.size,
      valid: validEntries,
      expired: expiredEntries,
      expiryMinutes: this.cacheExpiry / 60000
    };
  }
}

// Create and export singleton instance
const htsService = new HTSService();
export default htsService;