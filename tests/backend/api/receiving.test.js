// tests/backend/api/receiving.test.js
// Integration tests for receiving/preadmission API endpoints

const request = require('supertest');
const app = require('../../../src/backend/api/index');
const PreadmissionService = require('../../../src/backend/services/business/PreadmissionService');

// Mock the service
jest.mock('../../../src/backend/services/business/PreadmissionService');

describe('Receiving API Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/preadmissions', () => {
    it('should return all preadmissions', async () => {
      const mockPreadmissions = [
        { id: 1, admissionId: 'ADM-001', status: 'Pending' },
        { id: 2, admissionId: 'ADM-002', status: 'Arrived' }
      ];
      
      PreadmissionService.getAllPreadmissions.mockResolvedValue({
        success: true,
        data: mockPreadmissions
      });

      const response = await request(app)
        .get('/api/preadmissions')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        preadmissions: mockPreadmissions
      });
      expect(PreadmissionService.getAllPreadmissions).toHaveBeenCalledWith({});
    });

    it('should handle query parameters', async () => {
      PreadmissionService.getAllPreadmissions.mockResolvedValue({
        success: true,
        data: []
      });

      await request(app)
        .get('/api/preadmissions?status=Pending&customerId=CUST-001&limit=10')
        .expect(200);

      expect(PreadmissionService.getAllPreadmissions).toHaveBeenCalledWith({
        filters: [
          { column: 'status', value: 'Pending' },
          { column: 'customerId', value: 'CUST-001' }
        ],
        limit: 10
      });
    });

    it('should handle service errors', async () => {
      PreadmissionService.getAllPreadmissions.mockResolvedValue({
        success: false,
        error: 'Database connection failed'
      });

      const response = await request(app)
        .get('/api/preadmissions')
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        error: 'Database connection failed'
      });
    });
  });

  describe('GET /api/preadmissions/:admissionId', () => {
    it('should return specific preadmission', async () => {
      const mockPreadmission = { id: 1, admissionId: 'ADM-001', status: 'Pending' };
      
      PreadmissionService.getPreadmissionById.mockResolvedValue({
        success: true,
        data: mockPreadmission
      });

      const response = await request(app)
        .get('/api/preadmissions/ADM-001')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        preadmission: mockPreadmission
      });
      expect(PreadmissionService.getPreadmissionById).toHaveBeenCalledWith('ADM-001', {});
    });

    it('should handle preadmission not found', async () => {
      PreadmissionService.getPreadmissionById.mockResolvedValue({
        success: false,
        error: 'Preadmission not found'
      });

      const response = await request(app)
        .get('/api/preadmissions/NONEXISTENT')
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        error: 'Preadmission not found'
      });
    });
  });

  describe('POST /api/preadmissions', () => {
    it('should create new preadmission', async () => {
      const newPreadmission = {
        admissionId: 'ADM-003',
        customerId: 'CUST-001',
        e214: 'E214-003',
        container: 'CONT-003',
        bol: 'BOL-003',
        arrivalDate: '2024-01-15',
        items: [{ partId: 'PART-001', qty: 100 }]
      };

      const mockCreatedPreadmission = { id: 3, ...newPreadmission, status: 'Pending' };
      
      PreadmissionService.createPreadmission.mockResolvedValue({
        success: true,
        data: mockCreatedPreadmission
      });

      const response = await request(app)
        .post('/api/preadmissions')
        .send(newPreadmission)
        .expect(201);

      expect(response.body).toEqual({
        success: true,
        preadmission: mockCreatedPreadmission
      });
      expect(PreadmissionService.createPreadmission).toHaveBeenCalledWith(newPreadmission, {});
    });

    it('should handle validation errors', async () => {
      const invalidPreadmission = {
        e214: 'E214-003',
        container: 'CONT-003'
        // Missing required admissionId and customerId
      };

      PreadmissionService.createPreadmission.mockResolvedValue({
        success: false,
        error: 'Validation failed',
        validationErrors: ['Admission ID is required', 'Customer ID is required']
      });

      const response = await request(app)
        .post('/api/preadmissions')
        .send(invalidPreadmission)
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Validation failed',
        validationErrors: ['Admission ID is required', 'Customer ID is required']
      });
    });

    it('should handle duplicate admission ID', async () => {
      const duplicatePreadmission = {
        admissionId: 'ADM-001',
        customerId: 'CUST-001'
      };

      PreadmissionService.createPreadmission.mockResolvedValue({
        success: false,
        error: 'Admission ID \'ADM-001\' already exists'
      });

      const response = await request(app)
        .post('/api/preadmissions')
        .send(duplicatePreadmission)
        .expect(409);

      expect(response.body.error).toContain('already exists');
    });
  });

  describe('PUT /api/preadmissions/:admissionId/audit', () => {
    it('should update preadmission with audit data', async () => {
      const auditData = {
        status: 'Approved',
        audit_notes: 'All items verified and correct',
        photo_urls: ['dock_photo1.jpg', 'seal_photo.jpg'],
        audited_by: 'John Auditor',
        admitted_items: [
          { partId: 'PART-001', qty: 100, condition: 'Good' }
        ],
        seal_number: 'SEAL-12345',
        skid_count: 3
      };

      const updatedPreadmission = { 
        id: 1, 
        admissionId: 'ADM-001', 
        status: 'Approved',
        audit_timestamp: '2024-01-01T10:00:00Z'
      };
      
      PreadmissionService.updatePreadmissionAudit.mockResolvedValue({
        success: true,
        data: updatedPreadmission
      });

      const response = await request(app)
        .put('/api/preadmissions/ADM-001/audit')
        .send(auditData)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        preadmission: updatedPreadmission
      });
      expect(PreadmissionService.updatePreadmissionAudit).toHaveBeenCalledWith(
        'ADM-001',
        auditData,
        {}
      );
    });

    it('should handle audit rejection with reason', async () => {
      const rejectionData = {
        status: 'Rejected',
        audit_notes: 'Items do not match manifest',
        rejection_reason: 'Quantity discrepancy: Expected 100, found 95',
        photo_urls: ['discrepancy_photo.jpg'],
        audited_by: 'Jane Auditor'
      };

      PreadmissionService.updatePreadmissionAudit.mockResolvedValue({
        success: true,
        data: { id: 1, admissionId: 'ADM-001', status: 'Rejected' }
      });

      const response = await request(app)
        .put('/api/preadmissions/ADM-001/audit')
        .send(rejectionData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(PreadmissionService.updatePreadmissionAudit).toHaveBeenCalledWith(
        'ADM-001',
        expect.objectContaining({
          status: 'Rejected',
          rejection_reason: 'Quantity discrepancy: Expected 100, found 95'
        }),
        {}
      );
    });

    it('should validate required audit fields', async () => {
      const incompleteAuditData = {
        audit_notes: 'Some notes'
        // Missing status
      };

      const response = await request(app)
        .put('/api/preadmissions/ADM-001/audit')
        .send(incompleteAuditData)
        .expect(400);

      expect(response.body.error).toContain('Status is required');
      expect(PreadmissionService.updatePreadmissionAudit).not.toHaveBeenCalled();
    });
  });

  describe('POST /api/preadmissions/:admissionId/process', () => {
    it('should process admission and create inventory lot', async () => {
      const admissionData = {
        partId: 'PART-001',
        customerId: 'CUST-001',
        status: 'ADMITTED',
        qty: 100,
        location: 'A-01-01'
      };

      const mockPreadmission = {
        id: 1,
        admissionId: 'ADM-001',
        arrivalDate: '2024-01-01',
        bol: 'BOL-001',
        e214: 'E214-001'
      };

      const mockLot = {
        id: 'L-1234567890',
        part_id: 'PART-001',
        customer_id: 'CUST-001',
        original_quantity: 100,
        current_quantity: 100
      };

      // Mock getting the preadmission first
      PreadmissionService.getPreadmissionById.mockResolvedValue({
        success: true,
        data: mockPreadmission
      });

      // Mock processing the admission
      PreadmissionService.processAdmission.mockResolvedValue({
        success: true,
        data: mockLot
      });

      const response = await request(app)
        .post('/api/preadmissions/ADM-001/process')
        .send(admissionData)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        inventoryLot: mockLot
      });
      
      expect(PreadmissionService.processAdmission).toHaveBeenCalledWith(
        admissionData,
        mockPreadmission,
        {}
      );
    });

    it('should require storage location for processing', async () => {
      const incompleteAdmissionData = {
        partId: 'PART-001',
        customerId: 'CUST-001',
        status: 'ADMITTED',
        qty: 100
        // Missing location
      };

      const response = await request(app)
        .post('/api/preadmissions/ADM-001/process')
        .send(incompleteAdmissionData)
        .expect(400);

      expect(response.body.error).toContain('Storage location is required');
    });

    it('should handle preadmission not found during processing', async () => {
      PreadmissionService.getPreadmissionById.mockResolvedValue({
        success: false,
        error: 'Preadmission not found'
      });

      const response = await request(app)
        .post('/api/preadmissions/NONEXISTENT/process')
        .send({
          partId: 'PART-001',
          customerId: 'CUST-001',
          status: 'ADMITTED',
          qty: 100,
          location: 'A-01-01'
        })
        .expect(404);

      expect(response.body.error).toBe('Preadmission not found');
      expect(PreadmissionService.processAdmission).not.toHaveBeenCalled();
    });
  });

  describe('GET /api/preadmissions/status/:status', () => {
    it('should return preadmissions by status', async () => {
      const mockPreadmissions = [
        { id: 1, admissionId: 'ADM-001', status: 'Arrived' },
        { id: 2, admissionId: 'ADM-002', status: 'Arrived' }
      ];
      
      PreadmissionService.getPreadmissionsByStatus.mockResolvedValue({
        success: true,
        data: mockPreadmissions
      });

      const response = await request(app)
        .get('/api/preadmissions/status/Arrived')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        preadmissions: mockPreadmissions
      });
      expect(PreadmissionService.getPreadmissionsByStatus).toHaveBeenCalledWith(
        'Arrived',
        {}
      );
    });

    it('should handle URL encoded status values', async () => {
      PreadmissionService.getPreadmissionsByStatus.mockResolvedValue({
        success: true,
        data: []
      });

      await request(app)
        .get('/api/preadmissions/status/In%20Transit')
        .expect(200);

      expect(PreadmissionService.getPreadmissionsByStatus).toHaveBeenCalledWith(
        'In Transit',
        {}
      );
    });
  });

  describe('GET /api/preadmissions/search', () => {
    it('should search preadmissions', async () => {
      const mockResults = [
        { id: 1, admissionId: 'ADM-001', container: 'CONT-123' }
      ];
      
      PreadmissionService.searchPreadmissions.mockResolvedValue({
        success: true,
        data: mockResults
      });

      const response = await request(app)
        .get('/api/preadmissions/search?q=CONT-123&status=Arrived')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        preadmissions: mockResults
      });
      expect(PreadmissionService.searchPreadmissions).toHaveBeenCalledWith(
        'CONT-123',
        { status: 'Arrived' },
        {}
      );
    });

    it('should require search query', async () => {
      const response = await request(app)
        .get('/api/preadmissions/search')
        .expect(400);

      expect(response.body.error).toContain('Search query is required');
      expect(PreadmissionService.searchPreadmissions).not.toHaveBeenCalled();
    });

    it('should search across multiple filters', async () => {
      PreadmissionService.searchPreadmissions.mockResolvedValue({
        success: true,
        data: []
      });

      await request(app)
        .get('/api/preadmissions/search?q=test&status=Pending&customerId=CUST-001')
        .expect(200);

      expect(PreadmissionService.searchPreadmissions).toHaveBeenCalledWith(
        'test',
        { status: 'Pending', customerId: 'CUST-001' },
        {}
      );
    });
  });

  describe('GET /api/preadmissions/stats', () => {
    it('should return preadmission statistics', async () => {
      const mockStats = {
        total: 15,
        by_status: { 'Pending': 5, 'Arrived': 6, 'Approved': 4 },
        by_customer: { 'CUST-001': 10, 'CUST-002': 5 },
        total_value: 50000,
        average_processing_time: 2.5
      };
      
      PreadmissionService.getPreadmissionStats.mockResolvedValue({
        success: true,
        data: mockStats
      });

      const response = await request(app)
        .get('/api/preadmissions/stats')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        stats: mockStats
      });
      expect(PreadmissionService.getPreadmissionStats).toHaveBeenCalledWith({}, {});
    });

    it('should handle date range parameters', async () => {
      PreadmissionService.getPreadmissionStats.mockResolvedValue({
        success: true,
        data: {}
      });

      await request(app)
        .get('/api/preadmissions/stats?startDate=2024-01-01&endDate=2024-01-31')
        .expect(200);

      expect(PreadmissionService.getPreadmissionStats).toHaveBeenCalledWith(
        { startDate: '2024-01-01', endDate: '2024-01-31' },
        {}
      );
    });
  });

  describe('File Upload Integration', () => {
    it('should handle photo uploads during audit', async () => {
      const auditData = {
        status: 'Approved',
        audit_notes: 'Items verified',
        audited_by: 'John Auditor'
      };

      // Mock file upload middleware
      const mockFiles = [
        { filename: 'dock_photo1.jpg', path: '/uploads/dock_photo1.jpg' },
        { filename: 'seal_photo.jpg', path: '/uploads/seal_photo.jpg' }
      ];

      PreadmissionService.updatePreadmissionAudit.mockResolvedValue({
        success: true,
        data: { id: 1, status: 'Approved' }
      });

      const response = await request(app)
        .put('/api/preadmissions/ADM-001/audit')
        .field('status', 'Approved')
        .field('audit_notes', 'Items verified')
        .field('audited_by', 'John Auditor')
        .attach('photos', 'tests/fixtures/sample_dock_photo.jpg')
        .attach('photos', 'tests/fixtures/sample_seal_photo.jpg')
        .expect(200);

      expect(response.body.success).toBe(true);
      
      // Verify that photo URLs were included in the service call
      const serviceCall = PreadmissionService.updatePreadmissionAudit.mock.calls[0];
      expect(serviceCall[1]).toEqual(expect.objectContaining({
        photo_urls: expect.arrayContaining([
          expect.stringMatching(/\.jpg$/),
          expect.stringMatching(/\.jpg$/)
        ])
      }));
    });
  });

  describe('CBP Compliance Validation', () => {
    it('should validate FTZ compliance data in preadmissions', async () => {
      const ftzPreadmission = {
        admissionId: 'ADM-FTZ-001',
        customerId: 'CUST-001',
        e214: 'E214-FTZ-001',
        zone_status: 'PRIVILEGED_FOREIGN',
        port_of_unlading: 'Miami, FL',
        foreign_port_of_lading: 'Shanghai, China',
        it_number: 'IT-001',
        it_date: '2024-01-01',
        total_value: 25000.00
      };

      PreadmissionService.createPreadmission.mockResolvedValue({
        success: true,
        data: { id: 1, ...ftzPreadmission, status: 'Pending' }
      });

      const response = await request(app)
        .post('/api/preadmissions')
        .send(ftzPreadmission)
        .expect(201);

      expect(response.body.success).toBe(true);
      
      // Verify FTZ specific fields were processed
      expect(PreadmissionService.createPreadmission).toHaveBeenCalledWith(
        expect.objectContaining({
          zone_status: 'PRIVILEGED_FOREIGN',
          it_number: 'IT-001',
          it_date: '2024-01-01'
        }),
        {}
      );
    });

    it('should validate e214 format for FTZ entries', async () => {
      const invalidE214Data = {
        admissionId: 'ADM-001',
        customerId: 'CUST-001',
        e214: 'INVALID-FORMAT'
      };

      // Assume service validates e214 format
      PreadmissionService.createPreadmission.mockResolvedValue({
        success: false,
        error: 'Invalid e214 format',
        validationErrors: ['e214 must be in format E214-YYYYMMDD-###']
      });

      const response = await request(app)
        .post('/api/preadmissions')
        .send(invalidE214Data)
        .expect(400);

      expect(response.body.error).toContain('Invalid e214 format');
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle service timeouts gracefully', async () => {
      PreadmissionService.getAllPreadmissions.mockImplementation(
        () => new Promise((resolve) => {
          // Simulate timeout
          setTimeout(resolve, 30000);
        })
      );

      const response = await request(app)
        .get('/api/preadmissions')
        .timeout(1000)
        .expect(408); // Request timeout

      expect(response.body.error).toMatch(/timeout/i);
    });

    it('should handle database transaction failures', async () => {
      PreadmissionService.processAdmission.mockRejectedValue(
        new Error('Transaction rolled back due to constraint violation')
      );

      const response = await request(app)
        .post('/api/preadmissions/ADM-001/process')
        .send({
          partId: 'PART-001',
          customerId: 'CUST-001',
          status: 'ADMITTED',
          qty: 100,
          location: 'A-01-01'
        })
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        error: 'Internal server error'
      });
    });

    it('should maintain data consistency during concurrent operations', async () => {
      const auditData = {
        status: 'Approved',
        audit_notes: 'Concurrent test',
        audited_by: 'Test User'
      };

      // Simulate concurrent audit updates
      const concurrentRequests = Array(5).fill().map(() =>
        request(app)
          .put('/api/preadmissions/ADM-001/audit')
          .send(auditData)
      );

      PreadmissionService.updatePreadmissionAudit.mockResolvedValue({
        success: true,
        data: { id: 1, status: 'Approved' }
      });

      const responses = await Promise.allSettled(concurrentRequests);
      
      // Only one should succeed, others should be rejected due to concurrency control
      const successful = responses.filter(r => 
        r.status === 'fulfilled' && r.value.status === 200
      );
      const conflicts = responses.filter(r =>
        r.status === 'fulfilled' && r.value.status === 409
      );

      expect(successful.length).toBe(1);
      expect(conflicts.length).toBe(4);
    });
  });
});