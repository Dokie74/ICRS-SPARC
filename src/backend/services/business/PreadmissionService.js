// src/backend/services/business/PreadmissionService.js
// Preadmission management service for ICRS SPARC - transferred from original ICRS
// Maintains all Foreign Trade Zone compliance requirements and customs workflow

const BaseService = require('../BaseService');
const DatabaseService = require('../../db/supabase-client');

class PreadmissionService extends BaseService {
  constructor() {
    super('preadmissions');
    
    // Field mapping between frontend/service (snake_case) and database (camelCase)
    // This preserves existing functionality while supporting new spreadsheet fields
    this.fieldMapping = {
      // Existing camelCase fields in database -> snake_case in service/frontend
      'admission_id': 'admissionId',
      'customer_id': 'customerId',
      'expected_arrival': 'arrivalDate', // Existing field name mapping
      'container_number': 'container',   // Existing field name mapping
      
      // New snake_case fields can be used directly (added by ALTER TABLE migration)
      'zone_status': 'zone_status',
      'primary_supplier_name': 'primary_supplier_name',
      'year': 'year',
      'shipment_lot_id': 'shipment_lot_id',
      'bol_date': 'bol_date',
      'seal_number': 'seal_number',
      'luc_ship_date': 'luc_ship_date',
      'bond_amount': 'bond_amount',
      'freight_invoice_date': 'freight_invoice_date',
      'ship_invoice_number': 'ship_invoice_number',
      'uscbp_master_billing': 'uscbp_master_billing'
    };
  }
  
  /**
   * Map service field names to database field names
   * Handles camelCase (existing) vs snake_case (new) field mappings
   */
  mapToDatabase(data) {
    const mapped = {};
    for (const [serviceField, value] of Object.entries(data)) {
      const dbField = this.fieldMapping[serviceField] || serviceField;
      mapped[dbField] = value;
    }
    return mapped;
  }
  
  /**
   * Map database field names to service field names
   * Handles camelCase (existing) vs snake_case (new) field mappings
   */
  mapFromDatabase(data) {
    if (!data) return data;
    if (Array.isArray(data)) return data.map(item => this.mapFromDatabase(item));
    
    const mapped = {};
    for (const [dbField, value] of Object.entries(data)) {
      // Find the service field name for this database field
      const serviceField = Object.keys(this.fieldMapping).find(
        key => this.fieldMapping[key] === dbField
      ) || dbField;
      mapped[serviceField] = value;
    }
    return mapped;
  }

  validatePreadmission(preadmissionData) {
    const errors = [];
    
    // Required fields validation
    if (!preadmissionData.admission_id || preadmissionData.admission_id.trim().length < 1) {
      errors.push('Admission ID is required');
    }
    
    if (!preadmissionData.customer_id) {
      errors.push('Customer ID is required');
    }
    
    // String length validations
    if (preadmissionData.container_number && preadmissionData.container_number.length > 50) {
      errors.push('Container number must be 50 characters or less');
    }
    
    if (preadmissionData.seal_number && preadmissionData.seal_number.length > 50) {
      errors.push('Seal number must be 50 characters or less');
    }
    
    if (preadmissionData.shipment_lot_id && preadmissionData.shipment_lot_id.length > 100) {
      errors.push('Shipment/Lot ID must be 100 characters or less');
    }
    
    if (preadmissionData.ship_invoice_number && preadmissionData.ship_invoice_number.length > 100) {
      errors.push('Ship invoice number must be 100 characters or less');
    }
    
    // Numeric field validations
    if (preadmissionData.total_value && isNaN(parseFloat(preadmissionData.total_value))) {
      errors.push('Total value must be a valid number');
    }
    
    if (preadmissionData.bond_amount && isNaN(parseFloat(preadmissionData.bond_amount))) {
      errors.push('Bond amount must be a valid number');
    }
    
    if (preadmissionData.total_charges && isNaN(parseFloat(preadmissionData.total_charges))) {
      errors.push('Total charges must be a valid number');
    }
    
    if (preadmissionData.year && (!Number.isInteger(preadmissionData.year) || preadmissionData.year < 2020 || preadmissionData.year > 2030)) {
      errors.push('Year must be a valid integer between 2020 and 2030');
    }
    
    // Date validations
    const dateFields = ['bol_date', 'import_date', 'export_date', 'luc_ship_date', 'freight_invoice_date', 'expected_arrival'];
    dateFields.forEach(field => {
      if (preadmissionData[field] && !this.isValidDate(preadmissionData[field])) {
        errors.push(`${field.replace(/_/g, ' ')} must be a valid date`);
      }
    });
    
    // Date logic validation
    if (preadmissionData.bol_date && preadmissionData.import_date) {
      const bolDate = new Date(preadmissionData.bol_date);
      const importDate = new Date(preadmissionData.import_date);
      if (bolDate > importDate) {
        errors.push('BOL Date cannot be after FTZ Admission Date');
      }
    }
    
    if (preadmissionData.export_date && preadmissionData.import_date) {
      const exportDate = new Date(preadmissionData.export_date);
      const importDate = new Date(preadmissionData.import_date);
      if (exportDate > importDate) {
        errors.push('Export Date cannot be after Import Date');
      }
    }
    
    // Zone status validation
    if (preadmissionData.zone_status && !['PF', 'NPF', 'D', 'ZR'].includes(preadmissionData.zone_status)) {
      errors.push('Zone status must be one of: PF, NPF, D, ZR');
    }
    
    return { isValid: errors.length === 0, errors: errors };
  }
  
