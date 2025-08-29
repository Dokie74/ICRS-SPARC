// src/backend/services/inventory/PartService.js
// Parts management service for ICRS SPARC - transferred from original ICRS
// Maintains Foreign Trade Zone part master data with material classification

const BaseService = require('../BaseService');
const DatabaseService = require('../../db/supabase-client');

class PartService extends BaseService {
  constructor() {
    super('parts');
  }

  /**
   * Validate part data
   * Internalized validation for FTZ part requirements
   */
  validatePart(partData) {
    const errors = [];

    if (!partData.id || partData.id.trim().length < 1) {
      errors.push('Part Number is required');
    }

    if (!partData.description || partData.description.trim().length < 2) {
      errors.push('Description must be at least 2 characters long');
    }

    if (partData.hts_code && partData.hts_code.length > 10) {
      errors.push('HTS Code cannot exceed 10 characters');
    }

    if (partData.country_of_origin && partData.country_of_origin.length !== 2) {
      errors.push('Country of Origin must be a 2-character code');
    }

    if (partData.standard_value && (isNaN(partData.standard_value) || partData.standard_value < 0)) {
      errors.push('Standard Value must be a positive number');
    }

    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }

  /**
   * Sanitize input string
   * Security function for input cleaning
   */
  sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    return input.trim().replace(/[<>]/g, '');
  }

  /**
   * Get all parts with comprehensive filtering
   * Supports FTZ part master data management
   */
  async getAllParts(options = {}) {
    try {
      const queryOptions = {
        select: options.select || '*',
        orderBy: options.orderBy?.column ? 
          `${options.orderBy.column}.${options.orderBy.ascending ? 'asc' : 'desc'}` :
          'id.asc',
        filters: options.filters || [],
        limit: options.limit,
        offset: options.offset
      };

      const result = await DatabaseService.select('parts', queryOptions);
      return result;
    } catch (error) {
      console.error('Error fetching parts:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get part by ID
   * Critical for FTZ part detail views
   */
  async getPartById(partId, options = {}) {
    try {
      const result = await DatabaseService.select('parts', {
        filters: [{ column: 'id', value: partId }],
        single: true,
        ...options
      });
      return result;
    } catch (error) {
      console.error('Error fetching part:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Create new part
   * Maintains FTZ part creation with validation and material classification
   */
  async createPart(partData, options = {}) {
    try {
      // Validate part data (preserves original validation logic)
      const validationResult = this.validatePart(partData);
      if (!validationResult.isValid) {
        return { 
          success: false, 
          error: 'Validation failed', 
          validationErrors: validationResult.errors 
        };
      }

      // Sanitize input data (preserves original sanitization pattern)
      const sanitizedData = {
        id: this.sanitizeInput(partData.id),
        description: this.sanitizeInput(partData.description),
        hts_code: partData.hts_code ? this.sanitizeInput(partData.hts_code) : null,
        country_of_origin: partData.country_of_origin ? this.sanitizeInput(partData.country_of_origin) : null,
        standard_value: partData.standard_value ? parseFloat(partData.standard_value) : null,
        material_price: partData.material_price ? parseFloat(partData.material_price) : null,
        labor_price: partData.labor_price ? parseFloat(partData.labor_price) : null,
        unit_of_measure: partData.unit_of_measure ? this.sanitizeInput(partData.unit_of_measure) : null,
        manufacturer_id: partData.manufacturer_id ? this.sanitizeInput(partData.manufacturer_id) : null,
        gross_weight: partData.gross_weight ? parseFloat(partData.gross_weight) : null,
        material: partData.material ? this.sanitizeInput(partData.material) : null
      };

      const result = await DatabaseService.insert('parts', [sanitizedData], options);
      
      // Handle result format (single record creation)
      if (result.success && result.data.length > 0) {
        return { success: true, data: result.data[0] };
      }
      
      return result;
    } catch (error) {
      console.error('Error creating part:', error);
      
      // Handle unique constraint violations (preserves original error handling)
      if (error.message.includes('duplicate key') || error.message.includes('unique constraint')) {
        return { success: false, error: `Part Number '${partData.id}' already exists` };
      }
      
      return { success: false, error: error.message };
    }
  }

  /**
   * Update part
   * Maintains FTZ part update logic with validation
   */
  async updatePart(partId, updateData, options = {}) {
    try {
      // Validate part data (preserves original validation)
      const validationResult = this.validatePart({ ...updateData, id: partId });
      if (!validationResult.isValid) {
        return { 
          success: false, 
          error: 'Validation failed', 
          validationErrors: validationResult.errors 
        };
      }

      // Sanitize input data (excluding ID since it's in the parameter)
      const sanitizedData = {
        description: this.sanitizeInput(updateData.description),
        hts_code: updateData.hts_code ? this.sanitizeInput(updateData.hts_code) : null,
        country_of_origin: updateData.country_of_origin ? this.sanitizeInput(updateData.country_of_origin) : null,
        standard_value: updateData.standard_value ? parseFloat(updateData.standard_value) : null,
        material_price: updateData.material_price ? parseFloat(updateData.material_price) : null,
        labor_price: updateData.labor_price ? parseFloat(updateData.labor_price) : null,
        unit_of_measure: updateData.unit_of_measure ? this.sanitizeInput(updateData.unit_of_measure) : null,
        manufacturer_id: updateData.manufacturer_id ? this.sanitizeInput(updateData.manufacturer_id) : null,
        gross_weight: updateData.gross_weight ? parseFloat(updateData.gross_weight) : null,
        material: updateData.material ? this.sanitizeInput(updateData.material) : null
      };

      const result = await DatabaseService.update('parts', partId, sanitizedData, options);
      return result;
    } catch (error) {
      console.error('Error updating part:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Deactivate part (soft delete)
   * FTZ part deactivation while preserving historical data
   */
  async deactivatePart(partId, options = {}) {
    try {
      const result = await DatabaseService.delete('parts', partId, options);
      return result;
    } catch (error) {
      console.error('Error deactivating part:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Reactivate part
   * Note: Parts cannot be undeleted due to business requirements
   */
  async reactivatePart(partId, options = {}) {
    try {
      return { success: false, error: 'Part reactivation not supported - parts cannot be undeleted' };
    } catch (error) {
      console.error('Error reactivating part:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Search parts
   * Comprehensive part search for FTZ operations
   */
  async searchParts(searchTerm, filters = {}, options = {}) {
    try {
      const queryFilters = [];

      if (filters.country_of_origin) {
        queryFilters.push({ column: 'country_of_origin', value: filters.country_of_origin });
      }

      if (filters.manufacturer_id) {
        queryFilters.push({ column: 'manufacturer_id', value: filters.manufacturer_id });
      }

      const result = await DatabaseService.select('parts', {
        filters: queryFilters,
        orderBy: 'id.asc',
        ...options
      });

      // Client-side filtering for search term (could be moved to database function)
      if (result.success && searchTerm) {
        const filteredData = result.data.filter(part => 
          part.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
          part.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          part.hts_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          part.manufacturer_id?.toLowerCase().includes(searchTerm.toLowerCase())
        );
        
        return { success: true, data: filteredData };
      }

      return result;
    } catch (error) {
      console.error('Error searching parts:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get active parts only
   * Active part listing for FTZ operations
   */
  async getActiveParts(options = {}) {
    try {
      const result = await DatabaseService.select('parts', {
        orderBy: 'id.asc',
        ...options
      });

      return result;
    } catch (error) {
      console.error('Error fetching active parts:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get parts by HTS code
   * Critical for FTZ tariff classification
   */
  async getPartsByHTSCode(htsCode, options = {}) {
    try {
      const result = await DatabaseService.select('parts', {
        filters: [{ column: 'hts_code', value: htsCode }],
        orderBy: 'id.asc',
        ...options
      });

      return result;
    } catch (error) {
      console.error('Error fetching parts by HTS code:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get parts by country of origin
   * Essential for FTZ country of origin reporting
   */
  async getPartsByCountry(countryCode, options = {}) {
    try {
      const result = await DatabaseService.select('parts', {
        filters: [{ column: 'country_of_origin', value: countryCode }],
        orderBy: 'id.asc',
        ...options
      });

      return result;
    } catch (error) {
      console.error('Error fetching parts by country:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get part usage statistics
   * Analytics for FTZ part utilization tracking
   */
  async getPartUsageStats(partId, options = {}) {
    try {
      // Get all lots for this part
      const lotsResult = await DatabaseService.select('inventory_lots', {
        filters: [{ column: 'part_id', value: partId }],
        select: 'id, status, original_quantity, current_quantity, admission_date, customer_id',
        ...options
      });

      if (!lotsResult.success) {
        return { success: false, error: 'Failed to fetch part usage statistics' };
      }

      const lots = lotsResult.data;
      const stats = {
        total_lots: lots.length,
        total_admitted: lots.reduce((sum, lot) => sum + lot.original_quantity, 0),
        current_stock: lots.reduce((sum, lot) => sum + lot.current_quantity, 0),
        total_processed: lots.reduce((sum, lot) => sum + (lot.original_quantity - lot.current_quantity), 0),
        customer_count: new Set(lots.map(lot => lot.customer_id)).size,
        status_breakdown: {},
        monthly_admissions: {}
      };

      // Status breakdown (preserves original statistics logic)
      lots.forEach(lot => {
        stats.status_breakdown[lot.status] = (stats.status_breakdown[lot.status] || 0) + 1;
      });

      // Monthly admissions (last 12 months)
      const now = new Date();
      lots.forEach(lot => {
        const admissionDate = new Date(lot.admission_date);
        const monthsAgo = Math.floor((now - admissionDate) / (1000 * 60 * 60 * 24 * 30));
        if (monthsAgo < 12) {
          const monthKey = admissionDate.toISOString().substring(0, 7); // YYYY-MM
          stats.monthly_admissions[monthKey] = (stats.monthly_admissions[monthKey] || 0) + lot.original_quantity;
        }
      });

      return { success: true, data: stats };
    } catch (error) {
      console.error('Error fetching part usage statistics:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Validate part data
   * Client-side validation for FTZ part requirements
   */
  validatePartData(partData) {
    return this.validatePart(partData);
  }

  /**
   * Check if part is in use
   * Prevents deletion of parts with active inventory
   */
  async isPartInUse(partId, options = {}) {
    try {
      const result = await DatabaseService.select('inventory_lots', {
        filters: [{ column: 'part_id', value: partId }],
        select: 'id',
        limit: 1,
        ...options
      });

      return { 
        success: true, 
        data: result.success && result.data.length > 0 
      };
    } catch (error) {
      console.error('Error checking part usage:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get unique countries for filtering
   * Supports FTZ country of origin filtering
   */
  async getCountriesOfOrigin(options = {}) {
    try {
      const result = await DatabaseService.select('parts', {
        select: 'country_of_origin',
        filters: [],
        ...options
      });

      if (!result.success) {
        return result;
      }

      // Extract unique countries (preserves original logic)
      const uniqueCountries = [...new Set(
        result.data
          .map(part => part.country_of_origin)
          .filter(country => country && country.trim() !== '')
      )].sort();

      return { success: true, data: uniqueCountries };
    } catch (error) {
      console.error('Error fetching countries of origin:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get unique manufacturers for filtering
   * Supports FTZ manufacturer filtering
   */
  async getManufacturers(options = {}) {
    try {
      const result = await DatabaseService.select('parts', {
        select: 'manufacturer_id',
        filters: [],
        ...options
      });

      if (!result.success) {
        return result;
      }

      // Extract unique manufacturers (preserves original logic)
      const uniqueManufacturers = [...new Set(
        result.data
          .map(part => part.manufacturer_id)
          .filter(manufacturer => manufacturer && manufacturer.trim() !== '')
      )].sort();

      return { success: true, data: uniqueManufacturers };
    } catch (error) {
      console.error('Error fetching manufacturers:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Batch create parts
   * Bulk part creation for FTZ master data setup
   */
  async batchCreateParts(partsData, options = {}) {
    try {
      // Validate each part (preserves original validation pattern)
      const validationErrors = [];
      const validParts = [];

      partsData.forEach((part, index) => {
        const validationResult = this.validatePartData(part);
        if (!validationResult.isValid) {
          validationErrors.push({
            index,
            partId: part.id,
            errors: validationResult.errors
          });
        } else {
          validParts.push({
            id: this.sanitizeInput(part.id),
            description: this.sanitizeInput(part.description),
            hts_code: part.hts_code ? this.sanitizeInput(part.hts_code) : null,
            country_of_origin: part.country_of_origin ? this.sanitizeInput(part.country_of_origin) : null,
            standard_value: part.standard_value ? parseFloat(part.standard_value) : null,
            unit_of_measure: part.unit_of_measure ? this.sanitizeInput(part.unit_of_measure) : null,
            manufacturer_id: part.manufacturer_id ? this.sanitizeInput(part.manufacturer_id) : null,
            gross_weight: part.gross_weight ? parseFloat(part.gross_weight) : null
          });
        }
      });

      if (validationErrors.length > 0) {
        return {
          success: false,
          error: 'Validation errors found',
          validationErrors
        };
      }

      // Use batch insert with duplicate handling (preserves original pattern)
      const result = await DatabaseService.insertBatchWithDuplicateHandling('parts', validParts, options);
      return result;
    } catch (error) {
      console.error('Error batch creating parts:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get suppliers for a part
   * Part-supplier relationship for FTZ sourcing
   */
  async getSuppliersForPart(partId, options = {}) {
    try {
      const result = await DatabaseService.select('part_suppliers', {
        filters: [{ column: 'part_id', value: partId }],
        select: 'supplier_id, suppliers(*)',
        ...options
      });

      if (result.success) {
        return { 
          success: true, 
          data: result.data.map(ps => ps.suppliers) 
        };
      }
      
      return result;
    } catch (error) {
      console.error('Error fetching suppliers for part:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Add supplier to part
   * Establish part-supplier relationship
   */
  async addSupplierToPart(partId, supplierId, options = {}) {
    try {
      const result = await DatabaseService.insert('part_suppliers', [{
        part_id: partId,
        supplier_id: supplierId
      }], options);
      return result;
    } catch (error) {
      console.error('Error adding supplier to part:', error);
      
      // Handle unique constraint violations (preserves original error handling)
      if (error.message.includes('duplicate key') || error.message.includes('unique constraint')) {
        return { success: false, error: 'This supplier is already associated with this part' };
      }
      
      return { success: false, error: error.message };
    }
  }

  /**
   * Remove supplier from part
   * Remove part-supplier relationship
   */
  async removeSupplierFromPart(partId, supplierId, options = {}) {
    try {
      const result = await DatabaseService.delete('part_suppliers', {
        part_id: partId,
        supplier_id: supplierId
      }, options);
      
      return result;
    } catch (error) {
      console.error('Error removing supplier from part:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update part suppliers (replace all suppliers for a part)
   * Complete supplier relationship management
   */
  async updatePartSuppliers(partId, supplierIds, options = {}) {
    try {
      // Use RPC function for transaction-based update (maintains data integrity)
      const result = await DatabaseService.rpc('update_part_suppliers', {
        p_part_id: partId,
        p_supplier_ids: supplierIds
      }, options);
      
      return result;
    } catch (error) {
      console.error('Error updating part suppliers:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Subscribe to part changes
   * Real-time part master data updates
   */
  subscribeToPartChanges(callback, options = {}) {
    return DatabaseService.subscribe('parts', callback, options);
  }

  /**
   * Export parts to CSV format
   * FTZ part data export for reporting
   */
  async exportParts(filters = {}, options = {}) {
    try {
      const queryFilters = [];

      if (filters.country_of_origin) {
        queryFilters.push({ column: 'country_of_origin', value: filters.country_of_origin });
      }

      const result = await DatabaseService.select('parts', {
        filters: queryFilters,
        orderBy: 'id.asc',
        ...options
      });

      if (!result.success) {
        return result;
      }

      // Convert to CSV format (preserves original export structure)
      const headers = [
        'Part Number', 'Description', 'HTS Code', 'Country of Origin', 
        'Standard Value', 'Unit of Measure', 'Manufacturer ID', 
        'Gross Weight'
      ];
      
      const csvData = result.data.map(part => [
        part.id || '',
        part.description || '',
        part.hts_code || '',
        part.country_of_origin || '',
        part.standard_value || '',
        part.unit_of_measure || '',
        part.manufacturer_id || '',
        part.gross_weight || ''
      ]);

      return {
        success: true,
        data: {
          headers,
          rows: csvData
        }
      };
    } catch (error) {
      console.error('Error exporting parts:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new PartService();