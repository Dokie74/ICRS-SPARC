// tests/backend/services/enhanced/EnhancedBaseService.test.js
// Comprehensive tests for EnhancedBaseService with error handling, monitoring, and cross-service communication

const EnhancedBaseService = require('../../../../src/backend/services/enhanced/EnhancedBaseService');
const ServiceRegistry = require('../../../../src/backend/services/registry/ServiceRegistry');
const MonitoringService = require('../../../../src/backend/monitoring/MonitoringService');
const EventEmitter = require('events');

// Mock DatabaseService
const mockDatabaseService = {
  getAll: jest.fn(),
  getById: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  insert: jest.fn(),
  select: jest.fn(),
  raw: jest.fn()
};

// Mock implementation class for testing
class TestEnhancedService extends EnhancedBaseService {
  constructor(serviceRegistry, eventEmitter, monitoring) {
    super('test_table', serviceRegistry, eventEmitter, monitoring);
    this.client = mockDatabaseService;
  }

  async testOperation(data) {
    return this.executeWithErrorHandling(
      'testOperation',
      async () => {
        if (data.shouldFail) {
          throw new Error('Test operation failed');
        }
        return { result: 'success', data };
      },
      { input: data }
    );
  }

  async testCrossServiceCall(serviceName, methodName, ...args) {
    return this.callService(serviceName, methodName, ...args);
  }

  testEmitEvent(eventName, payload) {
    this.emitEvent(eventName, payload);
  }

  testValidation(data, requiredFields) {
    return this.validateRequiredEnhanced(data, requiredFields);
  }
}

