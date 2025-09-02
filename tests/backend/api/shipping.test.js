// tests/backend/api/shipping.test.js
// Integration tests for shipping/preshipment API endpoints

const request = require('supertest');
const app = require('../../../src/backend/api/index');
const PreshipmentService = require('../../../src/backend/services/business/PreshipmentService');

// Mock the service
jest.mock('../../../src/backend/services/business/PreshipmentService');

describe('Shipping API Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/preshipments', () => {
    it('should return all preshipments', async () => {
      const mockPreshipments = [
        { id: 1, shipmentId: 'SHIP-001', stage: 'Planning' },
        { id: 2, shipmentId: 'SHIP-002', stage: 'Ready to Ship' }
      ];
      
      PreshipmentService.getAllPreshipments.mockResolvedValue({
        success: true,
        data: mockPreshipments
      });

      const response = await request(app)
        .get('/api/preshipments')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        preshipments: mockPreshipments
      });
      expect(PreshipmentService.getAllPreshipments).toHaveBeenCalledWith({});
    });

    it('should handle query parameters', async () => {
      PreshipmentService.getAllPreshipments.mockResolvedValue({
        success: true,
        data: []
      });

      await request(app)
        .get('/api/preshipments?stage=Planning&limit=10&offset=0')
        .expect(200);

      expect(PreshipmentService.getAllPreshipments).toHaveBeenCalledWith({
        filters: [{ column: 'stage', value: 'Planning' }],
        limit: 10,
        offset: 0
      });
    });

    it('should handle service errors', async () => {
      PreshipmentService.getAllPreshipments.mockResolvedValue({
        success: false,
        error: 'Database connection failed'
      });

      const response = await request(app)
        .get('/api/preshipments')
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        error: 'Database connection failed'
      });
    });

    it('should handle service exceptions', async () => {
      PreshipmentService.getAllPreshipments.mockRejectedValue(
        new Error('Unexpected error')
      );

      const response = await request(app)
        .get('/api/preshipments')
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        error: 'Internal server error'
      });
    });
  });

  describe('GET /api/preshipments/:shipmentId', () => {
    it('should return specific preshipment', async () => {
      const mockPreshipment = { id: 1, shipmentId: 'SHIP-001', stage: 'Planning' };
      
      PreshipmentService.getPreshipmentById.mockResolvedValue({
        success: true,
        data: mockPreshipment
      });

      const response = await request(app)
        .get('/api/preshipments/SHIP-001')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        preshipment: mockPreshipment
      });
      expect(PreshipmentService.getPreshipmentById).toHaveBeenCalledWith('SHIP-001', {});
    });

    it('should handle preshipment not found', async () => {
      PreshipmentService.getPreshipmentById.mockResolvedValue({
        success: false,
        error: 'Preshipment not found'
      });

      const response = await request(app)
        .get('/api/preshipments/NONEXISTENT')
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        error: 'Preshipment not found'
      });
    });
  });

  describe('POST /api/preshipments', () => {
    it('should create new preshipment', async () => {
      const newPreshipment = {
        shipmentId: 'SHIP-003',
        type: 'EXPORT',
        customerId: 'CUST-001',
        items: [{ partId: 'PART-001', qty: 100 }]
      };

      const mockCreatedPreshipment = { id: 3, ...newPreshipment, stage: 'Planning' };
      
      PreshipmentService.createPreshipment.mockResolvedValue({
        success: true,
        data: mockCreatedPreshipment
      });

      const response = await request(app)
        .post('/api/preshipments')
        .send(newPreshipment)
        .expect(201);

      expect(response.body).toEqual({
        success: true,
        preshipment: mockCreatedPreshipment
      });
      expect(PreshipmentService.createPreshipment).toHaveBeenCalledWith(newPreshipment, {});
    });

    it('should handle validation errors', async () => {
      const invalidPreshipment = {
        type: 'EXPORT',
        customerId: 'CUST-001'
        // Missing required shipmentId and items
      };

      PreshipmentService.createPreshipment.mockResolvedValue({
        success: false,
        error: 'Validation failed',
        validationErrors: ['Shipment ID is required', 'Items array is required']
      });

      const response = await request(app)
        .post('/api/preshipments')
        .send(invalidPreshipment)
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Validation failed',
        validationErrors: ['Shipment ID is required', 'Items array is required']
      });
    });

    it('should handle duplicate shipment ID', async () => {
      const duplicatePreshipment = {
        shipmentId: 'SHIP-001',
        type: 'EXPORT',
        customerId: 'CUST-001',
        items: []
      };

      PreshipmentService.createPreshipment.mockResolvedValue({
        success: false,
        error: 'Shipment ID \'SHIP-001\' already exists'
      });

      const response = await request(app)
        .post('/api/preshipments')
        .send(duplicatePreshipment)
        .expect(409);

      expect(response.body.error).toContain('already exists');
    });
  });

  describe('PUT /api/preshipments/:shipmentId/stage', () => {
    it('should update preshipment stage', async () => {
      const updatedPreshipment = { id: 1, shipmentId: 'SHIP-001', stage: 'Picking' };
      
      PreshipmentService.updatePreshipmentStage.mockResolvedValue({
        success: true,
        data: updatedPreshipment
      });

      const response = await request(app)
        .put('/api/preshipments/SHIP-001/stage')
        .send({ stage: 'Picking' })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        preshipment: updatedPreshipment
      });
      expect(PreshipmentService.updatePreshipmentStage).toHaveBeenCalledWith(
        'SHIP-001',
        'Picking',
        {}
      );
    });

    it('should validate stage parameter', async () => {
      const response = await request(app)
        .put('/api/preshipments/SHIP-001/stage')
        .send({}) // Missing stage
        .expect(400);

      expect(response.body.error).toContain('Stage is required');
      expect(PreshipmentService.updatePreshipmentStage).not.toHaveBeenCalled();
    });
  });

  describe('PUT /api/preshipments/:shipmentId/finalize', () => {
    it('should finalize shipment with driver sign-off', async () => {
      const signoffData = {
        driver_name: 'John Doe',
        driver_license_number: 'DL123456',
        license_plate_number: 'ABC-123',
        carrier_name: 'Express Shipping',
        signature_data: 'base64_signature_data'
      };

      const finalizedPreshipment = { 
        id: 1, 
        shipmentId: 'SHIP-001', 
        stage: 'Shipped',
        shipped_at: '2024-01-01T10:00:00Z'
      };
      
      PreshipmentService.finalizeShipment.mockResolvedValue({
        success: true,
        data: finalizedPreshipment
      });

      const response = await request(app)
        .put('/api/preshipments/SHIP-001/finalize')
        .send(signoffData)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        preshipment: finalizedPreshipment
      });
      expect(PreshipmentService.finalizeShipment).toHaveBeenCalledWith(
        'SHIP-001',
        signoffData,
        {}
      );
    });

    it('should validate required driver information', async () => {
      const incompleteSignoffData = {
        driver_name: 'John Doe'
        // Missing license number and plate number
      };

      PreshipmentService.finalizeShipment.mockResolvedValue({
        success: false,
        error: 'Driver name, license number, and license plate are required'
      });

      const response = await request(app)
        .put('/api/preshipments/SHIP-001/finalize')
        .send(incompleteSignoffData)
        .expect(400);

      expect(response.body.error).toContain('required');
    });
  });

  describe('GET /api/preshipments/stage/:stage', () => {
    it('should return preshipments by stage', async () => {
      const mockPreshipments = [
        { id: 1, shipmentId: 'SHIP-001', stage: 'Ready to Ship' },
        { id: 2, shipmentId: 'SHIP-002', stage: 'Ready to Ship' }
      ];
      
      PreshipmentService.getPreshipmentsByStage.mockResolvedValue({
        success: true,
        data: mockPreshipments
      });

      const response = await request(app)
        .get('/api/preshipments/stage/Ready%20to%20Ship')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        preshipments: mockPreshipments
      });
      expect(PreshipmentService.getPreshipmentsByStage).toHaveBeenCalledWith(
        'Ready to Ship',
        {}
      );
    });
  });

  describe('GET /api/preshipments/search', () => {
    it('should search preshipments', async () => {
      const mockResults = [
        { id: 1, shipmentId: 'SHIP-001', carrier_name: 'FedEx' }
      ];
      
      PreshipmentService.searchPreshipments.mockResolvedValue({
        success: true,
        data: mockResults
      });

      const response = await request(app)
        .get('/api/preshipments/search?q=FedEx&stage=Planning')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        preshipments: mockResults
      });
      expect(PreshipmentService.searchPreshipments).toHaveBeenCalledWith(
        'FedEx',
        { stage: 'Planning' },
        {}
      );
    });

    it('should require search query', async () => {
      const response = await request(app)
        .get('/api/preshipments/search')
        .expect(400);

      expect(response.body.error).toContain('Search query is required');
      expect(PreshipmentService.searchPreshipments).not.toHaveBeenCalled();
    });
  });

  describe('GET /api/preshipments/stats', () => {
    it('should return preshipment statistics', async () => {
      const mockStats = {
        total: 10,
        by_stage: { 'Planning': 3, 'Shipped': 7 },
        by_type: { 'EXPORT': 8, 'IMPORT': 2 },
        shipped_count: 7
      };
      
      PreshipmentService.getPreshipmentStats.mockResolvedValue({
        success: true,
        data: mockStats
      });

      const response = await request(app)
        .get('/api/preshipments/stats')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        stats: mockStats
      });
      expect(PreshipmentService.getPreshipmentStats).toHaveBeenCalledWith({}, {});
    });

    it('should handle date range parameters', async () => {
      PreshipmentService.getPreshipmentStats.mockResolvedValue({
        success: true,
        data: {}
      });

      await request(app)
        .get('/api/preshipments/stats?startDate=2024-01-01&endDate=2024-01-31')
        .expect(200);

      expect(PreshipmentService.getPreshipmentStats).toHaveBeenCalledWith(
        { startDate: '2024-01-01', endDate: '2024-01-31' },
        {}
      );
    });
  });

  describe('Authentication and Authorization', () => {
    it('should require authentication for protected endpoints', async () => {
      // Mock authentication middleware failure
      const response = await request(app)
        .post('/api/preshipments')
        .send({})
        .expect(401);

      expect(response.body.error).toMatch(/unauthorized|authentication/i);
    });

    it('should check user permissions for admin operations', async () => {
      // Test finalize operation which may require special permissions
      const response = await request(app)
        .put('/api/preshipments/SHIP-001/finalize')
        .send({
          driver_name: 'John Doe',
          driver_license_number: 'DL123456',
          license_plate_number: 'ABC-123'
        })
        .expect(403); // Forbidden if user lacks permission

      expect(response.body.error).toMatch(/forbidden|permission/i);
    });
  });

  describe('Input Validation and Sanitization', () => {
    it('should sanitize shipment ID parameters', async () => {
      PreshipmentService.getPreshipmentById.mockResolvedValue({
        success: false,
        error: 'Not found'
      });

      // Test with potentially malicious input
      await request(app)
        .get('/api/preshipments/<script>alert("xss")</script>')
        .expect(404);

      // Verify the service was called with sanitized input
      expect(PreshipmentService.getPreshipmentById).toHaveBeenCalledWith(
        expect.not.stringMatching(/<script>/),
        {}
      );
    });

    it('should validate and sanitize request body', async () => {
      const maliciousData = {
        shipmentId: '<script>alert("xss")</script>',
        type: 'EXPORT',
        customerId: 'CUST-001',
        items: [],
        notes: '<img src=x onerror=alert("xss")>'
      };

      PreshipmentService.createPreshipment.mockResolvedValue({
        success: true,
        data: { id: 1 }
      });

      await request(app)
        .post('/api/preshipments')
        .send(maliciousData)
        .expect(201);

      // Verify service was called with sanitized data
      const calledWith = PreshipmentService.createPreshipment.mock.calls[0][0];
      expect(calledWith.shipmentId).not.toMatch(/<script>/);
      expect(calledWith.notes).not.toMatch(/<img/);
    });
  });

  describe('Performance and Rate Limiting', () => {
    it('should handle concurrent requests gracefully', async () => {
      PreshipmentService.getAllPreshipments.mockResolvedValue({
        success: true,
        data: []
      });

      // Send multiple concurrent requests
      const requests = Array(10).fill().map(() =>
        request(app).get('/api/preshipments')
      );

      const responses = await Promise.all(requests);
      
      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });

    it('should implement rate limiting for sensitive operations', async () => {
      // Simulate rapid creation attempts
      const createRequests = Array(20).fill().map((_, i) =>
        request(app)
          .post('/api/preshipments')
          .send({
            shipmentId: `SHIP-${i}`,
            type: 'EXPORT',
            customerId: 'CUST-001',
            items: []
          })
      );

      const responses = await Promise.allSettled(createRequests);
      
      // Some requests should be rate limited
      const rateLimited = responses.filter(r => 
        r.status === 'fulfilled' && r.value.status === 429
      );
      
      expect(rateLimited.length).toBeGreaterThan(0);
    });
  });
});