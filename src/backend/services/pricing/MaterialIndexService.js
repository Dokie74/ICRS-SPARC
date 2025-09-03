// src/backend/services/pricing/MaterialIndexService.js
// Material index and pricing adjustment service for ICRS SPARC
// Manages Shanghai Steel Price Index integration and FTZ pricing compliance

const BaseService = require('../BaseService');

class MaterialIndexService extends BaseService {
  constructor() {
    super('material_indices');
    this.supportedMaterials = ['aluminum', 'steel', 'stainless_steel'];
    this.defaultIndexSource = 'SHSPI';
  }

  /**
   * Get all material indices with optional filtering
   */
  async getAllMaterialIndices(options = {}) {
    try {
      const queryOptions = {
        select: '*',
        filters: [],
        orderBy: [{ column: 'price_date', ascending: false }],
        ...options
      };

      // Apply material filter
      if (options.material) {
        if (!this.supportedMaterials.includes(options.material)) {
          return this.createResponse(false, null, `Unsupported material: ${options.material}. Supported: ${this.supportedMaterials.join(', ')}`);
        }
        queryOptions.filters.push({ column: 'material', value: options.material });
      }

      // Apply date range filters
      if (options.startDate) {
        queryOptions.filters.push({ column: 'price_date', operator: 'gte', value: options.startDate });
      }

      if (options.endDate) {
        queryOptions.filters.push({ column: 'price_date', operator: 'lte', value: options.endDate });
      }

      // Apply index source filter
      if (options.indexSource) {
        queryOptions.filters.push({ column: 'index_source', value: options.indexSource });
      }

      const result = await this.getAll(queryOptions);
      return result;
    } catch (error) {
      console.error('Error in getAllMaterialIndices:', error);
      return this.createResponse(false, null, error.message);
    }
  }

  /**
   * Get latest price for each material
   */
  async getLatestPrices(options = {}) {
    try {
      const queryOptions = {
        select: 'material, price_usd_per_mt, price_date, index_source, fx_rate_cny_usd, data_period',
        orderBy: [{ column: 'price_date', ascending: false }],
        ...options
      };

      const result = await this.getAll(queryOptions);
      
      if (!result.success) {
        return result;
      }

      // Group by material and get the latest for each
      const latestPrices = {};
      result.data.forEach(record => {
        if (!latestPrices[record.material] || 
            new Date(record.price_date) > new Date(latestPrices[record.material].price_date)) {
          latestPrices[record.material] = record;
        }
      });

      return this.createResponse(true, Object.values(latestPrices));
    } catch (error) {
      console.error('Error fetching latest prices:', error);
      return this.createResponse(false, null, error.message);
    }
  }

  /**
   * Add new material index price
   */
  async addMaterialIndex(indexData, options = {}) {
    try {
      // Validate required fields
      const validation = this.validateRequired(indexData, ['material', 'price_usd_per_mt', 'price_date']);
      if (!validation.success) {
        return validation;
      }

      // Validate material
      if (!this.supportedMaterials.includes(indexData.material)) {
        return this.createResponse(false, null, `Unsupported material: ${indexData.material}. Supported: ${this.supportedMaterials.join(', ')}`);
      }

      // Validate price
      const price = parseFloat(indexData.price_usd_per_mt);
      if (isNaN(price) || price <= 0) {
        return this.createResponse(false, null, 'Price must be a positive number');
      }

      // Sanitize data
      const sanitizedData = {
        material: indexData.material,
        index_source: indexData.index_source || this.defaultIndexSource,
        price_usd_per_mt: price,
        price_date: indexData.price_date,
        data_period: indexData.data_period || null,
        fx_rate_cny_usd: indexData.fx_rate_cny_usd ? parseFloat(indexData.fx_rate_cny_usd) : null
      };

      const result = await this.create(sanitizedData, options);

      if (result.success) {
        return this.createResponse(true, result.data, 'Material index added successfully');
      }
      
      return result;
    } catch (error) {
      console.error('Error adding material index:', error);
      return this.createResponse(false, null, error.message);
    }
  }

