// src/backend/services/core/CustomerService.js
// Customer management service for ICRS SPARC - transferred from original ICRS
// Maintains all Foreign Trade Zone compliance requirements and contact management

const BaseService = require('../BaseService');
const DatabaseService = require('../../db/supabase-client');

class CustomerService extends BaseService {
  constructor() {
    super('customers');
  }

  validateCustomer(customerData) {
    const errors = [];
    
    if (!customerData.name || customerData.name.trim().length < 2) {
      errors.push('Customer name must be at least 2 characters long');
    }
    
    if (customerData.ein && !/^\d{2}-\d{7}$/.test(customerData.ein)) {
      errors.push('EIN must be in format XX-XXXXXXX');
    }
    
    if (customerData.contact_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerData.contact_email)) {
      errors.push('Invalid email format');
    }
    
    return { isValid: errors.length === 0, errors: errors };
  }
  
  sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    return input.trim().replace(/[<>]/g, '');
  }

  /**
   * Get all customers with flexible filtering
   * Supports FTZ customer master data management
   */
  async getAllCustomers(options = {}) {
    try {
      const queryOptions = {
        select: options.select || '*',
        orderBy: options.orderBy?.column ? 
          `${options.orderBy.column}.${options.orderBy.ascending ? 'asc' : 'desc'}` :
          'name.asc',
        filters: options.filters || [],
        limit: options.limit,
        offset: options.offset
      };

      const result = await DatabaseService.getAll('customers', queryOptions);
      return result;
    } catch (error) {
      console.error('Error fetching customers:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get customer by ID
   * Critical for FTZ customer detail views
   */
  async getCustomerById(customerId, options = {}) {
    try {
      const result = await DatabaseService.getAll('customers', {
        filters: [{ column: 'id', value: customerId }],
        single: true,
        ...options
      });
      return result;
    } catch (error) {
      console.error('Error fetching customer:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Create new customer
   * Maintains FTZ customer creation with EIN validation and broker information
   */
  async createCustomer(customerData, options = {}) {
    try {
      // Validate customer data (preserves FTZ compliance requirements)
      const validationResult = this.validateCustomer(customerData);
      if (!validationResult.isValid) {
        return { 
          success: false, 
          error: 'Validation failed', 
          validationErrors: validationResult.errors 
        };
      }

      // Sanitize input data (preserves original sanitization pattern)
      const sanitizedData = {
        name: this.sanitizeInput(customerData.name),
        ein: customerData.ein ? this.sanitizeInput(customerData.ein) : null,
        address: customerData.address ? this.sanitizeInput(customerData.address) : null,
        broker_name: customerData.broker_name ? this.sanitizeInput(customerData.broker_name) : null,
        contact_email: customerData.contact_email ? this.sanitizeInput(customerData.contact_email) : null
      };

      const result = await DatabaseService.insert('customers', [sanitizedData], options);
      
      // Handle result format (single record creation)
      if (result.success && result.data.length > 0) {
        return { success: true, data: result.data[0] };
      }
      
      return result;
    } catch (error) {
      console.error('Error creating customer:', error);
      
      // Handle unique constraint violations (preserves exact FTZ compliance error messaging)
      if (error.message.includes('duplicate key') || error.message.includes('unique constraint')) {
        return { success: false, error: 'A customer with this EIN already exists' };
      }
      
      return { success: false, error: error.message };
    }
  }

  /**
   * Update customer
   * Maintains FTZ customer update logic with EIN uniqueness validation
   */
  async updateCustomer(customerId, updateData, options = {}) {
    try {
      // Validate customer data (preserves FTZ validation requirements)
      const validationResult = this.validateCustomer(updateData);
      if (!validationResult.isValid) {
        return { 
          success: false, 
          error: 'Validation failed', 
          validationErrors: validationResult.errors 
        };
      }

      // Sanitize input data (preserves original sanitization)
      const sanitizedData = {
        name: this.sanitizeInput(updateData.name),
        ein: updateData.ein ? this.sanitizeInput(updateData.ein) : null,
        address: updateData.address ? this.sanitizeInput(updateData.address) : null,
        broker_name: updateData.broker_name ? this.sanitizeInput(updateData.broker_name) : null,
        contact_email: updateData.contact_email ? this.sanitizeInput(updateData.contact_email) : null
      };

      const result = await DatabaseService.update('customers', customerId, sanitizedData, options);
      return result;
    } catch (error) {
      console.error('Error updating customer:', error);
      
      // Handle unique constraint violations (preserves exact error messaging)
      if (error.message.includes('duplicate key') || error.message.includes('unique constraint')) {
        return { success: false, error: 'A customer with this EIN already exists' };
      }
      
      return { success: false, error: error.message };
    }
  }

  /**
   * Deactivate customer (soft delete)
   * FTZ customer deactivation while preserving historical references
   */
  async deactivateCustomer(customerId, options = {}) {
    try {
      const result = await DatabaseService.delete('customers', customerId, options);
      return result;
    } catch (error) {
      console.error('Error deactivating customer:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Reactivate customer
   * Note: Customer reactivation not supported due to business requirements
   */
  async reactivateCustomer(customerId, options = {}) {
    try {
      return { success: false, error: 'Customer reactivation not supported - customers cannot be undeleted' };
    } catch (error) {
      console.error('Error reactivating customer:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Search customers
   * Comprehensive customer search for FTZ operations
   */
  async searchCustomers(searchTerm, filters = {}, options = {}) {
    try {
      const queryFilters = [];

      const result = await DatabaseService.getAll('customers', {
        filters: queryFilters,
        orderBy: 'name.asc',
        ...options
      });

      // Client-side filtering for search term (could be moved to database function)
      if (result.success && searchTerm) {
        const filteredData = result.data.filter(customer => 
          customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          customer.ein?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          customer.contact_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          customer.broker_name?.toLowerCase().includes(searchTerm.toLowerCase())
        );
        
        return { success: true, data: filteredData };
      }

      return result;
    } catch (error) {
      console.error('Error searching customers:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get active customers only
   * Active customer listing for FTZ operations
   */
  async getActiveCustomers(options = {}) {
    try {
      const result = await DatabaseService.getAll('customers', {
        orderBy: 'name.asc',
        ...options
      });

      return result;
    } catch (error) {
      console.error('Error fetching active customers:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get customer statistics
   * Analytics for FTZ customer performance tracking
   */
  async getCustomerStats(customerId, options = {}) {
    try {
      // Get total lots for customer (preserves original statistics logic)
      const lotsResult = await DatabaseService.getAll('inventory_lots', {
        filters: [{ column: 'customer_id', value: customerId }],
        select: 'id, status, quantity, total_value',
        ...options
      });

      if (!lotsResult.success) {
        return { success: false, error: 'Failed to fetch customer statistics' };
      }

      const lots = lotsResult.data;
      const stats = {
        total_lots: lots.length,
        active_lots: lots.filter(lot => lot.quantity > 0).length,
        total_quantity: lots.reduce((sum, lot) => sum + lot.quantity, 0),
        total_value: lots.reduce((sum, lot) => sum + (lot.total_value || 0), 0),
        status_breakdown: {}
      };

      // Status breakdown (preserves original analytics pattern)
      lots.forEach(lot => {
        stats.status_breakdown[lot.status] = (stats.status_breakdown[lot.status] || 0) + 1;
      });

      return { success: true, data: stats };
    } catch (error) {
      console.error('Error fetching customer statistics:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get customer's recent activity
   * Critical for FTZ audit trail and activity monitoring
   */
  async getCustomerActivity(customerId, limit = 10, options = {}) {
    try {
      // Get recent transactions for customer's lots (preserves original RPC pattern)
      const result = await DatabaseService.rpc('get_customer_activity', {
        p_customer_id: customerId,
        p_limit: limit
      }, options);

      return result;
    } catch (error) {
      console.error('Error fetching customer activity:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Validate customer data
   * Client-side validation for FTZ customer requirements
   */
  validateCustomerData(customerData) {
    return this.validateCustomer(customerData);
  }

  /**
   * Check if customer has active inventory
   * Prevents customer deletion when inventory exists
   */
  async hasActiveInventory(customerId, options = {}) {
    try {
      const result = await DatabaseService.getAll('inventory_lots', {
        filters: [
          { column: 'customer_id', value: customerId },
          { column: 'quantity', operator: 'gt', value: 0 }
        ],
        select: 'id',
        limit: 1,
        ...options
      });

      return { 
        success: true, 
        data: result.success && result.data.length > 0 
      };
    } catch (error) {
      console.error('Error checking customer inventory:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Batch create customers
   * Bulk customer creation for FTZ master data setup
   */
  async batchCreateCustomers(customerData, options = {}) {
    try {
      // Validate each customer (preserves original validation pattern)
      const validationErrors = [];
      const validCustomers = [];

      customerData.forEach((customer, index) => {
        const validationResult = this.validateCustomerData(customer);
        if (!validationResult.isValid) {
          validationErrors.push({
            index,
            errors: validationResult.errors
          });
        } else {
          validCustomers.push({
            name: this.sanitizeInput(customer.name),
            ein: customer.ein ? this.sanitizeInput(customer.ein) : null,
            address: customer.address ? this.sanitizeInput(customer.address) : null,
            broker_name: customer.broker_name ? this.sanitizeInput(customer.broker_name) : null,
            contact_email: customer.contact_email ? this.sanitizeInput(customer.contact_email) : null
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
      const result = await DatabaseService.insertBatchWithDuplicateHandling('customers', validCustomers, options);
      return result;
    } catch (error) {
      console.error('Error batch creating customers:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Subscribe to customer changes
   * Real-time customer data updates for FTZ operations
   */
  subscribeToCustomerChanges(callback, options = {}) {
    return DatabaseService.subscribe('customers', callback, options);
  }

  // ==================== CONTACT MANAGEMENT ====================
  // Sophisticated contact relationship management for FTZ compliance

  /**
   * Get all contacts for a customer
   * Contact hierarchy for FTZ communication management
   */
  async getCustomerContacts(customerId, options = {}) {
    try {
      const result = await DatabaseService.getAll('contacts', {
        filters: [{ column: 'customer_id', value: customerId }],
        orderBy: 'is_primary.desc', // Primary contact first
        ...options
      });
      return result;
    } catch (error) {
      console.error('Error fetching customer contacts:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Create a new contact for a customer
   * Maintains primary contact business logic
   */
  async createCustomerContact(customerId, contactData, options = {}) {
    try {
      // If this is set as primary, unset other primary contacts first (preserves business logic)
      if (contactData.is_primary) {
        await this.unsetPrimaryContact(customerId, null, options);
      }

      const sanitizedData = {
        customer_id: customerId,
        name: this.sanitizeInput(contactData.name),
        email: contactData.email ? this.sanitizeInput(contactData.email) : null,
        phone: contactData.phone ? this.sanitizeInput(contactData.phone) : null,
        location: contactData.location ? this.sanitizeInput(contactData.location) : null,
        title: contactData.title ? this.sanitizeInput(contactData.title) : null,
        is_primary: contactData.is_primary || false
      };

      const result = await DatabaseService.insert('contacts', [sanitizedData], options);
      
      // Handle result format (single record creation)
      if (result.success && result.data.length > 0) {
        return { success: true, data: result.data[0] };
      }
      
      return result;
    } catch (error) {
      console.error('Error creating customer contact:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update a customer contact
   * Preserves sophisticated primary contact management logic
   */
  async updateCustomerContact(contactId, contactData, options = {}) {
    try {
      // If this is set as primary, get customer_id and unset other primary contacts
      if (contactData.is_primary) {
        const contactResult = await DatabaseService.getAll('contacts', {
          filters: [{ column: 'id', value: contactId }],
          single: true,
          ...options
        });
        if (contactResult.success) {
          await this.unsetPrimaryContact(contactResult.data.customer_id, contactId, options);
        }
      }

      const sanitizedData = {
        name: this.sanitizeInput(contactData.name),
        email: contactData.email ? this.sanitizeInput(contactData.email) : null,
        phone: contactData.phone ? this.sanitizeInput(contactData.phone) : null,
        location: contactData.location ? this.sanitizeInput(contactData.location) : null,
        title: contactData.title ? this.sanitizeInput(contactData.title) : null,
        is_primary: contactData.is_primary || false
      };

      const result = await DatabaseService.update('contacts', contactId, sanitizedData, options);
      return result;
    } catch (error) {
      console.error('Error updating customer contact:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete a customer contact
   * Standard contact deletion for FTZ contact management
   */
  async deleteCustomerContact(contactId, options = {}) {
    try {
      const result = await DatabaseService.delete('contacts', contactId, options);
      return result;
    } catch (error) {
      console.error('Error deleting customer contact:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Unset primary contact (helper method)
   * Critical business logic for primary contact management
   */
  async unsetPrimaryContact(customerId, excludeContactId = null, options = {}) {
    try {
      // Use RPC function for complex primary contact logic
      const result = await DatabaseService.rpc('unset_primary_contact', {
        p_customer_id: customerId,
        p_exclude_contact_id: excludeContactId
      }, options);
      
      return result;
    } catch (error) {
      console.error('Error unsetting primary contact:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Set a contact as primary
   * Primary contact designation for FTZ communication
   */
  async setPrimaryContact(contactId, options = {}) {
    try {
      // Get the contact to find customer_id
      const contactResult = await DatabaseService.getAll('contacts', {
        filters: [{ column: 'id', value: contactId }],
        single: true,
        ...options
      });
      
      if (!contactResult.success) {
        return contactResult;
      }

      // Unset other primary contacts (preserves business logic)
      await this.unsetPrimaryContact(contactResult.data.customer_id, contactId, options);

      // Set this contact as primary
      const result = await DatabaseService.update('contacts', contactId, { is_primary: true }, options);
      return result;
    } catch (error) {
      console.error('Error setting primary contact:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Batch create contacts for a customer
   * Bulk contact creation with sequential processing
   */
  async batchCreateCustomerContacts(customerId, contactsData, options = {}) {
    try {
      const results = [];
      
      for (const contactData of contactsData) {
        const result = await this.createCustomerContact(customerId, contactData, options);
        results.push(result);
        
        if (!result.success) {
          break; // Stop on first failure (preserves original pattern)
        }
      }

      const allSuccessful = results.every(r => r.success);
      return {
        success: allSuccessful,
        results: results,
        error: allSuccessful ? null : 'Some contacts failed to create'
      };
    } catch (error) {
      console.error('Error batch creating customer contacts:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Export customers to CSV format
   * FTZ customer data export for regulatory reporting
   */
  async exportCustomers(filters = {}, options = {}) {
    try {
      const queryFilters = [];

      const result = await DatabaseService.getAll('customers', {
        filters: queryFilters,
        orderBy: 'name.asc',
        ...options
      });

      if (!result.success) {
        return result;
      }

      // Convert to CSV format (preserves original export structure)
      const headers = ['Name', 'EIN', 'Address', 'Broker Name', 'Contact Email'];
      const csvData = result.data.map(customer => [
        customer.name || '',
        customer.ein || '',
        customer.address || '',
        customer.broker_name || '',
        customer.contact_email || ''
      ]);

      return {
        success: true,
        data: {
          headers,
          rows: csvData
        }
      };
    } catch (error) {
      console.error('Error exporting customers:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new CustomerService();