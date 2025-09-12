// src/backend/services/BaseService.js
// Base service class for ICRS SPARC backend services
// Provides consistent patterns and standardized response format

const supabaseClient = require('../db/supabase-client');

class BaseService {
  constructor(tableName) {
    this.tableName = tableName;
    this.client = supabaseClient;
  }

  /**
   * Standardized response wrapper
   * Ensures all services return { success: boolean, data?: any, error?: string }
   */
  createResponse(success, data = null, error = null) {
    const response = { success };
    
    if (success && data !== null) {
      response.data = data;
    }
    
    if (!success && error) {
      response.error = error;
    }
    
    return response;
  }

  /**
   * Get all records with filtering, pagination, and sorting
   */
  async getAll(options = {}) {
    try {
      const result = await this.client.getAll(this.tableName, options);
      return result;
    } catch (error) {
      console.error(`BaseService.getAll error for ${this.tableName}:`, error);
      return this.createResponse(false, null, error.message);
    }
  }

  /**
   * Get single record by ID
   */
  async getById(id, options = {}) {
    try {
      if (!id) {
        return this.createResponse(false, null, 'ID is required');
      }
      
      const result = await this.client.getById(this.tableName, id, options);
      return result;
    } catch (error) {
      console.error(`BaseService.getById error for ${this.tableName}:`, error);
      return this.createResponse(false, null, error.message);
    }
  }

  /**
   * Create new record
   */
  async create(data, options = {}) {
    try {
      if (!data || typeof data !== 'object') {
        return this.createResponse(false, null, 'Invalid data provided');
      }
      
      // Add audit fields
      const recordData = {
        ...data,
        created_at: new Date().toISOString()
      };
      
      if (options.userId) {
        recordData.created_by = options.userId;
      }
      
      const result = await this.client.create(this.tableName, recordData, options);
      return result;
    } catch (error) {
      console.error(`BaseService.create error for ${this.tableName}:`, error);
      return this.createResponse(false, null, error.message);
    }
  }

  /**
   * Update record by ID
   */
  async update(id, data, options = {}) {
    try {
      if (!id) {
        return this.createResponse(false, null, 'ID is required');
      }
      
      if (!data || typeof data !== 'object') {
        return this.createResponse(false, null, 'Invalid data provided');
      }
      
      // Add audit fields
      const updateData = {
        ...data,
        updated_at: new Date().toISOString()
      };
      
      if (options.userId) {
        updateData.updated_by = options.userId;
      }
      
      const result = await this.client.update(this.tableName, id, updateData, options);
      return result;
    } catch (error) {
      console.error(`BaseService.update error for ${this.tableName}:`, error);
      return this.createResponse(false, null, error.message);
    }
  }

  /**
   * Soft delete record (set active = false)
   */
  async softDelete(id, options = {}) {
    try {
      if (!id) {
        return this.createResponse(false, null, 'ID is required');
      }
      
      const updateData = {
        is_active: false,
        updated_at: new Date().toISOString()
      };
      
      if (options.userId) {
        updateData.updated_by = options.userId;
      }
      
      const result = await this.client.update(this.tableName, id, updateData, options);
      return result;
    } catch (error) {
      console.error(`BaseService.softDelete error for ${this.tableName}:`, error);
      return this.createResponse(false, null, error.message);
    }
  }

  /**
   * Hard delete record
   */
  async delete(id, options = {}) {
    try {
      if (!id) {
        return this.createResponse(false, null, 'ID is required');
      }
      
      const result = await this.client.delete(this.tableName, id, options);
      return result;
    } catch (error) {
      console.error(`BaseService.delete error for ${this.tableName}:`, error);
      return this.createResponse(false, null, error.message);
    }
  }

  /**
   * Create multiple records in a batch
   */
  async createBatch(dataArray, options = {}) {
    try {
      if (!Array.isArray(dataArray) || dataArray.length === 0) {
        return this.createResponse(false, null, 'Invalid data array provided');
      }
      
      // Add audit fields to all records
      const recordsData = dataArray.map(data => ({
        ...data,
        created_at: new Date().toISOString(),
        ...(options.userId && { created_by: options.userId })
      }));
      
      const result = await this.client.createBatch(this.tableName, recordsData, options);
      return result;
    } catch (error) {
      console.error(`BaseService.createBatch error for ${this.tableName}:`, error);
      return this.createResponse(false, null, error.message);
    }
  }

