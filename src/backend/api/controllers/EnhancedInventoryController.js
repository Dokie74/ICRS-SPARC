// src/backend/api/controllers/EnhancedInventoryController.js
// Enhanced Inventory API controller with comprehensive validation, real-time updates, and monitoring
// Maintains full compatibility with existing frontend while adding enterprise features

class EnhancedInventoryController {
  constructor(inventoryService, authService, monitoring) {
    this.inventoryService = inventoryService;
    this.authService = authService;
    this.monitoring = monitoring;
  }

  /**
   * Get all inventory lots with enhanced filtering and pagination
   * GET /api/inventory/lots
   */
  async getAllLots(req, res) {
    const startTime = Date.now();
    const traceId = this.generateTraceId();
    
    try {
      // Log request
      this.monitoring?.log({
        level: 'info',
        message: 'Getting all inventory lots',
        service: 'EnhancedInventoryController',
        operation: 'getAllLots',
        traceId,
        userId: req.user?.id,
        context: {
          query: req.query,
          userAgent: req.headers['user-agent']
        }
      });

      // Validate user permissions
      const permissionResult = await this.authService.checkCapability('inventory.read', req.user?.id);
      if (!permissionResult.success || !permissionResult.data) {
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions to view inventory',
          code: 'ACCESS_DENIED',
          timestamp: new Date().toISOString(),
          traceId
        });
      }

      // Parse and validate query parameters
      const options = this.parseListOptions(req.query);
      
      // Validate filters
      if (options.filters) {
        const filterValidation = this.validateFilters(options.filters);
        if (!filterValidation.valid) {
          return res.status(400).json({
            success: false,
            error: 'Invalid filter parameters',
            code: 'VALIDATION_ERROR',
            details: { validationErrors: filterValidation.errors },
            timestamp: new Date().toISOString(),
            traceId
          });
        }
      }

      // Call service with enhanced options
      const result = await this.inventoryService.getAllLots({
        ...options,
        userId: req.user?.id
      });

      const duration = Date.now() - startTime;

      if (!result.success) {
        this.monitoring?.recordMetric('api_request_completed', 1, {
          endpoint: 'GET /api/inventory/lots',
          status: 'error',
          duration: duration
        });

        return res.status(500).json({
          success: false,
          error: result.error,
          code: 'SERVICE_ERROR',
          timestamp: new Date().toISOString(),
          traceId
        });
      }

      // Record success metrics
      this.monitoring?.recordMetric('api_request_completed', 1, {
        endpoint: 'GET /api/inventory/lots',
        status: 'success',
        duration: duration,
        result_count: result.data?.length || 0
      });