  /**
   * Calculate 3-month rolling average for a material
   */
  async calculate3MonthAverage(material, month1, month2, month3, options = {}) {
    try {
      if (!this.supportedMaterials.includes(material)) {
        return this.createResponse(false, null, `Unsupported material: ${material}`);
      }

      const prices = [];
      const months = [month1, month2, month3];

      for (const month of months) {
        const result = await this.getAllMaterialIndices({
          material,
          startDate: `${month}-01`,
          endDate: `${month}-31`,
          limit: 1,
          ...options
        });

        if (result.success && result.data.length > 0) {
          prices.push(result.data[0].price_usd_per_mt);
        } else {
          return this.createResponse(false, null, `No price data found for ${material} in ${month}`);
        }
      }

      if (prices.length !== 3) {
        return this.createResponse(false, null, `Insufficient price data for ${material}. Need 3 months, got ${prices.length}`);
      }

      const numericPrices = prices.map(p => parseFloat(p));
      const average = numericPrices.reduce((sum, price) => sum + price, 0) / 3;

      return this.createResponse(true, {
        material,
        months: months,
        prices: numericPrices,
        average: parseFloat(average.toFixed(4)),
        calculation: '3_month_rolling',
        formula: `(${numericPrices.join(' + ')}) / 3 = ${average.toFixed(4)}`
      });
    } catch (error) {
      console.error('Error calculating 3-month average:', error);
      return this.createResponse(false, null, error.message);
    }
  }

  /**
   * Get pricing adjustments
   */
  async getAllPricingAdjustments(options = {}) {
    try {
      // Use direct client call since pricing_adjustments is not this service's main table
      const queryOptions = {
        select: '*',
        filters: [],
        orderBy: [{ column: 'created_at', ascending: false }],
        ...options
      };

      if (options.status) {
        queryOptions.filters.push({ column: 'status', value: options.status });
      }

      if (options.material) {
        queryOptions.filters.push({ column: 'material', value: options.material });
      }

      const result = await this.client.getAll('pricing_adjustments', queryOptions);
      return result;
    } catch (error) {
      console.error('Error fetching pricing adjustments:', error);
      return this.createResponse(false, null, error.message);
    }
  }

  /**
   * Create pricing adjustment
   */
  async createPricingAdjustment(adjustmentData, options = {}) {
    try {
      // Validate required fields
      const validation = this.validateRequired(adjustmentData, [
        'adjustment_name', 'material', 'data_months', 'new_average_price'
      ]);
      if (!validation.success) {
        return validation;
      }

      // Validate material
      if (!this.supportedMaterials.includes(adjustmentData.material)) {
        return this.createResponse(false, null, `Unsupported material: ${adjustmentData.material}`);
      }

      // Sanitize data
      const sanitizedData = {
        adjustment_name: adjustmentData.adjustment_name,
        material: adjustmentData.material,
        // Use existing table's created_at instead of adjustment_date
        data_months: adjustmentData.data_months,
        communication_month: adjustmentData.communication_month,
        effective_month: adjustmentData.effective_month,
        previous_price_usd_per_mt: adjustmentData.old_average_price ? parseFloat(adjustmentData.old_average_price) : null,
        new_price_usd_per_mt: parseFloat(adjustmentData.new_average_price),
        // Map to existing table columns
        percentage_change: adjustmentData.price_change_percent ? parseFloat(adjustmentData.price_change_percent) : null,
        parts_affected: adjustmentData.parts_affected || 0,
        total_cost_impact: adjustmentData.total_cost_impact ? parseFloat(adjustmentData.total_cost_impact) : 0,
        // Map to existing columns with new additions
        quarter: this.getQuarterFromEffective(adjustmentData.effective_month),
        year: this.getYearFromEffective(adjustmentData.effective_month),
        effective_date: this.getEffectiveDateFromMonth(adjustmentData.effective_month),
        source: adjustmentData.index_source || 'SHSPI',
        fx_rate_cny_usd: adjustmentData.fx_rate_cny_usd || null,
        // New columns we're adding
        customers_affected: adjustmentData.customers_affected || 0,
        pricing_formula: adjustmentData.pricing_formula || '3_month_rolling',
        formula_config: adjustmentData.formula_config || null,
        status: 'draft'
      };

      const result = await this.client.create('pricing_adjustments', sanitizedData, options);

      if (result.success) {
        return this.createResponse(true, result.data, 'Pricing adjustment created successfully');
      }
      
      return result;
    } catch (error) {
      console.error('Error creating pricing adjustment:', error);
      return this.createResponse(false, null, error.message);
    }
  }

