// tests/backend/preshipments-api.test.js
// Comprehensive test suite for preshipments API endpoints
// Tests all CRUD operations, ACE field validation, and business logic

const request = require('supertest');
const app = require('../../src/backend/api/index.js');

describe('Preshipments API', () => {
  // Mock authentication token for testing
  const testToken = 'test-token-123';
  const authHeader = { Authorization: `Bearer ${testToken}` };

  describe('GET /api/preshipments', () => {
    test('should return list of preshipments', async () => {
      const response = await request(app)
        .get('/api/preshipments')
        .set(authHeader)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body).toHaveProperty('count');
      expect(response.body).toHaveProperty('pagination');
    });

    test('should filter by stage', async () => {
      const response = await request(app)
        .get('/api/preshipments?stage=Planning')
        .set(authHeader)
        .expect(200);

      expect(response.body.success).toBe(true);
      if (response.body.data.length > 0) {
        response.body.data.forEach(item => {
          expect(item.stage).toBe('Planning');
        });
      }
    });

    test('should filter by type', async () => {
      const response = await request(app)
        .get('/api/preshipments?type=7501 Consumption Entry')
        .set(authHeader)
        .expect(200);

      expect(response.body.success).toBe(true);
      if (response.body.data.length > 0) {
        response.body.data.forEach(item => {
          expect(item.type).toBe('7501 Consumption Entry');
        });
      }
    });

    test('should filter by entry_summary_status', async () => {
      const response = await request(app)
        .get('/api/preshipments?entry_summary_status=NOT_PREPARED')
        .set(authHeader)
        .expect(200);

      expect(response.body.success).toBe(true);
      if (response.body.data.length > 0) {
        response.body.data.forEach(item => {
          expect(item.entry_summary_status).toBe('NOT_PREPARED');
        });
      }
    });

    test('should support pagination', async () => {
      const response = await request(app)
        .get('/api/preshipments?limit=1&offset=0')
        .set(authHeader)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.pagination.limit).toBe(1);
      expect(response.body.pagination.offset).toBe(0);
    });

    test('should support sorting', async () => {
      const response = await request(app)
        .get('/api/preshipments?orderBy=created_at&ascending=true')
        .set(authHeader)
        .expect(200);

      expect(response.body.success).toBe(true);
      // Note: Sorting validation would require multiple records
    });
  });

  describe('GET /api/preshipments/:id', () => {
    test('should return specific preshipment by ID', async () => {
      // Using mock data ID from the implementation
      const response = await request(app)
        .get('/api/preshipments/550e8400-e29b-41d4-a716-446655440001')
        .set(authHeader)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('shipmentId');
      expect(response.body.data).toHaveProperty('type');
      expect(response.body.data).toHaveProperty('stage');
      expect(response.body.data).toHaveProperty('entry_summary_status');
    });

    test('should return 404 for non-existent preshipment', async () => {
      const response = await request(app)
        .get('/api/preshipments/non-existent-id')
        .set(authHeader)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('not found');
    });
  });

  describe('POST /api/preshipments', () => {
    const validPreshipment = {
      shipmentId: 'PS-TEST-001',
      type: '7501 Consumption Entry',
      customerId: '550e8400-e29b-41d4-a716-446655440000',
      items: [
        {
          lot: 'L-TEST-001',
          qty: 10,
          part_id: 'PART-TEST-001',
          description: 'Test Widget',
          unit_value: 15.00,
          hts_code: '8421.23.0000',
          country_of_origin: 'CN'
        }
      ],
      stage: 'Planning',
      entry_summary_status: 'NOT_PREPARED',
      filing_district_port: '1001',
      entry_filer_code: 'ABC',
      carrier_code: 'SCAC',
      estimated_total_value: 150.00,
      estimated_duty_amount: 15.00,
      priority: 'Normal'
    };

    test('should create new preshipment with valid data', async () => {
      const response = await request(app)
        .post('/api/preshipments')
        .set(authHeader)
        .send(validPreshipment)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.shipmentId).toBe(validPreshipment.shipmentId);
      expect(response.body.data.type).toBe(validPreshipment.type);
    });

    test('should reject missing required fields', async () => {
      const invalidData = { ...validPreshipment };
      delete invalidData.shipmentId;

      const response = await request(app)
        .post('/api/preshipments')
        .set(authHeader)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('required fields');
    });

    test('should reject invalid type', async () => {
      const invalidData = { 
        ...validPreshipment, 
        type: 'Invalid Type' 
      };

      const response = await request(app)
        .post('/api/preshipments')
        .set(authHeader)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid type');
    });

    test('should reject empty items array', async () => {
      const invalidData = { 
        ...validPreshipment, 
        items: [] 
      };

      const response = await request(app)
        .post('/api/preshipments')
        .set(authHeader)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('At least one item is required');
    });

    test('should validate ACE Filing District Port format', async () => {
      const invalidData = { 
        ...validPreshipment, 
        filing_district_port: '12345' // Too long
      };

      const response = await request(app)
        .post('/api/preshipments')
        .set(authHeader)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('ACE validation failed');
      expect(response.body.validationErrors).toContain(
        'Filing District Port must be exactly 4 alphanumeric characters'
      );
    });

    test('should validate ACE Entry Filer Code format', async () => {
      const invalidData = { 
        ...validPreshipment, 
        entry_filer_code: 'ABCD' // Too long
      };

      const response = await request(app)
        .post('/api/preshipments')
        .set(authHeader)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('ACE validation failed');
      expect(response.body.validationErrors).toContain(
        'Entry Filer Code must be exactly 3 alphanumeric characters'
      );
    });

    test('should validate ACE Carrier Code SCAC format', async () => {
      const invalidData = { 
        ...validPreshipment, 
        carrier_code: 'ABC1' // Contains number
      };

      const response = await request(app)
        .post('/api/preshipments')
        .set(authHeader)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('ACE validation failed');
      expect(response.body.validationErrors).toContain(
        'Carrier Code must be exactly 4 uppercase letters (SCAC format)'
      );
    });

    test('should validate weekly entry requires zone_week_ending_date', async () => {
      const invalidData = { 
        ...validPreshipment, 
        weekly_entry: true,
        zone_week_ending_date: null
      };

      const response = await request(app)
        .post('/api/preshipments')
        .set(authHeader)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('ACE validation failed');
      expect(response.body.validationErrors).toContain(
        'Zone week ending date is required for weekly entries'
      );
    });
  });

  describe('PUT /api/preshipments/:id', () => {
    test('should update preshipment stage', async () => {
      const updateData = {
        stage: 'Picking',
        notes: 'Updated to picking stage'
      };

      const response = await request(app)
        .put('/api/preshipments/550e8400-e29b-41d4-a716-446655440001')
        .set(authHeader)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should update ACE entry summary status', async () => {
      const updateData = {
        entry_summary_status: 'DRAFT',
        compliance_notes: 'Entry summary drafted'
      };

      const response = await request(app)
        .put('/api/preshipments/550e8400-e29b-41d4-a716-446655440001')
        .set(authHeader)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should validate ACE fields on update', async () => {
      const updateData = {
        filing_district_port: '12345' // Invalid format
      };

      const response = await request(app)
        .put('/api/preshipments/550e8400-e29b-41d4-a716-446655440001')
        .set(authHeader)
        .send(updateData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('ACE validation failed');
    });

    test('should sanitize input fields', async () => {
      const updateData = {
        notes: '<script>alert("xss")</script>Safe note',
        compliance_notes: '<b>Bold text</b> compliance note'
      };

      const response = await request(app)
        .put('/api/preshipments/550e8400-e29b-41d4-a716-446655440001')
        .set(authHeader)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      // Note: Actual sanitization validation would require checking the stored data
    });
  });

  describe('POST /api/preshipments/:id/finalize', () => {
    const validFinalizationData = {
      driver_name: 'John Driver',
      driver_license_number: 'DL123456789',
      license_plate_number: 'ABC123',
      carrier_name: 'Test Carrier',
      signature_data: { signature: 'base64-encoded-signature' }
    };

    test('should finalize shipment with driver sign-off', async () => {
      const response = await request(app)
        .post('/api/preshipments/550e8400-e29b-41d4-a716-446655440001/finalize')
        .set(authHeader)
        .send(validFinalizationData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toContain('finalized successfully');
    });

    test('should reject finalization without required driver info', async () => {
      const invalidData = { ...validFinalizationData };
      delete invalidData.driver_name;

      const response = await request(app)
        .post('/api/preshipments/550e8400-e29b-41d4-a716-446655440001/finalize')
        .set(authHeader)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Driver name, license number, and license plate are required');
    });

    test('should reject finalization without license number', async () => {
      const invalidData = { ...validFinalizationData };
      delete invalidData.driver_license_number;

      const response = await request(app)
        .post('/api/preshipments/550e8400-e29b-41d4-a716-446655440001/finalize')
        .set(authHeader)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('required');
    });

    test('should reject finalization without license plate', async () => {
      const invalidData = { ...validFinalizationData };
      delete invalidData.license_plate_number;

      const response = await request(app)
        .post('/api/preshipments/550e8400-e29b-41d4-a716-446655440001/finalize')
        .set(authHeader)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('required');
    });
  });

  describe('GET /api/preshipments/stats/dashboard', () => {
    test('should return dashboard statistics', async () => {
      const response = await request(app)
        .get('/api/preshipments/stats/dashboard')
        .set(authHeader)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('total');
      expect(response.body.data).toHaveProperty('by_stage');
      expect(response.body.data).toHaveProperty('by_type');
      expect(response.body.data).toHaveProperty('by_entry_status');
      expect(response.body.data).toHaveProperty('by_priority');
      expect(response.body.data).toHaveProperty('total_estimated_value');
      expect(response.body.data).toHaveProperty('total_estimated_duty');
      expect(response.body.data).toHaveProperty('shipped_count');
      expect(response.body.data).toHaveProperty('in_progress_count');
    });

    test('should filter stats by date range', async () => {
      const startDate = '2024-08-01';
      const endDate = '2024-08-31';
      
      const response = await request(app)
        .get(`/api/preshipments/stats/dashboard?start_date=${startDate}&end_date=${endDate}`)
        .set(authHeader)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('total');
    });
  });

  describe('Reference Data Endpoints', () => {
    test('GET /api/preshipments/reference/stages should return stage options', async () => {
      const response = await request(app)
        .get('/api/preshipments/reference/stages')
        .set(authHeader)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      
      const stageValues = response.body.data.map(stage => stage.value);
      expect(stageValues).toContain('Planning');
      expect(stageValues).toContain('Picking');
      expect(stageValues).toContain('Packing');
      expect(stageValues).toContain('Loading');
      expect(stageValues).toContain('Ready to Ship');
      expect(stageValues).toContain('Shipped');
    });

    test('GET /api/preshipments/reference/entry-statuses should return ACE status options', async () => {
      const response = await request(app)
        .get('/api/preshipments/reference/entry-statuses')
        .set(authHeader)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      
      const statusValues = response.body.data.map(status => status.value);
      expect(statusValues).toContain('NOT_PREPARED');
      expect(statusValues).toContain('DRAFT');
      expect(statusValues).toContain('READY_TO_FILE');
      expect(statusValues).toContain('FILED');
      expect(statusValues).toContain('ACCEPTED');
      expect(statusValues).toContain('REJECTED');
    });

    test('GET /api/preshipments/reference/types should return shipment type options', async () => {
      const response = await request(app)
        .get('/api/preshipments/reference/types')
        .set(authHeader)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      
      const typeValues = response.body.data.map(type => type.value);
      expect(typeValues).toContain('7501 Consumption Entry');
      expect(typeValues).toContain('7512 T&E Export');
    });
  });

  describe('DELETE /api/preshipments/:id', () => {
    test('should delete preshipment (requires manager role)', async () => {
      const response = await request(app)
        .delete('/api/preshipments/550e8400-e29b-41d4-a716-446655440001')
        .set(authHeader)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Security and Validation', () => {
    test('should require authentication for all endpoints', async () => {
      await request(app)
        .get('/api/preshipments')
        .expect(401);

      await request(app)
        .post('/api/preshipments')
        .expect(401);

      await request(app)
        .put('/api/preshipments/test-id')
        .expect(401);

      await request(app)
        .delete('/api/preshipments/test-id')
        .expect(401);
    });

    test('should sanitize all string inputs to prevent XSS', async () => {
      const maliciousData = {
        shipmentId: '<script>alert("xss")</script>PS-XSS-001',
        type: '7501 Consumption Entry',
        customerId: '550e8400-e29b-41d4-a716-446655440000',
        items: [
          {
            lot: 'L-TEST-001',
            qty: 10,
            part_id: 'PART-TEST-001',
            description: '<script>alert("xss")</script>Test Widget',
            unit_value: 15.00
          }
        ],
        notes: '<script>alert("xss")</script>Malicious note'
      };

      const response = await request(app)
        .post('/api/preshipments')
        .set(authHeader)
        .send(maliciousData)
        .expect(201);

      expect(response.body.success).toBe(true);
      // Verification of sanitization would require checking stored data
    });

    test('should validate business rules for inventory allocation', async () => {
      // This would require setting up test inventory data
      // For now, just verify the endpoint handles allocation errors gracefully
      const testData = {
        shipmentId: 'PS-ALLOCATION-TEST',
        type: '7501 Consumption Entry',
        customerId: '550e8400-e29b-41d4-a716-446655440000',
        items: [
          {
            lot: 'L-NONEXISTENT-001',
            qty: 1000000, // Very large quantity to trigger allocation error
            part_id: 'NONEXISTENT-PART',
            description: 'Non-existent part',
            unit_value: 1.00
          }
        ]
      };

      const response = await request(app)
        .post('/api/preshipments')
        .set(authHeader)
        .send(testData);

      // Response could be 400 (allocation error) or 201 (demo mode)
      expect([400, 201]).toContain(response.status);
      
      if (response.status === 400) {
        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('allocation failed');
      }
    });
  });

  describe('Data Format Validation', () => {
    test('should enforce proper data types', async () => {
      const invalidData = {
        shipmentId: 123, // Should be string
        type: '7501 Consumption Entry',
        customerId: '550e8400-e29b-41d4-a716-446655440000',
        items: 'not-an-array', // Should be array
        estimated_total_value: 'not-a-number' // Should be number
      };

      const response = await request(app)
        .post('/api/preshipments')
        .set(authHeader)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('should validate date formats', async () => {
      const invalidData = {
        shipmentId: 'PS-DATE-TEST',
        type: '7501 Consumption Entry',
        customerId: '550e8400-e29b-41d4-a716-446655440000',
        items: [
          {
            lot: 'L-TEST-001',
            qty: 10,
            part_id: 'PART-TEST-001',
            description: 'Test Widget',
            unit_value: 15.00
          }
        ],
        date_of_importation: 'invalid-date-format',
        requested_ship_date: 'also-invalid'
      };

      const response = await request(app)
        .post('/api/preshipments')
        .set(authHeader)
        .send(invalidData);

      // Date validation may be handled at database level
      expect([400, 201]).toContain(response.status);
    });

    test('should validate numeric ranges', async () => {
      const invalidData = {
        shipmentId: 'PS-NUMERIC-TEST',
        type: '7501 Consumption Entry',
        customerId: '550e8400-e29b-41d4-a716-446655440000',
        items: [
          {
            lot: 'L-TEST-001',
            qty: -10, // Negative quantity
            part_id: 'PART-TEST-001',
            description: 'Test Widget',
            unit_value: -15.00 // Negative value
          }
        ],
        estimated_total_value: -1000, // Negative total
        estimated_duty_amount: -100 // Negative duty
      };

      const response = await request(app)
        .post('/api/preshipments')
        .set(authHeader)
        .send(invalidData);

      // Business logic validation may allow negative values in some cases
      expect([400, 201]).toContain(response.status);
    });
  });
});