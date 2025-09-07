// src/backend/services/business/ShippingService.js
// Comprehensive shipping service for ICRS SPARC - handles preshipment workflow
// Manages staging, driver signoff, label printing, and inventory lot integration

const BaseService = require('../BaseService');
const DatabaseService = require('../../db/supabase-client');
const PreshipmentService = require('./PreshipmentService');

class ShippingService extends BaseService {
  constructor() {
    super('preshipments');
  }

  /**
   * Input validation and sanitization methods
   */
  validatePreshipmentStaging(stagingData) {
    const errors = [];
    
    if (!stagingData.shipmentId || stagingData.shipmentId.trim().length < 1) {
      errors.push('Shipment ID is required');
    }
    
    if (!stagingData.stage) {
      errors.push('Stage is required');
    }
    
    if (!stagingData.items || !Array.isArray(stagingData.items)) {
      errors.push('Items array is required');
    }

    // Validate stage transitions
    const validStages = ['Planning', 'Picking', 'Packing', 'Loading', 'Ready to Ship', 'Staged', 'Shipped'];
    if (stagingData.stage && !validStages.includes(stagingData.stage)) {
      errors.push(`Invalid stage. Must be one of: ${validStages.join(', ')}`);
    }
    
    return { isValid: errors.length === 0, errors: errors };
  }

  validateDriverSignoff(signoffData) {
    const errors = [];
    
    if (!signoffData.driver_name || signoffData.driver_name.trim().length < 1) {
      errors.push('Driver name is required');
    }
    
    if (!signoffData.driver_license_number || signoffData.driver_license_number.trim().length < 1) {
      errors.push('Driver license number is required');
    }
    
    if (!signoffData.license_plate_number || signoffData.license_plate_number.trim().length < 1) {
      errors.push('License plate number is required');
    }
    
    return { isValid: errors.length === 0, errors: errors };
  }

  sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    return input.trim().replace(/[<>]/g, '');
  }

  /**
   * Get all shipments with comprehensive filtering
   * Supports staging workflow management
   */
  async getAllShipments(options = {}) {
    try {
      const queryOptions = {
        select: options.select || `
          *,
          customers(id, name, ein)
        `,
        orderBy: options.orderBy?.column ? 
          `${options.orderBy.column}.${options.orderBy.ascending ? 'asc' : 'desc'}` :
          'created_at.desc',
        filters: options.filters || [],
        limit: options.limit,
        offset: options.offset
      };

      const result = await DatabaseService.getAll('preshipments', queryOptions);
      return result;
    } catch (error) {
      console.error('Error fetching shipments:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get shipments by stage for workflow management
   */
  async getShipmentsByStage(stage, options = {}) {
    try {
      const result = await DatabaseService.getAll('preshipments', {
        select: `
          *,
          customers(name, ein)
        `,
        filters: [{ column: 'stage', value: stage }],
        orderBy: 'requested_ship_date.asc',
        ...options
      });

      return result;
    } catch (error) {
      console.error('Error fetching shipments by stage:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update preshipment status and staging workflow
   * Handles comprehensive staging transitions with validation
   */
  async updatePreshipmentStaging(shipmentId, stagingData, options = {}) {
    try {
      // Validate staging data
      const validationResult = this.validatePreshipmentStaging(stagingData);
      if (!validationResult.isValid) {
        return { 
          success: false, 
          error: 'Validation failed', 
          validationErrors: validationResult.errors 
        };
      }

      // Get current preshipment
      const currentResult = await DatabaseService.getAll('preshipments', {
        filters: [{ column: 'shipmentId', value: shipmentId }],
        single: true,
        ...options
      });

      if (!currentResult.success) {
        return { success: false, error: 'Preshipment not found' };
      }

      const preshipment = currentResult.data;

      // Validate stage transitions
      const stageTransitions = {
        'Planning': ['Picking'],
        'Picking': ['Packing', 'Planning'],
        'Packing': ['Loading', 'Picking'],
        'Loading': ['Ready to Ship', 'Packing'],
        'Ready to Ship': ['Staged', 'Loading'],
        'Staged': ['Shipped', 'Ready to Ship'],
        'Shipped': [] // Terminal state
      };

      const currentStage = preshipment.stage;
      const newStage = stagingData.stage;

      if (currentStage !== newStage && !stageTransitions[currentStage]?.includes(newStage)) {
        return { 
          success: false, 
          error: `Invalid stage transition from '${currentStage}' to '${newStage}'` 
        };
      }

      // Sanitize staging data
      const sanitizedData = {
        stage: this.sanitizeInput(stagingData.stage),
        items: stagingData.items || preshipment.items,
        staging_notes: stagingData.staging_notes ? this.sanitizeInput(stagingData.staging_notes) : null,
        staged_by: stagingData.staged_by ? this.sanitizeInput(stagingData.staged_by) : null,
        staging_location: stagingData.staging_location ? this.sanitizeInput(stagingData.staging_location) : null,
        updated_at: new Date().toISOString()
      };

      // Add stage-specific timestamps
      if (newStage === 'Staged') {
        sanitizedData.staged_at = new Date().toISOString();
      } else if (newStage === 'Ready to Ship') {
        sanitizedData.ready_at = new Date().toISOString();
      }

      const updateResult = await DatabaseService.update('preshipments', preshipment.id, sanitizedData, options);
      
      // Create staging audit record
      if (updateResult.success) {
        await this.createStagingAuditRecord(shipmentId, currentStage, newStage, options);
      }

      return updateResult;
    } catch (error) {
      console.error('Error updating preshipment staging:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Driver signoff with signature capture
   * Critical FTZ operation for shipment completion
   */
  async processDriverSignoff(shipmentId, signoffData, options = {}) {
    try {
      // Validate signoff data
      const validationResult = this.validateDriverSignoff(signoffData);
      if (!validationResult.isValid) {
        return { 
          success: false, 
          error: 'Driver signoff validation failed', 
          validationErrors: validationResult.errors 
        };
      }

      // Get current preshipment
      const preshipmentResult = await DatabaseService.getAll('preshipments', {
        filters: [{ column: 'shipmentId', value: shipmentId }],
        single: true,
        ...options
      });

      if (!preshipmentResult.success) {
        return { success: false, error: 'Preshipment not found' };
      }

      const preshipment = preshipmentResult.data;

      // Validate current stage allows signoff
      if (!['Staged', 'Ready to Ship'].includes(preshipment.stage)) {
        return { 
          success: false, 
          error: `Cannot process signoff for shipment in '${preshipment.stage}' stage. Must be 'Staged' or 'Ready to Ship'` 
        };
      }

      // Process signature data if provided
      let processedSignatureData = null;
      if (signoffData.signature_data) {
        processedSignatureData = {
          signature_image: signoffData.signature_data.image || null,
          signature_timestamp: new Date().toISOString(),
          signature_method: signoffData.signature_data.method || 'digital'
        };
      }

      // Sanitize and prepare signoff data
      const sanitizedSignoffData = {
        stage: 'Shipped',
        driver_name: this.sanitizeInput(signoffData.driver_name),
        driver_license_number: this.sanitizeInput(signoffData.driver_license_number),
        license_plate_number: this.sanitizeInput(signoffData.license_plate_number),
        carrier_name: signoffData.carrier_name ? this.sanitizeInput(signoffData.carrier_name) : preshipment.carrier_name,
        tracking_number: signoffData.tracking_number ? this.sanitizeInput(signoffData.tracking_number) : preshipment.tracking_number,
        signature_data: processedSignatureData,
        driver_notes: signoffData.driver_notes ? this.sanitizeInput(signoffData.driver_notes) : null,
        shipped_at: new Date().toISOString(),
        signed_off_by: options.userId || null
      };

      // Update preshipment with signoff data
      const updateResult = await DatabaseService.update('preshipments', preshipment.id, sanitizedSignoffData, options);

      // Update inventory lots if shipment completed
      if (updateResult.success) {
        await this.updateInventoryForShippedItems(preshipment.items, options);
        await this.createShipmentCompletionRecord(shipmentId, signoffData, options);
      }

      return updateResult;
    } catch (error) {
      console.error('Error processing driver signoff:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Generate and print shipping labels
   * Handles label generation for different carrier types
   */
  async generateShippingLabel(shipmentId, labelData, options = {}) {
    try {
      // Get preshipment details
      const preshipmentResult = await DatabaseService.getAll('preshipments', {
        filters: [{ column: 'shipmentId', value: shipmentId }],
        select: `
          *,
          customers(name, address, city, state, zip, country)
        `,
        single: true,
        ...options
      });

      if (!preshipmentResult.success) {
        return { success: false, error: 'Preshipment not found' };
      }

      const preshipment = preshipmentResult.data;
      
      // Validate preshipment is ready for labeling
      if (!['Ready to Ship', 'Staged'].includes(preshipment.stage)) {
        return { 
          success: false, 
          error: `Cannot generate labels for shipment in '${preshipment.stage}' stage` 
        };
      }

      // Generate label data structure
      const labelInfo = {
        shipment_id: shipmentId,
        carrier: labelData.carrier || preshipment.carrier_name || 'GROUND',
        service_type: labelData.service_type || 'STANDARD',
        tracking_number: labelData.tracking_number || this.generateTrackingNumber(),
        ship_from: {
          company: labelData.ship_from?.company || 'ICRS Warehouse',
          address: labelData.ship_from?.address || '123 Warehouse St',
          city: labelData.ship_from?.city || 'Port City',
          state: labelData.ship_from?.state || 'FL',
          zip: labelData.ship_from?.zip || '12345',
          country: labelData.ship_from?.country || 'US'
        },
        ship_to: {
          company: preshipment.customers?.name || 'Customer',
          address: preshipment.customers?.address || labelData.ship_to?.address,
          city: preshipment.customers?.city || labelData.ship_to?.city,
          state: preshipment.customers?.state || labelData.ship_to?.state,
          zip: preshipment.customers?.zip || labelData.ship_to?.zip,
          country: preshipment.customers?.country || labelData.ship_to?.country || 'US'
        },
        package_info: {
          weight: labelData.weight || 1,
          length: labelData.length || 12,
          width: labelData.width || 12,
          height: labelData.height || 12,
          package_type: labelData.package_type || 'BOX'
        },
        items: preshipment.items?.map(item => ({
          description: item.description || 'Item',
          quantity: item.quantity,
          value: item.unit_value || 0,
          weight: labelData.item_weight || 1,
          hts_code: item.hts_code,
          country_of_origin: item.country_of_origin || 'US'
        })) || [],
        label_format: labelData.label_format || 'PDF',
        created_at: new Date().toISOString()
      };

      // Store label data
      const labelResult = await DatabaseService.insert('shipping_labels', [labelInfo], options);

      if (!labelResult.success) {
        return labelResult;
      }

      // Update preshipment with tracking number
      await DatabaseService.update('preshipments', preshipment.id, {
        tracking_number: labelInfo.tracking_number,
        carrier_name: labelInfo.carrier,
        label_generated_at: new Date().toISOString()
      }, options);

      return {
        success: true,
        data: {
          label_id: labelResult.data[0].id,
          tracking_number: labelInfo.tracking_number,
          label_data: labelInfo,
          print_ready: true
        }
      };
    } catch (error) {
      console.error('Error generating shipping label:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update inventory lots when items are shipped
   * Decreases inventory quantities and updates lot statuses
   */
  async updateInventoryForShippedItems(items, options = {}) {
    try {
      const inventoryUpdates = [];
      const transactionRecords = [];

      for (const item of items) {
        if (!item.lot_id || !item.quantity) continue;

        // Get current lot information
        const lotResult = await DatabaseService.getAll('inventory_lots', {
          filters: [{ column: 'id', value: item.lot_id }],
          single: true,
          ...options
        });

        if (lotResult.success && lotResult.data) {
          const lot = lotResult.data;
          const newQuantity = Math.max(0, lot.current_quantity - item.quantity);

          // Update inventory lot
          inventoryUpdates.push({
            id: item.lot_id,
            current_quantity: newQuantity,
            status: newQuantity === 0 ? 'Shipped Out' : lot.status,
            last_shipped_at: new Date().toISOString()
          });

          // Create transaction record
          transactionRecords.push({
            lot_id: item.lot_id,
            type: 'Shipment',
            quantity_change: -item.quantity,
            resulting_quantity: newQuantity,
            created_at: new Date().toISOString(),
            created_by: options.userId
          });
        }
      }

      // Batch update inventory lots
      if (inventoryUpdates.length > 0) {
        await DatabaseService.upsertBatch('inventory_lots', inventoryUpdates, options);
      }

      // Batch create transaction records
      if (transactionRecords.length > 0) {
        await DatabaseService.createBatch('transactions', transactionRecords, options);
      }

      return { 
        success: true, 
        data: { 
          lots_updated: inventoryUpdates.length,
          transactions_created: transactionRecords.length 
        }
      };
    } catch (error) {
      console.error('Error updating inventory for shipped items:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get ready-to-ship preshipments
   * Quick access for warehouse staff
   */
  async getReadyToShipShipments(options = {}) {
    try {
      return await this.getShipmentsByStage('Ready to Ship', options);
    } catch (error) {
      console.error('Error fetching ready-to-ship shipments:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get staged shipments awaiting pickup
   */
  async getStagedShipments(options = {}) {
    try {
      return await this.getShipmentsByStage('Staged', options);
    } catch (error) {
      console.error('Error fetching staged shipments:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Search shipments with comprehensive filters
   */
  async searchShipments(searchTerm, filters = {}, options = {}) {
    try {
      const queryFilters = [];
      
      if (filters.stage) {
        queryFilters.push({ column: 'stage', value: filters.stage });
      }
      
      if (filters.customer_id) {
        queryFilters.push({ column: 'customer_id', value: filters.customer_id });
      }
      
      if (filters.carrier) {
        queryFilters.push({ column: 'carrier_name', value: filters.carrier });
      }

      const result = await DatabaseService.getAll('preshipments', {
        select: `
          *,
          customers(name, ein)
        `,
        filters: queryFilters,
        orderBy: 'created_at.desc',
        ...options
      });

      // Client-side text search
      if (result.success && searchTerm) {
        const filteredData = result.data.filter(shipment => 
          shipment.shipmentId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          shipment.tracking_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          shipment.carrier_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          shipment.customers?.name?.toLowerCase().includes(searchTerm.toLowerCase())
        );
        
        return { success: true, data: filteredData };
      }

      return result;
    } catch (error) {
      console.error('Error searching shipments:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Helper methods for supporting functionality
   */
  generateTrackingNumber() {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `TRK${timestamp.slice(-6)}${random}`;
  }

  async createStagingAuditRecord(shipmentId, fromStage, toStage, options = {}) {
    try {
      const auditRecord = {
        shipment_id: shipmentId,
        from_stage: fromStage,
        to_stage: toStage,
        changed_at: new Date().toISOString(),
        changed_by: options.userId
      };

      await DatabaseService.insert('preshipment_audit', [auditRecord], options);
    } catch (error) {
      console.error('Error creating staging audit record:', error);
    }
  }

  async createShipmentCompletionRecord(shipmentId, signoffData, options = {}) {
    try {
      const completionRecord = {
        shipment_id: shipmentId,
        completed_at: new Date().toISOString(),
        driver_name: signoffData.driver_name,
        driver_license: signoffData.driver_license_number,
        license_plate: signoffData.license_plate_number,
        completed_by: options.userId
      };

      await DatabaseService.insert('shipment_completions', [completionRecord], options);
    } catch (error) {
      console.error('Error creating shipment completion record:', error);
    }
  }

  /**
   * Get shipping statistics for reporting
   */
  async getShippingStatistics(dateRange = {}, options = {}) {
    try {
      const result = await DatabaseService.getAll('preshipments', {
        ...options
      });
      
      if (!result.success) {
        return result;
      }

      const shipments = result.data;
      
      // Filter by date range if provided
      let filteredShipments = shipments;
      if (dateRange.startDate || dateRange.endDate) {
        filteredShipments = shipments.filter(s => {
          const shipDate = new Date(s.shipped_at || s.created_at);
          const start = dateRange.startDate ? new Date(dateRange.startDate) : new Date(0);
          const end = dateRange.endDate ? new Date(dateRange.endDate) : new Date();
          return shipDate >= start && shipDate <= end;
        });
      }

      const stats = {
        total_shipments: filteredShipments.length,
        by_stage: {},
        by_carrier: {},
        shipped_count: 0,
        pending_count: 0,
        average_processing_time: 0,
        on_time_shipments: 0
      };

      // Calculate statistics
      filteredShipments.forEach(s => {
        // Stage breakdown
        stats.by_stage[s.stage] = (stats.by_stage[s.stage] || 0) + 1;
        
        // Carrier breakdown
        if (s.carrier_name) {
          stats.by_carrier[s.carrier_name] = (stats.by_carrier[s.carrier_name] || 0) + 1;
        }
        
        // Status counts
        if (s.stage === 'Shipped') {
          stats.shipped_count += 1;
          
          // Check on-time delivery
          if (s.requested_ship_date && s.shipped_at) {
            const requested = new Date(s.requested_ship_date);
            const shipped = new Date(s.shipped_at);
            if (shipped <= requested) {
              stats.on_time_shipments += 1;
            }
          }
        } else {
          stats.pending_count += 1;
        }
      });

      return { success: true, data: stats };
    } catch (error) {
      console.error('Error fetching shipping statistics:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new ShippingService();