  /**
   * Apply pricing adjustment to parts
   */
  async applyPricingAdjustment(adjustmentId, options = {}) {
    try {
      // Get the adjustment details
      const adjustmentResult = await this.client.getById('pricing_adjustments', adjustmentId, options);

      if (!adjustmentResult.success || !adjustmentResult.data) {
        return this.createResponse(false, null, 'Pricing adjustment not found');
      }

      const adjustment = adjustmentResult.data;

      if (adjustment.status === 'applied') {
        return this.createResponse(false, null, 'Pricing adjustment already applied');
      }

      // Get all parts with the matching material
      const partsResult = await this.client.getAll('parts', {
        select: 'id, material, material_price, material_weight, standard_value',
        filters: [{ column: 'material', value: adjustment.material }],
        ...options
      });

      if (!partsResult.success) {
        return partsResult;
      }

      const parts = partsResult.data;

      if (!parts || parts.length === 0) {
        return this.createResponse(false, null, `No parts found with material: ${adjustment.material}`);
      }

      // Calculate price changes for each part
      const priceChanges = [];
      const partUpdates = [];

      const newPricePerMT = adjustment.new_price_usd_per_mt || adjustment.new_average_price;
      const newPricePerKg = newPricePerMT / 1000;

      for (const part of parts) {
        const materialWeight = parseFloat(part.material_weight || 0);
        if (materialWeight > 0) {
          const oldMaterialPrice = parseFloat(part.material_price || 0);
          const newMaterialPrice = materialWeight * newPricePerKg;
          const materialPriceDiff = newMaterialPrice - oldMaterialPrice;
          
          const oldTotalPrice = parseFloat(part.standard_value || 0);
          const newTotalPrice = oldTotalPrice + materialPriceDiff;

          priceChanges.push({
            part_id: part.id,
            adjustment_id: adjustmentId,
            old_material_price: oldMaterialPrice,
            new_material_price: newMaterialPrice,
            old_total_price: oldTotalPrice,
            new_total_price: newTotalPrice,
            material_weight: materialWeight,
            price_adjustment_per_kg: newPricePerKg,
            effective_date: new Date().toISOString().split('T')[0]
          });

          partUpdates.push({
            id: part.id,
            material_price: newMaterialPrice,
            standard_value: newTotalPrice
          });
        }
      }

      // Insert price history records
      const historyResult = await this.client.createBatch('part_pricing_history', priceChanges, options);

      if (!historyResult.success) {
        return historyResult;
      }

      // Update parts with new prices
      let updatedCount = 0;
      for (const partUpdate of partUpdates) {
        const updateResult = await this.client.update('parts', partUpdate.id, {
          material_price: partUpdate.material_price,
          standard_value: partUpdate.standard_value
        }, options);

        if (updateResult.success) {
          updatedCount++;
        } else {
          console.error(`Error updating part ${partUpdate.id}:`, updateResult.error);
        }
      }

      // Mark adjustment as applied
      const totalCostImpact = priceChanges.reduce((sum, change) => 
        sum + (change.new_total_price - change.old_total_price), 0
      );

      const statusUpdateResult = await this.client.update('pricing_adjustments', adjustmentId, {
        status: 'applied',
        applied_at: new Date().toISOString(),
        parts_affected: updatedCount,
        total_cost_impact: totalCostImpact
      }, options);

      if (!statusUpdateResult.success) {
        return statusUpdateResult;
      }

      return this.createResponse(true, {
        adjustmentId,
        partsUpdated: updatedCount,
        totalCostImpact: totalCostImpact,
        priceChanges: priceChanges.length
      }, `Successfully applied pricing adjustment to ${updatedCount} parts`);
    } catch (error) {
      console.error('Error applying pricing adjustment:', error);
      return this.createResponse(false, null, error.message);
    }
  }