  isValidDate(dateString) {
    if (!dateString) return true; // Optional dates are valid when empty
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date) && dateString.match(/^\d{4}-\d{2}-\d{2}$/);
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
      
      // Map database response back to service field names
      if (result.success && result.data) {
        result.data = this.mapFromDatabase(result.data);
      }
      
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
        filters: [{ column: 'admissionId', value: admissionId }], // Use database field name
        single: true,
        ...options
      });

      // Map database response back to service field names
      if (result.success && result.data) {
        result.data = this.mapFromDatabase(result.data);
      }

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

      // Sanitize input data (updated for new spreadsheet-aligned fields)
      const sanitizedData = {
        // Primary identification (matches spreadsheet UID)
        admission_id: this.sanitizeInput(preadmissionData.admission_id),
        
        // Status fields (matches spreadsheet Status column)
        status: preadmissionData.status || 'Pending',
        zone_status: preadmissionData.zone_status || null,
        
        // Customer and supplier (matches spreadsheet Supplier2)
        customer_id: preadmissionData.customer_id,
        primary_supplier_name: preadmissionData.primary_supplier_name ? this.sanitizeInput(preadmissionData.primary_supplier_name) : null,
        
        // Shipment identification (new fields from spreadsheet)
        year: preadmissionData.year || null,
        shipment_lot_id: preadmissionData.shipment_lot_id ? this.sanitizeInput(preadmissionData.shipment_lot_id) : null,
        
        // Transport and BOL information (matches spreadsheet BOL fields)
        bol: preadmissionData.bol ? this.sanitizeInput(preadmissionData.bol) : null,
        bol_date: preadmissionData.bol_date || null,
        container_number: preadmissionData.container_number ? this.sanitizeInput(preadmissionData.container_number) : null,
        seal_number: preadmissionData.seal_number ? this.sanitizeInput(preadmissionData.seal_number) : null,
        
        // Date fields (aligned with spreadsheet date columns)
        import_date: preadmissionData.import_date || null, // FTZ Admission Date
        export_date: preadmissionData.export_date || null, // Keep for compatibility
        luc_ship_date: preadmissionData.luc_ship_date || null, // LUC Ship Date
        expected_arrival: preadmissionData.expected_arrival || null,
        freight_invoice_date: preadmissionData.freight_invoice_date || null,
        
        // Financial fields (matches spreadsheet Value/Bond/Tariff columns)
        total_value: preadmissionData.total_value ? parseFloat(preadmissionData.total_value) : 0.00,
        bond_amount: preadmissionData.bond_amount ? parseFloat(preadmissionData.bond_amount) : 0.00,
        total_charges: preadmissionData.total_charges ? parseFloat(preadmissionData.total_charges) : 0.00,
        
        // Carrier and transport (matches spreadsheet Carrier column)
        conveyance_name: preadmissionData.conveyance_name ? this.sanitizeInput(preadmissionData.conveyance_name) : null,
        it_carrier: preadmissionData.it_carrier ? this.sanitizeInput(preadmissionData.it_carrier) : null,
        ship_invoice_number: preadmissionData.ship_invoice_number ? this.sanitizeInput(preadmissionData.ship_invoice_number) : null,
        
        // Customs and compliance
        uscbp_master_billing: preadmissionData.uscbp_master_billing ? this.sanitizeInput(preadmissionData.uscbp_master_billing) : null,
        e214: preadmissionData.e214 ? this.sanitizeInput(preadmissionData.e214) : null,
        
        // Port information (keep for compatibility)
        foreign_port_of_lading: preadmissionData.foreign_port_of_lading ? this.sanitizeInput(preadmissionData.foreign_port_of_lading) : null,
        foreign_port_of_unlading: preadmissionData.foreign_port_of_unlading ? this.sanitizeInput(preadmissionData.foreign_port_of_unlading) : null,
        port_of_unlading: preadmissionData.port_of_unlading ? this.sanitizeInput(preadmissionData.port_of_unlading) : null,
        it_date: preadmissionData.it_date || null,
        it_port: preadmissionData.it_port ? this.sanitizeInput(preadmissionData.it_port) : null,
        
        // Notes (matches spreadsheet Note column)
        notes: preadmissionData.notes ? this.sanitizeInput(preadmissionData.notes) : null
      };

      // Map to database field names before inserting
      const dbData = this.mapToDatabase(sanitizedData);
      const result = await DatabaseService.insert('preadmissions', [dbData], options);
      
      // Handle result format (single record creation) and map response back
      if (result.success && result.data.length > 0) {
        const createdPreadmission = this.mapFromDatabase(result.data[0]);
        
        // Create items if provided
        if (preadmissionData.items && preadmissionData.items.length > 0) {
          const itemsResult = await this.updatePreadmissionItems(
            createdPreadmission.id || result.data[0].id, 
            preadmissionData.items, 
            options
          );
          
          if (!itemsResult.success) {
            console.warn('Failed to create preadmission items:', itemsResult.error);
            // Don't fail the entire operation, just warn
          }
        }
        
        return { success: true, data: createdPreadmission };
      }
      
      return result;
    } catch (error) {
      console.error('Error creating preadmission:', error);
      
      // Handle unique constraint violations (preserves exact FTZ compliance error messaging)
      if (error.message.includes('duplicate key') || error.message.includes('unique constraint')) {
        return { success: false, error: `Admission ID '${preadmissionData.admission_id}' already exists` };
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

      // Sanitize input data (updated for new spreadsheet-aligned fields)
      const sanitizedData = {
        // Primary identification (matches spreadsheet UID)
        admission_id: this.sanitizeInput(preadmissionData.admission_id),
        
        // Status fields (matches spreadsheet Status column)
        status: preadmissionData.status || 'Pending',
        zone_status: preadmissionData.zone_status || null,
        
        // Customer and supplier (matches spreadsheet Supplier2)
        customer_id: preadmissionData.customer_id,
        primary_supplier_name: preadmissionData.primary_supplier_name ? this.sanitizeInput(preadmissionData.primary_supplier_name) : null,
        
        // Shipment identification (new fields from spreadsheet)
        year: preadmissionData.year || null,
        shipment_lot_id: preadmissionData.shipment_lot_id ? this.sanitizeInput(preadmissionData.shipment_lot_id) : null,
        
        // Transport and BOL information (matches spreadsheet BOL fields)
        bol: preadmissionData.bol ? this.sanitizeInput(preadmissionData.bol) : null,
        bol_date: preadmissionData.bol_date || null,
        container_number: preadmissionData.container_number ? this.sanitizeInput(preadmissionData.container_number) : null,
        seal_number: preadmissionData.seal_number ? this.sanitizeInput(preadmissionData.seal_number) : null,
        
        // Date fields (aligned with spreadsheet date columns)
        import_date: preadmissionData.import_date || null, // FTZ Admission Date
        export_date: preadmissionData.export_date || null, // Keep for compatibility
        luc_ship_date: preadmissionData.luc_ship_date || null, // LUC Ship Date
        expected_arrival: preadmissionData.expected_arrival || null,
        freight_invoice_date: preadmissionData.freight_invoice_date || null,
        
        // Financial fields (matches spreadsheet Value/Bond/Tariff columns)
        total_value: preadmissionData.total_value ? parseFloat(preadmissionData.total_value) : 0.00,
        bond_amount: preadmissionData.bond_amount ? parseFloat(preadmissionData.bond_amount) : 0.00,
        total_charges: preadmissionData.total_charges ? parseFloat(preadmissionData.total_charges) : 0.00,
        
        // Carrier and transport (matches spreadsheet Carrier column)
        conveyance_name: preadmissionData.conveyance_name ? this.sanitizeInput(preadmissionData.conveyance_name) : null,
        it_carrier: preadmissionData.it_carrier ? this.sanitizeInput(preadmissionData.it_carrier) : null,
        ship_invoice_number: preadmissionData.ship_invoice_number ? this.sanitizeInput(preadmissionData.ship_invoice_number) : null,
        
        // Customs and compliance
        uscbp_master_billing: preadmissionData.uscbp_master_billing ? this.sanitizeInput(preadmissionData.uscbp_master_billing) : null,
        e214: preadmissionData.e214 ? this.sanitizeInput(preadmissionData.e214) : null,
        
        // Port information (keep for compatibility)
        foreign_port_of_lading: preadmissionData.foreign_port_of_lading ? this.sanitizeInput(preadmissionData.foreign_port_of_lading) : null,
        foreign_port_of_unlading: preadmissionData.foreign_port_of_unlading ? this.sanitizeInput(preadmissionData.foreign_port_of_unlading) : null,
        port_of_unlading: preadmissionData.port_of_unlading ? this.sanitizeInput(preadmissionData.port_of_unlading) : null,
        it_date: preadmissionData.it_date || null,
        it_port: preadmissionData.it_port ? this.sanitizeInput(preadmissionData.it_port) : null,
        
        // Notes (matches spreadsheet Note column)
        notes: preadmissionData.notes ? this.sanitizeInput(preadmissionData.notes) : null
      };

      // Map to database field names before updating
      const dbData = this.mapToDatabase(sanitizedData);
      const result = await DatabaseService.update('preadmissions', preadmissionId, dbData, options);
      
      // Map response back to service field names
      if (result.success && result.data) {
        result.data = this.mapFromDatabase(result.data);
      }
      
      return result;
    } catch (error) {
      console.error('Error updating preadmission:', error);
      
      // Handle unique constraint violations (preserves exact error messaging)
      if (error.message.includes('duplicate key') || error.message.includes('unique constraint')) {
        return { success: false, error: `Admission ID '${preadmissionData.admission_id}' already exists` };
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

  /**
   * Create preadmission items
   * Handles normalized item storage for spreadsheet import compatibility
   */
  async createPreadmissionItems(preadmissionId, items, options = {}) {
    try {
      if (!items || !Array.isArray(items) || items.length === 0) {
        return { success: true, data: [] };
      }

      const sanitizedItems = items.map(item => ({
        preadmission_id: preadmissionId,
        part_id: this.sanitizeInput(item.part_id),
        variant_id: item.variant_id || null,
        quantity: parseInt(item.quantity) || 0,
        package_quantity: item.package_quantity ? parseInt(item.package_quantity) : null,
        package_type: item.package_type ? this.sanitizeInput(item.package_type) : null,
        gross_weight: item.gross_weight ? parseFloat(item.gross_weight) : null,
        supplier_id: item.supplier_id || null,
        country_of_origin: item.country_of_origin ? this.sanitizeInput(item.country_of_origin) : null,
        hts_code: item.hts_code ? this.sanitizeInput(item.hts_code) : null
      }));

      const result = await DatabaseService.insert('preadmission_items', sanitizedItems, options);
      return result;
    } catch (error) {
      console.error('Error creating preadmission items:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update preadmission items
   * Replaces all items for a preadmission (delete and recreate)
   */
  async updatePreadmissionItems(preadmissionId, items, options = {}) {
    try {
      // Delete existing items
      const deleteResult = await DatabaseService.delete('preadmission_items', {
        filters: [{ column: 'preadmission_id', value: preadmissionId }]
      });

      if (!deleteResult.success) {
        console.warn('Failed to delete existing items:', deleteResult.error);
      }

      // Create new items
      return await this.createPreadmissionItems(preadmissionId, items, options);
    } catch (error) {
      console.error('Error updating preadmission items:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get preadmission with items
   * Joins preadmission data with its items for complete record
   */
  async getPreadmissionWithItems(admissionId, options = {}) {
    try {
      // Get the preadmission
      const preadmissionResult = await this.getPreadmissionById(admissionId, options);
      if (!preadmissionResult.success) {
        return preadmissionResult;
      }

      // Get the items
      const itemsResult = await DatabaseService.select('preadmission_items', {
        filters: [{ column: 'preadmission_id', value: preadmissionResult.data.id }],
        orderBy: 'created_at.asc'
      });

      // Combine the data
      const completeRecord = {
        ...preadmissionResult.data,
        items: itemsResult.success ? itemsResult.data : []
      };

      return { success: true, data: completeRecord };
    } catch (error) {
      console.error('Error fetching preadmission with items:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Import preadmission from spreadsheet data
   * Maps spreadsheet columns to database fields
   */
  async importFromSpreadsheetData(spreadsheetRecord, options = {}) {
    try {
      // Map spreadsheet columns to database fields
      const mappedData = {
        admission_id: spreadsheetRecord.UID?.toString() || '',
        status: 'Pending',
        zone_status: spreadsheetRecord.Status || null,
        customer_id: options.defaultCustomerId || null, // Will need to be provided
        primary_supplier_name: spreadsheetRecord['Supplier2'] || null,
        year: spreadsheetRecord.Year ? parseInt(spreadsheetRecord.Year) : null,
        shipment_lot_id: spreadsheetRecord['Shipment / Lot ID'] || null,
        bol: spreadsheetRecord['BOL Number'] || null,
        bol_date: this.parseSpreadsheetDate(spreadsheetRecord['BOL Date']) || null,
        container_number: spreadsheetRecord['Container ID'] || null,
        seal_number: spreadsheetRecord['Seal #'] || null,
        import_date: this.parseSpreadsheetDate(spreadsheetRecord['FTZ \nAdmission Date']) || null,
        luc_ship_date: this.parseSpreadsheetDate(spreadsheetRecord['LUC \nShip Date']) || null,
        total_value: this.parseSpreadsheetNumber(spreadsheetRecord['Value of Goods']) || 0.00,
        bond_amount: this.parseSpreadsheetNumber(spreadsheetRecord['Bond']) || 0.00,
        total_charges: this.parseSpreadsheetNumber(spreadsheetRecord['Tariff $']) || 0.00,
        conveyance_name: spreadsheetRecord['Carrier'] || null,
        uscbp_master_billing: spreadsheetRecord['USCBP \nMaster Bill #'] || null,
        freight_invoice_date: this.parseSpreadsheetDate(spreadsheetRecord['Freight Invoice Date']) || null,
        ship_invoice_number: spreadsheetRecord['Ship Inv.'] || null,
        notes: spreadsheetRecord['Note'] || null
      };

      // Create the preadmission
      const preadmissionResult = await this.createPreadmission(mappedData, options);
      if (!preadmissionResult.success) {
        return preadmissionResult;
      }

      // Create items if part data exists
      if (spreadsheetRecord['Part ID'] && spreadsheetRecord['# Pcs']) {
        const itemData = [{
          part_id: spreadsheetRecord['Part ID'].toString(),
          quantity: parseInt(spreadsheetRecord['# Pcs']) || 0,
          supplier_id: null, // Will need mapping
          country_of_origin: null,
          hts_code: null
        }];

        await this.createPreadmissionItems(preadmissionResult.data.id, itemData, options);
      }

      return preadmissionResult;
    } catch (error) {
      console.error('Error importing from spreadsheet data:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Parse spreadsheet date values
   */
  parseSpreadsheetDate(dateValue) {
    if (!dateValue) return null;
    
    // Handle Excel date objects
    if (dateValue instanceof Date) {
      return dateValue.toISOString().split('T')[0];
    }
    
    // Handle string dates
    if (typeof dateValue === 'string') {
      const parsed = new Date(dateValue);
      if (!isNaN(parsed.getTime())) {
        return parsed.toISOString().split('T')[0];
      }
    }
    
    return null;
  }

  /**
   * Parse spreadsheet numeric values
   */
  parseSpreadsheetNumber(numberValue) {
    if (!numberValue) return 0.00;
    
    if (typeof numberValue === 'number') {
      return numberValue;
    }
    
    if (typeof numberValue === 'string') {
      // Remove any currency symbols or commas
      const cleaned = numberValue.replace(/[$,]/g, '');
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? 0.00 : parsed;
    }
    
    return 0.00;
  }
}

module.exports = new PreadmissionService();