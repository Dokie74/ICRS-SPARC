// src/backend/services/business/PreadmissionService.js
// Preadmission management service for ICRS SPARC - transferred from original ICRS
// Maintains all Foreign Trade Zone compliance requirements and customs workflow

const BaseService = require('../BaseService');
const DatabaseService = require('../../db/supabase-client');

class PreadmissionService extends BaseService {
  constructor() {
    super('preadmissions');
  }

  validatePreadmission(preadmissionData) {
    const errors = [];
    
    if (!preadmissionData.admissionId || preadmissionData.admissionId.trim().length < 1) {
      errors.push('Admission ID is required');
    }
    
    if (!preadmissionData.customerId) {
      errors.push('Customer ID is required');
    }
    
    if (preadmissionData.container && preadmissionData.container.length > 50) {
      errors.push('Container number must be 50 characters or less');
    }
    
    if (preadmissionData.total_value && isNaN(parseFloat(preadmissionData.total_value))) {
      errors.push('Total value must be a valid number');
    }
    
    return { isValid: errors.length === 0, errors: errors };
  }
  
  sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    return input.trim().replace(/[<>]/g, '');
  }

  /**
   * Get all preadmissions with flexible filtering
   * Supports FTZ preadmission workflow management
   */
  async getAllPreadmissions(options = {}) {
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

      const result = await DatabaseService.select('preadmissions', queryOptions);
      return result;
    } catch (error) {
      console.error('Error fetching preadmissions:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get preadmission by admission ID
   * Critical for FTZ customs document retrieval
   */
  async getPreadmissionById(admissionId, options = {}) {
    try {
      const result = await DatabaseService.select('preadmissions', {
        filters: [{ column: 'admissionId', value: admissionId }],
        single: true,
        ...options
      });

      return result;
    } catch (error) {
      console.error('Error fetching preadmission:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Create new preadmission
   * Maintains FTZ preadmission creation with validation and audit trails
   */
  async createPreadmission(preadmissionData, options = {}) {
    try {
      // Validate preadmission data (preserves FTZ compliance requirements)
      const validationResult = this.validatePreadmission(preadmissionData);
      if (!validationResult.isValid) {
        return { 
          success: false, 
          error: 'Validation failed', 
          validationErrors: validationResult.errors 
        };
      }

      // Sanitize input data (preserves original sanitization pattern)
      const sanitizedData = {
        admissionId: this.sanitizeInput(preadmissionData.admissionId),
        e214: preadmissionData.e214 ? this.sanitizeInput(preadmissionData.e214) : null,
        container: preadmissionData.container ? this.sanitizeInput(preadmissionData.container) : null,
        bol: preadmissionData.bol ? this.sanitizeInput(preadmissionData.bol) : null,
        arrivalDate: preadmissionData.arrivalDate || new Date().toISOString(),
        items: preadmissionData.items || [],
        customerId: preadmissionData.customerId,
        conveyance_name: preadmissionData.conveyance_name ? this.sanitizeInput(preadmissionData.conveyance_name) : null,
        import_date: preadmissionData.import_date || null,
        port_of_unlading: preadmissionData.port_of_unlading ? this.sanitizeInput(preadmissionData.port_of_unlading) : null,
        total_value: preadmissionData.total_value ? parseFloat(preadmissionData.total_value) : null,
        total_charges: preadmissionData.total_charges ? parseFloat(preadmissionData.total_charges) : null,
        status: preadmissionData.status || 'Pending'
      };

      const result = await DatabaseService.insert('preadmissions', [sanitizedData], options);
      
      // Handle result format (single record creation)
      if (result.success && result.data.length > 0) {
        return { success: true, data: result.data[0] };
      }
      
      return result;
    } catch (error) {
      console.error('Error creating preadmission:', error);
      
      // Handle unique constraint violations (preserves exact FTZ compliance error messaging)
      if (error.message.includes('duplicate key') || error.message.includes('unique constraint')) {
        return { success: false, error: `Admission ID '${preadmissionData.admissionId}' already exists` };
      }
      
      return { success: false, error: error.message };
    }
  }

  /**
   * Update preadmission
   * Maintains FTZ preadmission update logic with comprehensive field support
   */
  async updatePreadmission(preadmissionId, preadmissionData, options = {}) {
    try {
      // Validate preadmission data (preserves FTZ validation requirements)
      const validationResult = this.validatePreadmission(preadmissionData);
      if (!validationResult.isValid) {
        return { 
          success: false, 
          error: 'Validation failed', 
          validationErrors: validationResult.errors 
        };
      }

      // Sanitize input data (preserves comprehensive field support)
      const sanitizedData = {
        admissionId: this.sanitizeInput(preadmissionData.admissionId),
        e214: preadmissionData.e214 ? this.sanitizeInput(preadmissionData.e214) : null,
        container: preadmissionData.container ? this.sanitizeInput(preadmissionData.container) : null,
        bol: preadmissionData.bol ? this.sanitizeInput(preadmissionData.bol) : null,
        arrivalDate: preadmissionData.arrivalDate || null,
        items: preadmissionData.items || [],
        customerId: preadmissionData.customerId,
        conveyance_name: preadmissionData.conveyance_name ? this.sanitizeInput(preadmissionData.conveyance_name) : null,
        import_date: preadmissionData.import_date || null,
        export_date: preadmissionData.export_date || null,
        port_of_unlading: preadmissionData.port_of_unlading ? this.sanitizeInput(preadmissionData.port_of_unlading) : null,
        foreign_port_of_lading: preadmissionData.foreign_port_of_lading ? this.sanitizeInput(preadmissionData.foreign_port_of_lading) : null,
        it_carrier: preadmissionData.it_carrier ? this.sanitizeInput(preadmissionData.it_carrier) : null,
        it_port: preadmissionData.it_port ? this.sanitizeInput(preadmissionData.it_port) : null,
        it_date: preadmissionData.it_date || null,
        it_number: preadmissionData.it_number ? this.sanitizeInput(preadmissionData.it_number) : null,
        zone_status: preadmissionData.zone_status ? this.sanitizeInput(preadmissionData.zone_status) : null,
        total_value: preadmissionData.total_value ? parseFloat(preadmissionData.total_value) : null,
        total_charges: preadmissionData.total_charges ? parseFloat(preadmissionData.total_charges) : null,
        status: preadmissionData.status || 'Pending Arrival'
      };

      const result = await DatabaseService.update('preadmissions', preadmissionId, sanitizedData, options);
      return result;
    } catch (error) {
      console.error('Error updating preadmission:', error);
      
      // Handle unique constraint violations (preserves exact error messaging)
      if (error.message.includes('duplicate key') || error.message.includes('unique constraint')) {
        return { success: false, error: `Admission ID '${preadmissionData.admissionId}' already exists` };
      }
      
      return { success: false, error: error.message };
    }
  }

  /**
   * Update preadmission audit data
   * Critical FTZ audit workflow with photo documentation
   */
  async updatePreadmissionAudit(admissionId, auditData, options = {}) {
    try {
      const sanitizedAuditData = {
        status: auditData.status,
        audit_notes: auditData.audit_notes ? this.sanitizeInput(auditData.audit_notes) : null,
        rejection_reason: auditData.rejection_reason ? this.sanitizeInput(auditData.rejection_reason) : null,
        photo_urls: auditData.photo_urls || [],
        audited_by: auditData.audited_by ? this.sanitizeInput(auditData.audited_by) : null,
        admitted_items: auditData.admitted_items || [],
        audit_timestamp: new Date().toISOString(),
        seal_number: auditData.seal_number ? this.sanitizeInput(auditData.seal_number) : null,
        skid_count: auditData.skid_count ? parseInt(auditData.skid_count) : null
      };

      const result = await DatabaseService.select('preadmissions', {
        filters: [{ column: 'admissionId', value: admissionId }],
        single: true,
        ...options
      });

      if (!result.success) {
        return { success: false, error: 'Preadmission not found' };
      }

      const preadmissionRecord = result.data;
      const updateResult = await DatabaseService.update('preadmissions', preadmissionRecord.id, sanitizedAuditData, options);
      
      return updateResult;
    } catch (error) {
      console.error('Error updating preadmission audit:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Process admission (convert preadmission to inventory lot)
   * Critical FTZ operation for inventory admission workflow
   */
  async processAdmission(admissionData, preadmission, options = {}) {
    try {
      const { partId, customerId, status, qty, location } = admissionData;

      if (!location) {
        return { success: false, error: 'Storage location is required for admission' };
      }

      const lotNumber = `L-${Date.now()}`;
      
      // Create inventory lot (preserves original lot creation pattern)
      const lotData = {
        id: lotNumber,
        part_id: partId,
        customer_id: customerId,
        status: status,
        original_quantity: parseInt(qty), 
        current_quantity: parseInt(qty),  
        admission_date: preadmission.arrivalDate,
        manifest_number: preadmission.bol,
        e214_admission_number: preadmission.e214,
        conveyance_name: preadmission.conveyance_name,
        import_date: preadmission.import_date,
        port_of_unlading: preadmission.port_of_unlading,
        bill_of_lading: preadmission.bol,
        total_value: preadmission.total_value,
        total_charges: preadmission.total_charges
      };

      const lotResult = await DatabaseService.insert('inventory_lots', [lotData], options);
      
      if (!lotResult.success) {
        return lotResult;
      }

      // Create location record (preserves inventory location tracking)
      const locationResult = await DatabaseService.insert('inventory_locations', [{
        lot_id: lotNumber,
        location_name: location,
        quantity: parseInt(qty)
      }], options);

      if (!locationResult.success) {
        console.warn('Failed to create location record:', locationResult.error);
      }

      // Create transaction record (preserves audit trail)
      const transactionResult = await DatabaseService.insert('transactions', [{
        lot_id: lotNumber,
        type: 'Admission',
        quantity_change: parseInt(qty),
        source_document_number: preadmission.bol
      }], options);

      if (!transactionResult.success) {
        console.warn('Failed to create transaction record:', transactionResult.error);
      }

      // Handle result format (single record creation)
      if (lotResult.success && lotResult.data.length > 0) {
        return { success: true, data: lotResult.data[0] };
      }
      
      return lotResult;
    } catch (error) {
      console.error('Error processing admission:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get preadmissions by status
   * Status-based filtering for FTZ workflow management
   */
  async getPreadmissionsByStatus(status, options = {}) {
    try {
      const result = await DatabaseService.select('preadmissions', {
        filters: [{ column: 'status', value: status }],
        orderBy: 'created_at.desc',
        ...options
      });

      return result;
    } catch (error) {
      console.error('Error fetching preadmissions by status:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get preadmissions by customer
   * Customer-specific preadmission filtering for FTZ operations
   */
  async getPreadmissionsByCustomer(customerId, options = {}) {
    try {
      const result = await DatabaseService.select('preadmissions', {
        filters: [{ column: 'customerId', value: customerId }],
        orderBy: 'created_at.desc',
        ...options
      });

      return result;
    } catch (error) {
      console.error('Error fetching preadmissions by customer:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Search preadmissions
   * Comprehensive search for FTZ preadmission management
   */
  async searchPreadmissions(searchTerm, filters = {}, options = {}) {
    try {
      const queryFilters = [];
      
      if (filters.status) {
        queryFilters.push({ column: 'status', value: filters.status });
      }

      if (filters.customerId) {
        queryFilters.push({ column: 'customerId', value: filters.customerId });
      }

      const result = await DatabaseService.select('preadmissions', {
        filters: queryFilters,
        orderBy: 'created_at.desc',
        ...options
      });

      // Client-side filtering for search term (could be moved to database function)
      if (result.success && searchTerm) {
        const filteredData = result.data.filter(preadmission => 
          preadmission.admissionId.toLowerCase().includes(searchTerm.toLowerCase()) ||
          preadmission.e214?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          preadmission.bol?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          preadmission.container?.toLowerCase().includes(searchTerm.toLowerCase())
        );
        
        return { success: true, data: filteredData };
      }

      return result;
    } catch (error) {
      console.error('Error searching preadmissions:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get pending preadmissions
   * Quick access to pending FTZ preadmissions
   */
  async getPendingPreadmissions(options = {}) {
    try {
      const result = await this.getPreadmissionsByStatus('Pending', options);
      return result;
    } catch (error) {
      console.error('Error fetching pending preadmissions:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Validate preadmission data
   * Client-side validation for FTZ preadmission requirements
   */
  validatePreadmissionData(preadmissionData) {
    return this.validatePreadmission(preadmissionData);
  }

  /**
   * Subscribe to preadmission changes
   * Real-time preadmission updates for FTZ operations
   */
  subscribeToPreamsionChanges(callback, options = {}) {
    return DatabaseService.subscribe('preadmissions', callback, options);
  }

  /**
   * Get preadmission statistics
   * Analytics for FTZ preadmission performance tracking
   */
  async getPreadmissionStats(dateRange = {}, options = {}) {
    try {
      const filters = [];
      
      // Date range filtering would need enhanced DatabaseService support
      // For now, get all and filter client-side (preserves original pattern)
      const result = await DatabaseService.select('preadmissions', {
        ...options
      });
      
      if (!result.success) {
        return result;
      }

      const preadmissions = result.data;
      
      // Filter by date range if provided (preserves original filtering logic)
      let filteredPreadmissions = preadmissions;
      if (dateRange.startDate || dateRange.endDate) {
        filteredPreadmissions = preadmissions.filter(p => {
          const createdDate = new Date(p.created_at);
          const start = dateRange.startDate ? new Date(dateRange.startDate) : new Date(0);
          const end = dateRange.endDate ? new Date(dateRange.endDate) : new Date();
          return createdDate >= start && createdDate <= end;
        });
      }

      const stats = {
        total: filteredPreadmissions.length,
        by_status: {},
        by_customer: {},
        total_value: 0,
        average_processing_time: 0
      };

      // Calculate statistics (preserves original analytics logic)
      filteredPreadmissions.forEach(p => {
        // Status breakdown
        stats.by_status[p.status] = (stats.by_status[p.status] || 0) + 1;
        
        // Customer breakdown
        stats.by_customer[p.customerId] = (stats.by_customer[p.customerId] || 0) + 1;
        
        // Total value
        if (p.total_value) {
          stats.total_value += parseFloat(p.total_value);
        }
      });

      return { success: true, data: stats };
    } catch (error) {
      console.error('Error fetching preadmission statistics:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new PreadmissionService();