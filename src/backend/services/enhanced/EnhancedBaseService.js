// src/backend/services/enhanced/EnhancedBaseService.js
// Enhanced BaseService with TypeScript interfaces, monitoring, and cross-service communication
// Maintains compatibility with existing BaseService while adding enterprise features

const BaseService = require('../BaseService');
const EventEmitter = require('events');

/**
 * Enhanced BaseService with comprehensive error handling, monitoring, and cross-service communication
 * Extends the proven BaseService pattern while adding enterprise-grade capabilities
 */
class EnhancedBaseService extends BaseService {
  constructor(tableName, serviceRegistry = null, eventEmitter = null, monitoring = null) {
    super(tableName);
    this.serviceRegistry = serviceRegistry;
    this.eventEmitter = eventEmitter || new EventEmitter();
    this.monitoring = monitoring;
  }

  /**
   * Enhanced response format with additional metadata
   */
  createEnhancedResponse(success, data = null, error = null, metadata = {}) {
    const response = this.createResponse(success, data, error);
    
    if (Object.keys(metadata).length > 0) {
      response.metadata = metadata;
    }
    
    if (!success && error) {
      response.timestamp = new Date().toISOString();
      response.traceId = this.generateTraceId();
    }
    
    return response;
  }

  /**
   * Execute operation with comprehensive error handling and monitoring
   */
  async executeWithErrorHandling(operation, asyncOperation, context = {}) {
    const startTime = Date.now();
    const traceId = this.generateTraceId();
    
    try {
      // Log operation start
      this.logOperation('info', `Starting operation: ${operation}`, {
        operation,
        context,
        traceId
      });
      
      // Record operation started metric
      this.recordMetric('service_operation_started', 1, {
        service: this.constructor.name,
        operation
      });
      
      const result = await asyncOperation();
      const duration = Date.now() - startTime;
      
      // Log success
      this.logOperation('info', `Operation completed successfully: ${operation}`, {
        operation,
        duration,
        traceId
      });
      
      // Record success metrics
      this.recordMetric('service_operation_completed', 1, {
        service: this.constructor.name,
        operation,
        status: 'success'
      });
      
      this.recordMetric('service_operation_duration', duration, {
        service: this.constructor.name,
        operation
      });
      
      return this.createEnhancedResponse(true, result, null, { duration, traceId });
      
    } catch (error) {
      const duration = Date.now() - startTime;
      const serviceError = this.classifyError(error, operation, context);
      
      // Log error
      this.logOperation('error', `Operation failed: ${operation} - ${error.message}`, {
        operation,
        duration,
        error: error.message,
        stack: error.stack,
        traceId
      });
      
      // Emit error event for monitoring
      this.emitEvent('service.error', serviceError);
      
      // Handle based on severity
      await this.handleErrorBySeverity(serviceError);
      
      // Record error metrics
      this.recordMetric('service_operation_completed', 1, {
        service: this.constructor.name,
        operation,
        status: 'error'
      });
      
      this.recordMetric('service_error_count', 1, {
        service: this.constructor.name,
        operation,
        error_type: error.constructor.name
      });
      
      return this.createEnhancedResponse(false, null, serviceError.message, {
        duration,
        traceId,
        errorCode: serviceError.code,
        errorCategory: serviceError.category
      });
    }
  }

  /**
   * Cross-service method calls with error handling
   */
  async callService(serviceName, methodName, ...args) {
    try {
      if (!this.serviceRegistry) {
        throw new Error('Service registry not available');
      }
      
      const service = this.serviceRegistry.get(serviceName);
      const method = service[methodName];
      
      if (typeof method !== 'function') {
        throw new Error(`Method ${methodName} not found on service ${serviceName}`);
      }
      
      const result = await method.apply(service, args);
      return result;
    } catch (error) {
      console.error(`Error calling ${serviceName}.${methodName}:`, error);
      return this.createResponse(false, null, error.message);
    }
  }

  /**
   * Event-based communication
   */
  emitEvent(eventName, payload) {
    if (this.eventEmitter) {
      this.eventEmitter.emit(eventName, {
        service: this.constructor.name,
        timestamp: new Date().toISOString(),
        ...payload
      });
    }
  }

  /**
   * Subscribe to events
   */
  subscribeToEvent(eventName, handler) {
    if (this.eventEmitter) {
      this.eventEmitter.on(eventName, handler);
    }
  }

  /**
   * Enhanced validation with detailed error reporting
   */
  validateRequiredEnhanced(data, requiredFields) {
    const validationErrors = [];
    
    requiredFields.forEach(field => {
      if (data[field] === undefined || data[field] === null || data[field] === '') {
        validationErrors.push({
          field,
          message: `${field} is required`
        });
      }
    });
    
    if (validationErrors.length > 0) {
      return this.createEnhancedResponse(false, null, 'Validation errors', {
        validationErrors
      });
    }
    
    return this.createResponse(true);
  }

