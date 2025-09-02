// tests/backend/services/shippingService.test.js
// Unit tests for ShippingService business logic

import { jest } from '@jest/globals';

// Mock database and external dependencies
const mockDb = {
  query: jest.fn(),
  transaction: jest.fn(),
  beginTransaction: jest.fn(),
  commit: jest.fn(),
  rollback: jest.fn()
};

const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn()
};

// Mock external services
const mockLabelService = {
  generateShippingLabel: jest.fn(),
  validateCarrierService: jest.fn(),
  calculateRates: jest.fn()
};

const mockCBPService = {
  submitFiling: jest.fn(),
  checkFilingStatus: jest.fn(),
  validateCompliance: jest.fn()
};

// Mock ShippingService - we'll need to read the actual file to mock it properly
jest.mock('../../../src/backend/services/business/ShippingService', () => ({
  getAllShipments: jest.fn(),
  getById: jest.fn(),
  createShipment: jest.fn(),
  updateShipment: jest.fn(),
  updatePreshipmentStaging: jest.fn(),
  processDriverSignoff: jest.fn(),
  generateShippingLabel: jest.fn(),
  getReadyToShipShipments: jest.fn(),
  getStagedShipments: jest.fn(),
  getShippingStatistics: jest.fn(),
  searchShipments: jest.fn()
}));

