// src/frontend/src/services/materialIndexService.js
// Frontend service for material index and pricing adjustment management
// Provides client-side API integration for ICRS SPARC quarterly pricing

import apiClient from './api-client';

class MaterialIndexService {
  constructor() {
    this.baseURL = '/api/material-pricing';
  }

  // ===========================================
  // MATERIAL INDICES METHODS
  // ===========================================

  /**
   * Get all material indices with optional filtering
   * @param {Object} options - Query options
   * @param {string} options.material - Filter by material (aluminum, steel, stainless_steel)
   * @param {string} options.startDate - Start date filter (YYYY-MM-DD)
   * @param {string} options.endDate - End date filter (YYYY-MM-DD)
   * @param {string} options.indexSource - Filter by index source (SHSPI, LME, etc.)
   * @param {number} options.limit - Limit number of results
   * @returns {Promise<Object>} Response with material indices data
   */
  async getAllMaterialIndices(options = {}) {
    try {
      const params = new URLSearchParams();
      
      if (options.material) params.append('material', options.material);
      if (options.startDate) params.append('startDate', options.startDate);
      if (options.endDate) params.append('endDate', options.endDate);
      if (options.indexSource) params.append('indexSource', options.indexSource);
      if (options.limit) params.append('limit', options.limit.toString());

      const queryString = params.toString();
      const url = `${this.baseURL}/indices${queryString ? `?${queryString}` : ''}`;
      
      const response = await apiClient.get(url);
      return response;
    } catch (error) {
      console.error('Error fetching material indices:', error);
      return { 
        success: false, 
        error: error.response?.data?.error || 'Failed to fetch material indices' 
      };
    }
  }

  /**
   * Get latest price for each material
   * @returns {Promise<Object>} Response with latest prices
   */
  async getLatestPrices() {
    try {
      const response = await apiClient.get(`${this.baseURL}/indices/latest`);
      return response;
    } catch (error) {
      console.error('Error fetching latest prices:', error);
      return { 
        success: false, 
        error: error.response?.data?.error || 'Failed to fetch latest prices' 
      };
    }
  }

  /**
   * Add new material index price
   * @param {Object} indexData - Material index data
   * @param {string} indexData.material - Material type
   * @param {number} indexData.price_usd_per_mt - Price in USD per metric ton
   * @param {string} indexData.price_date - Price date (YYYY-MM-DD)
   * @param {string} indexData.index_source - Index source (optional, defaults to SHSPI)
   * @param {string} indexData.data_period - Data period description (optional)
   * @param {number} indexData.fx_rate_cny_usd - FX rate CNY to USD (optional)
   * @returns {Promise<Object>} Response with created material index
   */
  async addMaterialIndex(indexData) {
    try {
      const response = await apiClient.post(`${this.baseURL}/indices`, indexData);
      return response;
    } catch (error) {
      console.error('Error adding material index:', error);
      return { 
        success: false, 
        error: error.response?.data?.error || 'Failed to add material index' 
      };
    }
  }

  /**
   * Add multiple material indices in batch
   * @param {Array} indices - Array of material index data objects
   * @returns {Promise<Object>} Response with batch operation results
   */
  async batchAddMaterialIndices(indices) {
    try {
      const response = await apiClient.post(`${this.baseURL}/indices/batch`, { indices });
      return response;
    } catch (error) {
      console.error('Error batch adding material indices:', error);
      return { 
        success: false, 
        error: error.response?.data?.error || 'Failed to batch add material indices' 
      };
    }
  }

  /**
   * Calculate 3-month rolling average for material
   * @param {string} material - Material type
   * @param {string} month1 - First month (YYYY-MM)
   * @param {string} month2 - Second month (YYYY-MM)
   * @param {string} month3 - Third month (YYYY-MM)
   * @returns {Promise<Object>} Response with calculation results
   */
  async calculate3MonthAverage(material, month1, month2, month3) {
    try {
      const response = await apiClient.post(`${this.baseURL}/calculate-average`, {
        material,
        month1,
        month2,
        month3
      });
      return response;
    } catch (error) {
      console.error('Error calculating 3-month average:', error);
      return { 
        success: false, 
        error: error.response?.data?.error || 'Failed to calculate 3-month average' 
      };
    }
  }

  // ===========================================
  // PRICING ADJUSTMENTS METHODS
  // ===========================================

