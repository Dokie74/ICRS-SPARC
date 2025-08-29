// src/backend/services/inventory/InventoryService.js
// Enhanced Inventory and lot management service for ICRS SPARC - transferred from original ICRS
// Maintains all Foreign Trade Zone operational requirements and transaction-based quantities
// Enhanced with real-time lot tracking, comprehensive validation, and monitoring

const EnhancedBaseService = require('../enhanced/EnhancedBaseService');
const DatabaseService = require('../../db/supabase-client');

class InventoryService extends EnhancedBaseService {
  constructor(serviceRegistry, eventEmitter, monitoring) {
    super('inventory_lots', serviceRegistry, eventEmitter, monitoring);
  }

  /**
   * Get all inventory lots with calculated quantities from transactions
   * Preserves FTZ lot tracking with comprehensive relational data
   */
  async getAllLots(options = {}) {
    try {
      console.log('InventoryService.getAllLots called with options:', options);

      const query = {
        select: `
          *,
          parts:part_id(id, description, material),
          customers:customer_id(id, name),
          storage_locations:storage_location_id(id, location_code, description),
          transactions(quantity)
        `,
        orderBy: options.orderBy?.column ? 
          `${options.orderBy.column}.${options.orderBy.ascending ? 'asc' : 'desc'}` :
          'created_at.desc',
        limit: options.limit,
        offset: options.offset
      };

      // Apply filters if provided (preserves original filtering logic)
      if (options.filters && options.filters.length > 0) {
        query.filters = options.filters;
      }

      console.log('Executing inventory query...');
      const result = await DatabaseService.select('inventory_lots', query);

      if (!result.success) {
        console.error('Database query error:', result.error);
        return result;
      }

      console.log('Raw inventory data from database:', result.data);

      // Transform data to match expected format and calculate current quantities (preserves original logic)
      const transformedData = result.data?.map(lot => {
        // Calculate current quantity from transactions (preserves FTZ transaction-based tracking)
        const totalReceived = lot.transactions?.filter(t => t.quantity > 0).reduce((sum, t) => sum + t.quantity, 0) || 0;
        const totalShipped = lot.transactions?.filter(t => t.quantity < 0).reduce((sum, t) => sum + Math.abs(t.quantity), 0) || 0;
        const currentQuantity = totalReceived - totalShipped;

        return {
          ...lot,
          current_quantity: currentQuantity,
          part_description: lot.parts?.description || 'Unknown Part',
          customer_name: lot.customers?.name || 'Unknown Customer',
          locations: lot.storage_locations ? [{
            name: lot.storage_locations.location_code,
            qty: currentQuantity
          }] : [],
          // Ensure status shows only if quantity > 0 (preserves inventory status logic)
          status: currentQuantity > 0 ? (lot.status || 'Available') : 'Depleted'
        };
      }) || [];

      console.log('Transformed inventory data:', transformedData);
      
      // Filter out lots with zero or negative quantities for display (preserves original filtering)
      const availableInventory = transformedData.filter(lot => lot.current_quantity > 0);
      
      return { success: true, data: availableInventory };
    } catch (error) {
      console.error('Error in getAllLots:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get lot by ID with comprehensive related data
   * Critical for FTZ lot detail views and transaction history
   */
  async getLotById(lotId, options = {}) {
    try {
      console.log('Getting detailed lot information for ID:', lotId);
      
      const query = {
        select: `
          *,
          parts:part_id(id, description, material, hts_code, unit_of_measure, country_of_origin, standard_value),
          customers:customer_id(id, name),
          storage_locations:storage_location_id(id, location_code, description),
          transactions(
            id,
            type,
            quantity,
            source_document_number,
            created_at,
            updated_at
          )
        `,
        filters: [{ column: 'id', value: lotId }],
        single: true
      };

      const result = await DatabaseService.select('inventory_lots', query);

      if (!result.success) {
        console.error('Error fetching lot details:', result.error);
        return result;
      }

      if (!result.data) {
        return { success: false, error: 'Lot not found' };
      }

      const data = result.data;

      // Calculate current quantity from transactions (preserves FTZ calculation logic)
      const totalReceived = data.transactions?.filter(t => t.quantity > 0).reduce((sum, t) => sum + t.quantity, 0) || 0;
      const totalShipped = data.transactions?.filter(t => t.quantity < 0).reduce((sum, t) => sum + Math.abs(t.quantity), 0) || 0;
      const currentQuantity = totalReceived - totalShipped;

      // Transform and enhance the data (preserves original enhancement pattern)
      const enrichedData = {
        ...data,
        current_quantity: currentQuantity,
        // Use quantity as original_quantity if admission_date exists, otherwise use currentQuantity
        original_quantity: data.quantity || currentQuantity,
        // Use created_at as admission_date if no specific admission_date exists
        admission_date: data.admission_date || data.created_at,
        locations: data.storage_locations ? [{
          location_name: data.storage_locations.location_code,
          description: data.storage_locations.description,
          quantity: currentQuantity
        }] : [],
        transactions: data.transactions?.map(t => ({
          ...t,
          // Use quantity as quantity_change for display consistency
          quantity_change: t.quantity,
          // Use created_at as transaction_date for display consistency
          transaction_date: t.created_at
        })) || []
      };

      console.log('Enhanced lot data:', enrichedData);
      return { success: true, data: enrichedData };
    } catch (error) {
      console.error('Error fetching lot details:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Create new inventory lot (admission)
   * Enhanced with comprehensive validation, real-time tracking, and business rules
   */
  async createLot(lotData, options = {}) {
    return this.executeWithErrorHandling(
      'createLot',
      async () => {
        // Enhanced validation with detailed error reporting
        const validation = this.validateRequiredEnhanced(lotData, ['part_id', 'customer_id', 'original_quantity']);
        if (!validation.success) {
          throw new Error(validation.error);
        }

        // Business rule validation
        await this.validateBusinessRules(lotData, [
          {
            field: 'original_quantity',
            validator: (data) => parseInt(data.original_quantity) > 0,
            message: 'Quantity must be greater than zero'
          },
          {
            field: 'part_id',
            validator: async (data) => {
              const partResult = await this.callService('PartService', 'getById', data.part_id, options);
              return partResult.success;
            },
            message: 'Part not found'
          },
          {
            field: 'customer_id',
            validator: async (data) => {
              const customerResult = await this.callService('CustomerService', 'getById', data.customer_id, options);
              return customerResult.success;
            },
            message: 'Customer not found'
          }
        ]);

        // Generate lot number if not provided (preserves original pattern)
        const lotNumber = lotData.id || `L-${Date.now()}`;

        const lotRecord = {
          id: lotNumber,
          part_id: lotData.part_id,
          customer_id: lotData.customer_id,
          storage_location_id: lotData.storage_location_id,
          status: lotData.status || 'In Stock',
          original_quantity: parseInt(lotData.original_quantity),
          current_quantity: parseInt(lotData.original_quantity),
          admission_date: lotData.admission_date || new Date().toISOString(),
          manifest_number: lotData.manifest_number,
          e214_admission_number: lotData.e214_admission_number,
          conveyance_name: lotData.conveyance_name,
          import_date: lotData.import_date,
          port_of_unlading: lotData.port_of_unlading,
          bill_of_lading: lotData.bill_of_lading,
          total_value: parseFloat(lotData.total_value) || 0,
          total_charges: parseFloat(lotData.total_charges) || 0,
          created_at: new Date().toISOString(),
          created_by: options.userId
        };

        // Create the lot using DatabaseService (adapts to SPARC pattern)
        const result = await DatabaseService.insert('inventory_lots', [lotRecord], options);
        
        if (!result.success) {
          throw new Error(result.error);
        }

        const createdLot = result.data[0];

        // Create initial transaction record (preserves audit trail)
        await this.addTransactionRecord(
          lotNumber, 
          'Admission', 
          lotRecord.original_quantity, 
          lotData.manifest_number || 'Initial Admission', 
          options
        );

        // Add audit log (maintains compliance)
        await this.addAuditLog('Created Inventory Lot', 'New lot admission', {
          lot_id: lotNumber,
          part_id: lotData.part_id,
          customer_id: lotData.customer_id,
          quantity: lotRecord.original_quantity,
          manifest_number: lotData.manifest_number
        }, options);

        // Emit real-time event for live updates
        this.emitEvent('inventory.lot.created', {
          lot: createdLot,
          created_by: options.userId,
          admission_date: lotRecord.admission_date
        });

        // Record metrics
        this.recordMetric('inventory_lot_created', 1, {
          customer_id: lotData.customer_id,
          part_id: lotData.part_id,
          quantity: lotRecord.original_quantity
        });

        return createdLot;
      },
      { lotData }
    );
  }

  /**
   * Adjust lot quantity
   * Enhanced with comprehensive validation, real-time updates, and audit requirements
   */
  async adjustLotQuantity(lotId, newQuantity, reason, oldQuantity, options = {}) {
    return this.executeWithErrorHandling(
      'adjustLotQuantity',
      async () => {
        // Validate inputs
        const validation = this.validateRequiredEnhanced({ lotId, newQuantity, reason }, ['lotId', 'newQuantity', 'reason']);
        if (!validation.success) {
          throw new Error(validation.error);
        }

        // Business rule validation
        if (newQuantity < 0) {
          throw new Error('Quantity cannot be negative');
        }

        if (typeof newQuantity !== 'number' || isNaN(newQuantity)) {
          throw new Error('Invalid quantity value');
        }

        // Get current lot data to verify existence and old quantity
        const lotResult = await this.getLotById(lotId);
        if (!lotResult.success) {
          throw new Error('Lot not found');
        }

        const currentLot = lotResult.data;
        const actualOldQuantity = oldQuantity !== undefined ? oldQuantity : currentLot.current_quantity;
        const quantityChange = newQuantity - actualOldQuantity;

        // Skip update if no change
        if (quantityChange === 0) {
          return currentLot;
        }

        // Update lot quantity with optimistic locking check
        const updateResult = await DatabaseService.update('inventory_lots', lotId, {
          current_quantity: newQuantity,
          updated_at: new Date().toISOString(),
          updated_by: options.userId
        }, options);

        if (!updateResult.success) {
          throw new Error(updateResult.error);
        }

        // Add transaction record (preserves audit trail)
        await this.addTransactionRecord(
          lotId, 
          'Adjustment', 
          quantityChange, 
          `${reason} (${actualOldQuantity} → ${newQuantity})`, 
          options
        );

        // Add audit log (maintains compliance requirements)
        await this.addAuditLog('Adjusted Quantity', reason, {
          lot_id: lotId,
          from: actualOldQuantity,
          to: newQuantity,
          change: quantityChange,
          part_id: currentLot.part_id,
          customer_id: currentLot.customer_id
        }, options);

        // Get updated lot data for the response
        const updatedLotResult = await this.getLotById(lotId);
        const updatedLot = updatedLotResult.success ? updatedLotResult.data : updateResult.data;

        // Emit real-time event for live updates
        this.emitEvent('inventory.lot.updated', {
          lot_id: lotId,
          changes: {
            quantity: { old: actualOldQuantity, new: newQuantity }
          },
          reason,
          user_id: options.userId,
          lot_data: updatedLot
        });

        // Record metrics
        this.recordMetric('inventory_quantity_adjusted', 1, {
          lot_id: lotId,
          change_amount: Math.abs(quantityChange),
          change_type: quantityChange > 0 ? 'increase' : 'decrease'
        });

        // Check for low stock alerts
        if (newQuantity <= 10 && actualOldQuantity > 10) {
          this.emitEvent('inventory.low_stock_alert', {
            lot_id: lotId,
            current_quantity: newQuantity,
            part_id: currentLot.part_id,
            customer_id: currentLot.customer_id
          });
        }

        return updatedLot;
      },
      { lotId, newQuantity, reason, oldQuantity }
    );
  }

  /**
   * Change lot status
   * Preserves FTZ status workflow with history tracking
   */
  async changeLotStatus(lotId, newStatus, reason, oldStatus, options = {}) {
    try {
      // Update lot status
      const updateResult = await DatabaseService.update('inventory_lots', lotId, {
        status: newStatus
      }, options);

      if (!updateResult.success) {
        return updateResult;
      }

      // Add status history record (preserves status tracking)
      await DatabaseService.insert('status_history', [{
        inventory_lot_id: lotId,
        previous_status: oldStatus,
        new_status: newStatus,
        change_reason: reason
      }], options);

      // Add audit log (maintains compliance)
      await this.addAuditLog('Changed Status', reason, {
        lot_id: lotId,
        from: oldStatus,
        to: newStatus
      }, options);

      return updateResult;
    } catch (error) {
      console.error('Error changing lot status:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Void lot
   * Critical FTZ operation for removing inventory from zone
   */
  async voidLot(lotId, reason, quantityToRemove, options = {}) {
    try {
      // Update lot to voided status
      const updateResult = await DatabaseService.update('inventory_lots', lotId, {
        voided: true,
        current_quantity: 0
      }, options);

      if (!updateResult.success) {
        return updateResult;
      }

      // Add transaction record (maintains audit trail)
      await this.addTransactionRecord(lotId, 'Removal', -quantityToRemove, `VOID: ${reason}`, options);

      // Add audit log (compliance requirement)
      await this.addAuditLog('Voided Lot', reason, { lot_id: lotId }, options);

      return updateResult;
    } catch (error) {
      console.error('Error voiding lot:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Add location record
   * Supports FTZ storage location tracking
   */
  async addLocationRecord(lotId, locationName, quantity, options = {}) {
    try {
      const result = await DatabaseService.insert('inventory_locations', [{
        lot_id: lotId,
        location_name: locationName,
        quantity: quantity
      }], options);

      return result;
    } catch (error) {
      console.error('Error adding location record:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Add transaction record
   * Critical for FTZ audit trail and quantity calculations
   */
  async addTransactionRecord(lotId, type, quantityChange, sourceDocument, options = {}) {
    try {
      const result = await DatabaseService.insert('transactions', [{
        lot_id: lotId,
        type: type,
        quantity_change: quantityChange,
        source_document_number: sourceDocument
      }], options);

      return result;
    } catch (error) {
      console.error('Error adding transaction record:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Add audit log entry
   * Maintains FTZ compliance audit requirements
   */
  async addAuditLog(action, reason, details, options = {}) {
    try {
      const result = await DatabaseService.insert('audit_log', [{
        action: action,
        reason: reason,
        details: details,
        user_id: options.userId || null
      }], options);

      return result;
    } catch (error) {
      console.error('Error adding audit log:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get inventory summary
   * Dashboard metrics for FTZ operations
   */
  async getInventorySummary(options = {}) {
    try {
      const result = await DatabaseService.rpc('get_inventory_summary', {}, options);
      return result;
    } catch (error) {
      console.error('Error fetching inventory summary:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get low stock items
   * Monitoring for FTZ inventory management
   */
  async getLowStockItems(threshold = 10, options = {}) {
    try {
      const result = await DatabaseService.select('inventory_lots', {
        select: 'id, part_id, customer_id, current_quantity, status',
        filters: [{ column: 'current_quantity', operator: 'lte', value: threshold }],
        ...options
      });

      return result;
    } catch (error) {
      console.error('Error fetching low stock items:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Search lots
   * Comprehensive search for FTZ lot management
   */
  async searchLots(searchTerm, filters = {}, options = {}) {
    try {
      const queryFilters = [];
      
      if (filters.status) {
        queryFilters.push({ column: 'status', value: filters.status });
      }
      
      if (filters.customer_id) {
        queryFilters.push({ column: 'customer_id', value: filters.customer_id });
      }

      if (filters.part_id) {
        queryFilters.push({ column: 'part_id', value: filters.part_id });
      }

      const result = await DatabaseService.select('inventory_lots', {
        filters: queryFilters,
        orderBy: 'created_at.desc',
        ...options
      });

      // Client-side filtering for search term (could be moved to database function)
      if (result.success && searchTerm) {
        const filteredData = result.data.filter(lot => 
          lot.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
          lot.manifest_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          lot.e214_admission_number?.toLowerCase().includes(searchTerm.toLowerCase())
        );
        
        return { success: true, data: filteredData };
      }

      return result;
    } catch (error) {
      console.error('Error searching lots:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get lots by status
   * Status-based filtering for FTZ operations
   */
  async getLotsByStatus(status, options = {}) {
    try {
      const result = await DatabaseService.select('inventory_lots', {
        filters: [{ column: 'status', value: status }],
        orderBy: 'created_at.desc',
        ...options
      });

      return result;
    } catch (error) {
      console.error('Error fetching lots by status:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get lots by customer
   * Customer-specific inventory for FTZ management
   */
  async getLotsByCustomer(customerId, options = {}) {
    try {
      const result = await DatabaseService.select('inventory_lots', {
        filters: [{ column: 'customer_id', value: customerId }],
        orderBy: 'created_at.desc',
        ...options
      });

      return result;
    } catch (error) {
      console.error('Error fetching lots by customer:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get transaction history for a lot
   * Critical for FTZ audit and quantity verification
   */
  async getLotTransactionHistory(lotId, options = {}) {
    try {
      const result = await DatabaseService.select('transactions', {
        filters: [{ column: 'lot_id', value: lotId }],
        orderBy: 'created_at.desc',
        ...options
      });

      return result;
    } catch (error) {
      console.error('Error fetching lot transaction history:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get transaction history for a specific part across all lots
   * Part-level transaction history for FTZ reporting
   */
  async getPartTransactionHistory(partId, options = {}) {
    try {
      console.log('Getting transaction history for part:', partId);
      
      const query = {
        select: `
          *,
          inventory_lots:lot_id(
            id,
            manifest_number,
            customer_id,
            admission_date,
            status,
            customers:customer_id(name)
          )
        `,
        filters: [{ column: 'inventory_lots.part_id', value: partId }],
        orderBy: 'created_at.desc',
        ...options
      };

      const result = await DatabaseService.select('transactions', query);

      return result;
    } catch (error) {
      console.error('Error fetching part transaction history:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Subscribe to inventory changes
   * Real-time updates for FTZ operations
   */
  subscribeToInventoryChanges(callback, options = {}) {
    return DatabaseService.subscribe('inventory_lots', callback, options);
  }

  /**
   * Subscribe to transaction changes
   * Real-time transaction monitoring for audit compliance
   */
  subscribeToTransactionChanges(callback, options = {}) {
    return DatabaseService.subscribe('transactions', callback, options);
  }
}

module.exports = new InventoryService();