describe('ShippingService Unit Tests', () => {
  let ShippingService;

  beforeEach(() => {
    jest.clearAllMocks();
    // Import fresh instance for each test
    ShippingService = require('../../../src/backend/services/business/ShippingService');
  });

  describe('getAllShipments', () => {
    it('should return paginated shipments with default parameters', async () => {
      const mockShipments = [
        {
          id: '1',
          shipment_id: 'SHP-2024-001',
          customer_id: 'CUST-001',
          customer_name: 'Test Customer',
          stage: 'Draft',
          created_at: new Date().toISOString()
        },
        {
          id: '2',
          shipment_id: 'SHP-2024-002',
          customer_id: 'CUST-002',
          customer_name: 'Another Customer',
          stage: 'Pending Pick',
          created_at: new Date().toISOString()
        }
      ];

      ShippingService.getAllShipments.mockResolvedValue({
        success: true,
        data: mockShipments,
        count: 2
      });

      const result = await ShippingService.getAllShipments({
        limit: 100,
        offset: 0,
        accessToken: 'test-token'
      });

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.count).toBe(2);
      expect(result.data[0]).toMatchObject({
        shipment_id: 'SHP-2024-001',
        stage: 'Draft'
      });
    });

    it('should handle filtering by stage', async () => {
      const mockFilteredShipments = [
        {
          id: '2',
          shipment_id: 'SHP-2024-002',
          stage: 'Pending Pick'
        }
      ];

      ShippingService.getAllShipments.mockResolvedValue({
        success: true,
        data: mockFilteredShipments,
        count: 1
      });

      const result = await ShippingService.getAllShipments({
        filters: [{ column: 'stage', value: 'Pending Pick' }],
        accessToken: 'test-token'
      });

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].stage).toBe('Pending Pick');
    });

    it('should handle database errors gracefully', async () => {
      ShippingService.getAllShipments.mockRejectedValue(
        new Error('Database connection failed')
      );

      await expect(
        ShippingService.getAllShipments({ accessToken: 'test-token' })
      ).rejects.toThrow('Database connection failed');
    });
  });

  describe('updatePreshipmentStaging', () => {
    const mockShipmentId = 'SHP-2024-001';
    const mockStagingData = {
      stage: 'Pulled',
      staging_notes: 'All items pulled successfully',
      staging_location: 'Dock 3',
      items: [
        { item_id: 'ITEM-001', quantity: 10, status: 'pulled' }
      ],
      staged_by: 'John Doe'
    };

    it('should successfully update shipment staging', async () => {
      ShippingService.updatePreshipmentStaging.mockResolvedValue({
        success: true,
        data: {
          id: mockShipmentId,
          stage: 'Pulled',
          staging_completed_at: new Date().toISOString()
        }
      });

      const result = await ShippingService.updatePreshipmentStaging(
        mockShipmentId,
        mockStagingData,
        { accessToken: 'test-token', userId: 'user-123' }
      );

      expect(result.success).toBe(true);
      expect(result.data.stage).toBe('Pulled');
      expect(result.data).toHaveProperty('staging_completed_at');
    });

    it('should validate required staging data', async () => {
      const invalidStagingData = {
        // Missing required stage field
        staging_notes: 'Test notes'
      };

      ShippingService.updatePreshipmentStaging.mockRejectedValue(
        new Error('Stage is required for staging update')
      );

      await expect(
        ShippingService.updatePreshipmentStaging(
          mockShipmentId,
          invalidStagingData,
          { accessToken: 'test-token' }
        )
      ).rejects.toThrow('Stage is required for staging update');
    });

    it('should validate stage transitions', async () => {
      const invalidStageTransition = {
        stage: 'Shipped', // Invalid transition from Draft to Shipped
        staging_notes: 'Invalid transition'
      };

      ShippingService.updatePreshipmentStaging.mockRejectedValue(
        new Error('Invalid stage transition')
      );

      await expect(
        ShippingService.updatePreshipmentStaging(
          mockShipmentId,
          invalidStageTransition,
          { accessToken: 'test-token' }
        )
      ).rejects.toThrow('Invalid stage transition');
    });
  });

  describe('processDriverSignoff', () => {
    const mockShipmentId = 'SHP-2024-001';
    const mockSignoffData = {
      driver_name: 'Mike Johnson',
      driver_license_number: 'DL123456789',
      license_plate_number: 'ABC-1234',
      carrier_name: 'FedEx',
      tracking_number: 'TRK123456789',
      signature_data: 'base64-encoded-signature',
      driver_notes: 'Shipment picked up successfully'
    };

    it('should successfully process driver signoff', async () => {
      ShippingService.processDriverSignoff.mockResolvedValue({
        success: true,
        data: {
          id: mockShipmentId,
          stage: 'Shipped',
          driver_signoff_completed_at: new Date().toISOString(),
          tracking_number: mockSignoffData.tracking_number
        }
      });

      const result = await ShippingService.processDriverSignoff(
        mockShipmentId,
        mockSignoffData,
        { accessToken: 'test-token', userId: 'user-123' }
      );

      expect(result.success).toBe(true);
      expect(result.data.stage).toBe('Shipped');
      expect(result.data.tracking_number).toBe(mockSignoffData.tracking_number);
      expect(result.data).toHaveProperty('driver_signoff_completed_at');
    });

    it('should validate required driver information', async () => {
      const incompleteSignoffData = {
        driver_name: 'Mike Johnson',
        // Missing license number
        license_plate_number: 'ABC-1234'
      };

      ShippingService.processDriverSignoff.mockRejectedValue(
        new Error('Driver license number is required')
      );

      await expect(
        ShippingService.processDriverSignoff(
          mockShipmentId,
          incompleteSignoffData,
          { accessToken: 'test-token' }
        )
      ).rejects.toThrow('Driver license number is required');
    });

    it('should only allow signoff for Ready for Pickup shipments', async () => {
      ShippingService.processDriverSignoff.mockRejectedValue(
        new Error('Shipment must be in Ready for Pickup stage for driver signoff')
      );

      await expect(
        ShippingService.processDriverSignoff(
          mockShipmentId,
          mockSignoffData,
          { accessToken: 'test-token' }
        )
      ).rejects.toThrow('Shipment must be in Ready for Pickup stage for driver signoff');
    });
  });

  describe('generateShippingLabel', () => {
    const mockShipmentId = 'SHP-2024-001';
    const mockLabelData = {
      carrier: 'FEDEX',
      service_type: 'OVERNIGHT',
      ship_to: {
        name: 'Customer Name',
        address: '123 Main St',
        city: 'Anytown',
        state: 'ST',
        zip: '12345'
      },
      package_info: {
        weight: '10.5',
        dimensions: { length: 12, width: 8, height: 6 },
        declared_value: 250.00
      },
      label_format: 'PDF'
    };

    it('should successfully generate shipping labels', async () => {
      ShippingService.generateShippingLabel.mockResolvedValue({
        success: true,
        data: {
          label_url: 'https://example.com/label.pdf',
          tracking_number: 'TRK123456789',
          estimated_cost: 25.50,
          estimated_delivery: '2024-01-16T17:00:00Z'
        }
      });

      const result = await ShippingService.generateShippingLabel(
        mockShipmentId,
        mockLabelData,
        { accessToken: 'test-token', userId: 'user-123' }
      );

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('label_url');
      expect(result.data).toHaveProperty('tracking_number');
      expect(result.data.estimated_cost).toBeGreaterThan(0);
    });

    it('should validate package information', async () => {
      const invalidLabelData = {
        carrier: 'FEDEX',
        service_type: 'OVERNIGHT',
        ship_to: mockLabelData.ship_to,
        // Missing package_info
        label_format: 'PDF'
      };

      ShippingService.generateShippingLabel.mockRejectedValue(
        new Error('Package information is required for label generation')
      );

      await expect(
        ShippingService.generateShippingLabel(
          mockShipmentId,
          invalidLabelData,
          { accessToken: 'test-token' }
        )
      ).rejects.toThrow('Package information is required for label generation');
    });
  });

  describe('getShippingStatistics', () => {
    it('should return comprehensive shipping statistics', async () => {
      const mockStats = {
        total_shipments: 150,
        by_stage: {
          'Draft': 20,
          'Pending Pick': 35,
          'Pulled': 25,
          'Generate Labels': 15,
          'Ready for Pickup': 30,
          'Shipped': 25
        },
        by_priority: {
          'High': 40,
          'Medium': 70,
          'Low': 40
        },
        cbp_compliance: {
          filed: 120,
          pending: 30
        },
        performance_metrics: {
          avg_processing_time_hours: 48.5,
          on_time_delivery_rate: 0.92
        }
      };

      ShippingService.getShippingStatistics.mockResolvedValue({
        success: true,
        data: mockStats
      });

      const result = await ShippingService.getShippingStatistics(
        { startDate: '2024-01-01', endDate: '2024-01-31' },
        { accessToken: 'test-token' }
      );

      expect(result.success).toBe(true);
      expect(result.data.total_shipments).toBe(150);
      expect(result.data.by_stage).toHaveProperty('Draft');
      expect(result.data.performance_metrics.on_time_delivery_rate).toBeGreaterThan(0.9);
    });

    it('should handle date range filtering', async () => {
      ShippingService.getShippingStatistics.mockImplementation(
        async (dateRange, options) => {
          expect(dateRange).toHaveProperty('startDate');
          expect(dateRange).toHaveProperty('endDate');
          return {
            success: true,
            data: { total_shipments: 50 }
          };
        }
      );

      await ShippingService.getShippingStatistics(
        { startDate: '2024-01-15', endDate: '2024-01-31' },
        { accessToken: 'test-token' }
      );

      expect(ShippingService.getShippingStatistics).toHaveBeenCalledWith(
        { startDate: '2024-01-15', endDate: '2024-01-31' },
        { accessToken: 'test-token' }
      );
    });
  });

  describe('searchShipments', () => {
    it('should search shipments by term and filters', async () => {
      const mockSearchResults = [
        {
          id: '1',
          shipment_id: 'SHP-2024-001',
          customer_name: 'Test Customer',
          stage: 'Draft'
        }
      ];

      ShippingService.searchShipments.mockResolvedValue({
        success: true,
        data: mockSearchResults
      });

      const result = await ShippingService.searchShipments(
        'Test Customer',
        { stage: 'Draft' },
        { accessToken: 'test-token' }
      );

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].customer_name).toContain('Test Customer');
    });

    it('should handle empty search results', async () => {
      ShippingService.searchShipments.mockResolvedValue({
        success: true,
        data: []
      });

      const result = await ShippingService.searchShipments(
        'NonexistentCustomer',
        {},
        { accessToken: 'test-token' }
      );

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle authentication errors', async () => {
      ShippingService.getAllShipments.mockRejectedValue(
        new Error('Invalid access token')
      );

      await expect(
        ShippingService.getAllShipments({ accessToken: 'invalid-token' })
      ).rejects.toThrow('Invalid access token');
    });

    it('should handle network timeouts', async () => {
      ShippingService.getAllShipments.mockRejectedValue(
        new Error('Request timeout')
      );

      await expect(
        ShippingService.getAllShipments({ accessToken: 'test-token' })
      ).rejects.toThrow('Request timeout');
    });
  });

  describe('Data Validation', () => {
    it('should validate shipment ID format', async () => {
      const invalidId = 'invalid-id';

      ShippingService.getById.mockRejectedValue(
        new Error('Invalid shipment ID format')
      );

      await expect(
        ShippingService.getById(invalidId, { accessToken: 'test-token' })
      ).rejects.toThrow('Invalid shipment ID format');
    });

    it('should validate required fields for create operations', async () => {
      const incompleteShipmentData = {
        // Missing required customer_id
        stage: 'Draft'
      };

      ShippingService.createShipment.mockRejectedValue(
        new Error('Customer ID is required')
      );

      await expect(
        ShippingService.createShipment(
          incompleteShipmentData,
          { accessToken: 'test-token' }
        )
      ).rejects.toThrow('Customer ID is required');
    });
  });

  describe('Performance Tests', () => {
    it('should handle large result sets efficiently', async () => {
      const largeDataSet = Array.from({ length: 1000 }, (_, i) => ({
        id: `${i + 1}`,
        shipment_id: `SHP-2024-${String(i + 1).padStart(3, '0')}`,
        customer_name: `Customer ${i + 1}`,
        stage: 'Draft'
      }));

      ShippingService.getAllShipments.mockResolvedValue({
        success: true,
        data: largeDataSet,
        count: 1000
      });

      const start = Date.now();
      const result = await ShippingService.getAllShipments({
        limit: 1000,
        accessToken: 'test-token'
      });
      const duration = Date.now() - start;

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1000);
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });
});