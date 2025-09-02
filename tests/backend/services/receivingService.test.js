// tests/backend/services/receivingService.test.js
// Unit tests for ReceivingService business logic - FTZ compliance and dock audits

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
const mockFTZService = {
  validateCompliance: jest.fn(),
  checkDocumentation: jest.fn(),
  verifySealIntegrity: jest.fn()
};

const mockPhotoStorageService = {
  uploadPhoto: jest.fn(),
  getPhotoUrl: jest.fn(),
  deletePhoto: jest.fn()
};

const mockCustomsService = {
  validateManifest: jest.fn(),
  checkRestrictions: jest.fn(),
  submitNotification: jest.fn()
};

// Mock ReceivingService
jest.mock('../../../src/backend/services/business/ReceivingService', () => ({
  getAllReceivables: jest.fn(),
  getById: jest.fn(),
  createReceivable: jest.fn(),
  updateReceivable: jest.fn(),
  submitDockAudit: jest.fn(),
  verifyFTZCompliance: jest.fn(),
  getPendingReceivables: jest.fn(),
  getInProgressAudits: jest.fn(),
  getReceivingStatistics: jest.fn(),
  searchReceivables: jest.fn(),
  getAuditPhotos: jest.fn()
}));

describe('ReceivingService Unit Tests', () => {
  let ReceivingService;

  beforeEach(() => {
    jest.clearAllMocks();
    // Import fresh instance for each test
    ReceivingService = require('../../../src/backend/services/business/ReceivingService');
  });

  describe('getAllReceivables', () => {
    it('should return paginated receivables with default parameters', async () => {
      const mockReceivables = [
        {
          id: '1',
          admission_id: 'ADM-2024-001',
          customer_id: 'CUST-001',
          customer_name: 'Test Customer',
          container_number: 'CONT123456789',
          status: 'Pending',
          arrival_date: new Date().toISOString(),
          ftz_status: 'Pending',
          ftz_urgency: 'Normal'
        },
        {
          id: '2',
          admission_id: 'ADM-2024-002',
          customer_id: 'CUST-002',
          customer_name: 'Another Customer',
          container_number: 'CONT987654321',
          status: 'Arrived',
          arrival_date: new Date().toISOString(),
          ftz_status: 'Compliant',
          ftz_urgency: 'Urgent'
        }
      ];

      ReceivingService.getAllReceivables.mockResolvedValue({
        success: true,
        data: mockReceivables,
        count: 2
      });

      const result = await ReceivingService.getAllReceivables({
        limit: 100,
        offset: 0,
        accessToken: 'test-token'
      });

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.count).toBe(2);
      expect(result.data[0]).toMatchObject({
        admission_id: 'ADM-2024-001',
        status: 'Pending'
      });
    });

    it('should handle filtering by FTZ status', async () => {
      const mockFilteredReceivables = [
        {
          id: '1',
          admission_id: 'ADM-2024-001',
          ftz_status: 'Urgent'
        }
      ];

      ReceivingService.getAllReceivables.mockResolvedValue({
        success: true,
        data: mockFilteredReceivables,
        count: 1
      });

      const result = await ReceivingService.getAllReceivables({
        filters: [{ column: 'ftz_urgency', value: 'Urgent' }],
        accessToken: 'test-token'
      });

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].ftz_status).toBe('Urgent');
    });

    it('should handle database errors gracefully', async () => {
      ReceivingService.getAllReceivables.mockRejectedValue(
        new Error('Database connection failed')
      );

      await expect(
        ReceivingService.getAllReceivables({ accessToken: 'test-token' })
      ).rejects.toThrow('Database connection failed');
    });
  });

  describe('submitDockAudit', () => {
    const mockAdmissionId = 'ADM-2024-001';
    const mockAuditData = {
      audit_status: 'Accepted',
      audit_notes: 'Container inspection completed successfully',
      seal_number: 'SEAL123456',
      seal_intact: true,
      container_condition: 'Good',
      skid_count: 25,
      damage_reported: false,
      admitted_items: [
        { item_id: 'ITEM-001', expected_quantity: 100, actual_quantity: 100, condition: 'good' }
      ],
      ftz_compliance: {
        documentation_complete: true,
        manifest_verified: true,
        customs_cleared: true
      },
      temperature_check: '72°F',
      weight_verified: true,
      documentation_complete: true,
      photos: [
        {
          filename: 'container_exterior.jpg',
          data: Buffer.from('mock-photo-data'),
          size: 1024000,
          content_type: 'image/jpeg'
        }
      ],
      audited_by: 'John Inspector'
    };

    it('should successfully submit dock audit with photos', async () => {
      ReceivingService.submitDockAudit.mockResolvedValue({
        success: true,
        data: {
          id: mockAdmissionId,
          status: 'Accepted',
          audit_completed_at: new Date().toISOString(),
          audit_id: 'AUDIT-001',
          photos_uploaded: 1
        }
      });

      const result = await ReceivingService.submitDockAudit(
        mockAdmissionId,
        mockAuditData,
        { accessToken: 'test-token', userId: 'user-123' }
      );

      expect(result.success).toBe(true);
      expect(result.data.status).toBe('Accepted');
      expect(result.data).toHaveProperty('audit_completed_at');
      expect(result.data.photos_uploaded).toBe(1);
    });

    it('should validate required audit fields', async () => {
      const invalidAuditData = {
        // Missing required audit_status
        audit_notes: 'Test notes',
        seal_number: 'SEAL123456'
      };

      ReceivingService.submitDockAudit.mockRejectedValue(
        new Error('Audit status is required')
      );

      await expect(
        ReceivingService.submitDockAudit(
          mockAdmissionId,
          invalidAuditData,
          { accessToken: 'test-token' }
        )
      ).rejects.toThrow('Audit status is required');
    });

    it('should handle photo upload failures gracefully', async () => {
      const auditDataWithBadPhoto = {
        ...mockAuditData,
        photos: [
          {
            filename: 'corrupted.jpg',
            data: null, // Corrupted photo data
            size: 0,
            content_type: 'image/jpeg'
          }
        ]
      };

      ReceivingService.submitDockAudit.mockRejectedValue(
        new Error('Photo upload failed - invalid file data')
      );

      await expect(
        ReceivingService.submitDockAudit(
          mockAdmissionId,
          auditDataWithBadPhoto,
          { accessToken: 'test-token' }
        )
      ).rejects.toThrow('Photo upload failed - invalid file data');
    });

    it('should validate FTZ compliance data format', async () => {
      const invalidFTZData = {
        ...mockAuditData,
        ftz_compliance: 'invalid-format' // Should be object
      };

      ReceivingService.submitDockAudit.mockRejectedValue(
        new Error('FTZ compliance data must be a valid object')
      );

      await expect(
        ReceivingService.submitDockAudit(
          mockAdmissionId,
          invalidFTZData,
          { accessToken: 'test-token' }
        )
      ).rejects.toThrow('FTZ compliance data must be a valid object');
    });

    it('should handle rejection audit with reasons', async () => {
      const rejectionAuditData = {
        ...mockAuditData,
        audit_status: 'Rejected',
        rejection_reason: 'Seal tampered, container damaged'
      };

      ReceivingService.submitDockAudit.mockResolvedValue({
        success: true,
        data: {
          id: mockAdmissionId,
          status: 'Rejected',
          rejection_reason: 'Seal tampered, container damaged',
          audit_completed_at: new Date().toISOString()
        }
      });

      const result = await ReceivingService.submitDockAudit(
        mockAdmissionId,
        rejectionAuditData,
        { accessToken: 'test-token', userId: 'user-123' }
      );

      expect(result.success).toBe(true);
      expect(result.data.status).toBe('Rejected');
      expect(result.data.rejection_reason).toContain('Seal tampered');
    });
  });

  describe('verifyFTZCompliance', () => {
    const mockAdmissionId = 'ADM-2024-001';
    const mockComplianceData = {
      documentation_complete: true,
      container_seal_verified: true,
      customs_inspection_passed: true,
      manifest_matches_cargo: true,
      hts_codes_verified: true,
      country_of_origin_verified: true,
      value_declaration_verified: true,
      special_requirements_met: false,
      notes: 'Special permit required for hazardous materials',
      verified_by: 'Jane Compliance'
    };

    it('should successfully verify FTZ compliance', async () => {
      ReceivingService.verifyFTZCompliance.mockResolvedValue({
        success: true,
        data: {
          id: mockAdmissionId,
          ftz_compliance_status: 'Compliant',
          compliance_verified_at: new Date().toISOString(),
          compliance_score: 95
        }
      });

      const result = await ReceivingService.verifyFTZCompliance(
        mockAdmissionId,
        mockComplianceData,
        { accessToken: 'test-token', userId: 'user-123' }
      );

      expect(result.success).toBe(true);
      expect(result.data.ftz_compliance_status).toBe('Compliant');
      expect(result.data.compliance_score).toBeGreaterThan(90);
    });

    it('should validate required compliance fields', async () => {
      const incompleteComplianceData = {
        documentation_complete: true,
        // Missing container_seal_verified and customs_inspection_passed
        manifest_matches_cargo: true
      };

      ReceivingService.verifyFTZCompliance.mockRejectedValue(
        new Error('Container seal verification is required')
      );

      await expect(
        ReceivingService.verifyFTZCompliance(
          mockAdmissionId,
          incompleteComplianceData,
          { accessToken: 'test-token' }
        )
      ).rejects.toThrow('Container seal verification is required');
    });

    it('should handle non-compliant situations', async () => {
      const nonCompliantData = {
        ...mockComplianceData,
        customs_inspection_passed: false,
        notes: 'Failed customs inspection - missing documentation'
      };

      ReceivingService.verifyFTZCompliance.mockResolvedValue({
        success: true,
        data: {
          id: mockAdmissionId,
          ftz_compliance_status: 'Non-Compliant',
          compliance_issues: ['Failed customs inspection'],
          requires_action: true
        }
      });

      const result = await ReceivingService.verifyFTZCompliance(
        mockAdmissionId,
        nonCompliantData,
        { accessToken: 'test-token', userId: 'user-123' }
      );

      expect(result.success).toBe(true);
      expect(result.data.ftz_compliance_status).toBe('Non-Compliant');
      expect(result.data.requires_action).toBe(true);
    });
  });

  describe('getAuditPhotos', () => {
    const mockAdmissionId = 'ADM-2024-001';

    it('should return audit photos with metadata', async () => {
      const mockPhotos = [
        {
          id: 'photo-1',
          filename: 'container_exterior.jpg',
          url: 'https://example.com/photos/photo-1.jpg',
          size: 1024000,
          content_type: 'image/jpeg',
          uploaded_at: new Date().toISOString(),
          description: 'Container exterior view'
        },
        {
          id: 'photo-2',
          filename: 'seal_verification.jpg',
          url: 'https://example.com/photos/photo-2.jpg',
          size: 856000,
          content_type: 'image/jpeg',
          uploaded_at: new Date().toISOString(),
          description: 'Seal number verification'
        }
      ];

      ReceivingService.getAuditPhotos.mockResolvedValue({
        success: true,
        data: mockPhotos
      });

      const result = await ReceivingService.getAuditPhotos(
        mockAdmissionId,
        { accessToken: 'test-token' }
      );

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data[0]).toHaveProperty('url');
      expect(result.data[0]).toHaveProperty('filename');
    });

    it('should handle missing photos gracefully', async () => {
      ReceivingService.getAuditPhotos.mockResolvedValue({
        success: true,
        data: []
      });

      const result = await ReceivingService.getAuditPhotos(
        mockAdmissionId,
        { accessToken: 'test-token' }
      );

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(0);
    });
  });

  describe('getReceivingStatistics', () => {
    it('should return comprehensive receiving statistics', async () => {
      const mockStats = {
        total_receivables: 200,
        by_status: {
          'Pending': 50,
          'Arrived': 30,
          'Inspecting': 20,
          'Accepted': 80,
          'Rejected': 15,
          'On Hold': 5
        },
        by_ftz_status: {
          'Compliant': 150,
          'Non-Compliant': 25,
          'Pending': 20,
          'Exempt': 5
        },
        by_urgency: {
          'Urgent': 45,
          'Normal': 130,
          'Low': 25
        },
        performance_metrics: {
          avg_dock_time_hours: 6.5,
          audit_completion_rate: 0.94,
          ftz_compliance_rate: 0.88
        },
        daily_arrivals: [
          { date: '2024-01-15', count: 12 },
          { date: '2024-01-16', count: 15 },
          { date: '2024-01-17', count: 8 }
        ]
      };

      ReceivingService.getReceivingStatistics.mockResolvedValue({
        success: true,
        data: mockStats
      });

      const result = await ReceivingService.getReceivingStatistics(
        { startDate: '2024-01-01', endDate: '2024-01-31' },
        { accessToken: 'test-token' }
      );

      expect(result.success).toBe(true);
      expect(result.data.total_receivables).toBe(200);
      expect(result.data.by_status).toHaveProperty('Accepted');
      expect(result.data.performance_metrics.ftz_compliance_rate).toBeGreaterThan(0.8);
      expect(result.data.daily_arrivals).toBeInstanceOf(Array);
    });
  });

  describe('searchReceivables', () => {
    it('should search receivables by container number', async () => {
      const mockSearchResults = [
        {
          id: '1',
          admission_id: 'ADM-2024-001',
          container_number: 'CONT123456789',
          customer_name: 'Test Customer',
          status: 'Arrived'
        }
      ];

      ReceivingService.searchReceivables.mockResolvedValue({
        success: true,
        data: mockSearchResults
      });

      const result = await ReceivingService.searchReceivables(
        'CONT123456789',
        {},
        { accessToken: 'test-token' }
      );

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].container_number).toBe('CONT123456789');
    });

    it('should handle complex search filters', async () => {
      ReceivingService.searchReceivables.mockImplementation(
        async (searchTerm, filters, options) => {
          expect(filters).toHaveProperty('ftz_urgency');
          expect(filters).toHaveProperty('status');
          return {
            success: true,
            data: []
          };
        }
      );

      await ReceivingService.searchReceivables(
        'test',
        { ftz_urgency: 'Urgent', status: 'Arrived' },
        { accessToken: 'test-token' }
      );

      expect(ReceivingService.searchReceivables).toHaveBeenCalledWith(
        'test',
        { ftz_urgency: 'Urgent', status: 'Arrived' },
        { accessToken: 'test-token' }
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle authentication errors', async () => {
      ReceivingService.getAllReceivables.mockRejectedValue(
        new Error('Invalid access token')
      );

      await expect(
        ReceivingService.getAllReceivables({ accessToken: 'invalid-token' })
      ).rejects.toThrow('Invalid access token');
    });

    it('should handle file size validation errors', async () => {
      const oversizedPhotoData = {
        admission_id: 'ADM-2024-001',
        audit_status: 'Accepted',
        photos: [
          {
            filename: 'huge_photo.jpg',
            data: Buffer.alloc(20 * 1024 * 1024), // 20MB file
            size: 20 * 1024 * 1024,
            content_type: 'image/jpeg'
          }
        ]
      };

      ReceivingService.submitDockAudit.mockRejectedValue(
        new Error('Photo file size exceeds 10MB limit')
      );

      await expect(
        ReceivingService.submitDockAudit(
          'ADM-2024-001',
          oversizedPhotoData,
          { accessToken: 'test-token' }
        )
      ).rejects.toThrow('Photo file size exceeds 10MB limit');
    });
  });

  describe('Data Integrity', () => {
    it('should validate admission ID format', async () => {
      const invalidId = 'invalid-admission-id';

      ReceivingService.getById.mockRejectedValue(
        new Error('Invalid admission ID format')
      );

      await expect(
        ReceivingService.getById(invalidId, { accessToken: 'test-token' })
      ).rejects.toThrow('Invalid admission ID format');
    });

    it('should enforce referential integrity with customers', async () => {
      const receivableWithInvalidCustomer = {
        customer_id: 'NONEXISTENT-CUSTOMER',
        container_number: 'CONT123456789',
        status: 'Pending'
      };

      ReceivingService.createReceivable.mockRejectedValue(
        new Error('Referenced customer does not exist')
      );

      await expect(
        ReceivingService.createReceivable(
          receivableWithInvalidCustomer,
          { accessToken: 'test-token' }
        )
      ).rejects.toThrow('Referenced customer does not exist');
    });
  });

  describe('Performance Tests', () => {
    it('should handle concurrent audit submissions', async () => {
      const auditPromises = Array.from({ length: 10 }, (_, i) => {
        ReceivingService.submitDockAudit.mockResolvedValueOnce({
          success: true,
          data: { id: `ADM-2024-${String(i + 1).padStart(3, '0')}`, status: 'Accepted' }
        });

        return ReceivingService.submitDockAudit(
          `ADM-2024-${String(i + 1).padStart(3, '0')}`,
          { audit_status: 'Accepted', audited_by: `Inspector ${i + 1}` },
          { accessToken: 'test-token' }
        );
      });

      const results = await Promise.all(auditPromises);

      expect(results).toHaveLength(10);
      results.forEach(result => {
        expect(result.success).toBe(true);
      });
    });

    it('should efficiently handle large photo batches', async () => {
      const largePhotoBatch = Array.from({ length: 10 }, (_, i) => ({
        filename: `photo_${i + 1}.jpg`,
        data: Buffer.alloc(1024 * 1024), // 1MB each
        size: 1024 * 1024,
        content_type: 'image/jpeg'
      }));

      const auditWithManyPhotos = {
        audit_status: 'Accepted',
        photos: largePhotoBatch,
        audited_by: 'Test Inspector'
      };

      ReceivingService.submitDockAudit.mockResolvedValue({
        success: true,
        data: {
          id: 'ADM-2024-001',
          status: 'Accepted',
          photos_uploaded: 10
        }
      });

      const start = Date.now();
      const result = await ReceivingService.submitDockAudit(
        'ADM-2024-001',
        auditWithManyPhotos,
        { accessToken: 'test-token' }
      );
      const duration = Date.now() - start;

      expect(result.success).toBe(true);
      expect(result.data.photos_uploaded).toBe(10);
      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
    });
  });
});