  /**
   * Get pricing timeline based on current date
   */
  getPricingTimeline(currentDate = new Date()) {
    const now = new Date(currentDate);
    const currentMonth = now.getMonth(); // 0-11
    const currentYear = now.getFullYear();

    // Calculate the previous 3 months for data collection
    const dataMonths = [];
    for (let i = 3; i >= 1; i--) {
      const date = new Date(currentYear, currentMonth - i, 1);
      dataMonths.push({
        year: date.getFullYear(),
        month: date.getMonth() + 1,
        name: date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      });
    }

    // Communication month (current month)
    const communicationMonth = {
      year: currentYear,
      month: currentMonth + 1,
      name: now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      key: `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`
    };

    // Effective month (next month)
    const effectiveDate = new Date(currentYear, currentMonth + 1, 1);
    const effectiveMonth = {
      year: effectiveDate.getFullYear(),
      month: effectiveDate.getMonth() + 1,
      name: effectiveDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      key: `${effectiveDate.getFullYear()}-${String(effectiveDate.getMonth() + 1).padStart(2, '0')}`
    };

    return {
      dataMonths,
      communicationMonth,
      effectiveMonth,
      formula: '3_month_rolling',
      description: `Average of ${dataMonths.map(m => m.name).join(', ')} communicated in ${communicationMonth.name} becomes new price in ${effectiveMonth.name}`
    };
  }

  /**
   * Batch add multiple material indices
   */
  async batchAddMaterialIndices(indicesData, options = {}) {
    try {
      if (!Array.isArray(indicesData) || indicesData.length === 0) {
        return this.createResponse(false, null, 'Invalid indices data array');
      }

      const results = [];
      const errors = [];

      for (const indexData of indicesData) {
        const result = await this.addMaterialIndex(indexData, options);
        if (result.success) {
          results.push(result.data);
        } else {
          errors.push({
            material: indexData.material,
            date: indexData.price_date,
            error: result.error
          });
        }
      }

      const successCount = results.length;
      const errorCount = errors.length;

      if (errorCount === 0) {
        return this.createResponse(true, results, `Successfully added ${successCount} material indices`);
      } else if (successCount > 0) {
        return this.createResponse(true, {
          results,
          errors,
          summary: { successCount, errorCount }
        }, `Added ${successCount} indices, ${errorCount} failed`);
      } else {
        return this.createResponse(false, { errors }, 'Failed to add any material indices');
      }
    } catch (error) {
      console.error('Error in batch add material indices:', error);
      return this.createResponse(false, null, error.message);
    }
  }

  /**
   * Get supported materials
   */
  getSupportedMaterials() {
    return {
      success: true,
      data: this.supportedMaterials.map(material => ({
        value: material,
        label: material.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
      }))
    };
  }

  /**
   * Helper method to convert effective month to quarter
   */
  getQuarterFromEffective(effectiveMonth) {
    if (!effectiveMonth) return null;
    const month = parseInt(effectiveMonth.split('-')[1]);
    return `Q${Math.ceil(month / 3)}`;
  }

  /**
   * Helper method to get year from effective month
   */
  getYearFromEffective(effectiveMonth) {
    if (!effectiveMonth) return new Date().getFullYear();
    return parseInt(effectiveMonth.split('-')[0]);
  }

  /**
   * Helper method to convert effective month to date
   */
  getEffectiveDateFromMonth(effectiveMonth) {
    if (!effectiveMonth) return new Date().toISOString().split('T')[0];
    return `${effectiveMonth}-01`;
  }

  /**
   * Validate pricing adjustment data
   */
  validatePricingAdjustmentData(adjustmentData) {
    const errors = [];

    if (!adjustmentData.adjustment_name || adjustmentData.adjustment_name.trim().length === 0) {
      errors.push('Adjustment name is required');
    }

    if (!this.supportedMaterials.includes(adjustmentData.material)) {
      errors.push(`Unsupported material: ${adjustmentData.material}`);
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

module.exports = new MaterialIndexService();