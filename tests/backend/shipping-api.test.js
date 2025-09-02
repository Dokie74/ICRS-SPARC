// tests/backend/shipping-api.test.js
// Comprehensive tests for shipping API endpoints and ShippingService
// Tests preshipment staging workflow, driver signoff, and label generation

const request = require('supertest');
const { describe, it, expect, beforeAll, afterAll, beforeEach } = require('@jest/globals');

// Mock the Express app and services
const app = require('../../src/backend/api/index');
const ShippingService = require('../../src/backend/services/business/ShippingService');

// Test data and configuration
const TEST_SHIPMENT_ID = 'SHP-TEST-001';
const TEST_USER_ID = '550e8400-e29b-41d4-a716-446655440000';
const AUTH_TOKEN = 'demo-token-for-testing-only-shipping';

describe('Shipping API Tests', () => {
  beforeAll(async () => {
    // Setup test environment
    process.env.NODE_ENV = 'test';
  });

  afterAll(async () => {
    // Cleanup after tests
  });

  describe('GET /api/shipping', () => {
    it('should fetch all shipments with default pagination', async () => {
      const response = await request(app)
        .get('/api/shipping')
        .set('Authorization', `Bearer ${AUTH_TOKEN}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.pagination).toHaveProperty('limit', 100);
      expect(response.body.pagination).toHaveProperty('offset', 0);
    });

    it('should filter shipments by stage', async () => {
      const response = await request(app)
        .get('/api/shipping?stage=Ready to Ship')
        .set('Authorization', `Bearer ${AUTH_TOKEN}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      if (response.body.data.length > 0) {
        response.body.data.forEach(shipment => {
          expect(shipment.stage).toBe('Ready to Ship');
        });
      }
    });

    it('should filter shipments by customer', async () => {
      const response = await request(app)
        .get('/api/shipping?customer_id=CUST-001')
        .set('Authorization', `Bearer ${AUTH_TOKEN}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      if (response.body.data.length > 0) {
        response.body.data.forEach(shipment => {
          expect(shipment.customer_id).toBe('CUST-001');
        });
      }
    });

    it('should apply pagination correctly', async () => {
      const response = await request(app)
        .get('/api/shipping?limit=5&offset=0')
        .set('Authorization', `Bearer ${AUTH_TOKEN}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeLessThanOrEqual(5);
      expect(response.body.pagination.limit).toBe(5);
    });

    it('should require authentication', async () => {
      await request(app)
        .get('/api/shipping')
        .expect(401);
    });
  });

  describe('GET /api/shipping/:id', () => {
    it('should fetch shipment by ID', async () => {
      // This would work with real database data
      const response = await request(app)
        .get(`/api/shipping/${TEST_SHIPMENT_ID}`)
        .set('Authorization', `Bearer ${AUTH_TOKEN}`)
        .expect(200);

      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('data');
    });

    it('should return 404 for non-existent shipment', async () => {
      const response = await request(app)
        .get('/api/shipping/NON-EXISTENT-ID')
        .set('Authorization', `Bearer ${AUTH_TOKEN}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('not found');
    });
  });

  describe('GET /api/shipping/stage/:stage', () => {
    it('should fetch shipments by stage', async () => {
      const response = await request(app)
        .get('/api/shipping/stage/Ready to Ship')
        .set('Authorization', `Bearer ${AUTH_TOKEN}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('stage', 'Ready to Ship');
    });

    it('should handle empty results for stage', async () => {
      const response = await request(app)
        .get('/api/shipping/stage/NonExistentStage')
        .set('Authorization', `Bearer ${AUTH_TOKEN}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('PUT /api/shipping/:id/staging', () => {
    it('should update shipment stage successfully', async () => {
      const stagingData = {
        stage: 'Picking',
        staging_notes: 'Items picked successfully',
        staging_location: 'DOCK-A'
      };

      const response = await request(app)
        .put(`/api/shipping/${TEST_SHIPMENT_ID}/staging`)
        .set('Authorization', `Bearer ${AUTH_TOKEN}`)
        .send(stagingData)
        .expect(200);

      expect(response.body).toHaveProperty('success');
    });

    it('should validate required stage field', async () => {
      const response = await request(app)
        .put(`/api/shipping/${TEST_SHIPMENT_ID}/staging`)
        .set('Authorization', `Bearer ${AUTH_TOKEN}`)
        .send({ staging_notes: 'Missing stage' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid stage');
    });

    it('should validate stage values', async () => {
      const response = await request(app)
        .put(`/api/shipping/${TEST_SHIPMENT_ID}/staging`)
        .set('Authorization', `Bearer ${AUTH_TOKEN}`)
        .send({ stage: 'InvalidStage' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid stage');
    });

    it('should require staff authorization', async () => {
      await request(app)
        .put(`/api/shipping/${TEST_SHIPMENT_ID}/staging`)
        .send({ stage: 'Picking' })
        .expect(401);
    });
  });

  describe('POST /api/shipping/:id/signoff', () => {
    it('should process driver signoff successfully', async () => {
      const signoffData = {
        driver_name: 'John Smith',
        driver_license_number: 'DL123456789',
        license_plate_number: 'ABC-1234',
        carrier_name: 'FedEx',
        signature_data: {
          image: 'base64signaturedata',
          method: 'digital'
        }
      };

      const response = await request(app)
        .post(`/api/shipping/${TEST_SHIPMENT_ID}/signoff`)
        .set('Authorization', `Bearer ${AUTH_TOKEN}`)
        .send(signoffData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('message');
      expect(response.body.data.message).toContain('successfully signed off');
    });

    it('should validate required signoff fields', async () => {
      const incompleteData = {
        driver_name: 'John Smith'
        // Missing license numbers
      };

      const response = await request(app)
        .post(`/api/shipping/${TEST_SHIPMENT_ID}/signoff`)
        .set('Authorization', `Bearer ${AUTH_TOKEN}`)
        .send(incompleteData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Missing required fields');
    });

    it('should require staff authorization', async () => {
      await request(app)
        .post(`/api/shipping/${TEST_SHIPMENT_ID}/signoff`)
        .send({
          driver_name: 'John Smith',
          driver_license_number: 'DL123456789',
          license_plate_number: 'ABC-1234'
        })
        .expect(401);
    });
  });

  describe('POST /api/shipping/:id/label', () => {
    it('should generate shipping label successfully', async () => {
      const labelData = {
        carrier: 'FEDEX',
        service_type: 'GROUND',
        ship_to: {
          company: 'Test Company',
          address: '123 Test St',
          city: 'Test City',
          state: 'FL',
          zip: '12345',
          country: 'US'
        },
        package_info: {
          weight: 5,
          length: 12,
          width: 12,
          height: 8
        }
      };

      const response = await request(app)
        .post(`/api/shipping/${TEST_SHIPMENT_ID}/label`)
        .set('Authorization', `Bearer ${AUTH_TOKEN}`)
        .send(labelData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('tracking_number');
      expect(response.body.data).toHaveProperty('label_id');
      expect(response.body.data.print_ready).toBe(true);
    });

    it('should require staff authorization', async () => {
      await request(app)
        .post(`/api/shipping/${TEST_SHIPMENT_ID}/label`)
        .send({ carrier: 'FEDEX' })
        .expect(401);
    });
  });

  describe('GET /api/shipping/workflow/ready-to-ship', () => {
    it('should fetch ready-to-ship shipments', async () => {
      const response = await request(app)
        .get('/api/shipping/workflow/ready-to-ship')
        .set('Authorization', `Bearer ${AUTH_TOKEN}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('GET /api/shipping/workflow/staged', () => {
    it('should fetch staged shipments', async () => {
      const response = await request(app)
        .get('/api/shipping/workflow/staged')
        .set('Authorization', `Bearer ${AUTH_TOKEN}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('POST /api/shipping/search', () => {
    it('should search shipments with text term', async () => {
      const searchData = {
        search_term: 'SHP',
        filters: {},
        limit: 50
      };

      const response = await request(app)
        .post('/api/shipping/search')
        .set('Authorization', `Bearer ${AUTH_TOKEN}`)
        .send(searchData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body).toHaveProperty('search_term', 'SHP');
    });

    it('should search shipments with filters', async () => {
      const searchData = {
        search_term: '',
        filters: {
          stage: 'Ready to Ship',
          carrier: 'FedEx'
        },
        limit: 25
      };

      const response = await request(app)
        .post('/api/shipping/search')
        .set('Authorization', `Bearer ${AUTH_TOKEN}`)
        .send(searchData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty('filters');
    });
  });

  describe('GET /api/shipping/reports/statistics', () => {
    it('should fetch shipping statistics', async () => {
      const response = await request(app)
        .get('/api/shipping/reports/statistics')
        .set('Authorization', `Bearer ${AUTH_TOKEN}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty('data');
      expect(typeof response.body.data).toBe('object');
    });

    it('should apply date range filter', async () => {
      const response = await request(app)
        .get('/api/shipping/reports/statistics?start_date=2024-01-01&end_date=2024-01-31')
        .set('Authorization', `Bearer ${AUTH_TOKEN}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty('date_range');
      expect(response.body.date_range.startDate).toBe('2024-01-01');
    });

    it('should require manager authorization', async () => {
      // Test with lower privilege token (would need different mock setup)
      await request(app)
        .get('/api/shipping/reports/statistics')
        .expect(401);
    });
  });

  describe('GET /api/shipping/reference/stages', () => {
    it('should fetch available stages', async () => {
      const response = await request(app)
        .get('/api/shipping/reference/stages')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      
      // Verify stage structure
      response.body.data.forEach(stage => {
        expect(stage).toHaveProperty('value');
        expect(stage).toHaveProperty('label');
        expect(stage).toHaveProperty('description');
      });
    });
  });

  describe('GET /api/shipping/reference/carriers', () => {
    it('should fetch available carriers', async () => {
      const response = await request(app)
        .get('/api/shipping/reference/carriers')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      
      // Verify carrier structure
      response.body.data.forEach(carrier => {
        expect(carrier).toHaveProperty('value');
        expect(carrier).toHaveProperty('label');
        expect(carrier).toHaveProperty('services');
        expect(Array.isArray(carrier.services)).toBe(true);
      });
    });
  });
});

// ShippingService Unit Tests
describe('ShippingService Tests', () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
  });

  describe('validatePreshipmentStaging', () => {
    it('should validate staging data successfully', () => {
      const validData = {
        shipmentId: 'SHP-001',
        stage: 'Picking',
        items: [{ part_id: 'PART-001', quantity: 10 }]
      };

      const result = ShippingService.validatePreshipmentStaging(validData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing required fields', () => {
      const invalidData = {
        stage: 'Picking'
        // Missing shipmentId and items
      };

      const result = ShippingService.validatePreshipmentStaging(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors).toContain('Shipment ID is required');
      expect(result.errors).toContain('Items array is required');
    });

    it('should validate stage values', () => {
      const invalidData = {
        shipmentId: 'SHP-001',
        stage: 'InvalidStage',
        items: []
      };

      const result = ShippingService.validatePreshipmentStaging(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('Invalid stage'))).toBe(true);
    });
  });

  describe('validateDriverSignoff', () => {
    it('should validate signoff data successfully', () => {
      const validData = {
        driver_name: 'John Smith',
        driver_license_number: 'DL123456789',
        license_plate_number: 'ABC-1234'
      };

      const result = ShippingService.validateDriverSignoff(validData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing required fields', () => {
      const invalidData = {
        driver_name: 'John Smith'
        // Missing license numbers
      };

      const result = ShippingService.validateDriverSignoff(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Driver license number is required');
      expect(result.errors).toContain('License plate number is required');
    });
  });

  describe('generateTrackingNumber', () => {
    it('should generate valid tracking number format', () => {
      const trackingNumber = ShippingService.generateTrackingNumber();
      
      expect(typeof trackingNumber).toBe('string');
      expect(trackingNumber).toMatch(/^TRK\d{6}[A-Z0-9]{6}$/);
      expect(trackingNumber.length).toBe(15); // TRK + 6 digits + 6 alphanumeric
    });

    it('should generate unique tracking numbers', () => {
      const trackingNumber1 = ShippingService.generateTrackingNumber();
      const trackingNumber2 = ShippingService.generateTrackingNumber();
      
      expect(trackingNumber1).not.toBe(trackingNumber2);
    });
  });

  describe('sanitizeInput', () => {
    it('should sanitize dangerous characters', () => {
      const dangerousInput = '<script>alert("xss")</script>';
      const sanitized = ShippingService.sanitizeInput(dangerousInput);
      
      expect(sanitized).not.toContain('<');
      expect(sanitized).not.toContain('>');
      expect(sanitized).toBe('script>alert("xss")/script>');
    });

    it('should handle non-string inputs', () => {
      expect(ShippingService.sanitizeInput(123)).toBe(123);
      expect(ShippingService.sanitizeInput(null)).toBe(null);
      expect(ShippingService.sanitizeInput(undefined)).toBe(undefined);
    });

    it('should trim whitespace', () => {
      const input = '  test string  ';
      const sanitized = ShippingService.sanitizeInput(input);
      
      expect(sanitized).toBe('test string');
    });
  });
});

// Integration tests would go here for actual database operations
describe('ShippingService Integration Tests', () => {
  // These would require actual database setup and cleanup
  it.skip('should update preshipment staging in database', async () => {
    // Mock database calls and test actual integration
  });

  it.skip('should process driver signoff with inventory updates', async () => {
    // Test full workflow including inventory lot updates
  });

  it.skip('should generate and store shipping labels', async () => {
    // Test label generation and database storage
  });
});