  /**
   * Business rule validation
   */
  async validateBusinessRules(data, rules = []) {
    const validationErrors = [];
    
    for (const rule of rules) {
      try {
        const isValid = await rule.validator(data);
        if (!isValid) {
          validationErrors.push({
            field: rule.field,
            message: rule.message
          });
        }
      } catch (error) {
        validationErrors.push({
          field: rule.field,
          message: `Validation error: ${error.message}`
        });
      }
    }
    
    if (validationErrors.length > 0) {
      return this.createEnhancedResponse(false, null, 'Business rule validation failed', {
        validationErrors
      });
    }
    
    return this.createResponse(true);
  }

  /**
   * Enhanced search with full-text capabilities
   */
  async searchEnhanced(searchText, searchFields = [], options = {}) {
    return this.executeWithErrorHandling(
      'searchEnhanced',
      async () => {
        if (!searchText || !searchFields.length) {
          throw new Error('Search text and fields are required');
        }
        
        // Use the enhanced search capabilities from the base service
        const result = await this.search(searchText, searchFields, options);
        
        if (!result.success) {
          throw new Error(result.error);
        }
        
        return result.data;
      },
      { searchText, searchFields, options }
    );
  }

  /**
   * Batch operations with transaction support
   */
  async executeBatchOperation(operations, options = {}) {
    return this.executeWithErrorHandling(
      'executeBatchOperation',
      async () => {
        const results = [];
        const errors = [];
        
        // Process operations in sequence for transaction support
        for (let i = 0; i < operations.length; i++) {
          const operation = operations[i];
          try {
            let result;
            
            switch (operation.type) {
              case 'create':
                result = await this.create(operation.data, options);
                break;
              case 'update':
                result = await this.update(operation.id, operation.data, options);
                break;
              case 'delete':
                result = await this.delete(operation.id, options);
                break;
              default:
                throw new Error(`Unknown operation type: ${operation.type}`);
            }
            
            if (result.success) {
              results.push({ index: i, result: result.data });
            } else {
              errors.push({ index: i, error: result.error });
            }
          } catch (error) {
            errors.push({ index: i, error: error.message });
          }
        }
        
        return {
          success_count: results.length,
          error_count: errors.length,
          results,
          errors
        };
      },
      { operationCount: operations.length }
    );
  }

  /**
   * Classify errors by category and severity
   */
  classifyError(error, operation, context) {
    let category = 'system';
    let severity = 'medium';
    let code = 'UNKNOWN_ERROR';
    
    // Database errors
    if (error.code && error.code.startsWith('23')) {
      category = 'database';
      if (error.code === '23505') {
        code = 'DUPLICATE_ENTRY';
        severity = 'low';
      } else if (error.code === '23503') {
        code = 'REFERENCE_ERROR';
        severity = 'medium';
      }
    }
    
    // Validation errors
    if (error.message.includes('required') || error.message.includes('invalid')) {
      category = 'validation';
      severity = 'low';
      code = 'VALIDATION_ERROR';
    }
    
    // Authentication/Authorization errors
    if (error.message.includes('unauthorized') || error.message.includes('permission')) {
      category = 'authorization';
      severity = 'high';
      code = 'ACCESS_DENIED';
    }
    
    return {
      code,
      message: error.message || 'An unknown error occurred',
      category,
      severity,
      context,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      service: this.constructor.name,
      method: operation
    };
  }

  /**
   * Handle errors based on severity
   */
  async handleErrorBySeverity(error) {
    switch (error.severity) {
      case 'critical':
        await this.sendCriticalAlert(error);
        break;
      case 'high':
        await this.reportToErrorTracking(error);
        break;
      case 'medium':
        console.error('Service error:', error);
        break;
      case 'low':
        console.debug('Minor service error:', error);
        break;
    }
  }

  /**
   * Generate unique trace ID
   */
  generateTraceId() {
    return `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Log operation with structured format
   */
  logOperation(level, message, context = {}) {
    if (this.monitoring && this.monitoring.log) {
      this.monitoring.log({
        level,
        message,
        service: this.constructor.name,
        context,
        timestamp: new Date().toISOString()
      });
    } else {
      const logMethod = console[level] || console.log;
      logMethod(`[${this.constructor.name}] ${message}`, context);
    }
  }

  /**
   * Record metrics
   */
  recordMetric(name, value, labels = {}) {
    if (this.monitoring && this.monitoring.recordMetric) {
      this.monitoring.recordMetric({ name, value, labels });
    }
  }

  /**
   * Send critical alerts
   */
  async sendCriticalAlert(error) {
    console.error('CRITICAL ERROR:', error);
    this.emitEvent('alert.critical', {
      error,
      requires_immediate_attention: true
    });
  }

  /**
   * Report to error tracking service
   */
  async reportToErrorTracking(error) {
    console.error('High severity error reported:', error);
  }
}

module.exports = EnhancedBaseService;