  /**
   * Get pricing adjustments with optional filtering
   * @param {Object} options - Query options
   * @param {string} options.status - Filter by status (draft, applied, cancelled)
   * @param {string} options.material - Filter by material
   * @param {number} options.limit - Limit number of results
   * @returns {Promise<Object>} Response with pricing adjustments
   */
  async getAllPricingAdjustments(options = {}) {
    try {
      const params = new URLSearchParams();
      
      if (options.status) params.append('status', options.status);
      if (options.material) params.append('material', options.material);
      if (options.limit) params.append('limit', options.limit.toString());

      const queryString = params.toString();
      const url = `${this.baseURL}/adjustments${queryString ? `?${queryString}` : ''}`;
      
      const response = await apiClient.get(url);
      return response;
    } catch (error) {
      console.error('Error fetching pricing adjustments:', error);
      return { 
        success: false, 
        error: error.response?.data?.error || 'Failed to fetch pricing adjustments' 
      };
    }
  }

  /**
   * Create new pricing adjustment
   * @param {Object} adjustmentData - Pricing adjustment data
   * @param {string} adjustmentData.adjustment_name - Name/title of the adjustment
   * @param {string} adjustmentData.material - Material type
   * @param {Array} adjustmentData.data_months - Array of months used for calculation
   * @param {string} adjustmentData.communication_month - Month when communicated
   * @param {string} adjustmentData.effective_month - Month when effective
   * @param {number} adjustmentData.old_average_price - Previous average price
   * @param {number} adjustmentData.new_average_price - New average price
   * @param {number} adjustmentData.price_change_percent - Percentage change
   * @param {string} adjustmentData.pricing_formula - Formula used (3_month_rolling, simple_average)
   * @returns {Promise<Object>} Response with created pricing adjustment
   */
  async createPricingAdjustment(adjustmentData) {
    try {
      const response = await apiClient.post(`${this.baseURL}/adjustments`, adjustmentData);
      return response;
    } catch (error) {
      console.error('Error creating pricing adjustment:', error);
      return { 
        success: false, 
        error: error.response?.data?.error || 'Failed to create pricing adjustment' 
      };
    }
  }

  /**
   * Apply pricing adjustment to parts
   * @param {string} adjustmentId - ID of the pricing adjustment to apply
   * @returns {Promise<Object>} Response with application results
   */
  async applyPricingAdjustment(adjustmentId) {
    try {
      const response = await apiClient.post(`${this.baseURL}/adjustments/${adjustmentId}/apply`);
      return response;
    } catch (error) {
      console.error('Error applying pricing adjustment:', error);
      return { 
        success: false, 
        error: error.response?.data?.error || 'Failed to apply pricing adjustment' 
      };
    }
  }

  // ===========================================
  // UTILITY METHODS
  // ===========================================

  /**
   * Get supported materials list
   * @returns {Promise<Object>} Response with supported materials
   */
  async getSupportedMaterials() {
    try {
      const response = await apiClient.get(`${this.baseURL}/materials`);
      return response;
    } catch (error) {
      console.error('Error fetching supported materials:', error);
      return { 
        success: false, 
        error: error.response?.data?.error || 'Failed to fetch supported materials' 
      };
    }
  }

  /**
   * Get pricing timeline for current date or specified date
   * @param {string} currentDate - Reference date (YYYY-MM-DD, optional)
   * @returns {Promise<Object>} Response with pricing timeline
   */
  async getPricingTimeline(currentDate = null) {
    try {
      const params = currentDate ? `?currentDate=${currentDate}` : '';
      const response = await apiClient.get(`${this.baseURL}/timeline${params}`);
      return response;
    } catch (error) {
      console.error('Error fetching pricing timeline:', error);
      return { 
        success: false, 
        error: error.response?.data?.error || 'Failed to fetch pricing timeline' 
      };
    }
  }

  /**
   * Get service status and information
   * @returns {Promise<Object>} Response with service status
   */
  async getServiceStatus() {
    try {
      const response = await apiClient.get(`${this.baseURL}/status`);
      return response;
    } catch (error) {
      console.error('Error fetching service status:', error);
      return { 
        success: false, 
        error: error.response?.data?.error || 'Failed to fetch service status' 
      };
    }
  }

  // ===========================================
  // CLIENT-SIDE UTILITY METHODS
  // ===========================================

