// src/backend/services/business/EntrySummaryService.js
// Entry Summary service for ICRS SPARC - transferred from original ICRS
// ACE Entry Summary service for CBP ABI Entry Summary (AE) transactions
// Handles creation, validation, and filing of FTZ Type 06 entries with combined entry summary support

const BaseService = require('../BaseService');
const DatabaseService = require('../../db/supabase-client');

class EntrySummaryService extends BaseService {
  constructor() {
    super('entry_summaries');
  }

  validateEntrySummary(entrySummaryData) {
    const errors = [];
    
    if (!entrySummaryData.entry_number || entrySummaryData.entry_number.trim().length < 1) {
      errors.push('Entry number is required');
    }
    
    if (!entrySummaryData.entry_filer_code) {
      errors.push('Entry filer code is required');
    }
    
    if (!entrySummaryData.importer_of_record_number) {
      errors.push('Importer of record number is required');
    }
    
    if (!entrySummaryData.consignee_id) {
      errors.push('Consignee is required');
    }
    
    return { isValid: errors.length === 0, errors: errors };
  }
  
  sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    return input.trim().replace(/[<>]/g, '');
  }

  /**
   * Get all entry summaries with flexible filtering
   * Supports FTZ entry summary management
   */
  async getAllEntrySummaries(options = {}) {
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

      const result = await DatabaseService.getAll('entry_summaries', queryOptions);
      return result;
    } catch (error) {
      console.error('Error fetching entry summaries:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get entry summary by ID
   * Critical for FTZ entry summary retrieval
   */
  async getEntrySummaryById(id, options = {}) {
    try {
      const result = await DatabaseService.getAll('entry_summaries', {
        filters: [{ column: 'id', value: id }],
        single: true,
        ...options
      });
      return result;
    } catch (error) {
      console.error('Error fetching entry summary:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get entry summary by entry number
   * CBP entry number lookup for FTZ operations
   */
  async getEntrySummaryByEntryNumber(entryNumber, options = {}) {
    try {
      const result = await DatabaseService.getAll('entry_summaries', {
        filters: [{ column: 'entry_number', value: entryNumber }],
        single: true,
        ...options
      });

      return result;
    } catch (error) {
      console.error('Error fetching entry summary by entry number:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Create new entry summary from preshipment
   * Critical FTZ operation for CBP entry creation workflow
   */
  async createEntrySummaryFromPreshipment(preshipmentId, options = {}) {
    try {
      // Get preshipment data (adapts to SPARC database pattern)
      const preshipmentResult = await DatabaseService.getAll('preshipments', {
        filters: [{ column: 'id', value: preshipmentId }],
        single: true,
        ...options
      });
      
      if (!preshipmentResult.success) {
        return { success: false, error: 'Preshipment not found' };
      }

      const preshipment = preshipmentResult.data;

      // Validate required fields for entry summary (preserves FTZ compliance)
      const validationResult = this.validatePreshipmentForEntryCreation(preshipment);
      if (!validationResult.valid) {
        return { success: false, error: validationResult.errors.join(', ') };
      }

      // Generate entry number if not provided
      const entryNumber = preshipment.entry_number || await this.generateEntryNumber();

      // Create entry summary header (preserves comprehensive CBP field structure)
      const entrySummaryData = {
        entry_number: entryNumber,
        entry_type_code: preshipment.entry_type_code || '06',
        summary_filing_action_request_code: 'A',
        record_district_port_of_entry: preshipment.filing_district_port,
        entry_filer_code: preshipment.entry_filer_code,
        consolidated_summary_indicator: preshipment.consolidated_entry ? 'Y' : 'N',
        importer_of_record_number: preshipment.importer_of_record_number,
        date_of_importation: preshipment.date_of_importation,
        foreign_trade_zone_identifier: preshipment.foreign_trade_zone_id,
        bill_of_lading_number: preshipment.bill_of_lading_number,
        voyage_flight_trip_number: preshipment.voyage_flight_trip_number,
        carrier_code: preshipment.carrier_code,
        importing_conveyance_name: preshipment.importing_conveyance_name,
        consignee_id: preshipment.customerId,
        manufacturer_name: preshipment.manufacturer_name,
        manufacturer_address: preshipment.manufacturer_address,
        seller_name: preshipment.seller_name,
        seller_address: preshipment.seller_address,
        bond_type_code: preshipment.bond_type_code,
        surety_company_code: preshipment.surety_company_code,
        filing_status: 'DRAFT',
        preshipment_id: preshipmentId,
        created_by: preshipment.prepared_by
      };

      // Create entry summary
      const entryResult = await DatabaseService.insert('entry_summaries', [entrySummaryData], options);
      if (!entryResult.success) {
        return entryResult;
      }

      const entrySummaryId = entryResult.data[0].id;

      // Create line items from preshipment items (preserves original workflow)
      const lineItemsResult = await this.createLineItemsFromPreshipment(
        entrySummaryId, 
        preshipment.items || [],
        options
      );

      if (!lineItemsResult.success) {
        // Rollback entry summary creation
        await DatabaseService.delete('entry_summaries', entrySummaryId, options);
        return lineItemsResult;
      }

      // Calculate and create grand totals
      const grandTotalsResult = await this.calculateAndCreateGrandTotals(entrySummaryId, options);
      if (!grandTotalsResult.success) {
        return grandTotalsResult;
      }

      // Update preshipment with entry summary reference
      await DatabaseService.update('preshipments', preshipmentId, {
        entry_summary_id: entrySummaryId,
        entry_number: entryNumber,
        entry_summary_status: 'DRAFT'
      }, options);

      // Return complete entry summary
      return await this.getEntrySummaryWithDetails(entrySummaryId, options);
    } catch (error) {
      console.error('Error creating entry summary:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Create line items from preshipment items
   * FTZ line item creation with part information integration
   */
  async createLineItemsFromPreshipment(entrySummaryId, items, options = {}) {
    try {
      const lineItems = [];
      
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        
        // Get part information (adapts to SPARC pattern)
        const partResult = await DatabaseService.getAll('parts', {
          filters: [{ column: 'id', value: item.part_id }],
          single: true,
          ...options
        });
        
        if (!partResult.success) {
          continue; // Skip items without valid part data
        }

        const part = partResult.data;

        // Get lot information for FTZ status
        const lotInfo = await this.getLotInformation(item.lot, options);

        // Create line item (preserves CBP line item structure)
        const lineItemData = {
          entry_summary_id: entrySummaryId,
          line_item_number: i + 1,
          country_of_origin_code: part.country_of_origin || 'US',
          hts_number: this.formatHTSNumber(part.hts_code),
          commercial_description: part.description,
          entered_value: this.calculateEnteredValue(part, item.qty),
          part_id: item.part_id,
          lot_id: item.lot,
          quantity_1: item.qty,
          unit_of_measure_code_1: 'PCS' // Default to pieces
        };

        const lineItemResult = await DatabaseService.insert('entry_summary_line_items', [lineItemData], options);
        if (lineItemResult.success) {
          lineItems.push(lineItemResult.data[0]);
          
          // Create FTZ status record for this line item
          await this.createFTZStatusRecord(lineItemResult.data[0].id, item, lotInfo, options);
        }
      }

      return { success: true, data: lineItems };
    } catch (error) {
      console.error('Error creating line items:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Create FTZ status record for line item
   * Critical for FTZ merchandise status tracking
   */
  async createFTZStatusRecord(lineItemId, item, lotInfo, options = {}) {
    try {
      const ftzStatusData = {
        entry_line_item_id: lineItemId,
        ftz_line_item_quantity: item.qty,
        ftz_merchandise_status_code: this.determineFTZStatus(lotInfo),
        privileged_ftz_merchandise_filing_date: lotInfo?.admission_date
      };

      return await DatabaseService.insert('ftz_status_records', [ftzStatusData], options);
    } catch (error) {
      console.error('Error creating FTZ status record:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Calculate and create grand totals
   * CBP entry summary totals calculation
   */
  async calculateAndCreateGrandTotals(entrySummaryId, options = {}) {
    try {
      // Get all line items for this entry
      const lineItemsResult = await DatabaseService.getAll('entry_summary_line_items', {
        filters: [{ column: 'entry_summary_id', value: entrySummaryId }],
        ...options
      });

      if (!lineItemsResult.success) {
        return lineItemsResult;
      }

      const lineItems = lineItemsResult.data;
      
      // Calculate totals (preserves original calculation logic)
      const totals = lineItems.reduce((acc, item) => ({
        total_entered_value: acc.total_entered_value + (parseFloat(item.entered_value) || 0),
        grand_total_duty_amount: acc.grand_total_duty_amount + (parseFloat(item.duty_amount) || 0),
        grand_total_user_fee_amount: acc.grand_total_user_fee_amount + 0, // Usually 0 for FTZ
        grand_total_tax_amount: acc.grand_total_tax_amount + 0,
        grand_total_antidumping_duty_amount: acc.grand_total_antidumping_duty_amount + (parseFloat(item.antidumping_duty_amount) || 0),
        grand_total_countervailing_duty_amount: acc.grand_total_countervailing_duty_amount + (parseFloat(item.countervailing_duty_amount) || 0)
      }), {
        total_entered_value: 0,
        grand_total_duty_amount: 0,
        grand_total_user_fee_amount: 0,
        grand_total_tax_amount: 0,
        grand_total_antidumping_duty_amount: 0,
        grand_total_countervailing_duty_amount: 0
      });

      // Create grand totals record
      const grandTotalsData = {
        entry_summary_id: entrySummaryId,
        ...totals,
        estimated_total_amount: totals.total_entered_value + totals.grand_total_duty_amount
      };

      return await DatabaseService.insert('entry_grand_totals', [grandTotalsData], options);
    } catch (error) {
      console.error('Error calculating grand totals:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Validate preshipment data for entry summary creation
   * FTZ compliance validation for CBP entry requirements
   */
  validatePreshipmentForEntryCreation(preshipment) {
    const errors = [];

    if (!preshipment.filing_district_port) {
      errors.push('District/Port of Entry is required');
    }

    if (!preshipment.entry_filer_code) {
      errors.push('Entry Filer Code is required');
    }

    if (!preshipment.importer_of_record_number) {
      errors.push('Importer of Record Number is required');
    }

    if (!preshipment.customerId) {
      errors.push('Consignee (Customer) is required');
    }

    if (!preshipment.items || preshipment.items.length === 0) {
      errors.push('At least one line item is required');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get complete entry summary with all related data
   * Comprehensive FTZ entry summary with line items, totals, and PGA data
   */
  async getEntrySummaryWithDetails(entrySummaryId, options = {}) {
    try {
      // Get main entry summary
      const entryResult = await this.getEntrySummaryById(entrySummaryId, options);
      if (!entryResult.success) {
        return entryResult;
      }

      const entry = entryResult.data;

      // Get line items
      const lineItemsResult = await DatabaseService.getAll('entry_summary_line_items', {
        filters: [{ column: 'entry_summary_id', value: entrySummaryId }],
        orderBy: 'line_item_number.asc',
        ...options
      });

      // Get FTZ status records for each line item (preserves comprehensive data fetching)
      const ftzStatusPromises = lineItemsResult.data?.map(async (item) => {
        const ftzResult = await DatabaseService.getAll('ftz_status_records', {
          filters: [{ column: 'entry_line_item_id', value: item.id }],
          single: true,
          ...options
        });
        return {
          ...item,
          ftz_status: ftzResult.success ? ftzResult.data : null
        };
      }) || [];

      const lineItemsWithFTZ = await Promise.all(ftzStatusPromises);

      // Get grand totals
      const grandTotalsResult = await DatabaseService.getAll('entry_grand_totals', {
        filters: [{ column: 'entry_summary_id', value: entrySummaryId }],
        single: true,
        ...options
      });

      // Note: pga_data table does not exist in current schema
      // PGA data would need to be stored in entry_summaries table or separate table if created
      console.warn('pga_data table not found - returning empty PGA data');

      return {
        success: true,
        data: {
          ...entry,
          line_items: lineItemsWithFTZ,
          grand_totals: grandTotalsResult.success ? grandTotalsResult.data : null,
          pga_data: [], // Empty since table doesn't exist
          warning: 'pga_data table does not exist'
        }
      };
    } catch (error) {
      console.error('Error fetching entry summary details:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update entry summary filing status
   * CBP filing status management for FTZ entries
   */
  async updateFilingStatus(entrySummaryId, status, responseMessage = null, options = {}) {
    try {
      const updateData = {
        filing_status: status,
        updated_at: new Date().toISOString()
      };

      if (responseMessage) {
        updateData.ace_response_message = responseMessage;
      }

      if (status === 'FILED') {
        updateData.filed_at = new Date().toISOString();
      } else if (status === 'ACCEPTED') {
        updateData.accepted_at = new Date().toISOString();
      }

      const result = await DatabaseService.update('entry_summaries', entrySummaryId, updateData, options);
      
      // Also update related preshipment status (preserves workflow integration)
      if (result.success) {
        const entryResult = await this.getEntrySummaryById(entrySummaryId, options);
        if (entryResult.success && entryResult.data.preshipment_id) {
          await DatabaseService.update('preshipments', entryResult.data.preshipment_id, {
            entry_summary_status: status
          }, options);
        }
      }

      return result;
    } catch (error) {
      console.error('Error updating filing status:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get entry summaries by filing status
   * Status-based filtering for FTZ entry management
   */
  async getEntrySummariesByStatus(status, options = {}) {
    try {
      const result = await DatabaseService.getAll('entry_summaries', {
        filters: [{ column: 'filing_status', value: status }],
        orderBy: 'created_at.desc',
        ...options
      });

      return result;
    } catch (error) {
      console.error('Error fetching entry summaries by status:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Generate entry number
   * CBP entry number generation (placeholder for CBP system integration)
   */
  async generateEntryNumber() {
    try {
      // Simple implementation - in production would integrate with CBP numbering system
      const timestamp = Date.now().toString().slice(-6);
      const random = Math.floor(Math.random() * 100).toString().padStart(2, '0');
      return `FTZ${timestamp}${random}`;
    } catch (error) {
      console.error('Error generating entry number:', error);
      throw error;
    }
  }

  /**
   * Format HTS number for ACE compliance
   * CBP HTS code formatting requirements
   */
  formatHTSNumber(htsCode) {
    if (!htsCode) return '0000.00.0000';
    
    // Remove dots and ensure 10 digits
    const cleanCode = htsCode.replace(/\./g, '').padEnd(10, '0');
    
    // Format as XXXX.XX.XXXX
    return `${cleanCode.slice(0, 4)}.${cleanCode.slice(4, 6)}.${cleanCode.slice(6, 10)}`;
  }

  /**
   * Calculate entered value for line item
   * FTZ entered value calculation for CBP compliance
   */
  calculateEnteredValue(part, quantity) {
    const unitValue = parseFloat(part.standard_value) || 0;
    return unitValue * quantity;
  }

  /**
   * Determine FTZ merchandise status
   * FTZ status code determination for CBP reporting
   */
  determineFTZStatus(lotInfo) {
    // Default to Privileged Foreign status
    // In production, this would be determined by actual FTZ records
    return lotInfo?.ftz_status || 'P';
  }

  /**
   * Get lot information for FTZ status determination
   * Inventory lot lookup for FTZ merchandise classification
   */
  async getLotInformation(lotId, options = {}) {
    try {
      if (!lotId) return null;

      const result = await DatabaseService.getAll('inventory_lots', {
        filters: [{ column: 'id', value: lotId }],
        single: true,
        ...options
      });

      return result.success ? result.data : null;
    } catch (error) {
      console.error('Error fetching lot information:', error);
      return null;
    }
  }

  /**
   * Search entry summaries
   * Comprehensive search for FTZ entry summary management
   */
  async searchEntrySummaries(searchTerm, filters = {}, options = {}) {
    try {
      const queryFilters = [];

      if (filters.filing_status) {
        queryFilters.push({ column: 'filing_status', value: filters.filing_status });
      }

      if (filters.entry_type_code) {
        queryFilters.push({ column: 'entry_type_code', value: filters.entry_type_code });
      }

      if (filters.consignee_id) {
        queryFilters.push({ column: 'consignee_id', value: filters.consignee_id });
      }

      const result = await DatabaseService.getAll('entry_summaries', {
        filters: queryFilters,
        orderBy: 'created_at.desc',
        ...options
      });

      // Client-side filtering for search term (could be moved to database function)
      if (result.success && searchTerm) {
        const filteredData = result.data.filter(entry =>
          entry.entry_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          entry.bill_of_lading_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          entry.importing_conveyance_name?.toLowerCase().includes(searchTerm.toLowerCase())
        );

        return { success: true, data: filteredData };
      }

      return result;
    } catch (error) {
      console.error('Error searching entry summaries:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get entry summary statistics
   * Analytics for FTZ entry summary performance tracking
   */
  async getEntrySummaryStats(dateRange = {}, options = {}) {
    try {
      const result = await DatabaseService.getAll('entry_summaries', {
        ...options
      });

      if (!result.success) {
        return result;
      }

      const entries = result.data;

      // Filter by date range if provided (preserves original filtering logic)
      let filteredEntries = entries;
      if (dateRange.startDate || dateRange.endDate) {
        filteredEntries = entries.filter(e => {
          const createdDate = new Date(e.created_at);
          const start = dateRange.startDate ? new Date(dateRange.startDate) : new Date(0);
          const end = dateRange.endDate ? new Date(dateRange.endDate) : new Date();
          return createdDate >= start && createdDate <= end;
        });
      }

      const stats = {
        total: filteredEntries.length,
        by_status: {},
        by_filer: {},
        by_port: {},
        filed_count: 0,
        accepted_count: 0
      };

      // Calculate statistics (preserves original analytics logic)
      filteredEntries.forEach(e => {
        stats.by_status[e.filing_status] = (stats.by_status[e.filing_status] || 0) + 1;
        stats.by_filer[e.entry_filer_code] = (stats.by_filer[e.entry_filer_code] || 0) + 1;
        stats.by_port[e.record_district_port_of_entry] = (stats.by_port[e.record_district_port_of_entry] || 0) + 1;

        if (e.filing_status === 'FILED') stats.filed_count += 1;
        if (e.filing_status === 'ACCEPTED') stats.accepted_count += 1;
      });

      return { success: true, data: stats };
    } catch (error) {
      console.error('Error fetching entry summary statistics:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Subscribe to entry summary changes
   * Real-time entry summary updates for FTZ operations
   */
  subscribeToEntrySummaryChanges(callback, options = {}) {
    return DatabaseService.subscribe('entry_summaries', callback, options);
  }

  /**
   * Create entry summary from entry summary group (multiple preshipments)
   * Combined entry summary creation for FTZ group processing
   */
  async createEntrySummaryFromGroup(groupId, options = {}) {
    try {
      console.log('Creating entry summary from group:', groupId);

      // Get the group and validate it's ready for filing (uses direct DatabaseService pattern)
      const groupResult = await DatabaseService.getAll('entry_summary_groups', {
        filters: [{ column: 'id', value: groupId }],
        single: true,
        ...options
      });

      if (!groupResult.success) {
        return { success: false, error: groupResult.error };
      }

      const group = groupResult.data;

      if (group.status !== 'ready_for_review' && group.status !== 'approved') {
        return {
          success: false,
          error: 'Group must be in ready_for_review or approved status to generate entry summary'
        };
      }

      // Get all preshipments in the group with customer data
      const groupPreshipmentsResult = await DatabaseService.getAll('entry_group_preshipments', {
        select: `
          *,
          preshipments!inner (
            *,
            customers (*)
          )
        `,
        filters: [{ column: 'group_id', value: groupId }],
        ...options
      });

      if (!groupPreshipmentsResult.success) {
        return { success: false, error: groupPreshipmentsResult.error };
      }

      const groupPreshipments = groupPreshipmentsResult.data;

      if (!groupPreshipments || groupPreshipments.length === 0) {
        return {
          success: false,
          error: 'No preshipments found in group'
        };
      }

      // Generate entry number
      const entryNumber = await this.generateEntryNumber();

      // Consolidate line items from all preshipments
      const consolidatedLineItems = await this.getConsolidatedLineItems(groupPreshipments, options);

      // Create the consolidated entry summary (preserves comprehensive field mapping)
      const entrySummaryData = {
        entry_number: entryNumber,
        entry_type_code: '06', // FTZ entry
        summary_filing_action_request_code: 'A',
        record_district_port_of_entry: group.filing_district_port,
        entry_filer_code: group.entry_filer_code,
        consolidated_summary_indicator: 'Y', // Mark as consolidated
        
        // Use first preshipment's importer as primary (or could be configured)
        importer_of_record_number: groupPreshipments[0].preshipments.importer_of_record_number || 
                                   groupPreshipments[0].preshipments.customers.ein,
        
        date_of_importation: group.target_entry_date,
        foreign_trade_zone_identifier: group.foreign_trade_zone_identifier,
        
        // Combined group information
        group_id: groupId,
        filing_status: 'DRAFT',
        
        // Aggregate transportation info from first preshipment
        ...this.getTransportationInfo(groupPreshipments[0].preshipments),
        
        created_by: options.userId || null
      };

      // Create the entry summary
      const entrySummaryResult = await DatabaseService.insert('entry_summaries', [entrySummaryData], options);

      if (!entrySummaryResult.success) {
        console.error('Error creating entry summary:', entrySummaryResult.error);
        return entrySummaryResult;
      }

      const entrySummary = entrySummaryResult.data[0];
      const entrySummaryId = entrySummary.id;

      // Create consolidated line items
      const lineItemsResult = await this.createConsolidatedLineItems(
        entrySummaryId,
        consolidatedLineItems,
        options
      );

      if (!lineItemsResult.success) {
        // Rollback entry summary creation
        await DatabaseService.delete('entry_summaries', entrySummaryId, options);
        return lineItemsResult;
      }

      // Calculate and create grand totals
      const grandTotalsResult = await this.calculateAndCreateGrandTotals(entrySummaryId, options);
      if (!grandTotalsResult.success) {
        return grandTotalsResult;
      }

      // Update group with entry summary info
      await DatabaseService.update('entry_summary_groups', groupId, {
        entry_number: entryNumber,
        status: 'filed',
        filed_at: new Date().toISOString(),
        filed_by: options.userId || null
      }, options);

      // Update all preshipments in the group
      for (const egp of groupPreshipments) {
        await DatabaseService.update('preshipments', egp.preshipment_id, {
          entry_summary_id: entrySummaryId,
          entry_number: entryNumber,
          entry_summary_status: 'FILED'
        }, options);
      }

      return {
        success: true,
        data: {
          entry_summary: entrySummary,
          group_id: groupId,
          preshipments_count: groupPreshipments.length,
          line_items_count: consolidatedLineItems.length
        }
      };

    } catch (error) {
      console.error('Error creating entry summary from group:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get consolidated line items from multiple preshipments
   * FTZ line item consolidation for combined entries
   */
  async getConsolidatedLineItems(groupPreshipments, options = {}) {
    const consolidatedItems = new Map();

    groupPreshipments.forEach(egp => {
      const preshipment = egp.preshipments;
      
      if (preshipment.items) {
        preshipment.items.forEach(item => {
          // Create a unique key for consolidation (HTS code + country + description)
          const consolidationKey = `${item.hts_code || 'N/A'}_${item.country_of_origin || 'N/A'}_${item.description || 'N/A'}`;
          
          if (consolidatedItems.has(consolidationKey)) {
            // Add to existing consolidated item
            const existing = consolidatedItems.get(consolidationKey);
            existing.quantity += parseFloat(item.quantity || 0);
            existing.total_value += parseFloat(item.value || 0);
            existing.source_preshipments.push(preshipment.id);
            existing.source_customers.add(preshipment.customers.company_name);
          } else {
            // Create new consolidated item
            consolidatedItems.set(consolidationKey, {
              hts_code: item.hts_code,
              description: item.description,
              country_of_origin: item.country_of_origin,
              quantity: parseFloat(item.quantity || 0),
              unit_of_measure: item.unit_of_measure,
              unit_value: parseFloat(item.unit_value || 0),
              total_value: parseFloat(item.value || 0),
              duty_rate: parseFloat(item.duty_rate || 0),
              duty_amount: parseFloat(item.duty_amount || 0),
              source_preshipments: [preshipment.id],
              source_customers: new Set([preshipment.customers.company_name]),
              consolidated_from_count: 1
            });
          }
        });
      }
    });

    // Convert Map to Array and finalize consolidation
    return Array.from(consolidatedItems.values()).map((item, index) => ({
      ...item,
      line_number: index + 1,
      source_customers: Array.from(item.source_customers).join(', '),
      consolidated_from_count: item.source_preshipments.length
    }));
  }

  /**
   * Create consolidated line items in the database
   * Database persistence for consolidated FTZ line items
   */
  async createConsolidatedLineItems(entrySummaryId, consolidatedItems, options = {}) {
    try {
      const lineItemsData = consolidatedItems.map(item => ({
        entry_summary_id: entrySummaryId,
        line_number: item.line_number,
        hts_code: item.hts_code,
        commodity_description: item.description,
        country_of_origin: item.country_of_origin,
        quantity: item.quantity,
        unit_of_measure: item.unit_of_measure,
        unit_value: item.unit_value,
        total_value: item.total_value,
        duty_rate: item.duty_rate,
        duty_amount: item.duty_amount,
        // Store consolidation metadata
        consolidation_metadata: {
          source_preshipments: item.source_preshipments,
          source_customers: item.source_customers,
          consolidated_from_count: item.consolidated_from_count
        }
      }));

      const result = await DatabaseService.insert('entry_summary_line_items', lineItemsData, options);

      if (!result.success) {
        console.error('Error creating consolidated line items:', result.error);
        return result;
      }

      return {
        success: true,
        data: result.data,
        count: lineItemsData.length
      };

    } catch (error) {
      console.error('Error creating consolidated line items:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Extract transportation info from a preshipment
   * Transportation data extraction for CBP entry requirements
   */
  getTransportationInfo(preshipment) {
    return {
      bill_of_lading_number: preshipment.bill_of_lading_number,
      bill_of_lading_issuer_code: preshipment.bill_of_lading_issuer_code,
      vessel_code: preshipment.vessel_code,
      vessel_name: preshipment.vessel_name,
      voyage_trip_number: preshipment.voyage_trip_number,
      port_of_unlading: preshipment.port_of_unlading,
      port_of_entry: preshipment.port_of_entry,
      mode_of_transportation: preshipment.mode_of_transportation
    };
  }

  /**
   * Get entry summaries created from groups
   * Group-based entry summary retrieval for FTZ consolidated entries
   */
  async getGroupEntrySummaries(filters = {}, options = {}) {
    try {
      const queryFilters = [
        { column: 'group_id', operator: 'is not', value: null }
      ];

      // Apply additional filters
      if (filters.filing_status) {
        queryFilters.push({ column: 'filing_status', value: filters.filing_status });
      }

      const result = await DatabaseService.getAll('entry_summaries', {
        select: `
          *,
          entry_summary_groups (
            id,
            group_name,
            week_ending_date,
            status
          )
        `,
        filters: queryFilters,
        orderBy: 'created_at.desc',
        ...options
      });

      return result;

    } catch (error) {
      console.error('Error fetching group entry summaries:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new EntrySummaryService();