  /**
   * Upsert multiple records (insert or update)
   */
  async upsertBatch(dataArray, options = {}) {
    try {
      if (!Array.isArray(dataArray) || dataArray.length === 0) {
        return this.createResponse(false, null, 'Invalid data array provided');
      }
      
      // Add audit fields
      const recordsData = dataArray.map(data => ({
        ...data,
        updated_at: new Date().toISOString(),
        ...(options.userId && { updated_by: options.userId }),
        // Add created_at for new records
        ...(!data.id && { 
          created_at: new Date().toISOString(),
          ...(options.userId && { created_by: options.userId })
        })
      }));
      
      const result = await this.client.upsertBatch(this.tableName, recordsData, options);
      return result;
    } catch (error) {
      console.error(`BaseService.upsertBatch error for ${this.tableName}:`, error);
      return this.createResponse(false, null, error.message);
    }
  }

  /**
   * Call database function/RPC
   */
  async callFunction(functionName, params = {}, options = {}) {
    try {
      const result = await this.client.callFunction(functionName, params, options);
      return result;
    } catch (error) {
      console.error(`BaseService.callFunction error for ${functionName}:`, error);
      return this.createResponse(false, null, error.message);
    }
  }

  /**
   * Get records by field value
   */
  async getByField(fieldName, value, options = {}) {
    try {
      if (!fieldName || value === undefined) {
        return this.createResponse(false, null, 'Field name and value are required');
      }
      
      const searchOptions = {
        ...options,
        filters: [
          ...(options.filters || []),
          { column: fieldName, value }
        ]
      };
      
      const result = await this.client.getAll(this.tableName, searchOptions);
      return result;
    } catch (error) {
      console.error(`BaseService.getByField error for ${this.tableName}:`, error);
      return this.createResponse(false, null, error.message);
    }
  }

  /**
   * Search records with text query
   */
  async search(searchText, searchFields = [], options = {}) {
    try {
      if (!searchText || !searchFields.length) {
        return this.createResponse(false, null, 'Search text and fields are required');
      }
      
      // Create OR filters for multiple fields
      const searchFilters = searchFields.map(field => ({
        column: field,
        value: `%${searchText}%`,
        operator: 'ilike'
      }));
      
      // For now, we'll search the first field (Supabase client needs enhancement for OR queries)
      const searchOptions = {
        ...options,
        filters: [
          ...(options.filters || []),
          searchFilters[0] // Use first search field
        ]
      };
      
      const result = await this.client.getAll(this.tableName, searchOptions);
      return result;
    } catch (error) {
      console.error(`BaseService.search error for ${this.tableName}:`, error);
      return this.createResponse(false, null, error.message);
    }
  }

  /**
   * Count records with optional filters
   */
  async count(options = {}) {
    try {
      const result = await this.client.getAll(this.tableName, {
        ...options,
        select: 'id',
        limit: 1000000 // Large limit to get count
      });
      
      if (!result.success) {
        return result;
      }
      
      return this.createResponse(true, { count: result.count || result.data.length });
    } catch (error) {
      console.error(`BaseService.count error for ${this.tableName}:`, error);
      return this.createResponse(false, null, error.message);
    }
  }

  /**
   * Check if record exists by ID
   */
  async exists(id, options = {}) {
    try {
      if (!id) {
        return this.createResponse(false, null, 'ID is required');
      }
      
      const result = await this.client.getById(this.tableName, id, {
        ...options,
        select: 'id'
      });
      
      return this.createResponse(true, { exists: result.success && !!result.data });
    } catch (error) {
      console.error(`BaseService.exists error for ${this.tableName}:`, error);
      return this.createResponse(false, null, error.message);
    }
  }

  /**
   * Validate required fields
   */
  validateRequired(data, requiredFields) {
    const missing = requiredFields.filter(field => 
      data[field] === undefined || data[field] === null || data[field] === ''
    );
    
    if (missing.length > 0) {
      return this.createResponse(false, null, `Missing required fields: ${missing.join(', ')}`);
    }
    
    return this.createResponse(true);
  }

  /**
   * Create real-time subscription for table changes
   */
  createSubscription(callback, filters = {}) {
    try {
      return this.client.createSubscription(this.tableName, callback, filters);
    } catch (error) {
      console.error(`BaseService.createSubscription error for ${this.tableName}:`, error);
      return null;
    }
  }
}

module.exports = BaseService;