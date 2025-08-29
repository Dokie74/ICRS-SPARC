// tests/backend/services/BaseService.test.js
// Comprehensive unit tests for BaseService foundation

const BaseService = require('../../../src/backend/services/BaseService');
const supabaseClient = require('../../../src/backend/db/supabase-client');

// Mock Supabase client
jest.mock('../../../src/backend/db/supabase-client', () => ({
  getAll: jest.fn(),
  getById: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  createBatch: jest.fn(),
  upsertBatch: jest.fn(),
  callFunction: jest.fn(),
  createSubscription: jest.fn()
}));

// Test implementation of BaseService for testing
class TestService extends BaseService {
  constructor() {
    super('test_table');
  }
}

describe('BaseService', () => {
  let testService;
  let mockData;

  beforeEach(() => {
    testService = new TestService();
    mockData = {
      id: 'test-id-123',
      name: 'Test Record',
      status: 'active',
      created_at: new Date().toISOString()
    };
    
    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('Response Creation', () => {
    test('creates successful response with data', () => {
      const response = testService.createResponse(true, mockData);
      
      expect(response).toEqual({
        success: true,
        data: mockData
      });
    });

    test('creates error response with message', () => {
      const errorMsg = 'Something went wrong';
      const response = testService.createResponse(false, null, errorMsg);
      
      expect(response).toEqual({
        success: false,
        error: errorMsg
      });
    });

    test('handles null data for successful response', () => {
      const response = testService.createResponse(true, null);
      
      expect(response).toEqual({
        success: true,
        data: null
      });
    });
  });

  describe('getAll() - Read Operations', () => {
    test('retrieves all records successfully', async () => {
      const mockResponse = { success: true, data: [mockData], count: 1 };
      supabaseClient.getAll.mockResolvedValue(mockResponse);

      const result = await testService.getAll();

      expect(supabaseClient.getAll).toHaveBeenCalledWith('test_table', {});
      expect(result).toEqual(mockResponse);
    });

    test('handles database error gracefully', async () => {
      const errorMsg = 'Database connection failed';
      supabaseClient.getAll.mockRejectedValue(new Error(errorMsg));

      const result = await testService.getAll();

      expect(result.success).toBe(false);
      expect(result.error).toBe(errorMsg);
    });

    test('passes options to database client', async () => {
      const options = {
        filters: [{ column: 'status', value: 'active' }],
        orderBy: { column: 'created_at', ascending: false },
        limit: 50,
        offset: 0
      };

      supabaseClient.getAll.mockResolvedValue({ success: true, data: [] });

      await testService.getAll(options);

      expect(supabaseClient.getAll).toHaveBeenCalledWith('test_table', options);
    });
  });

  describe('getById() - Single Record Retrieval', () => {
    test('retrieves record by ID successfully', async () => {
      const mockResponse = { success: true, data: mockData };
      supabaseClient.getById.mockResolvedValue(mockResponse);

      const result = await testService.getById('test-id-123');

      expect(supabaseClient.getById).toHaveBeenCalledWith('test_table', 'test-id-123', {});
      expect(result).toEqual(mockResponse);
    });

    test('validates ID parameter', async () => {
      const result = await testService.getById(null);

      expect(result.success).toBe(false);
      expect(result.error).toBe('ID is required');
      expect(supabaseClient.getById).not.toHaveBeenCalled();
    });

    test('handles non-existent record gracefully', async () => {
      supabaseClient.getById.mockResolvedValue({ success: false, error: 'Record not found' });

      const result = await testService.getById('non-existent-id');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Record not found');
    });
  });

  describe('create() - Record Creation', () => {
    test('creates record with audit fields', async () => {
      const inputData = { name: 'New Record', status: 'active' };
      const options = { userId: 'user-123' };
      const mockResponse = { success: true, data: { ...inputData, id: 'new-id-456' } };
      
      supabaseClient.create.mockResolvedValue(mockResponse);

      const result = await testService.create(inputData, options);

      expect(supabaseClient.create).toHaveBeenCalledWith(
        'test_table',
        expect.objectContaining({
          ...inputData,
          created_at: expect.any(String),
          created_by: 'user-123'
        }),
        options
      );
      expect(result).toEqual(mockResponse);
    });

    test('validates input data', async () => {
      const result = await testService.create(null);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid data provided');
      expect(supabaseClient.create).not.toHaveBeenCalled();
    });

    test('handles creation without userId', async () => {
      const inputData = { name: 'New Record' };
      supabaseClient.create.mockResolvedValue({ success: true, data: mockData });

      await testService.create(inputData);

      expect(supabaseClient.create).toHaveBeenCalledWith(
        'test_table',
        expect.objectContaining({
          ...inputData,
          created_at: expect.any(String)
        }),
        {}
      );
      expect(supabaseClient.create).not.toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ created_by: expect.anything() }),
        expect.anything()
      );
    });
  });

  describe('update() - Record Updates', () => {
    test('updates record with audit fields', async () => {
      const updateData = { name: 'Updated Record' };
      const options = { userId: 'user-456' };
      const mockResponse = { success: true, data: { ...mockData, ...updateData } };
      
      supabaseClient.update.mockResolvedValue(mockResponse);

      const result = await testService.update('test-id-123', updateData, options);

      expect(supabaseClient.update).toHaveBeenCalledWith(
        'test_table',
        'test-id-123',
        expect.objectContaining({
          ...updateData,
          updated_at: expect.any(String),
          updated_by: 'user-456'
        }),
        options
      );
      expect(result).toEqual(mockResponse);
    });

    test('validates ID parameter', async () => {
      const result = await testService.update(null, { name: 'Test' });

      expect(result.success).toBe(false);
      expect(result.error).toBe('ID is required');
    });

    test('validates update data', async () => {
      const result = await testService.update('test-id', null);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid data provided');
    });
  });

  describe('delete() - Record Deletion', () => {
    test('performs soft delete by default', async () => {
      const options = { userId: 'user-789' };
      const mockResponse = { success: true, data: { ...mockData, active: false } };
      
      supabaseClient.update.mockResolvedValue(mockResponse);

      const result = await testService.softDelete('test-id-123', options);

      expect(supabaseClient.update).toHaveBeenCalledWith(
        'test_table',
        'test-id-123',
        expect.objectContaining({
          active: false,
          updated_at: expect.any(String),
          updated_by: 'user-789'
        }),
        options
      );
      expect(result).toEqual(mockResponse);
    });

    test('performs hard delete when requested', async () => {
      const mockResponse = { success: true, data: null };
      supabaseClient.delete.mockResolvedValue(mockResponse);

      const result = await testService.delete('test-id-123');

      expect(supabaseClient.delete).toHaveBeenCalledWith('test_table', 'test-id-123', {});
      expect(result).toEqual(mockResponse);
    });

    test('validates ID for deletion', async () => {
      const result = await testService.delete(null);

      expect(result.success).toBe(false);
      expect(result.error).toBe('ID is required');
    });
  });

  describe('Batch Operations', () => {
    test('creates multiple records with audit fields', async () => {
      const batchData = [
        { name: 'Record 1', status: 'active' },
        { name: 'Record 2', status: 'inactive' }
      ];
      const options = { userId: 'batch-user' };
      const mockResponse = { success: true, data: batchData.map((item, index) => ({ ...item, id: `id-${index}` })) };
      
      supabaseClient.createBatch.mockResolvedValue(mockResponse);

      const result = await testService.createBatch(batchData, options);

      expect(supabaseClient.createBatch).toHaveBeenCalledWith(
        'test_table',
        batchData.map(data => expect.objectContaining({
          ...data,
          created_at: expect.any(String),
          created_by: 'batch-user'
        })),
        options
      );
      expect(result).toEqual(mockResponse);
    });

    test('validates batch data array', async () => {
      const result = await testService.createBatch(null);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid data array provided');
    });

    test('handles empty batch array', async () => {
      const result = await testService.createBatch([]);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid data array provided');
    });

    test('performs upsert batch operations', async () => {
      const upsertData = [
        { id: 'existing-1', name: 'Updated Record 1' },
        { name: 'New Record 2' } // No ID = insert
      ];
      const mockResponse = { success: true, data: upsertData };
      
      supabaseClient.upsertBatch.mockResolvedValue(mockResponse);

      const result = await testService.upsertBatch(upsertData, { userId: 'upsert-user' });

      expect(supabaseClient.upsertBatch).toHaveBeenCalledWith(
        'test_table',
        expect.arrayContaining([
          expect.objectContaining({
            id: 'existing-1',
            name: 'Updated Record 1',
            updated_at: expect.any(String),
            updated_by: 'upsert-user'
          }),
          expect.objectContaining({
            name: 'New Record 2',
            created_at: expect.any(String),
            created_by: 'upsert-user',
            updated_at: expect.any(String),
            updated_by: 'upsert-user'
          })
        ]),
        expect.any(Object)
      );
    });
  });

  describe('Search and Query Operations', () => {
    test('searches records by field value', async () => {
      const mockResponse = { success: true, data: [mockData] };
      supabaseClient.getAll.mockResolvedValue(mockResponse);

      const result = await testService.getByField('status', 'active');

      expect(supabaseClient.getAll).toHaveBeenCalledWith('test_table', {
        filters: [{ column: 'status', value: 'active' }]
      });
      expect(result).toEqual(mockResponse);
    });

    test('validates field search parameters', async () => {
      const result = await testService.getByField(null, 'value');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Field name and value are required');
    });

    test('performs text search across fields', async () => {
      const searchFields = ['name', 'description'];
      const mockResponse = { success: true, data: [mockData] };
      supabaseClient.getAll.mockResolvedValue(mockResponse);

      const result = await testService.search('test query', searchFields);

      expect(supabaseClient.getAll).toHaveBeenCalledWith('test_table', {
        filters: [{ column: 'name', value: '%test query%', operator: 'ilike' }]
      });
      expect(result).toEqual(mockResponse);
    });

    test('validates search parameters', async () => {
      const result = await testService.search('', []);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Search text and fields are required');
    });
  });

  describe('Utility Methods', () => {
    test('counts records with filters', async () => {
      const mockResponse = { success: true, data: [mockData, mockData], count: 2 };
      supabaseClient.getAll.mockResolvedValue(mockResponse);

      const result = await testService.count({ filters: [{ column: 'status', value: 'active' }] });

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ count: 2 });
    });

    test('checks record existence', async () => {
      const mockResponse = { success: true, data: mockData };
      supabaseClient.getById.mockResolvedValue(mockResponse);

      const result = await testService.exists('test-id-123');

      expect(supabaseClient.getById).toHaveBeenCalledWith('test_table', 'test-id-123', { select: 'id' });
      expect(result.success).toBe(true);
      expect(result.data.exists).toBe(true);
    });

    test('validates required fields', () => {
      const data = { name: 'Test', status: 'active' };
      const requiredFields = ['name', 'status', 'missing_field'];

      const result = testService.validateRequired(data, requiredFields);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Missing required fields: missing_field');
    });

    test('passes validation with all required fields', () => {
      const data = { name: 'Test', status: 'active' };
      const requiredFields = ['name', 'status'];

      const result = testService.validateRequired(data, requiredFields);

      expect(result.success).toBe(true);
    });
  });

  describe('Real-time Subscriptions', () => {
    test('creates subscription for table changes', () => {
      const mockCallback = jest.fn();
      const mockSubscription = { unsubscribe: jest.fn() };
      const filters = { status: 'active' };
      
      supabaseClient.createSubscription.mockReturnValue(mockSubscription);

      const result = testService.createSubscription(mockCallback, filters);

      expect(supabaseClient.createSubscription).toHaveBeenCalledWith('test_table', mockCallback, filters);
      expect(result).toEqual(mockSubscription);
    });

    test('handles subscription creation error', () => {
      supabaseClient.createSubscription.mockImplementation(() => {
        throw new Error('Subscription failed');
      });

      const result = testService.createSubscription(jest.fn());

      expect(result).toBeNull();
    });
  });

  describe('Database Function Calls', () => {
    test('calls database function with parameters', async () => {
      const functionName = 'calculate_inventory_summary';
      const params = { customer_id: 'cust-123' };
      const mockResponse = { success: true, data: { total_lots: 50 } };
      
      supabaseClient.callFunction.mockResolvedValue(mockResponse);

      const result = await testService.callFunction(functionName, params);

      expect(supabaseClient.callFunction).toHaveBeenCalledWith(functionName, params, {});
      expect(result).toEqual(mockResponse);
    });

    test('handles function call errors', async () => {
      supabaseClient.callFunction.mockRejectedValue(new Error('Function execution failed'));

      const result = await testService.callFunction('test_function');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Function execution failed');
    });
  });

  describe('Error Handling', () => {
    test('logs errors with service context', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      supabaseClient.getAll.mockRejectedValue(new Error('Database error'));

      await testService.getAll();

      expect(consoleSpy).toHaveBeenCalledWith(
        'BaseService.getAll error for test_table:',
        expect.any(Error)
      );
      
      consoleSpy.mockRestore();
    });

    test('maintains consistent error response format', async () => {
      supabaseClient.create.mockRejectedValue(new Error('Constraint violation'));

      const result = await testService.create({ name: 'Test' });

      expect(result).toEqual({
        success: false,
        error: 'Constraint violation'
      });
    });
  });

  describe('Performance Considerations', () => {
    test('handles large batch operations efficiently', async () => {
      const largeBatch = Array(1000).fill().map((_, i) => ({
        name: `Record ${i}`,
        status: 'active'
      }));

      supabaseClient.createBatch.mockResolvedValue({ success: true, data: largeBatch });

      const startTime = Date.now();
      const result = await testService.createBatch(largeBatch);
      const duration = Date.now() - startTime;

      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });

    test('optimizes query parameters for large datasets', async () => {
      const options = {
        limit: 1000,
        offset: 0,
        select: 'id,name,status',
        orderBy: { column: 'created_at', ascending: false }
      };

      supabaseClient.getAll.mockResolvedValue({ success: true, data: [] });

      await testService.getAll(options);

      expect(supabaseClient.getAll).toHaveBeenCalledWith('test_table', options);
    });
  });
});