      // Enhanced response with metadata
      res.json({
        success: true,
        data: result.data,
        count: result.data?.length || 0,
        metadata: {
          duration,
          traceId,
          query: options,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.monitoring?.log({
        level: 'error',
        message: `Error in getAllLots: ${error.message}`,
        service: 'EnhancedInventoryController',
        operation: 'getAllLots',
        duration,
        traceId,
        context: { error: error.stack }
      });

      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
        timestamp: new Date().toISOString(),
        traceId
      });
    }
  }

  /**
   * Get lot by ID with comprehensive details
   * GET /api/inventory/lots/:lotId
   */
  async getLotById(req, res) {
    const startTime = Date.now();
    const traceId = this.generateTraceId();
    const { lotId } = req.params;
    
    try {
      this.monitoring?.log({
        level: 'info',
        message: `Getting lot details for ${lotId}`,
        service: 'EnhancedInventoryController',
        operation: 'getLotById',
        traceId,
        userId: req.user?.id,
        context: { lotId }
      });

      // Validate parameters
      if (!lotId || typeof lotId !== 'string' || lotId.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Valid lot ID is required',
          code: 'VALIDATION_ERROR',
          timestamp: new Date().toISOString(),
          traceId
        });
      }

      // Check permissions
      const permissionResult = await this.authService.checkCapability('inventory.read', req.user?.id);
      if (!permissionResult.success || !permissionResult.data) {
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions to view inventory details',
          code: 'ACCESS_DENIED',
          timestamp: new Date().toISOString(),
          traceId
        });
      }

      const result = await this.inventoryService.getLotById(lotId, {
        userId: req.user?.id
      });

      const duration = Date.now() - startTime;

      if (!result.success) {
        const statusCode = result.error === 'Lot not found' ? 404 : 500;
        
        this.monitoring?.recordMetric('api_request_completed', 1, {
          endpoint: 'GET /api/inventory/lots/:lotId',
          status: statusCode === 404 ? 'not_found' : 'error',
          duration: duration
        });

        return res.status(statusCode).json({
          success: false,
          error: result.error,
          code: statusCode === 404 ? 'NOT_FOUND' : 'SERVICE_ERROR',
          timestamp: new Date().toISOString(),
          traceId
        });
      }

      this.monitoring?.recordMetric('api_request_completed', 1, {
        endpoint: 'GET /api/inventory/lots/:lotId',
        status: 'success',
        duration: duration
      });

      res.json({
        success: true,
        data: result.data,
        metadata: {
          duration,
          traceId,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.monitoring?.log({
        level: 'error',
        message: `Error in getLotById: ${error.message}`,
        service: 'EnhancedInventoryController',
        operation: 'getLotById',
        duration,
        traceId,
        context: { error: error.stack, lotId }
      });

      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
        timestamp: new Date().toISOString(),
        traceId
      });
    }
  }

  /**
   * Create new inventory lot
   * POST /api/inventory/lots
   */
  async createLot(req, res) {
    const startTime = Date.now();
    const traceId = this.generateTraceId();
    
    try {
      this.monitoring?.log({
        level: 'info',
        message: 'Creating new inventory lot',
        service: 'EnhancedInventoryController',
        operation: 'createLot',
        traceId,
        userId: req.user?.id
      });

      // Check permissions
      const permissionResult = await this.authService.checkCapability('inventory.create', req.user?.id);
      if (!permissionResult.success || !permissionResult.data) {
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions to create inventory lots',
          code: 'ACCESS_DENIED',
          timestamp: new Date().toISOString(),
          traceId
        });
      }

      // Validate request body
      const validation = this.validateCreateLotRequest(req.body);
      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          error: 'Invalid lot data',
          code: 'VALIDATION_ERROR',
          details: { validationErrors: validation.errors },
          timestamp: new Date().toISOString(),
          traceId
        });
      }

      const result = await this.inventoryService.createLot(req.body, {
        userId: req.user?.id
      });

      const duration = Date.now() - startTime;

      if (!result.success) {
        this.monitoring?.recordMetric('api_request_completed', 1, {
          endpoint: 'POST /api/inventory/lots',
          status: 'error',
          duration: duration
        });

        const statusCode = result.error.includes('not found') ? 400 : 500;
        
        return res.status(statusCode).json({
          success: false,
          error: result.error,
          code: statusCode === 400 ? 'BUSINESS_RULE_VIOLATION' : 'SERVICE_ERROR',
          timestamp: new Date().toISOString(),
          traceId
        });
      }

      this.monitoring?.recordMetric('api_request_completed', 1, {
        endpoint: 'POST /api/inventory/lots',
        status: 'success',
        duration: duration
      });

      this.monitoring?.recordMetric('inventory_lot_created', 1, {
        user_id: req.user?.id,
        part_id: req.body.part_id,
        customer_id: req.body.customer_id
      });

      res.status(201).json({
        success: true,
        data: result.data,
        metadata: {
          duration,
          traceId,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.monitoring?.log({
        level: 'error',
        message: `Error in createLot: ${error.message}`,
        service: 'EnhancedInventoryController',
        operation: 'createLot',
        duration,
        traceId,
        context: { error: error.stack }
      });

      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
        timestamp: new Date().toISOString(),
        traceId
      });
    }
  }

  /**
   * Update lot quantity
   * PUT /api/inventory/lots/:lotId/quantity
   */
  async updateLotQuantity(req, res) {
    const startTime = Date.now();
    const traceId = this.generateTraceId();
    const { lotId } = req.params;
    const { newQuantity, reason, oldQuantity } = req.body;
    
    try {
      this.monitoring?.log({
        level: 'info',
        message: `Updating quantity for lot ${lotId}`,
        service: 'EnhancedInventoryController',
        operation: 'updateLotQuantity',
        traceId,
        userId: req.user?.id,
        context: { lotId, newQuantity, oldQuantity }
      });

      // Check permissions
      const permissionResult = await this.authService.checkCapability('inventory.update', req.user?.id);
      if (!permissionResult.success || !permissionResult.data) {
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions to update inventory',
          code: 'ACCESS_DENIED',
          timestamp: new Date().toISOString(),
          traceId
        });
      }

      // Validate request
      const validation = this.validateQuantityUpdateRequest({ lotId, newQuantity, reason, oldQuantity });
      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          error: 'Invalid quantity update data',
          code: 'VALIDATION_ERROR',
          details: { validationErrors: validation.errors },
          timestamp: new Date().toISOString(),
          traceId
        });
      }

      const result = await this.inventoryService.adjustLotQuantity(
        lotId, 
        parseInt(newQuantity), 
        reason, 
        oldQuantity ? parseInt(oldQuantity) : undefined,
        { userId: req.user?.id }
      );

      const duration = Date.now() - startTime;

      if (!result.success) {
        this.monitoring?.recordMetric('api_request_completed', 1, {
          endpoint: 'PUT /api/inventory/lots/:lotId/quantity',
          status: 'error',
          duration: duration
        });

        const statusCode = result.error.includes('not found') ? 404 : 500;
        
        return res.status(statusCode).json({
          success: false,
          error: result.error,
          code: statusCode === 404 ? 'NOT_FOUND' : 'SERVICE_ERROR',
          timestamp: new Date().toISOString(),
          traceId
        });
      }

      this.monitoring?.recordMetric('api_request_completed', 1, {
        endpoint: 'PUT /api/inventory/lots/:lotId/quantity',
        status: 'success',
        duration: duration
      });

      res.json({
        success: true,
        data: result.data,
        metadata: {
          duration,
          traceId,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.monitoring?.log({
        level: 'error',
        message: `Error in updateLotQuantity: ${error.message}`,
        service: 'EnhancedInventoryController',
        operation: 'updateLotQuantity',
        duration,
        traceId,
        context: { error: error.stack, lotId }
      });

      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
        timestamp: new Date().toISOString(),
        traceId
      });
    }
  }

  /**
   * Get inventory summary with real-time metrics
   * GET /api/inventory/summary
   */
  async getInventorySummary(req, res) {
    const startTime = Date.now();
    const traceId = this.generateTraceId();
    
    try {
      // Check permissions
      const permissionResult = await this.authService.checkCapability('inventory.read', req.user?.id);
      if (!permissionResult.success || !permissionResult.data) {
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions to view inventory summary',
          code: 'ACCESS_DENIED',
          timestamp: new Date().toISOString(),
          traceId
        });
      }

      const result = await this.inventoryService.getInventorySummary({ userId: req.user?.id });
      const duration = Date.now() - startTime;

      if (!result.success) {
        return res.status(500).json({
          success: false,
          error: result.error,
          code: 'SERVICE_ERROR',
          timestamp: new Date().toISOString(),
          traceId
        });
      }

      res.json({
        success: true,
        data: result.data,
        metadata: {
          duration,
          traceId,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.monitoring?.log({
        level: 'error',
        message: `Error in getInventorySummary: ${error.message}`,
        service: 'EnhancedInventoryController',
        operation: 'getInventorySummary',
        duration,
        traceId,
        context: { error: error.stack }
      });

      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
        timestamp: new Date().toISOString(),
        traceId
      });
    }
  }

  // Utility methods

  generateTraceId() {
    return `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  parseListOptions(query) {
    const options = {};
    
    if (query.limit) {
      const limit = parseInt(query.limit);
      if (!isNaN(limit) && limit > 0 && limit <= 1000) {
        options.limit = limit;
      }
    }
    
    if (query.offset) {
      const offset = parseInt(query.offset);
      if (!isNaN(offset) && offset >= 0) {
        options.offset = offset;
      }
    }
    
    if (query.orderBy && query.ascending !== undefined) {
      options.orderBy = {
        column: query.orderBy,
        ascending: query.ascending === 'true'
      };
    }
    
    if (query.search) {
      options.search = query.search.trim();
    }
    
    // Parse filters
    const filters = [];
    if (query.status) filters.push({ column: 'status', value: query.status });
    if (query.customer_id) filters.push({ column: 'customer_id', value: query.customer_id });
    if (query.part_id) filters.push({ column: 'part_id', value: query.part_id });
    
    if (filters.length > 0) {
      options.filters = filters;
    }
    
    return options;
  }

  validateFilters(filters) {
    const errors = [];
    const allowedColumns = ['status', 'customer_id', 'part_id', 'active', 'voided'];
    
    filters.forEach((filter, index) => {
      if (!filter.column || !allowedColumns.includes(filter.column)) {
        errors.push({
          field: `filters[${index}].column`,
          message: `Invalid filter column: ${filter.column}`
        });
      }
      
      if (filter.value === undefined || filter.value === null) {
        errors.push({
          field: `filters[${index}].value`,
          message: 'Filter value is required'
        });
      }
    });
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  validateCreateLotRequest(data) {
    const errors = [];
    const requiredFields = ['part_id', 'customer_id', 'quantity'];
    
    requiredFields.forEach(field => {
      if (!data[field]) {
        errors.push({
          field,
          message: `${field} is required`
        });
      }
    });
    
    if (data.quantity && (isNaN(parseInt(data.quantity)) || parseInt(data.quantity) <= 0)) {
      errors.push({
        field: 'quantity',
        message: 'Quantity must be a positive number'
      });
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  validateQuantityUpdateRequest(data) {
    const errors = [];
    
    if (!data.lotId) {
      errors.push({ field: 'lotId', message: 'Lot ID is required' });
    }
    
    if (data.newQuantity === undefined || data.newQuantity === null) {
      errors.push({ field: 'newQuantity', message: 'New quantity is required' });
    } else if (isNaN(parseInt(data.newQuantity)) || parseInt(data.newQuantity) < 0) {
      errors.push({ field: 'newQuantity', message: 'New quantity must be a non-negative number' });
    }
    
    if (!data.reason || typeof data.reason !== 'string' || data.reason.trim().length === 0) {
      errors.push({ field: 'reason', message: 'Reason is required' });
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
}

module.exports = EnhancedInventoryController;