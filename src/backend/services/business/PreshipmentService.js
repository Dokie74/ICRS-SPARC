// src/backend/services/business/PreshipmentService.js
// Preshipment management service for ICRS SPARC - transferred from original ICRS
// Maintains all Foreign Trade Zone compliance requirements and outbound workflow

const BaseService = require('../BaseService');
const DatabaseService = require('../../db/supabase-client');

class PreshipmentService extends BaseService {
  constructor() {
    super('preshipments');
  }

  validatePreshipment(preshipmentData) {
    const errors = [];
    
    if (!preshipmentData.shipmentId || preshipmentData.shipmentId.trim().length < 1) {
      errors.push('Shipment ID is required');
    }
    
    if (!preshipmentData.type) {
      errors.push('Shipment type is required');
    }
    
    if (!preshipmentData.customerId) {
      errors.push('Customer ID is required');
    }
    
    if (!preshipmentData.items || !Array.isArray(preshipmentData.items)) {
      errors.push('Items array is required');
    }
    
    if (preshipmentData.tracking_number && preshipmentData.tracking_number.length > 100) {
      errors.push('Tracking number must be 100 characters or less');
    }
    
    return { isValid: errors.length === 0, errors: errors };
  }
  
  sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    return input.trim().replace(/[<>]/g, '');
  }

  /**
   * Get all preshipments with flexible filtering
   * Supports FTZ preshipment workflow management
   */
  async getAllPreshipments(options = {}) {
    try {
      const queryOptions = {
        select: options.select || '*',
        orderBy: options.orderBy?.column ? 
          `${options.orderBy.column}.${options.orderBy.ascending ? 'asc' : 'desc'}` :
          'created_at.desc',
        filters: options.filters || [],
        limit: options.limit,
        offset: options.offset
      };

      const result = await DatabaseService.select('preshipments', queryOptions);
      return result;
    } catch (error) {
      console.error('Error fetching preshipments:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get preshipment by shipment ID
   * Critical for FTZ outbound document retrieval
   */
  async getPreshipmentById(shipmentId, options = {}) {
    try {
      const result = await DatabaseService.select('preshipments', {
        filters: [{ column: 'shipmentId', value: shipmentId }],
        single: true,
        ...options
      });

      return result;
    } catch (error) {
      console.error('Error fetching preshipment:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Create new preshipment
   * Maintains FTZ preshipment creation with validation and audit trails
   */
  async createPreshipment(preshipmentData, options = {}) {
    try {
      // Validate preshipment data (preserves FTZ compliance requirements)
      const validationResult = this.validatePreshipment(preshipmentData);
      if (!validationResult.isValid) {
        return { 
          success: false, 
          error: 'Validation failed', 
          validationErrors: validationResult.errors 
        };
      }

      // Sanitize input data (preserves original sanitization pattern)
      const sanitizedData = {
        shipmentId: this.sanitizeInput(preshipmentData.shipmentId),
        type: this.sanitizeInput(preshipmentData.type),
        customerId: preshipmentData.customerId,
        items: preshipmentData.items || [],
        entryNumber: preshipmentData.entryNumber ? this.sanitizeInput(preshipmentData.entryNumber) : null,
        stage: preshipmentData.stage || 'Planning',
        priority: preshipmentData.priority || 'Normal',
        requested_ship_date: preshipmentData.requested_ship_date || null,
        carrier_name: preshipmentData.carrier_name ? this.sanitizeInput(preshipmentData.carrier_name) : null,
        tracking_number: preshipmentData.tracking_number ? this.sanitizeInput(preshipmentData.tracking_number) : null,
        notes: preshipmentData.notes ? this.sanitizeInput(preshipmentData.notes) : null
      };

      const result = await DatabaseService.insert('preshipments', [sanitizedData], options);
      
      // Handle result format (single record creation)
      if (result.success && result.data.length > 0) {
        return { success: true, data: result.data[0] };
      }
      
      return result;
    } catch (error) {
      console.error('Error creating preshipment:', error);
      
      // Handle unique constraint violations (preserves exact FTZ compliance error messaging)
      if (error.message.includes('duplicate key') || error.message.includes('unique constraint')) {
        return { success: false, error: `Shipment ID '${preshipmentData.shipmentId}' already exists` };
      }
      
      return { success: false, error: error.message };
    }
  }

  /**
   * Update preshipment stage
   * FTZ workflow stage management with audit trail
   */
  async updatePreshipmentStage(shipmentId, stage, options = {}) {
    try {
      const result = await DatabaseService.select('preshipments', {
        filters: [{ column: 'shipmentId', value: shipmentId }],
        single: true,
        ...options
      });

      if (!result.success) {
        return { success: false, error: 'Preshipment not found' };
      }

      const preshipmentRecord = result.data;
      const updateResult = await DatabaseService.update('preshipments', preshipmentRecord.id, {
        stage: stage,
        updated_at: new Date().toISOString()
      }, options);
      
      return updateResult;
    } catch (error) {
      console.error('Error updating preshipment stage:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Finalize shipment (driver sign-off)
   * Critical FTZ operation for shipment completion with driver documentation
   */
  async finalizeShipment(shipmentId, signoffData, options = {}) {
    try {
      // Validate sign-off data (preserves FTZ documentation requirements)
      if (!signoffData.driver_name || !signoffData.driver_license_number || !signoffData.license_plate_number) {
        return {
          success: false,
          error: 'Driver name, license number, and license plate are required'
        };
      }

      const result = await DatabaseService.select('preshipments', {
        filters: [{ column: 'shipmentId', value: shipmentId }],
        single: true,
        ...options
      });

      if (!result.success) {
        return { success: false, error: 'Preshipment not found' };
      }

      const preshipmentRecord = result.data;
      const sanitizedSignoffData = {
        stage: 'Shipped',
        driver_name: this.sanitizeInput(signoffData.driver_name),
        driver_license_number: this.sanitizeInput(signoffData.driver_license_number),
        license_plate_number: this.sanitizeInput(signoffData.license_plate_number),
        carrier_name: signoffData.carrier_name ? this.sanitizeInput(signoffData.carrier_name) : null,
        signature_data: signoffData.signature_data || null,
        shipped_at: new Date().toISOString()
      };

      const updateResult = await DatabaseService.update('preshipments', preshipmentRecord.id, sanitizedSignoffData, options);
      
      return updateResult;
    } catch (error) {
      console.error('Error finalizing shipment:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get preshipments by stage
   * Stage-based filtering for FTZ workflow management
   */
  async getPreshipmentsByStage(stage, options = {}) {
    try {
      const result = await DatabaseService.select('preshipments', {
        filters: [{ column: 'stage', value: stage }],
        orderBy: 'created_at.desc',
        ...options
      });

      return result;
    } catch (error) {
      console.error('Error fetching preshipments by stage:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get preshipments by customer
   * Customer-specific preshipment filtering for FTZ operations
   */
  async getPreshipmentsByCustomer(customerId, options = {}) {
    try {
      const result = await DatabaseService.select('preshipments', {
        filters: [{ column: 'customerId', value: customerId }],
        orderBy: 'created_at.desc',
        ...options
      });

      return result;
    } catch (error) {
      console.error('Error fetching preshipments by customer:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get preshipments by type
   * Type-based filtering for FTZ shipment classification
   */
  async getPreshipmentsByType(type, options = {}) {
    try {
      const result = await DatabaseService.select('preshipments', {
        filters: [{ column: 'type', value: type }],
        orderBy: 'created_at.desc',
        ...options
      });

      return result;
    } catch (error) {
      console.error('Error fetching preshipments by type:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Search preshipments
   * Comprehensive search for FTZ preshipment management
   */
  async searchPreshipments(searchTerm, filters = {}, options = {}) {
    try {
      const queryFilters = [];
      
      if (filters.stage) {
        queryFilters.push({ column: 'stage', value: filters.stage });
      }

      if (filters.type) {
        queryFilters.push({ column: 'type', value: filters.type });
      }

      if (filters.customerId) {
        queryFilters.push({ column: 'customerId', value: filters.customerId });
      }

      const result = await DatabaseService.select('preshipments', {
        filters: queryFilters,
        orderBy: 'created_at.desc',
        ...options
      });

      // Client-side filtering for search term (could be moved to database function)
      if (result.success && searchTerm) {
        const filteredData = result.data.filter(preshipment => 
          preshipment.shipmentId.toLowerCase().includes(searchTerm.toLowerCase()) ||
          preshipment.entryNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          preshipment.tracking_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          preshipment.carrier_name?.toLowerCase().includes(searchTerm.toLowerCase())
        );
        
        return { success: true, data: filteredData };
      }

      return result;
    } catch (error) {
      console.error('Error searching preshipments:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get ready to ship preshipments
   * Quick access to ready-to-ship FTZ preshipments
   */
  async getReadyToShipPreshipments(options = {}) {
    try {
      const result = await this.getPreshipmentsByStage('Ready to Ship', options);
      return result;
    } catch (error) {
      console.error('Error fetching ready to ship preshipments:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get in progress preshipments
   * Multi-stage query for active FTZ preshipments
   */
  async getInProgressPreshipments(options = {}) {
    try {
      const stages = ['Planning', 'Picking', 'Packing', 'Loading'];
      const allResults = await Promise.all(
        stages.map(stage => this.getPreshipmentsByStage(stage, options))
      );

      const combinedData = [];
      allResults.forEach(result => {
        if (result.success) {
          combinedData.push(...result.data);
        }
      });

      // Sort by created_at descending (preserves original sorting logic)
      combinedData.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      return { success: true, data: combinedData };
    } catch (error) {
      console.error('Error fetching in progress preshipments:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get shipped preshipments
   * Date-filtered shipped FTZ preshipments for reporting
   */
  async getShippedPreshipments(dateRange = {}, options = {}) {
    try {
      const result = await this.getPreshipmentsByStage('Shipped', options);
      
      if (!result.success) {
        return result;
      }

      // Filter by date range if provided (preserves original filtering logic)
      let filteredData = result.data;
      if (dateRange.startDate || dateRange.endDate) {
        filteredData = result.data.filter(p => {
          const shippedDate = new Date(p.shipped_at || p.updated_at);
          const start = dateRange.startDate ? new Date(dateRange.startDate) : new Date(0);
          const end = dateRange.endDate ? new Date(dateRange.endDate) : new Date();
          return shippedDate >= start && shippedDate <= end;
        });
      }

      return { success: true, data: filteredData };
    } catch (error) {
      console.error('Error fetching shipped preshipments:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update preshipment items
   * FTZ item management for preshipment workflow
   */
  async updatePreshipmentItems(shipmentId, items, options = {}) {
    try {
      const result = await DatabaseService.select('preshipments', {
        filters: [{ column: 'shipmentId', value: shipmentId }],
        single: true,
        ...options
      });

      if (!result.success) {
        return { success: false, error: 'Preshipment not found' };
      }

      const preshipmentRecord = result.data;
      const updateResult = await DatabaseService.update('preshipments', preshipmentRecord.id, {
        items: items,
        updated_at: new Date().toISOString()
      }, options);
      
      return updateResult;
    } catch (error) {
      console.error('Error updating preshipment items:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Subscribe to preshipment changes
   * Real-time preshipment updates for FTZ operations
   */
  subscribeToPreshipmentChanges(callback, options = {}) {
    return DatabaseService.subscribe('preshipments', callback, options);
  }

  /**
   * Get preshipment statistics
   * Analytics for FTZ preshipment performance tracking
   */
  async getPreshipmentStats(dateRange = {}, options = {}) {
    try {
      const result = await DatabaseService.select('preshipments', {
        ...options
      });
      
      if (!result.success) {
        return result;
      }

      const preshipments = result.data;
      
      // Filter by date range if provided (preserves original filtering logic)
      let filteredPreshipments = preshipments;
      if (dateRange.startDate || dateRange.endDate) {
        filteredPreshipments = preshipments.filter(p => {
          const createdDate = new Date(p.created_at);
          const start = dateRange.startDate ? new Date(dateRange.startDate) : new Date(0);
          const end = dateRange.endDate ? new Date(dateRange.endDate) : new Date();
          return createdDate >= start && createdDate <= end;
        });
      }

      const stats = {
        total: filteredPreshipments.length,
        by_stage: {},
        by_type: {},
        by_customer: {},
        shipped_count: 0,
        average_processing_time: 0
      };

      // Calculate statistics (preserves original analytics logic)
      filteredPreshipments.forEach(p => {
        // Stage breakdown
        stats.by_stage[p.stage] = (stats.by_stage[p.stage] || 0) + 1;
        
        // Type breakdown
        stats.by_type[p.type] = (stats.by_type[p.type] || 0) + 1;
        
        // Customer breakdown
        stats.by_customer[p.customerId] = (stats.by_customer[p.customerId] || 0) + 1;
        
        // Shipped count
        if (p.stage === 'Shipped') {
          stats.shipped_count += 1;
        }
      });

      return { success: true, data: stats };
    } catch (error) {
      console.error('Error fetching preshipment statistics:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new PreshipmentService();