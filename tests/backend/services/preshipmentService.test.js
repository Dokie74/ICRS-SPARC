// tests/backend/services/preshipmentService.test.js
// Comprehensive unit tests for PreshipmentService with business logic validation

const PreshipmentService = require('../../../src/backend/services/business/PreshipmentService');
const DatabaseService = require('../../../src/backend/db/supabase-client');

// Mock DatabaseService
jest.mock('../../../src/backend/db/supabase-client');

describe('PreshipmentService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validatePreshipment', () => {
    it('should validate required fields', () => {
      const validData = {
        shipmentId: 'SHIP-001',
        type: 'EXPORT',
        customerId: 'CUST-001',
        items: [{ partId: 'PART-001', qty: 100 }]
      };
      
      const result = PreshipmentService.validatePreshipment(validData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject missing shipmentId', () => {
      const invalidData = {
        type: 'EXPORT',
        customerId: 'CUST-001',
        items: []
      };
      
      const result = PreshipmentService.validatePreshipment(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Shipment ID is required');
    });

    it('should reject empty shipmentId', () => {
      const invalidData = {
        shipmentId: '   ',
        type: 'EXPORT',
        customerId: 'CUST-001',
        items: []
      };
      
      const result = PreshipmentService.validatePreshipment(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Shipment ID is required');
    });

    it('should reject missing type', () => {
      const invalidData = {
        shipmentId: 'SHIP-001',
        customerId: 'CUST-001',
        items: []
      };
      
      const result = PreshipmentService.validatePreshipment(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Shipment type is required');
    });

    it('should reject missing customerId', () => {
      const invalidData = {
        shipmentId: 'SHIP-001',
        type: 'EXPORT',
        items: []
      };
      
      const result = PreshipmentService.validatePreshipment(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Customer ID is required');
    });

    it('should reject missing or invalid items array', () => {
      const invalidDataNoItems = {
        shipmentId: 'SHIP-001',
        type: 'EXPORT',
        customerId: 'CUST-001'
      };
      
      const resultNoItems = PreshipmentService.validatePreshipment(invalidDataNoItems);
      expect(resultNoItems.isValid).toBe(false);
      expect(resultNoItems.errors).toContain('Items array is required');

      const invalidDataNonArray = {
        shipmentId: 'SHIP-001',
        type: 'EXPORT',
        customerId: 'CUST-001',
        items: 'not an array'
      };
      
      const resultNonArray = PreshipmentService.validatePreshipment(invalidDataNonArray);
      expect(resultNonArray.isValid).toBe(false);
      expect(resultNonArray.errors).toContain('Items array is required');
    });

    it('should reject tracking number that is too long', () => {
      const invalidData = {
        shipmentId: 'SHIP-001',
        type: 'EXPORT',
        customerId: 'CUST-001',
        items: [],
        tracking_number: 'A'.repeat(101) // 101 characters
      };
      
      const result = PreshipmentService.validatePreshipment(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Tracking number must be 100 characters or less');
    });

    it('should allow valid tracking number', () => {
      const validData = {
        shipmentId: 'SHIP-001',
        type: 'EXPORT',
        customerId: 'CUST-001',
        items: [],
        tracking_number: 'TRACK123456789'
      };
      
      const result = PreshipmentService.validatePreshipment(validData);
      expect(result.isValid).toBe(true);
    });
  });

  describe('sanitizeInput', () => {
    it('should trim whitespace', () => {
      const result = PreshipmentService.sanitizeInput('  test  ');
      expect(result).toBe('test');
    });

    it('should remove angle brackets', () => {
      const result = PreshipmentService.sanitizeInput('<script>alert("xss")</script>');
      expect(result).toBe('scriptalert("xss")/script');
    });

    it('should return non-string values as-is', () => {
      expect(PreshipmentService.sanitizeInput(123)).toBe(123);
      expect(PreshipmentService.sanitizeInput(null)).toBe(null);
      expect(PreshipmentService.sanitizeInput(undefined)).toBe(undefined);
    });
  });

  describe('getAllPreshipments', () => {
    it('should fetch all preshipments with default options', async () => {
      const mockData = [{ id: 1, shipmentId: 'SHIP-001' }];
      DatabaseService.select.mockResolvedValue({ success: true, data: mockData });

      const result = await PreshipmentService.getAllPreshipments();
      
      expect(DatabaseService.select).toHaveBeenCalledWith('preshipments', {
        select: '*',
        orderBy: 'created_at.desc',
        filters: [],
        limit: undefined,
        offset: undefined
      });
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockData);
    });

    it('should handle custom options', async () => {
      const mockData = [];
      DatabaseService.select.mockResolvedValue({ success: true, data: mockData });

      const options = {
        select: 'shipmentId,stage',
        orderBy: { column: 'shipmentId', ascending: true },
        filters: [{ column: 'stage', value: 'Planning' }],
        limit: 10,
        offset: 0
      };

      await PreshipmentService.getAllPreshipments(options);
      
      expect(DatabaseService.select).toHaveBeenCalledWith('preshipments', {
        select: 'shipmentId,stage',
        orderBy: 'shipmentId.asc',
        filters: [{ column: 'stage', value: 'Planning' }],
        limit: 10,
        offset: 0
      });
    });

    it('should handle database errors', async () => {
      const error = new Error('Database connection failed');
      DatabaseService.select.mockRejectedValue(error);

      const result = await PreshipmentService.getAllPreshipments();
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Database connection failed');
    });
  });

  describe('createPreshipment', () => {
    it('should create a valid preshipment', async () => {
      const mockCreatedData = { id: 1, shipmentId: 'SHIP-001', stage: 'Planning' };
      DatabaseService.insert.mockResolvedValue({
        success: true,
        data: [mockCreatedData]
      });

      const preshipmentData = {
        shipmentId: 'SHIP-001',
        type: 'EXPORT',
        customerId: 'CUST-001',
        items: [{ partId: 'PART-001', qty: 100 }]
      };

      const result = await PreshipmentService.createPreshipment(preshipmentData);
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockCreatedData);
      expect(DatabaseService.insert).toHaveBeenCalledWith(
        'preshipments',
        [expect.objectContaining({
          shipmentId: 'SHIP-001',
          type: 'EXPORT',
          customerId: 'CUST-001',
          items: [{ partId: 'PART-001', qty: 100 }],
          stage: 'Planning',
          priority: 'Normal'
        })],
        {}
      );
    });

    it('should reject invalid preshipment data', async () => {
      const invalidData = {
        type: 'EXPORT',
        customerId: 'CUST-001'
      };

      const result = await PreshipmentService.createPreshipment(invalidData);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Validation failed');
      expect(result.validationErrors).toContain('Shipment ID is required');
      expect(result.validationErrors).toContain('Items array is required');
      expect(DatabaseService.insert).not.toHaveBeenCalled();
    });

    it('should handle unique constraint violations', async () => {
      DatabaseService.insert.mockRejectedValue(
        new Error('duplicate key value violates unique constraint')
      );

      const preshipmentData = {
        shipmentId: 'SHIP-001',
        type: 'EXPORT',
        customerId: 'CUST-001',
        items: []
      };

      const result = await PreshipmentService.createPreshipment(preshipmentData);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Shipment ID \'SHIP-001\' already exists');
    });

    it('should sanitize input data', async () => {
      DatabaseService.insert.mockResolvedValue({
        success: true,
        data: [{ id: 1 }]
      });

      const preshipmentData = {
        shipmentId: '  SHIP-001  ',
        type: '<script>EXPORT</script>',
        customerId: 'CUST-001',
        items: [],
        carrier_name: '  Carrier Corp  ',
        notes: '<div>Special instructions</div>'
      };

      await PreshipmentService.createPreshipment(preshipmentData);
      
      expect(DatabaseService.insert).toHaveBeenCalledWith(
        'preshipments',
        [expect.objectContaining({
          shipmentId: 'SHIP-001',
          type: 'scriptEXPORT/script',
          carrier_name: 'Carrier Corp',
          notes: 'divSpecial instructions/div'
        })],
        {}
      );
    });
  });

  describe('finalizeShipment', () => {
    it('should finalize shipment with valid sign-off data', async () => {
      const mockPreshipment = { id: 1, shipmentId: 'SHIP-001', stage: 'Loading' };
      DatabaseService.select.mockResolvedValue({
        success: true,
        data: mockPreshipment
      });
      DatabaseService.update.mockResolvedValue({
        success: true,
        data: { ...mockPreshipment, stage: 'Shipped' }
      });

      const signoffData = {
        driver_name: 'John Doe',
        driver_license_number: 'DL123456',
        license_plate_number: 'ABC-123',
        carrier_name: 'Express Shipping',
        signature_data: 'base64_signature_data'
      };

      const result = await PreshipmentService.finalizeShipment('SHIP-001', signoffData);
      
      expect(result.success).toBe(true);
      expect(DatabaseService.update).toHaveBeenCalledWith(
        'preshipments',
        1,
        expect.objectContaining({
          stage: 'Shipped',
          driver_name: 'John Doe',
          driver_license_number: 'DL123456',
          license_plate_number: 'ABC-123',
          carrier_name: 'Express Shipping',
          signature_data: 'base64_signature_data',
          shipped_at: expect.any(String)
        }),
        {}
      );
    });

    it('should reject incomplete sign-off data', async () => {
      const incompleteSignoffData = {
        driver_name: 'John Doe'
        // Missing license number and plate number
      };

      const result = await PreshipmentService.finalizeShipment('SHIP-001', incompleteSignoffData);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Driver name, license number, and license plate are required');
      expect(DatabaseService.select).not.toHaveBeenCalled();
    });

    it('should handle preshipment not found', async () => {
      DatabaseService.select.mockResolvedValue({
        success: false,
        error: 'Not found'
      });

      const signoffData = {
        driver_name: 'John Doe',
        driver_license_number: 'DL123456',
        license_plate_number: 'ABC-123'
      };

      const result = await PreshipmentService.finalizeShipment('NONEXISTENT', signoffData);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Preshipment not found');
      expect(DatabaseService.update).not.toHaveBeenCalled();
    });
  });

  describe('getPreshipmentsByStage', () => {
    it('should filter preshipments by stage', async () => {
      const mockData = [
        { id: 1, shipmentId: 'SHIP-001', stage: 'Planning' },
        { id: 2, shipmentId: 'SHIP-002', stage: 'Planning' }
      ];
      DatabaseService.select.mockResolvedValue({ success: true, data: mockData });

      const result = await PreshipmentService.getPreshipmentsByStage('Planning');
      
      expect(DatabaseService.select).toHaveBeenCalledWith('preshipments', {
        filters: [{ column: 'stage', value: 'Planning' }],
        orderBy: 'created_at.desc'
      });
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockData);
    });
  });

  describe('getInProgressPreshipments', () => {
    it('should fetch preshipments from all in-progress stages', async () => {
      const mockPlanningData = [{ id: 1, stage: 'Planning' }];
      const mockPickingData = [{ id: 2, stage: 'Picking' }];
      const mockPackingData = [{ id: 3, stage: 'Packing' }];
      const mockLoadingData = [{ id: 4, stage: 'Loading' }];

      // Mock multiple calls to getPreshipmentsByStage
      DatabaseService.select
        .mockResolvedValueOnce({ success: true, data: mockPlanningData })
        .mockResolvedValueOnce({ success: true, data: mockPickingData })
        .mockResolvedValueOnce({ success: true, data: mockPackingData })
        .mockResolvedValueOnce({ success: true, data: mockLoadingData });

      const result = await PreshipmentService.getInProgressPreshipments();
      
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(4);
      expect(DatabaseService.select).toHaveBeenCalledTimes(4);
    });

    it('should handle partial failures gracefully', async () => {
      // First call succeeds, second fails, third succeeds, fourth succeeds
      DatabaseService.select
        .mockResolvedValueOnce({ success: true, data: [{ id: 1 }] })
        .mockResolvedValueOnce({ success: false, error: 'Database error' })
        .mockResolvedValueOnce({ success: true, data: [{ id: 3 }] })
        .mockResolvedValueOnce({ success: true, data: [{ id: 4 }] });

      const result = await PreshipmentService.getInProgressPreshipments();
      
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(3); // Only successful results
    });
  });

  describe('searchPreshipments', () => {
    it('should search preshipments by term and filters', async () => {
      const mockData = [
        { id: 1, shipmentId: 'SHIP-001', stage: 'Planning', carrier_name: 'FedEx' },
        { id: 2, shipmentId: 'SHIP-002', stage: 'Planning', carrier_name: 'UPS' },
        { id: 3, shipmentId: 'TEST-001', stage: 'Shipped', carrier_name: 'FedEx' }
      ];
      DatabaseService.select.mockResolvedValue({ success: true, data: mockData });

      const filters = { stage: 'Planning' };
      const result = await PreshipmentService.searchPreshipments('SHIP', filters);
      
      expect(DatabaseService.select).toHaveBeenCalledWith('preshipments', {
        filters: [{ column: 'stage', value: 'Planning' }],
        orderBy: 'created_at.desc'
      });
      
      expect(result.success).toBe(true);
      // Should filter client-side for search term
      expect(result.data).toHaveLength(2);
      expect(result.data.every(p => p.shipmentId.includes('SHIP'))).toBe(true);
    });

    it('should search across multiple fields', async () => {
      const mockData = [
        { id: 1, shipmentId: 'SHIP-001', entryNumber: 'ENT-123', tracking_number: null, carrier_name: null },
        { id: 2, shipmentId: 'SHIP-002', entryNumber: null, tracking_number: 'TRACK-123', carrier_name: null },
        { id: 3, shipmentId: 'SHIP-003', entryNumber: null, tracking_number: null, carrier_name: 'CARRIER-123' }
      ];
      DatabaseService.select.mockResolvedValue({ success: true, data: mockData });

      const result = await PreshipmentService.searchPreshipments('123');
      
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(3); // All contain '123' in different fields
    });
  });

  describe('getPreshipmentStats', () => {
    it('should calculate comprehensive statistics', async () => {
      const mockData = [
        { id: 1, stage: 'Planning', type: 'EXPORT', customerId: 'CUST-001', created_at: '2024-01-01' },
        { id: 2, stage: 'Shipped', type: 'EXPORT', customerId: 'CUST-001', created_at: '2024-01-02' },
        { id: 3, stage: 'Planning', type: 'IMPORT', customerId: 'CUST-002', created_at: '2024-01-03' }
      ];
      DatabaseService.select.mockResolvedValue({ success: true, data: mockData });

      const result = await PreshipmentService.getPreshipmentStats();
      
      expect(result.success).toBe(true);
      expect(result.data.total).toBe(3);
      expect(result.data.by_stage).toEqual({
        'Planning': 2,
        'Shipped': 1
      });
      expect(result.data.by_type).toEqual({
        'EXPORT': 2,
        'IMPORT': 1
      });
      expect(result.data.by_customer).toEqual({
        'CUST-001': 2,
        'CUST-002': 1
      });
      expect(result.data.shipped_count).toBe(1);
    });

    it('should filter statistics by date range', async () => {
      const mockData = [
        { id: 1, stage: 'Planning', created_at: '2024-01-01T10:00:00Z' },
        { id: 2, stage: 'Shipped', created_at: '2024-01-15T10:00:00Z' },
        { id: 3, stage: 'Planning', created_at: '2024-01-30T10:00:00Z' }
      ];
      DatabaseService.select.mockResolvedValue({ success: true, data: mockData });

      const dateRange = {
        startDate: '2024-01-10',
        endDate: '2024-01-20'
      };
      
      const result = await PreshipmentService.getPreshipmentStats(dateRange);
      
      expect(result.success).toBe(true);
      expect(result.data.total).toBe(1); // Only one record in date range
    });
  });
});
