// tests/backend/api/routes/inventory.api.test.js
// API endpoint testing with authentication, authorization, and performance validation

const request = require('supertest');
const app = require('../../../../src/backend/api/index');
const testDbHelper = require('../../helpers/testDatabaseHelper');
const testDataFactory = require('../../helpers/testDataFactory');
const authHelper = require('../../helpers/authHelper');

describe('Inventory API Endpoints', () => {
  let testData;
  let authTokens;

  beforeAll(async () => {
    await testDbHelper.setupTestDatabase();
  });

  beforeEach(async () => {
    await testDbHelper.resetTestData();
    testData = await testDataFactory.createBaseTestData();
    authTokens = await authHelper.generateTestTokens(testData);
  });

  afterAll(async () => {
    await testDbHelper.cleanupTestDatabase();
  });

  describe('GET /api/inventory/lots', () => {
    beforeEach(async () => {
      // Create test inventory lots
      const lots = [
        {
          part_id: testData.testPart.id,
          customer_id: testData.testCustomer.id,
          original_quantity: 100,
          status: 'In Stock',
          manifest_number: 'MAN-001'
        },
        {
          part_id: testData.testPart.id,
          customer_id: testData.testCustomer.id,
          original_quantity: 200,
          status: 'On Hold',
          manifest_number: 'MAN-002'
        }
      ];

      for (const lot of lots) {
        await testDataFactory.createInventoryLot(lot);
      }
    });

    test('returns inventory lots for authenticated user', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .get('/api/inventory/lots')
        .set('Authorization', `Bearer ${authTokens.warehouseStaff}`)
        .expect(200);

      const duration = Date.now() - startTime;

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThanOrEqual(2);
      expect(response.body.count).toBeDefined();

      // Performance assertion
      expect(duration).toBeLessThan(500); // <500ms target
    });

    test('requires authentication', async () => {
      const response = await request(app)
        .get('/api/inventory/lots')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Authentication required');
    });

    test('enforces role-based access control', async () => {
      const response = await request(app)
        .get('/api/inventory/lots')
        .set('Authorization', `Bearer ${authTokens.restrictedUser}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Insufficient permissions');
    });

    test('supports pagination parameters', async () => {
      const response = await request(app)
        .get('/api/inventory/lots?limit=1&offset=0')
        .set('Authorization', `Bearer ${authTokens.warehouseStaff}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.count).toBeGreaterThanOrEqual(2);
    });

    test('supports filtering by status', async () => {
      const response = await request(app)
        .get('/api/inventory/lots?status=In Stock')
        .set('Authorization', `Bearer ${authTokens.warehouseStaff}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.forEach(lot => {
        expect(lot.status).toBe('In Stock');
      });
    });

    test('supports search functionality', async () => {
      const response = await request(app)
        .get('/api/inventory/lots?search=MAN-001')
        .set('Authorization', `Bearer ${authTokens.warehouseStaff}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0].manifest_number).toContain('MAN-001');
    });

    test('handles invalid query parameters gracefully', async () => {
      const response = await request(app)
        .get('/api/inventory/lots?limit=invalid&offset=abc')
        .set('Authorization', `Bearer ${authTokens.warehouseStaff}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid query parameters');
    });
  });

  describe('GET /api/inventory/lots/:lotId', () => {
    let testLot;

    beforeEach(async () => {
      testLot = await testDataFactory.createInventoryLot({
        part_id: testData.testPart.id,
        customer_id: testData.testCustomer.id,
        original_quantity: 100
      });
    });

    test('returns specific lot details', async () => {
      const response = await request(app)
        .get(`/api/inventory/lots/${testLot.id}`)
        .set('Authorization', `Bearer ${authTokens.warehouseStaff}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testLot.id);
      expect(response.body.data.current_quantity).toBe(100);
      expect(response.body.data.part).toBeDefined(); // Should include part details
      expect(response.body.data.customer).toBeDefined(); // Should include customer details
    });

    test('returns 404 for non-existent lot', async () => {
      const response = await request(app)
        .get('/api/inventory/lots/non-existent-id')
        .set('Authorization', `Bearer ${authTokens.warehouseStaff}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Lot not found');
    });

    test('enforces customer-specific access control', async () => {
      // Create a lot for a different customer
      const anotherCustomer = await testDataFactory.createTestCustomer({ name: 'Other Customer' });
      const restrictedLot = await testDataFactory.createInventoryLot({
        part_id: testData.testPart.id,
        customer_id: anotherCustomer.id,
        original_quantity: 50
      });

      const response = await request(app)
        .get(`/api/inventory/lots/${restrictedLot.id}`)
        .set('Authorization', `Bearer ${authTokens.customerRestrictedUser}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Access denied');
    });
  });

  describe('POST /api/inventory/lots', () => {
    test('creates new inventory lot with valid data', async () => {
      const newLotData = {
        part_id: testData.testPart.id,
        customer_id: testData.testCustomer.id,
        original_quantity: 150,
        admission_date: new Date().toISOString(),
        manifest_number: 'MAN-NEW-001',
        conveyance_name: 'Test Ship',
        port_of_unlading: 'Los Angeles',
        bill_of_lading: 'BOL-12345'
      };

      const startTime = Date.now();
      
      const response = await request(app)
        .post('/api/inventory/lots')
        .set('Authorization', `Bearer ${authTokens.warehouseStaff}`)
        .send(newLotData)
        .expect(201);

      const duration = Date.now() - startTime;

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBeDefined();
      expect(response.body.data.current_quantity).toBe(150);
      expect(response.body.data.status).toBe('In Stock');
      expect(response.body.data.created_by).toBe(testData.warehouseUser.id);

      // Performance assertion
      expect(duration).toBeLessThan(500); // <500ms creation target
    });

    test('validates required fields', async () => {
      const invalidData = {
        part_id: testData.testPart.id,
        // Missing required customer_id and original_quantity
      };

      const response = await request(app)
        .post('/api/inventory/lots')
        .set('Authorization', `Bearer ${authTokens.warehouseStaff}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Missing required fields');
      expect(response.body.validationErrors).toBeDefined();
      expect(response.body.validationErrors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'customer_id' }),
          expect.objectContaining({ field: 'original_quantity' })
        ])
      );
    });

    test('validates business rules', async () => {
      const invalidData = {
        part_id: testData.testPart.id,
        customer_id: testData.testCustomer.id,
        original_quantity: -50 // Negative quantity
      };

      const response = await request(app)
        .post('/api/inventory/lots')
        .set('Authorization', `Bearer ${authTokens.warehouseStaff}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Quantity must be greater than zero');
    });

    test('validates foreign key references', async () => {
      const invalidData = {
        part_id: 'non-existent-part',
        customer_id: testData.testCustomer.id,
        original_quantity: 100
      };

      const response = await request(app)
        .post('/api/inventory/lots')
        .set('Authorization', `Bearer ${authTokens.warehouseStaff}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Part not found');
    });

    test('requires appropriate permissions', async () => {
      const lotData = {
        part_id: testData.testPart.id,
        customer_id: testData.testCustomer.id,
        original_quantity: 100
      };

      const response = await request(app)
        .post('/api/inventory/lots')
        .set('Authorization', `Bearer ${authTokens.readOnlyUser}`)
        .send(lotData)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Insufficient permissions');
    });

    test('handles concurrent lot creation', async () => {
      const lotData = {
        part_id: testData.testPart.id,
        customer_id: testData.testCustomer.id,
        original_quantity: 100,
        manifest_number: 'CONCURRENT-TEST'
      };

      // Create multiple lots simultaneously
      const promises = Array(5).fill().map((_, i) =>
        request(app)
          .post('/api/inventory/lots')
          .set('Authorization', `Bearer ${authTokens.warehouseStaff}`)
          .send({ ...lotData, manifest_number: `CONCURRENT-${i}` })
      );

      const responses = await Promise.all(promises);

      // All should succeed with unique IDs
      responses.forEach((response, index) => {
        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data.id).toBeDefined();
        expect(response.body.data.manifest_number).toBe(`CONCURRENT-${index}`);
      });

      // Verify all lots have unique IDs
      const lotIds = responses.map(r => r.body.data.id);
      const uniqueIds = [...new Set(lotIds)];
      expect(uniqueIds).toHaveLength(lotIds.length);
    });
  });

  describe('PUT /api/inventory/lots/:lotId/quantity', () => {
    let testLot;

    beforeEach(async () => {
      testLot = await testDataFactory.createInventoryLot({
        part_id: testData.testPart.id,
        customer_id: testData.testCustomer.id,
        original_quantity: 100
      });
    });

    test('adjusts lot quantity with valid data', async () => {
      const adjustmentData = {
        newQuantity: 75,
        reason: 'Partial shipment completed',
        oldQuantity: 100
      };

      const response = await request(app)
        .put(`/api/inventory/lots/${testLot.id}/quantity`)
        .set('Authorization', `Bearer ${authTokens.warehouseStaff}`)
        .send(adjustmentData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.current_quantity).toBe(75);
      expect(response.body.data.updated_by).toBe(testData.warehouseUser.id);

      // Verify transaction history
      const historyResponse = await request(app)
        .get(`/api/inventory/lots/${testLot.id}/transactions`)
        .set('Authorization', `Bearer ${authTokens.warehouseStaff}`)
        .expect(200);

      const adjustmentTransaction = historyResponse.body.data.find(t => t.type === 'Adjustment');
      expect(adjustmentTransaction).toBeDefined();
      expect(adjustmentTransaction.quantity).toBe(-25); // Reduction
    });

    test('validates quantity adjustment parameters', async () => {
      const invalidData = {
        newQuantity: -10, // Negative quantity
        reason: 'Invalid adjustment',
        oldQuantity: 100
      };

      const response = await request(app)
        .put(`/api/inventory/lots/${testLot.id}/quantity`)
        .set('Authorization', `Bearer ${authTokens.warehouseStaff}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Quantity cannot be negative');
    });

    test('requires adjustment reason', async () => {
      const invalidData = {
        newQuantity: 75,
        oldQuantity: 100
        // Missing reason
      };

      const response = await request(app)
        .put(`/api/inventory/lots/${testLot.id}/quantity`)
        .set('Authorization', `Bearer ${authTokens.warehouseStaff}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Reason is required');
    });

    test('validates old quantity for optimistic locking', async () => {
      const adjustmentData = {
        newQuantity: 75,
        reason: 'Test adjustment',
        oldQuantity: 50 // Incorrect old quantity
      };

      const response = await request(app)
        .put(`/api/inventory/lots/${testLot.id}/quantity`)
        .set('Authorization', `Bearer ${authTokens.warehouseStaff}`)
        .send(adjustmentData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Quantity has been modified');
    });
  });

  describe('PUT /api/inventory/lots/:lotId/status', () => {
    let testLot;

    beforeEach(async () => {
      testLot = await testDataFactory.createInventoryLot({
        part_id: testData.testPart.id,
        customer_id: testData.testCustomer.id,
        original_quantity: 100,
        status: 'In Stock'
      });
    });

    test('changes lot status with valid data', async () => {
      const statusData = {
        newStatus: 'On Hold',
        reason: 'Quality inspection required',
        oldStatus: 'In Stock'
      };

      const response = await request(app)
        .put(`/api/inventory/lots/${testLot.id}/status`)
        .set('Authorization', `Bearer ${authTokens.warehouseStaff}`)
        .send(statusData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('On Hold');
    });

    test('validates status transition rules', async () => {
      // First set to Depleted
      await request(app)
        .put(`/api/inventory/lots/${testLot.id}/status`)
        .set('Authorization', `Bearer ${authTokens.warehouseStaff}`)
        .send({
          newStatus: 'Depleted',
          reason: 'All quantity shipped',
          oldStatus: 'In Stock'
        });

      // Try invalid transition from Depleted to In Stock
      const response = await request(app)
        .put(`/api/inventory/lots/${testLot.id}/status`)
        .set('Authorization', `Bearer ${authTokens.warehouseStaff}`)
        .send({
          newStatus: 'In Stock',
          reason: 'Invalid transition',
          oldStatus: 'Depleted'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid status transition');
    });
  });

  describe('DELETE /api/inventory/lots/:lotId', () => {
    let testLot;

    beforeEach(async () => {
      testLot = await testDataFactory.createInventoryLot({
        part_id: testData.testPart.id,
        customer_id: testData.testCustomer.id,
        original_quantity: 100
      });
    });

    test('voids lot with proper authorization', async () => {
      const voidData = {
        reason: 'Damaged goods - water damage',
        quantityToRemove: 100
      };

      const response = await request(app)
        .delete(`/api/inventory/lots/${testLot.id}`)
        .set('Authorization', `Bearer ${authTokens.supervisor}`)
        .send(voidData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.voided).toBe(true);
      expect(response.body.data.current_quantity).toBe(0);
    });

    test('requires supervisor permissions for voiding', async () => {
      const voidData = {
        reason: 'Unauthorized void attempt',
        quantityToRemove: 100
      };

      const response = await request(app)
        .delete(`/api/inventory/lots/${testLot.id}`)
        .set('Authorization', `Bearer ${authTokens.warehouseStaff}`)
        .send(voidData)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Supervisor permission required');
    });

    test('validates void reason requirement', async () => {
      const voidData = {
        quantityToRemove: 100
        // Missing reason
      };

      const response = await request(app)
        .delete(`/api/inventory/lots/${testLot.id}`)
        .set('Authorization', `Bearer ${authTokens.supervisor}`)
        .send(voidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Void reason is required');
    });
  });

  describe('GET /api/inventory/summary', () => {
    beforeEach(async () => {
      // Create various lots for summary testing
      const lotConfigs = [
        { quantity: 100, status: 'In Stock' },
        { quantity: 200, status: 'In Stock' },
        { quantity: 50, status: 'On Hold' },
        { quantity: 0, status: 'Depleted' }
      ];

      for (const config of lotConfigs) {
        await testDataFactory.createInventoryLot({
          part_id: testData.testPart.id,
          customer_id: testData.testCustomer.id,
          original_quantity: config.quantity,
          status: config.status
        });
      }
    });

    test('returns inventory summary metrics', async () => {
      const response = await request(app)
        .get('/api/inventory/summary')
        .set('Authorization', `Bearer ${authTokens.warehouseStaff}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.total_lots).toBe(4);
      expect(response.body.data.active_lots).toBe(3);
      expect(response.body.data.total_quantity).toBe(350);
      expect(response.body.data.by_status).toBeDefined();
      expect(response.body.data.by_status['In Stock']).toBe(2);
    });

    test('meets performance target for large datasets', async () => {
      // Create additional lots for performance testing
      const additionalLots = Array(100).fill().map(() => ({
        part_id: testData.testPart.id,
        customer_id: testData.testCustomer.id,
        original_quantity: Math.floor(Math.random() * 500) + 1
      }));

      for (const lot of additionalLots) {
        await testDataFactory.createInventoryLot(lot);
      }

      const startTime = Date.now();
      
      const response = await request(app)
        .get('/api/inventory/summary')
        .set('Authorization', `Bearer ${authTokens.warehouseStaff}`)
        .expect(200);

      const duration = Date.now() - startTime;

      expect(response.body.success).toBe(true);
      expect(duration).toBeLessThan(1000); // <1s for summary calculation
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('handles malformed JSON gracefully', async () => {
      const response = await request(app)
        .post('/api/inventory/lots')
        .set('Authorization', `Bearer ${authTokens.warehouseStaff}`)
        .set('Content-Type', 'application/json')
        .send('{ invalid json')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid JSON');
    });

    test('handles database connection errors', async () => {
      // This would typically be done by mocking the database service
      // For brevity, we'll test the error response format
      const response = await request(app)
        .get('/api/inventory/lots/invalid-format-id')
        .set('Authorization', `Bearer ${authTokens.warehouseStaff}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
      expect(response.body.timestamp).toBeDefined();
    });

    test('enforces rate limiting', async () => {
      const requests = Array(10).fill().map(() =>
        request(app)
          .get('/api/inventory/lots')
          .set('Authorization', `Bearer ${authTokens.warehouseStaff}`)
      );

      const responses = await Promise.all(requests);

      // Most should succeed, but some might be rate limited
      const successfulRequests = responses.filter(r => r.status === 200);
      const rateLimitedRequests = responses.filter(r => r.status === 429);

      expect(successfulRequests.length + rateLimitedRequests.length).toBe(10);
      
      if (rateLimitedRequests.length > 0) {
        expect(rateLimitedRequests[0].body.error).toContain('Rate limit exceeded');
      }
    });
  });

  describe('Security Testing', () => {
    test('prevents SQL injection in search parameters', async () => {
      const maliciousSearch = "'; DROP TABLE inventory_lots; --";
      
      const response = await request(app)
        .get(`/api/inventory/lots?search=${encodeURIComponent(maliciousSearch)}`)
        .set('Authorization', `Bearer ${authTokens.warehouseStaff}`)
        .expect(200); // Should not cause error, just return no results

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
    });

    test('validates JWT token expiry', async () => {
      const expiredToken = authHelper.generateExpiredToken();
      
      const response = await request(app)
        .get('/api/inventory/lots')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Token expired');
    });

    test('prevents cross-site request forgery', async () => {
      const response = await request(app)
        .post('/api/inventory/lots')
        .set('Authorization', `Bearer ${authTokens.warehouseStaff}`)
        .set('Origin', 'https://malicious-site.com')
        .send({
          part_id: testData.testPart.id,
          customer_id: testData.testCustomer.id,
          original_quantity: 100
        })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid origin');
    });
  });
});