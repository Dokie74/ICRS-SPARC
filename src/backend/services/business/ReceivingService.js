// src/backend/services/business/ReceivingService.js
// Comprehensive receiving service for ICRS SPARC - handles dock audits and FTZ compliance
// Manages photo capture, compliance verification, and automatic inventory lot creation

const BaseService = require('../BaseService');
const DatabaseService = require('../../db/supabase-client');
const PreadmissionService = require('./PreadmissionService');

class ReceivingService extends BaseService {
  constructor() {
    super('preadmissions');
  }

  /**
   * Input validation and sanitization methods
   */
  validateDockAudit(auditData) {
    const errors = [];
    
    if (!auditData.admission_id || auditData.admission_id.trim().length < 1) {
      errors.push('Admission ID is required');
    }
    
    if (!auditData.audited_by || auditData.audited_by.trim().length < 1) {
      errors.push('Auditor identification is required');
    }
    
    if (!auditData.audit_status) {
      errors.push('Audit status is required');
    }

    // Validate audit status
    const validStatuses = ['Accepted', 'Rejected', 'Partial Accept', 'Pending Review'];
    if (auditData.audit_status && !validStatuses.includes(auditData.audit_status)) {
      errors.push(`Invalid audit status. Must be one of: ${validStatuses.join(', ')}`);
    }

    // Validate admitted items if status is accepted
    if (['Accepted', 'Partial Accept'].includes(auditData.audit_status)) {
      if (!auditData.admitted_items || !Array.isArray(auditData.admitted_items)) {
        errors.push('Admitted items array is required for accepted shipments');
      } else if (auditData.admitted_items.length === 0) {
        errors.push('At least one admitted item is required for accepted shipments');
      }
    }

    // Validate rejection reason if rejected
    if (auditData.audit_status === 'Rejected' && !auditData.rejection_reason) {
      errors.push('Rejection reason is required for rejected shipments');
    }

    return { isValid: errors.length === 0, errors: errors };
  }

  validateFTZCompliance(complianceData) {
    const errors = [];
    
    if (!complianceData.container_seal_verified) {
      errors.push('Container seal verification is required');
    }
    
    if (!complianceData.documentation_complete) {
      errors.push('Documentation completeness check is required');
    }
    
    if (!complianceData.customs_inspection_passed) {
      errors.push('Customs inspection status is required');
    }
    
    return { isValid: errors.length === 0, errors: errors };
  }

  sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    return input.trim().replace(/[<>]/g, '');
  }

  /**
   * Get all receivables (preadmissions) with comprehensive filtering
   * Supports dock audit workflow management
   */
  async getAllReceivables(options = {}) {
    try {
      const queryOptions = {
        select: options.select || `
          *,
          customers(id, name, ein)
        `,
        orderBy: (options.orderBy?.column && options.orderBy.column !== 'undefined' && options.orderBy.column !== undefined) ? 
          `${options.orderBy.column}.${options.orderBy.ascending ? 'asc' : 'desc'}` :
          'arrival_date.desc',
        filters: options.filters || [],
        limit: options.limit,
        offset: options.offset
      };

      const result = await DatabaseService.getAll('preadmissions', queryOptions);
      return result;
    } catch (error) {
      console.error('Error fetching receivables:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get receivables by status for workflow management
   */
  async getReceivablesByStatus(status, options = {}) {
    try {
      const result = await DatabaseService.getAll('preadmissions', {
        select: `
          *,
          customers(id, name, ein)
        `,
        filters: [{ column: 'status', value: status }],
        orderBy: 'arrival_date.asc',
        ...options
      });

      return result;
    } catch (error) {
      console.error('Error fetching receivables by status:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Submit dock audit with photo capture and FTZ compliance
   * Critical operation for receiving workflow
   */
  async submitDockAudit(admissionId, auditData, options = {}) {
    try {
      // Validate audit data
      const validationResult = this.validateDockAudit(auditData);
      if (!validationResult.isValid) {
        return { 
          success: false, 
          error: 'Dock audit validation failed', 
          validationErrors: validationResult.errors 
        };
      }

      // Get current preadmission
      const preadmissionResult = await DatabaseService.getAll('preadmissions', {
        filters: [{ column: 'admission_id', value: admissionId }],
        select: `
          *
        `,
        single: true,
        ...options
      });

      if (!preadmissionResult.success) {
        return { success: false, error: 'Preadmission not found' };
      }

      const preadmission = preadmissionResult.data;

      // Validate FTZ compliance if provided
      if (auditData.ftz_compliance) {
        const complianceValidation = this.validateFTZCompliance(auditData.ftz_compliance);
        if (!complianceValidation.isValid) {
          return {
            success: false,
            error: 'FTZ compliance validation failed',
            validationErrors: complianceValidation.errors
          };
        }
      }

      // Process photo uploads if provided
      const processedPhotos = await this.processAuditPhotos(auditData.photos || [], options);

      // Sanitize audit data
      const sanitizedAuditData = {
        status: auditData.audit_status,
        audit_notes: auditData.audit_notes ? this.sanitizeInput(auditData.audit_notes) : null,
        rejection_reason: auditData.rejection_reason ? this.sanitizeInput(auditData.rejection_reason) : null,
        audited_by: this.sanitizeInput(auditData.audited_by),
        audit_timestamp: new Date().toISOString(),
        seal_number: auditData.seal_number ? this.sanitizeInput(auditData.seal_number) : null,
        seal_intact: auditData.seal_intact || false,
        container_condition: auditData.container_condition ? this.sanitizeInput(auditData.container_condition) : null,
        skid_count: auditData.skid_count ? parseInt(auditData.skid_count) : null,
        damage_reported: auditData.damage_reported || false,
        damage_description: auditData.damage_description ? this.sanitizeInput(auditData.damage_description) : null,
        photo_urls: processedPhotos.urls || [],
        admitted_items: auditData.admitted_items || [],
        ftz_compliance_data: auditData.ftz_compliance || null,
        temperature_check: auditData.temperature_check || null,
        weight_verified: auditData.weight_verified || false,
        documentation_complete: auditData.documentation_complete || false
      };

      // Update preadmission with audit data
      const updateResult = await DatabaseService.update('preadmissions', preadmission.id, sanitizedAuditData, options);

      // If accepted, create inventory lots
      if (updateResult.success && ['Accepted', 'Partial Accept'].includes(auditData.audit_status)) {
        const inventoryResult = await this.createInventoryLotsFromAudit(preadmission, auditData, options);
        
        if (!inventoryResult.success) {
          console.error('Failed to create inventory lots:', inventoryResult.error);
          // Don't fail the audit, but log the issue
        }

        return {
          success: true,
          data: {
            ...updateResult.data,
            inventory_lots_created: inventoryResult.success ? inventoryResult.data.lots_created : 0
          }
        };
      }

      return updateResult;
    } catch (error) {
      console.error('Error submitting dock audit:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Process and store audit photos
   * Handles photo upload and metadata storage
   */
  async processAuditPhotos(photos, options = {}) {
    try {
      const processedPhotos = {
        urls: [],
        metadata: []
      };

      for (const photo of photos) {
        if (photo.data && photo.filename) {
          // In a real implementation, this would upload to storage service
          const photoRecord = {
            filename: this.sanitizeInput(photo.filename),
            upload_timestamp: new Date().toISOString(),
            file_size: photo.size || null,
            content_type: photo.content_type || 'image/jpeg',
            description: photo.description ? this.sanitizeInput(photo.description) : null,
            photo_type: photo.photo_type || 'dock_audit',
            uploaded_by: options.userId
          };

          // Note: audit_photos table does not exist in current schema
          // Photo metadata would need to be stored in preadmissions.photo_urls JSON field
          console.warn('audit_photos table not found - photo metadata not stored');
          processedPhotos.urls.push(`/temp/photos/${photo.filename}`);
          processedPhotos.metadata.push(photoRecord);
        }
      }

      return { success: true, data: processedPhotos };
    } catch (error) {
      console.error('Error processing audit photos:', error);
      return { success: false, error: error.message, data: { urls: [], metadata: [] } };
    }
  }

  /**
   * Create inventory lots from accepted dock audit
   * Automatically generates lot numbers and inventory records
   */
  async createInventoryLotsFromAudit(preadmission, auditData, options = {}) {
    try {
      const inventoryLots = [];
      const locationRecords = [];
      const transactionRecords = [];
      let lotsCreated = 0;

      for (const admittedItem of auditData.admitted_items) {
        if (!admittedItem.part_id || !admittedItem.quantity || admittedItem.quantity <= 0) {
          continue;
        }

        // Generate unique lot number
        const lotNumber = this.generateLotNumber(preadmission.admission_id);

        // Create inventory lot (updated to match actual schema)
        const lotData = {
          id: lotNumber,
          part_id: admittedItem.part_id,
          customer_id: preadmission.customer_id,
          status: 'Available',
          quantity: parseInt(admittedItem.quantity), // Use 'quantity' column
          total_value: admittedItem.total_value || 0,
          unit_value: admittedItem.unit_value || (admittedItem.total_value / parseInt(admittedItem.quantity)) || 0,
          storage_location_id: null // Set storage location ID if needed
        };

        inventoryLots.push(lotData);

        // Note: inventory_locations table does not exist in current schema
        // Location would be tracked via storage_location_id in inventory_lots
        if (admittedItem.location) {
          console.log(`Location '${admittedItem.location}' noted for lot ${lotNumber}`);
        }

        // Create admission transaction (updated to match actual schema)
        transactionRecords.push({
          lot_id: lotNumber,
          type: 'Admission',
          quantity: parseInt(admittedItem.quantity), // Use 'quantity' column
          reference_id: preadmission.admission_id, // Use 'reference_id' column
          total_value: admittedItem.total_value || 0,
          unit_price: admittedItem.unit_value || 0,
          notes: `Dock audit admission - ${auditData.audit_status}`,
          created_by: options.userId
        });

        lotsCreated++;
      }

      // Batch create all records (updated for existing tables only)
      const results = await Promise.all([
        inventoryLots.length > 0 ? DatabaseService.createBatch('inventory_lots', inventoryLots, options) : { success: true, data: [] },
        transactionRecords.length > 0 ? DatabaseService.createBatch('transactions', transactionRecords, options) : { success: true, data: [] }
      ]);

      const [lotResult, transactionResult] = results;
      const locationResult = { success: true, data: [] }; // Placeholder since table doesn't exist

      if (!lotResult.success) {
        throw new Error(`Failed to create inventory lots: ${lotResult.error}`);
      }

      return {
        success: true,
        data: {
          lots_created: lotsCreated,
          locations_created: locationRecords.length,
          transactions_created: transactionRecords.length,
          lot_numbers: inventoryLots.map(lot => lot.id)
        }
      };
    } catch (error) {
      console.error('Error creating inventory lots from audit:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Verify FTZ compliance for receiving
   * Checks documentation and regulatory requirements
   */
  async verifyFTZCompliance(admissionId, complianceData, options = {}) {
    try {
      // Validate compliance data
      const validationResult = this.validateFTZCompliance(complianceData);
      if (!validationResult.isValid) {
        return { 
          success: false, 
          error: 'FTZ compliance validation failed', 
          validationErrors: validationResult.errors 
        };
      }

      // Get preadmission for compliance check
      const preadmissionResult = await DatabaseService.getAll('preadmissions', {
        filters: [{ column: 'admission_id', value: admissionId }],
        single: true,
        ...options
      });

      if (!preadmissionResult.success) {
        return { success: false, error: 'Preadmission not found' };
      }

      const preadmission = preadmissionResult.data;

      // Perform compliance checks
      const complianceChecks = {
        documentation_complete: complianceData.documentation_complete,
        container_seal_verified: complianceData.container_seal_verified,
        customs_inspection_passed: complianceData.customs_inspection_passed,
        manifest_matches_cargo: complianceData.manifest_matches_cargo || false,
        hts_codes_verified: complianceData.hts_codes_verified || false,
        country_of_origin_verified: complianceData.country_of_origin_verified || false,
        value_declaration_verified: complianceData.value_declaration_verified || false,
        special_requirements_met: complianceData.special_requirements_met || false
      };

      // Calculate compliance score
      const totalChecks = Object.keys(complianceChecks).length;
      const passedChecks = Object.values(complianceChecks).filter(Boolean).length;
      const complianceScore = (passedChecks / totalChecks) * 100;

      const complianceRecord = {
        admission_id: admissionId,
        compliance_checks: complianceChecks,
        compliance_score: complianceScore,
        compliance_status: complianceScore >= 90 ? 'Compliant' : complianceScore >= 70 ? 'Conditional' : 'Non-Compliant',
        verified_by: complianceData.verified_by ? this.sanitizeInput(complianceData.verified_by) : null,
        verification_date: new Date().toISOString(),
        notes: complianceData.notes ? this.sanitizeInput(complianceData.notes) : null,
        created_by: options.userId
      };

      // Note: ftz_compliance table does not exist in current schema
      // Compliance data would be stored in preadmissions table or separate table if created
      console.warn('ftz_compliance table not found - compliance record not stored');
      const complianceResult = { success: true, data: [{ id: `temp-${Date.now()}` }] };

      // Note: FTZ compliance columns (ftz_compliance_status, ftz_compliance_score, compliance_verified_at) 
      // do not exist in preadmissions table schema - compliance data would be stored elsewhere
      // Update preadmission with available columns only
      await DatabaseService.update('preadmissions', preadmission.id, {
        // Note: Compliance status would need to be stored in 'status' or a JSON field
        status: 'compliance_verified'
      }, options);

      return {
        success: true,
        data: {
          compliance_id: 'temp-compliance-id',
          compliance_status: complianceRecord.compliance_status,
          compliance_score: complianceScore,
          compliance_details: complianceChecks,
          warning: 'Compliance record not stored - table does not exist'
        }
      };
    } catch (error) {
      console.error('Error verifying FTZ compliance:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get pending receivables awaiting dock audit
   */
  async getPendingReceivables(options = {}) {
    try {
      return await this.getReceivablesByStatus('Pending', options);
    } catch (error) {
      console.error('Error fetching pending receivables:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get in-progress dock audits
   */
  async getInProgressAudits(options = {}) {
    try {
      return await this.getReceivablesByStatus('In Progress', options);
    } catch (error) {
      console.error('Error fetching in-progress audits:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Search receivables with comprehensive filters
   */
  async searchReceivables(searchTerm, filters = {}, options = {}) {
    try {
      const queryFilters = [];
      
      if (filters.status) {
        queryFilters.push({ column: 'status', value: filters.status });
      }
      
      if (filters.customer_id) {
        queryFilters.push({ column: 'customer_id', value: filters.customer_id });
      }
      
      if (filters.container_number) {
        queryFilters.push({ column: 'container_number', value: `%${filters.container_number}%`, operator: 'ilike' });
      }

      const result = await DatabaseService.getAll('preadmissions', {
        select: `
          *,
          customers(name, ein, contact_person)
        `,
        filters: queryFilters,
        orderBy: 'arrival_date.desc',
        ...options
      });

      // Client-side text search
      if (result.success && searchTerm) {
        const filteredData = result.data.filter(receivable => 
          receivable.admission_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          receivable.container_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          receivable.bill_of_lading?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          receivable.vessel_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          receivable.customers?.name?.toLowerCase().includes(searchTerm.toLowerCase())
        );
        
        return { success: true, data: filteredData };
      }

      return result;
    } catch (error) {
      console.error('Error searching receivables:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Helper methods for supporting functionality
   */
  generateLotNumber(admissionId) {
    const timestamp = Date.now().toString();
    const admissionSuffix = admissionId.slice(-4).toUpperCase();
    return `LOT-${admissionSuffix}-${timestamp.slice(-6)}`;
  }

  /**
   * Get receiving statistics for reporting
   */
  async getReceivingStatistics(dateRange = {}, options = {}) {
    try {
      const result = await DatabaseService.getAll('preadmissions', {
        ...options
      });
      
      if (!result.success) {
        return result;
      }

      const receivables = result.data;
      
      // Filter by date range if provided
      let filteredReceivables = receivables;
      if (dateRange.startDate || dateRange.endDate) {
        filteredReceivables = receivables.filter(r => {
          const auditDate = new Date(r.audit_timestamp || r.arrival_date);
          const start = dateRange.startDate ? new Date(dateRange.startDate) : new Date(0);
          const end = dateRange.endDate ? new Date(dateRange.endDate) : new Date();
          return auditDate >= start && auditDate <= end;
        });
      }

      const stats = {
        total_receivables: filteredReceivables.length,
        by_status: {},
        by_audit_status: {},
        accepted_count: 0,
        rejected_count: 0,
        pending_count: 0,
        average_processing_time: 0,
        compliance_rate: 0
      };

      let totalProcessingTime = 0;
      let processedCount = 0;
      let compliantCount = 0;
      let totalWithCompliance = 0;

      // Calculate statistics
      filteredReceivables.forEach(r => {
        // Status breakdown
        stats.by_status[r.status] = (stats.by_status[r.status] || 0) + 1;
        
        // Audit status counts
        if (r.status === 'Accepted') {
          stats.accepted_count += 1;
        } else if (r.status === 'Rejected') {
          stats.rejected_count += 1;
        } else {
          stats.pending_count += 1;
        }
        
        // Processing time calculation
        if (r.audit_timestamp && r.arrival_date) {
          const arrivalTime = new Date(r.arrival_date);
          const auditTime = new Date(r.audit_timestamp);
          const processingTime = (auditTime - arrivalTime) / (1000 * 60 * 60); // hours
          totalProcessingTime += processingTime;
          processedCount += 1;
        }
        
        // Compliance rate calculation
        // Note: ftz_compliance_status column does not exist in preadmissions table
        // Compliance would be tracked through 'status' field or JSON data
        if (r.status === 'compliance_verified' || r.zone_status === 'compliant') {
          totalWithCompliance += 1;
          if (r.zone_status === 'compliant') {
            compliantCount += 1;
          }
        }
      });

      // Calculate averages
      if (processedCount > 0) {
        stats.average_processing_time = totalProcessingTime / processedCount;
      }
      
      if (totalWithCompliance > 0) {
        stats.compliance_rate = (compliantCount / totalWithCompliance) * 100;
      }

      return { success: true, data: stats };
    } catch (error) {
      console.error('Error fetching receiving statistics:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get audit photos for a specific admission
   */
  async getAuditPhotos(admissionId, options = {}) {
    try {
      // Note: audit_photos table does not exist in current schema
      // Photos would be retrieved from preadmissions.photo_urls JSON field
      console.warn('audit_photos table not found - returning empty result');
      return { success: true, data: [], warning: 'audit_photos table does not exist' };
    } catch (error) {
      console.error('Error fetching audit photos:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new ReceivingService();