describe('EnhancedBaseService', () => {
  let serviceRegistry;
  let eventEmitter;
  let monitoring;
  let testService;
  let mockService;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Create test dependencies
    serviceRegistry = new ServiceRegistry();
    eventEmitter = new EventEmitter();
    monitoring = new MonitoringService();
    
    // Create test service
    testService = new TestEnhancedService(serviceRegistry, eventEmitter, monitoring);
    
    // Create mock service for cross-service testing
    mockService = {
      testMethod: jest.fn().mockResolvedValue({ success: true, data: 'mock result' })
    };
    
    // Register mock service
    serviceRegistry.register('MockService', mockService);
  });

  describe('Enhanced Error Handling', () => {
    test('should handle successful operations with monitoring', async () => {
      const testData = { value: 'test' };
      const result = await testService.testOperation(testData);
      
      expect(result.success).toBe(true);
      expect(result.data.result).toBe('success');
      expect(result.metadata).toHaveProperty('duration');
      expect(result.metadata).toHaveProperty('traceId');
    });

    test('should handle operation failures with error classification', async () => {
      const testData = { shouldFail: true };
      const result = await testService.testOperation(testData);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Test operation failed');
      expect(result.metadata).toHaveProperty('traceId');
      expect(result.metadata).toHaveProperty('errorCode');
    });

    test('should classify database errors correctly', () => {
      const dbError = { code: '23505', message: 'duplicate key value' };
      const classified = testService.classifyError(dbError, 'testOp', {});
      
      expect(classified.category).toBe('database');
      expect(classified.code).toBe('DUPLICATE_ENTRY');
      expect(classified.severity).toBe('low');
    });

    test('should classify validation errors correctly', () => {
      const validationError = { message: 'field is required' };
      const classified = testService.classifyError(validationError, 'testOp', {});
      
      expect(classified.category).toBe('validation');
      expect(classified.code).toBe('VALIDATION_ERROR');
      expect(classified.severity).toBe('low');
    });

    test('should generate unique trace IDs', () => {
      const traceId1 = testService.generateTraceId();
      const traceId2 = testService.generateTraceId();
      
      expect(traceId1).toMatch(/^trace_\d+_[a-z0-9]+$/);
      expect(traceId2).toMatch(/^trace_\d+_[a-z0-9]+$/);
      expect(traceId1).not.toBe(traceId2);
    });
  });

  describe('Cross-Service Communication', () => {
    test('should successfully call other services', async () => {
      const result = await testService.testCrossServiceCall('MockService', 'testMethod', 'arg1', 'arg2');
      
      expect(result.success).toBe(true);
      expect(result.data).toBe('mock result');
      expect(mockService.testMethod).toHaveBeenCalledWith('arg1', 'arg2');
    });

    test('should handle missing services gracefully', async () => {
      const result = await testService.testCrossServiceCall('NonExistentService', 'testMethod');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('NonExistentService not found');
    });

    test('should handle missing methods gracefully', async () => {
      const result = await testService.testCrossServiceCall('MockService', 'nonExistentMethod');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('nonExistentMethod not found');
    });

    test('should handle service method errors', async () => {
      mockService.testMethod.mockRejectedValue(new Error('Service method failed'));
      
      const result = await testService.testCrossServiceCall('MockService', 'testMethod');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Service method failed');
    });
  });

  describe('Event System', () => {
    test('should emit events with service metadata', (done) => {
      const testPayload = { data: 'test event' };
      
      eventEmitter.on('test.event', (event) => {
        expect(event.service).toBe('TestEnhancedService');
        expect(event.data).toBe('test event');
        expect(event).toHaveProperty('timestamp');
        done();
      });
      
      testService.testEmitEvent('test.event', testPayload);
    });

    test('should subscribe to events', (done) => {
      testService.subscribeToEvent('test.subscription', (event) => {
        expect(event.message).toBe('test subscription');
        done();
      });
      
      eventEmitter.emit('test.subscription', { message: 'test subscription' });
    });
  });

  describe('Enhanced Validation', () => {
    test('should validate required fields successfully', () => {
      const data = { field1: 'value1', field2: 'value2' };
      const result = testService.testValidation(data, ['field1', 'field2']);
      
      expect(result.success).toBe(true);
    });

    test('should identify missing required fields', () => {
      const data = { field1: 'value1' };
      const result = testService.testValidation(data, ['field1', 'field2', 'field3']);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Validation errors');
      expect(result.metadata.validationErrors).toHaveLength(2);
      expect(result.metadata.validationErrors[0].field).toBe('field2');
      expect(result.metadata.validationErrors[1].field).toBe('field3');
    });

    test('should handle empty and null values', () => {
      const data = { field1: '', field2: null, field3: undefined };
      const result = testService.testValidation(data, ['field1', 'field2', 'field3']);
      
      expect(result.success).toBe(false);
      expect(result.metadata.validationErrors).toHaveLength(3);
    });

    test('should validate business rules', async () => {
      const data = { quantity: 10, price: 5.50 };
      const rules = [
        {
          field: 'quantity',
          validator: (data) => data.quantity > 0,
          message: 'Quantity must be positive'
        },
        {
          field: 'price',
          validator: (data) => data.price > 0,
          message: 'Price must be positive'
        }
      ];
      
      const result = await testService.validateBusinessRules(data, rules);
      expect(result.success).toBe(true);
    });

    test('should identify failed business rules', async () => {
      const data = { quantity: -1, price: 0 };
      const rules = [
        {
          field: 'quantity',
          validator: (data) => data.quantity > 0,
          message: 'Quantity must be positive'
        },
        {
          field: 'price',
          validator: (data) => data.price > 0,
          message: 'Price must be positive'
        }
      ];
      
      const result = await testService.validateBusinessRules(data, rules);
      expect(result.success).toBe(false);
      expect(result.metadata.validationErrors).toHaveLength(2);
    });
  });

  describe('Batch Operations', () => {
    beforeEach(() => {
      // Mock database operations
      mockDatabaseService.create.mockResolvedValue({ success: true, data: { id: '1' } });
      mockDatabaseService.update.mockResolvedValue({ success: true, data: { id: '1' } });
      mockDatabaseService.delete.mockResolvedValue({ success: true });
    });

    test('should execute batch operations successfully', async () => {
      const operations = [
        { type: 'create', data: { name: 'item1' } },
        { type: 'update', id: '1', data: { name: 'item1_updated' } },
        { type: 'delete', id: '2' }
      ];
      
      const result = await testService.executeBatchOperation(operations, { userId: 'user123' });
      
      expect(result.success).toBe(true);
      expect(result.data.success_count).toBe(3);
      expect(result.data.error_count).toBe(0);
      expect(result.data.results).toHaveLength(3);
    });

    test('should handle partial failures in batch operations', async () => {
      mockDatabaseService.update.mockResolvedValue({ success: false, error: 'Update failed' });
      
      const operations = [
        { type: 'create', data: { name: 'item1' } },
        { type: 'update', id: '1', data: { name: 'item1_updated' } },
        { type: 'delete', id: '2' }
      ];
      
      const result = await testService.executeBatchOperation(operations, { userId: 'user123' });
      
      expect(result.success).toBe(true);
      expect(result.data.success_count).toBe(2);
      expect(result.data.error_count).toBe(1);
      expect(result.data.errors).toHaveLength(1);
    });

    test('should handle invalid operation types', async () => {
      const operations = [
        { type: 'invalid_operation', data: { name: 'item1' } }
      ];
      
      const result = await testService.executeBatchOperation(operations);
      
      expect(result.success).toBe(true);
      expect(result.data.success_count).toBe(0);
      expect(result.data.error_count).toBe(1);
    });
  });

  describe('Enhanced Response Format', () => {
    test('should create enhanced responses with metadata', () => {
      const data = { result: 'test' };
      const metadata = { source: 'test', version: '1.0' };
      
      const response = testService.createEnhancedResponse(true, data, null, metadata);
      
      expect(response.success).toBe(true);
      expect(response.data).toBe(data);
      expect(response.metadata).toBe(metadata);
    });

    test('should include error metadata in failed responses', () => {
      const error = 'Test error';
      
      const response = testService.createEnhancedResponse(false, null, error);
      
      expect(response.success).toBe(false);
      expect(response.error).toBe(error);
      expect(response).toHaveProperty('timestamp');
      expect(response).toHaveProperty('traceId');
    });
  });

  describe('Integration with Monitoring', () => {
    test('should record metrics through monitoring service', async () => {
      // Spy on monitoring methods
      const recordMetricSpy = jest.spyOn(monitoring, 'recordMetric');
      const logSpy = jest.spyOn(monitoring, 'log');
      
      await testService.testOperation({ value: 'test' });
      
      expect(recordMetricSpy).toHaveBeenCalledWith('service_operation_started', 1, {
        service: 'TestEnhancedService',
        operation: 'testOperation'
      });
      
      expect(logSpy).toHaveBeenCalledWith(expect.objectContaining({
        level: 'info',
        message: 'Starting operation: testOperation',
        service: 'TestEnhancedService'
      }));
    });

    test('should record error metrics on failures', async () => {
      const recordMetricSpy = jest.spyOn(monitoring, 'recordMetric');
      
      await testService.testOperation({ shouldFail: true });
      
      expect(recordMetricSpy).toHaveBeenCalledWith('service_error_count', 1, {
        service: 'TestEnhancedService',
        operation: 'testOperation',
        error_type: 'Error'
      });
    });
  });

  describe('Error Severity Handling', () => {
    test('should handle critical errors', async () => {
      const sendCriticalAlertSpy = jest.spyOn(testService, 'sendCriticalAlert');
      const error = { severity: 'critical', message: 'Critical test error' };
      
      await testService.handleErrorBySeverity(error);
      
      expect(sendCriticalAlertSpy).toHaveBeenCalledWith(error);
    });

    test('should emit critical error events', async () => {
      const eventSpy = jest.spyOn(testService, 'emitEvent');
      const error = { severity: 'critical', message: 'Critical test error' };
      
      await testService.sendCriticalAlert(error);
      
      expect(eventSpy).toHaveBeenCalledWith('alert.critical', {
        error,
        requires_immediate_attention: true
      });
    });
  });
});

// Additional test utilities
function createMockOptions(overrides = {}) {
  return {
    userId: 'test-user-123',
    filters: [],
    limit: 50,
    offset: 0,
    ...overrides
  };
}

function createMockServiceResponse(success = true, data = null, error = null) {
  return {
    success,
    ...(data && { data }),
    ...(error && { error })
  };
}