  /**
   * Calculate price impact on parts (client-side calculation)
   * @param {Array} parts - Array of parts with material_weight and standard_value
   * @param {number} oldPricePerMT - Old price per metric ton
   * @param {number} newPricePerMT - New price per metric ton
   * @returns {Object} Calculated impact data
   */
  calculatePartPriceImpact(parts, oldPricePerMT, newPricePerMT) {
    if (!Array.isArray(parts)) {
      return { success: false, error: 'Parts must be an array' };
    }

    const priceChangePerKg = (newPricePerMT - oldPricePerMT) / 1000;
    const impacts = [];
    let totalCostImpact = 0;
    let partsAffected = 0;

    parts.forEach(part => {
      const materialWeight = parseFloat(part.material_weight || 0);
      if (materialWeight > 0) {
        const priceImpactPerPart = materialWeight * priceChangePerKg;
        const oldTotalPrice = parseFloat(part.standard_value || 0);
        const newTotalPrice = oldTotalPrice + priceImpactPerPart;

        impacts.push({
          partId: part.id,
          partNumber: part.part_number || part.id,
          description: part.description || '',
          materialWeight: materialWeight,
          priceImpactPerPart: parseFloat(priceImpactPerPart.toFixed(4)),
          oldTotalPrice: parseFloat(oldTotalPrice.toFixed(2)),
          newTotalPrice: parseFloat(newTotalPrice.toFixed(2)),
          percentChange: oldTotalPrice > 0 ? parseFloat(((priceImpactPerPart / oldTotalPrice) * 100).toFixed(2)) : 0
        });

        totalCostImpact += priceImpactPerPart;
        partsAffected++;
      }
    });

    return {
      success: true,
      data: {
        impacts,
        summary: {
          partsAffected,
          totalParts: parts.length,
          totalCostImpact: parseFloat(totalCostImpact.toFixed(2)),
          averageImpactPerPart: partsAffected > 0 ? parseFloat((totalCostImpact / partsAffected).toFixed(2)) : 0,
          priceChangePerMT: parseFloat((newPricePerMT - oldPricePerMT).toFixed(2)),
          priceChangePerKg: parseFloat(priceChangePerKg.toFixed(4)),
          priceChangePercent: oldPricePerMT > 0 ? parseFloat(((newPricePerMT - oldPricePerMT) / oldPricePerMT * 100).toFixed(2)) : 0
        }
      }
    };
  }

  /**
   * Format currency value
   * @param {number} amount - Amount to format
   * @param {string} currency - Currency code (default: USD)
   * @returns {string} Formatted currency string
   */
  formatCurrency(amount, currency = 'USD') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 4
    }).format(amount);
  }

  /**
   * Format percentage value
   * @param {number} value - Percentage value
   * @param {number} decimals - Number of decimal places (default: 2)
   * @returns {string} Formatted percentage string
   */
  formatPercentage(value, decimals = 2) {
    return `${parseFloat(value).toFixed(decimals)}%`;
  }

  /**
   * Validate material index data
   * @param {Object} indexData - Material index data to validate
   * @returns {Object} Validation result with valid flag and errors array
   */
  validateMaterialIndexData(indexData) {
    const errors = [];
    const supportedMaterials = ['aluminum', 'steel', 'stainless_steel'];

    if (!indexData.material || !supportedMaterials.includes(indexData.material)) {
      errors.push(`Material must be one of: ${supportedMaterials.join(', ')}`);
    }

    const price = parseFloat(indexData.price_usd_per_mt);
    if (isNaN(price) || price <= 0) {
      errors.push('Price must be a positive number');
    }

    if (!indexData.price_date) {
      errors.push('Price date is required');
    } else {
      const date = new Date(indexData.price_date);
      if (isNaN(date.getTime())) {
        errors.push('Price date must be a valid date (YYYY-MM-DD)');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate pricing adjustment data
   * @param {Object} adjustmentData - Pricing adjustment data to validate
   * @returns {Object} Validation result with valid flag and errors array
   */
  validatePricingAdjustmentData(adjustmentData) {
    const errors = [];
    const supportedMaterials = ['aluminum', 'steel', 'stainless_steel'];

    if (!adjustmentData.adjustment_name || adjustmentData.adjustment_name.trim().length === 0) {
      errors.push('Adjustment name is required');
    }

    if (!adjustmentData.material || !supportedMaterials.includes(adjustmentData.material)) {
      errors.push(`Material must be one of: ${supportedMaterials.join(', ')}`);
    }

    if (!adjustmentData.data_months || !Array.isArray(adjustmentData.data_months) || adjustmentData.data_months.length !== 3) {
      errors.push('Data months must be an array of 3 months');
    }

    const newPrice = parseFloat(adjustmentData.new_average_price);
    if (isNaN(newPrice) || newPrice <= 0) {
      errors.push('New average price must be a positive number');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

// Export singleton instance
const materialIndexService = new MaterialIndexService();
export default materialIndexService;