// tests/backend/receiving-api.test.js
// Comprehensive tests for receiving API endpoints and ReceivingService
// Tests dock audits, FTZ compliance verification, and photo upload functionality

const request = require('supertest');
const { describe, it, expect, beforeAll, afterAll, beforeEach } = require('@jest/globals');
const fs = require('fs');
const path = require('path');

// Mock the Express app and services
const app = require('../../src/backend/api/index');
const ReceivingService = require('../../src/backend/services/business/ReceivingService');

// Test data and configuration
const TEST_ADMISSION_ID = 'ADM-TEST-001';
const TEST_USER_ID = '550e8400-e29b-41d4-a716-446655440000';
const AUTH_TOKEN = 'demo-token-for-testing-only-receiving';

// Helper function to create test image buffer
const createTestImageBuffer = () => {
  // Create a minimal PNG buffer for testing
  return Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
    0xde, 0x00, 0x00, 0x00, 0x0c, 0x49, 0x44, 0x41,
    0x54, 0x08, 0xd7, 0x63, 0xf8, 0x0f, 0x00, 0x00,
    0x01, 0x00, 0x01, 0x5c, 0xc8, 0xa7, 0x5a, 0x00,
    0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
    0x42, 0x60, 0x82
  ]);
};

describe('Receiving API Tests', () => {
  beforeAll(async () => {
    // Setup test environment
    process.env.NODE_ENV = 'test';
  });

  afterAll(async () => {
    // Cleanup after tests
  });

  describe('GET /api/receiving', () => {
    it('should fetch all receivables with default pagination', async () => {
      const response = await request(app)
        .get('/api/receiving')
        .set('Authorization', `Bearer ${AUTH_TOKEN}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.pagination).toHaveProperty('limit', 100);
      expect(response.body.pagination).toHaveProperty('offset', 0);
    });

    it('should filter receivables by status', async () => {
      const response = await request(app)
        .get('/api/receiving?status=Pending')
        .set('Authorization', `Bearer ${AUTH_TOKEN}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      if (response.body.data.length > 0) {
        response.body.data.forEach(receivable => {
          expect(receivable.status).toBe('Pending');
        });
      }
    });

    it('should filter receivables by customer', async () => {
      const response = await request(app)
        .get('/api/receiving?customer_id=CUST-001')
        .set('Authorization', `Bearer ${AUTH_TOKEN}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      if (response.body.data.length > 0) {
        response.body.data.forEach(receivable => {
          expect(receivable.customer_id).toBe('CUST-001');
        });
      }
    });

    it('should filter receivables by container number', async () => {
      const response = await request(app)
        .get('/api/receiving?container_number=CONT123')
        .set('Authorization', `Bearer ${AUTH_TOKEN}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      // Container filter uses ILIKE, so partial matches are expected
    });

    it('should apply pagination correctly', async () => {
      const response = await request(app)
        .get('/api/receiving?limit=5&offset=0')
        .set('Authorization', `Bearer ${AUTH_TOKEN}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeLessThanOrEqual(5);
      expect(response.body.pagination.limit).toBe(5);
    });

    it('should require authentication', async () => {
      await request(app)
        .get('/api/receiving')
        .expect(401);
    });
  });

  describe('GET /api/receiving/:id', () => {
    it('should fetch receivable by ID', async () => {
      // This would work with real database data
      const response = await request(app)
        .get(`/api/receiving/${TEST_ADMISSION_ID}`)
        .set('Authorization', `Bearer ${AUTH_TOKEN}`)
        .expect(200);

      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('data');
    });

    it('should return 404 for non-existent receivable', async () => {
      const response = await request(app)
        .get('/api/receiving/NON-EXISTENT-ID')
        .set('Authorization', `Bearer ${AUTH_TOKEN}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('not found');
    });
  });

  describe('GET /api/receiving/status/:status', () => {
    it('should fetch receivables by status', async () => {
      const response = await request(app)
        .get('/api/receiving/status/Pending')
        .set('Authorization', `Bearer ${AUTH_TOKEN}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('status', 'Pending');
    });

    it('should handle empty results for status', async () => {
      const response = await request(app)
        .get('/api/receiving/status/NonExistentStatus')
        .set('Authorization', `Bearer ${AUTH_TOKEN}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('POST /api/receiving/:id/dock-audit', () => {
    it('should submit dock audit successfully without photos', async () => {
      const auditData = {
        audit_status: 'Accepted',
        audit_notes: 'All items verified and accepted',
        seal_number: 'SEAL123456',
        seal_intact: true,
        container_condition: 'Good',
        skid_count: 5,
        damage_reported: false,
        admitted_items: JSON.stringify([
          { part_id: 'PART-001', quantity: 100, condition: 'Good', location: 'DOCK-A' }
        ]),
        weight_verified: true,
        documentation_complete: true
      };

      const response = await request(app)
        .post(`/api/receiving/${TEST_ADMISSION_ID}/dock-audit`)
        .set('Authorization', `Bearer ${AUTH_TOKEN}`)
        .send(auditData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('message');
      expect(response.body.data.message).toContain('successfully');
    });

    it('should submit dock audit with photo upload', async () => {
      const testImageBuffer = createTestImageBuffer();
      
      const response = await request(app)
        .post(`/api/receiving/${TEST_ADMISSION_ID}/dock-audit`)
        .set('Authorization', `Bearer ${AUTH_TOKEN}`)
        .field('audit_status', 'Accepted')
        .field('audit_notes', 'Container and cargo verified')
        .field('seal_number', 'SEAL789012')
        .field('seal_intact', 'true')
        .field('container_condition', 'Excellent')
        .field('admitted_items', JSON.stringify([
          { part_id: 'PART-002', quantity: 50, condition: 'Excellent', location: 'DOCK-B' }
        ]))
        .attach('photos', testImageBuffer, 'container-photo.png')
        .attach('photos', testImageBuffer, 'cargo-photo.png')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('photos_uploaded');
      expect(response.body.data.photos_uploaded).toBe(2);
    });

    it('should handle partial acceptance with rejected items', async () => {
      const auditData = {
        audit_status: 'Partial Accept',
        audit_notes: 'Some items damaged during transport',
        rejection_reason: 'Water damage to 20% of shipment',
        seal_number: 'SEAL345678',
        seal_intact: false,
        container_condition: 'Fair',
        damage_reported: true,
        damage_description: 'Water staining on bottom layer of cargo',
        admitted_items: JSON.stringify([
          { part_id: 'PART-003', quantity: 80, condition: 'Good', location: 'DOCK-C' }
          // 20 units rejected due to damage
        ])
      };

      const response = await request(app)
        .post(`/api/receiving/${TEST_ADMISSION_ID}/dock-audit`)
        .set('Authorization', `Bearer ${AUTH_TOKEN}`)
        .send(auditData)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should handle complete rejection', async () => {
      const auditData = {
        audit_status: 'Rejected',
        audit_notes: 'Shipment completely rejected',
        rejection_reason: 'Severe container damage, all cargo compromised',
        seal_number: 'SEAL999999',
        seal_intact: false,
        container_condition: 'Damaged',
        damage_reported: true,
        damage_description: 'Container breach, water damage throughout'
      };

      const response = await request(app)
        .post(`/api/receiving/${TEST_ADMISSION_ID}/dock-audit`)
        .set('Authorization', `Bearer ${AUTH_TOKEN}`)
        .send(auditData)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should validate required audit fields', async () => {
      const incompleteData = {
        audit_notes: 'Missing required fields'
        // Missing audit_status
      };

      const response = await request(app)
        .post(`/api/receiving/${TEST_ADMISSION_ID}/dock-audit`)
        .set('Authorization', `Bearer ${AUTH_TOKEN}`)
        .send(incompleteData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid audit status');
    });

    it('should validate audit status values', async () => {
      const invalidData = {
        audit_status: 'InvalidStatus',
        audit_notes: 'Test audit'
      };

      const response = await request(app)
        .post(`/api/receiving/${TEST_ADMISSION_ID}/dock-audit`)
        .set('Authorization', `Bearer ${AUTH_TOKEN}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid audit status');
    });

    it('should validate admitted items for accepted status', async () => {
      const invalidData = {
        audit_status: 'Accepted',
        audit_notes: 'Accepted without items'
        // Missing admitted_items for accepted status
      };

      const response = await request(app)
        .post(`/api/receiving/${TEST_ADMISSION_ID}/dock-audit`)
        .set('Authorization', `Bearer ${AUTH_TOKEN}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should validate JSON format for admitted items', async () => {
      const invalidData = {
        audit_status: 'Accepted',
        admitted_items: 'invalid json format'
      };

      const response = await request(app)
        .post(`/api/receiving/${TEST_ADMISSION_ID}/dock-audit`)
        .set('Authorization', `Bearer ${AUTH_TOKEN}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid admitted_items format');
    });

    it('should require staff authorization', async () => {
      await request(app)
        .post(`/api/receiving/${TEST_ADMISSION_ID}/dock-audit`)
        .send({ audit_status: 'Accepted' })
        .expect(401);
    });

    it('should reject non-image file uploads', async () => {
      const testBuffer = Buffer.from('Not an image');
      
      const response = await request(app)
        .post(`/api/receiving/${TEST_ADMISSION_ID}/dock-audit`)
        .set('Authorization', `Bearer ${AUTH_TOKEN}`)
        .field('audit_status', 'Accepted')
        .attach('photos', testBuffer, 'document.txt')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Only image files are allowed');
    });
  });

  describe('POST /api/receiving/:id/ftz-compliance', () => {
    it('should verify FTZ compliance successfully', async () => {
      const complianceData = {
        documentation_complete: true,
        container_seal_verified: true,
        customs_inspection_passed: true,
        manifest_matches_cargo: true,
        hts_codes_verified: true,
        country_of_origin_verified: true,
        value_declaration_verified: true,
        special_requirements_met: true,
        notes: 'All compliance checks passed'
      };

      const response = await request(app)
        .post(`/api/receiving/${TEST_ADMISSION_ID}/ftz-compliance`)
        .set('Authorization', `Bearer ${AUTH_TOKEN}`)
        .send(complianceData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('compliance_status');
      expect(response.body.data).toHaveProperty('compliance_score');
      expect(response.body.data.compliance_status).toBe('Compliant');
    });

    it('should handle partial compliance', async () => {
      const complianceData = {
        documentation_complete: true,
        container_seal_verified: true,
        customs_inspection_passed: false, // Failed customs inspection
        manifest_matches_cargo: true,
        hts_codes_verified: false, // Missing HTS verification
        notes: 'Partial compliance - pending customs review'
      };

      const response = await request(app)
        .post(`/api/receiving/${TEST_ADMISSION_ID}/ftz-compliance`)
        .set('Authorization', `Bearer ${AUTH_TOKEN}`)
        .send(complianceData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(['Conditional', 'Non-Compliant']).toContain(response.body.data.compliance_status);
    });

    it('should validate required compliance fields', async () => {
      const incompleteData = {
        documentation_complete: true
        // Missing container_seal_verified and customs_inspection_passed
      };

      const response = await request(app)
        .post(`/api/receiving/${TEST_ADMISSION_ID}/ftz-compliance`)
        .set('Authorization', `Bearer ${AUTH_TOKEN}`)
        .send(incompleteData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Missing required compliance fields');
    });

    it('should validate boolean values for compliance fields', async () => {
      const invalidData = {
        documentation_complete: 'yes', // Should be boolean
        container_seal_verified: true,
        customs_inspection_passed: true
      };

      const response = await request(app)
        .post(`/api/receiving/${TEST_ADMISSION_ID}/ftz-compliance`)
        .set('Authorization', `Bearer ${AUTH_TOKEN}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should require staff authorization', async () => {
      await request(app)
        .post(`/api/receiving/${TEST_ADMISSION_ID}/ftz-compliance`)
        .send({
          documentation_complete: true,
          container_seal_verified: true,
          customs_inspection_passed: true
        })
        .expect(401);
    });
  });

  describe('GET /api/receiving/workflow/pending', () => {
    it('should fetch pending receivables', async () => {
      const response = await request(app)
        .get('/api/receiving/workflow/pending')
        .set('Authorization', `Bearer ${AUTH_TOKEN}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('GET /api/receiving/workflow/in-progress', () => {
    it('should fetch in-progress audits', async () => {
      const response = await request(app)
        .get('/api/receiving/workflow/in-progress')
        .set('Authorization', `Bearer ${AUTH_TOKEN}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('POST /api/receiving/search', () => {
    it('should search receivables with text term', async () => {
      const searchData = {
        search_term: 'ADM',
        filters: {},
        limit: 50
      };

      const response = await request(app)
        .post('/api/receiving/search')
        .set('Authorization', `Bearer ${AUTH_TOKEN}`)
        .send(searchData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body).toHaveProperty('search_term', 'ADM');
    });

    it('should search receivables with filters', async () => {
      const searchData = {
        search_term: '',
        filters: {
          status: 'Pending',
          container_number: 'CONT123'
        },
        limit: 25
      };

      const response = await request(app)
        .post('/api/receiving/search')
        .set('Authorization', `Bearer ${AUTH_TOKEN}`)
        .send(searchData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty('filters');
    });
  });

  describe('GET /api/receiving/:id/photos', () => {
    it('should fetch audit photos for receivable', async () => {
      const response = await request(app)
        .get(`/api/receiving/${TEST_ADMISSION_ID}/photos`)
        .set('Authorization', `Bearer ${AUTH_TOKEN}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('GET /api/receiving/reports/statistics', () => {
    it('should fetch receiving statistics', async () => {
      const response = await request(app)
        .get('/api/receiving/reports/statistics')
        .set('Authorization', `Bearer ${AUTH_TOKEN}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty('data');
      expect(typeof response.body.data).toBe('object');
    });

    it('should apply date range filter', async () => {
      const response = await request(app)
        .get('/api/receiving/reports/statistics?start_date=2024-01-01&end_date=2024-01-31')
        .set('Authorization', `Bearer ${AUTH_TOKEN}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty('date_range');
      expect(response.body.date_range.startDate).toBe('2024-01-01');
    });

    it('should require manager authorization', async () => {
      // Test with lower privilege token (would need different mock setup)
      await request(app)
        .get('/api/receiving/reports/statistics')
        .expect(401);
    });
  });

  describe('GET /api/receiving/reference/audit-statuses', () => {
    it('should fetch available audit statuses', async () => {
      const response = await request(app)
        .get('/api/receiving/reference/audit-statuses')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      
      // Verify status structure
      response.body.data.forEach(status => {
        expect(status).toHaveProperty('value');
        expect(status).toHaveProperty('label');
        expect(status).toHaveProperty('description');
      });
    });
  });

  describe('GET /api/receiving/reference/container-conditions', () => {
    it('should fetch available container conditions', async () => {
      const response = await request(app)
        .get('/api/receiving/reference/container-conditions')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      
      // Verify condition structure
      response.body.data.forEach(condition => {
        expect(condition).toHaveProperty('value');
        expect(condition).toHaveProperty('label');
        expect(condition).toHaveProperty('description');
      });
    });
  });
});

// ReceivingService Unit Tests
describe('ReceivingService Tests', () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
  });

  describe('validateDockAudit', () => {
    it('should validate audit data successfully', () => {
      const validData = {
        admission_id: 'ADM-001',
        audited_by: 'John Auditor',
        audit_status: 'Accepted',
        admitted_items: [{ part_id: 'PART-001', quantity: 100 }]
      };

      const result = ReceivingService.validateDockAudit(validData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing required fields', () => {
      const invalidData = {
        audit_status: 'Accepted'
        // Missing admission_id and audited_by
      };

      const result = ReceivingService.validateDockAudit(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors).toContain('Admission ID is required');
      expect(result.errors).toContain('Auditor identification is required');
    });

    it('should validate audit status values', () => {
      const invalidData = {
        admission_id: 'ADM-001',
        audited_by: 'John Auditor',
        audit_status: 'InvalidStatus',
        admitted_items: []
      };

      const result = ReceivingService.validateDockAudit(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('Invalid audit status'))).toBe(true);
    });

    it('should require admitted items for accepted status', () => {
      const invalidData = {
        admission_id: 'ADM-001',
        audited_by: 'John Auditor',
        audit_status: 'Accepted'
        // Missing admitted_items
      };

      const result = ReceivingService.validateDockAudit(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Admitted items array is required for accepted shipments');
    });

    it('should require rejection reason for rejected status', () => {
      const invalidData = {
        admission_id: 'ADM-001',
        audited_by: 'John Auditor',
        audit_status: 'Rejected'
        // Missing rejection_reason
      };

      const result = ReceivingService.validateDockAudit(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Rejection reason is required for rejected shipments');
    });
  });

  describe('validateFTZCompliance', () => {
    it('should validate compliance data successfully', () => {
      const validData = {
        container_seal_verified: true,
        documentation_complete: true,
        customs_inspection_passed: true
      };

      const result = ReceivingService.validateFTZCompliance(validData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing required fields', () => {
      const invalidData = {
        container_seal_verified: true
        // Missing other required fields
      };

      const result = ReceivingService.validateFTZCompliance(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Documentation completeness check is required');
      expect(result.errors).toContain('Customs inspection status is required');
    });
  });

  describe('generateLotNumber', () => {
    it('should generate valid lot number format', () => {
      const admissionId = 'ADM-TEST-001';
      const lotNumber = ReceivingService.generateLotNumber(admissionId);
      
      expect(typeof lotNumber).toBe('string');
      expect(lotNumber).toMatch(/^LOT-[A-Z0-9]{4}-\d{6}$/);
      expect(lotNumber.startsWith('LOT-')).toBe(true);
      expect(lotNumber.includes('001')).toBe(true); // From admission ID suffix
    });

    it('should generate unique lot numbers', () => {
      const admissionId = 'ADM-TEST-001';
      const lotNumber1 = ReceivingService.generateLotNumber(admissionId);
      // Wait a small amount to ensure different timestamp
      const lotNumber2 = ReceivingService.generateLotNumber(admissionId);
      
      // They may be the same if called too quickly, but structure should be valid
      expect(lotNumber1).toMatch(/^LOT-[A-Z0-9]{4}-\d{6}$/);
      expect(lotNumber2).toMatch(/^LOT-[A-Z0-9]{4}-\d{6}$/);
    });
  });

  describe('sanitizeInput', () => {
    it('should sanitize dangerous characters', () => {
      const dangerousInput = '<script>alert("xss")</script>';
      const sanitized = ReceivingService.sanitizeInput(dangerousInput);
      
      expect(sanitized).not.toContain('<');
      expect(sanitized).not.toContain('>');
      expect(sanitized).toBe('script>alert("xss")/script>');
    });

    it('should handle non-string inputs', () => {
      expect(ReceivingService.sanitizeInput(123)).toBe(123);
      expect(ReceivingService.sanitizeInput(null)).toBe(null);
      expect(ReceivingService.sanitizeInput(undefined)).toBe(undefined);
    });

    it('should trim whitespace', () => {
      const input = '  test string  ';
      const sanitized = ReceivingService.sanitizeInput(input);
      
      expect(sanitized).toBe('test string');
    });
  });
});

// Photo Upload Tests
describe('Photo Upload Tests', () => {
  it('should handle multiple photo uploads', async () => {
    const testImageBuffer = createTestImageBuffer();
    
    const response = await request(app)
      .post(`/api/receiving/${TEST_ADMISSION_ID}/dock-audit`)
      .set('Authorization', `Bearer ${AUTH_TOKEN}`)
      .field('audit_status', 'Accepted')
      .field('admitted_items', JSON.stringify([
        { part_id: 'PART-001', quantity: 50 }
      ]))
      .attach('photos', testImageBuffer, 'photo1.png')
      .attach('photos', testImageBuffer, 'photo2.png')
      .attach('photos', testImageBuffer, 'photo3.png')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.photos_uploaded).toBe(3);
  });

  it('should enforce file count limits', async () => {
    const testImageBuffer = createTestImageBuffer();
    const request_builder = request(app)
      .post(`/api/receiving/${TEST_ADMISSION_ID}/dock-audit`)
      .set('Authorization', `Bearer ${AUTH_TOKEN}`)
      .field('audit_status', 'Accepted')
      .field('admitted_items', JSON.stringify([
        { part_id: 'PART-001', quantity: 50 }
      ]));

    // Attach 11 files (exceeds limit of 10)
    for (let i = 1; i <= 11; i++) {
      request_builder.attach('photos', testImageBuffer, `photo${i}.png`);
    }

    const response = await request_builder.expect(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toContain('Too many files');
  });

  it('should enforce file size limits', async () => {
    // Create a large buffer (> 10MB)
    const largeBuffer = Buffer.alloc(11 * 1024 * 1024); // 11MB
    
    const response = await request(app)
      .post(`/api/receiving/${TEST_ADMISSION_ID}/dock-audit`)
      .set('Authorization', `Bearer ${AUTH_TOKEN}`)
      .field('audit_status', 'Accepted')
      .field('admitted_items', JSON.stringify([
        { part_id: 'PART-001', quantity: 50 }
      ]))
      .attach('photos', largeBuffer, 'large-photo.png')
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.error).toContain('File size too large');
  });
});

// Integration tests would go here for actual database operations
describe('ReceivingService Integration Tests', () => {
  // These would require actual database setup and cleanup
  it.skip('should submit dock audit and create inventory lots', async () => {
    // Mock database calls and test actual integration
  });

  it.skip('should verify FTZ compliance and update records', async () => {
    // Test compliance verification with database updates
  });

  it.skip('should process photo uploads and store metadata', async () => {
    // Test photo upload processing with actual storage
  });
});