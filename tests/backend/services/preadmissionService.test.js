// tests/backend/services/preadmissionService.test.js
// Comprehensive unit tests for PreadmissionService with FTZ compliance validation

const PreadmissionService = require('../../../src/backend/services/business/PreadmissionService');
const DatabaseService = require('../../../src/backend/db/supabase-client');

// Mock DatabaseService
jest.mock('../../../src/backend/db/supabase-client');

describe('PreadmissionService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validatePreadmission', () => {
    it('should validate required fields', () => {
      const validData = {
        admissionId: 'ADM-001',
        customerId: 'CUST-001'
      };
      
      const result = PreadmissionService.validatePreadmission(validData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject missing admissionId', () => {
      const invalidData = {
        customerId: 'CUST-001'
      };
      
      const result = PreadmissionService.validatePreadmission(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Admission ID is required');
    });

    it('should reject empty admissionId', () => {
      const invalidData = {
        admissionId: '   ',
        customerId: 'CUST-001'
      };
      
      const result = PreadmissionService.validatePreadmission(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Admission ID is required');
    });

    it('should reject missing customerId', () => {
      const invalidData = {
        admissionId: 'ADM-001'
      };
      
      const result = PreadmissionService.validatePreadmission(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Customer ID is required');
    });

    it('should reject container number that is too long', () => {
      const invalidData = {
        admissionId: 'ADM-001',
        customerId: 'CUST-001',
        container: 'A'.repeat(51) // 51 characters
      };
      
      const result = PreadmissionService.validatePreadmission(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Container number must be 50 characters or less');
    });

    it('should reject invalid total_value', () => {
      const invalidData = {
        admissionId: 'ADM-001',
        customerId: 'CUST-001',
        total_value: 'not-a-number'
      };
      
      const result = PreadmissionService.validatePreadmission(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Total value must be a valid number');
    });

    it('should accept valid numeric total_value', () => {
      const validData = {
        admissionId: 'ADM-001',
        customerId: 'CUST-001',
        total_value: '1500.50'
      };
      
      const result = PreadmissionService.validatePreadmission(validData);
      expect(result.isValid).toBe(true);
    });
  });

  describe('createPreadmission', () => {
    it('should create a valid preadmission', async () => {
      const mockCreatedData = { id: 1, admissionId: 'ADM-001', status: 'Pending' };
      DatabaseService.insert.mockResolvedValue({
        success: true,
        data: [mockCreatedData]
      });

      const preadmissionData = {
        admissionId: 'ADM-001',
        customerId: 'CUST-001',
        e214: 'E214-001',
        container: 'CONTAINER-001',
        bol: 'BOL-001'
      };

      const result = await PreadmissionService.createPreadmission(preadmissionData);
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockCreatedData);
      expect(DatabaseService.insert).toHaveBeenCalledWith(
        'preadmissions',
        [expect.objectContaining({
          admissionId: 'ADM-001',
          customerId: 'CUST-001',
          e214: 'E214-001',
          container: 'CONTAINER-001',
          bol: 'BOL-001',
          status: 'Pending'
        })],
        {}
      );
    });

    it('should set default values for optional fields', async () => {
      DatabaseService.insert.mockResolvedValue({
        success: true,
        data: [{ id: 1 }]
      });

      const minimalData = {
        admissionId: 'ADM-001',
        customerId: 'CUST-001'
      };

      await PreadmissionService.createPreadmission(minimalData);
      
      expect(DatabaseService.insert).toHaveBeenCalledWith(
        'preadmissions',
        [expect.objectContaining({
          admissionId: 'ADM-001',
          customerId: 'CUST-001',
          status: 'Pending',
          items: [],
          arrivalDate: expect.any(String) // Default to current ISO string
        })],
        {}
      );
    });

    it('should sanitize input fields', async () => {
      DatabaseService.insert.mockResolvedValue({
        success: true,
        data: [{ id: 1 }]
      });

      const dirtyData = {
        admissionId: '  ADM-001  ',
        customerId: 'CUST-001',
        e214: '<script>E214-001</script>',
        container: '  CONTAINER-001  ',
        conveyance_name: '<div>Ship Name</div>',
        port_of_unlading: '  Port Name  '
      };

      await PreadmissionService.createPreadmission(dirtyData);
      
      expect(DatabaseService.insert).toHaveBeenCalledWith(
        'preadmissions',
        [expect.objectContaining({
          admissionId: 'ADM-001',
          e214: 'scriptE214-001/script',
          container: 'CONTAINER-001',
          conveyance_name: 'divShip Name/div',
          port_of_unlading: 'Port Name'
        })],
        {}
      );
    });

    it('should handle unique constraint violations', async () => {
      DatabaseService.insert.mockRejectedValue(
        new Error('duplicate key value violates unique constraint')
      );

      const preadmissionData = {
        admissionId: 'ADM-001',
        customerId: 'CUST-001'
      };

      const result = await PreadmissionService.createPreadmission(preadmissionData);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Admission ID \'ADM-001\' already exists');
    });
  });

  describe('updatePreadmissionAudit', () => {
    it('should update preadmission with audit data', async () => {
      const mockPreadmission = { id: 1, admissionId: 'ADM-001' };
      DatabaseService.select.mockResolvedValue({
        success: true,
        data: mockPreadmission
      });
      DatabaseService.update.mockResolvedValue({
        success: true,
        data: { ...mockPreadmission, status: 'Audited' }
      });

      const auditData = {
        status: 'Approved',
        audit_notes: 'All items verified',
        photo_urls: ['photo1.jpg', 'photo2.jpg'],
        audited_by: 'John Auditor',
        admitted_items: [{ partId: 'PART-001', qty: 100 }],
        seal_number: 'SEAL-123',
        skid_count: 5
      };

      const result = await PreadmissionService.updatePreadmissionAudit('ADM-001', auditData);
      
      expect(result.success).toBe(true);
      expect(DatabaseService.update).toHaveBeenCalledWith(
        'preadmissions',
        1,
        expect.objectContaining({
          status: 'Approved',
          audit_notes: 'All items verified',
          photo_urls: ['photo1.jpg', 'photo2.jpg'],
          audited_by: 'John Auditor',
          admitted_items: [{ partId: 'PART-001', qty: 100 }],
          seal_number: 'SEAL-123',
          skid_count: 5,
          audit_timestamp: expect.any(String)
        }),
        {}
      );
    });

    it('should sanitize audit data', async () => {
      DatabaseService.select.mockResolvedValue({
        success: true,
        data: { id: 1, admissionId: 'ADM-001' }
      });
      DatabaseService.update.mockResolvedValue({ success: true, data: {} });

      const dirtyAuditData = {
        status: 'Approved',
        audit_notes: '<script>Malicious note</script>',
        rejection_reason: '  Reason with spaces  ',
        audited_by: '<div>Auditor Name</div>',
        seal_number: '  SEAL-123  ',
        skid_count: '10' // String that should be parsed to int
      };

      await PreadmissionService.updatePreadmissionAudit('ADM-001', dirtyAuditData);
      
      expect(DatabaseService.update).toHaveBeenCalledWith(
        'preadmissions',
        1,
        expect.objectContaining({
          audit_notes: 'scriptMalicious note/script',
          rejection_reason: 'Reason with spaces',
          audited_by: 'divAuditor Name/div',
          seal_number: 'SEAL-123',
          skid_count: 10
        }),
        {}
      );
    });

    it('should handle preadmission not found', async () => {
      DatabaseService.select.mockResolvedValue({
        success: false,
        error: 'Not found'
      });

      const auditData = { status: 'Approved' };
      const result = await PreadmissionService.updatePreadmissionAudit('NONEXISTENT', auditData);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Preadmission not found');
      expect(DatabaseService.update).not.toHaveBeenCalled();
    });
  });

  describe('processAdmission', () => {
    it('should create inventory lot and location records', async () => {
      const mockPreadmission = {
        id: 1,
        admissionId: 'ADM-001',
        arrivalDate: '2024-01-01',
        bol: 'BOL-001',
        e214: 'E214-001',
        conveyance_name: 'Ship Name',
        import_date: '2024-01-01',
        port_of_unlading: 'Port Name',
        total_value: 1500.00,
        total_charges: 150.00
      };

      const mockLot = { id: 1, lot_number: 'L-123456789' };
      
      DatabaseService.insert
        .mockResolvedValueOnce({ success: true, data: [mockLot] }) // inventory_lots
        .mockResolvedValueOnce({ success: true, data: [{}] }) // inventory_locations
        .mockResolvedValueOnce({ success: true, data: [{}] }); // transactions

      const admissionData = {
        partId: 'PART-001',
        customerId: 'CUST-001',
        status: 'ADMITTED',
        qty: 100,
        location: 'A-01-01'
      };

      const result = await PreadmissionService.processAdmission(admissionData, mockPreadmission);
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockLot);
      
      // Verify inventory lot creation
      expect(DatabaseService.insert).toHaveBeenNthCalledWith(1, 
        'inventory_lots',
        [expect.objectContaining({
          part_id: 'PART-001',
          customer_id: 'CUST-001',
          status: 'ADMITTED',
          original_quantity: 100,
          current_quantity: 100,
          admission_date: '2024-01-01',
          manifest_number: 'BOL-001',
          e214_admission_number: 'E214-001'
        })],
        {}
      );
      
      // Verify location record creation
      expect(DatabaseService.insert).toHaveBeenNthCalledWith(2,
        'inventory_locations',
        [expect.objectContaining({
          location_name: 'A-01-01',
          quantity: 100
        })],
        {}
      );
      
      // Verify transaction record creation
      expect(DatabaseService.insert).toHaveBeenNthCalledWith(3,
        'transactions',
        [expect.objectContaining({
          type: 'Admission',
          quantity_change: 100,
          source_document_number: 'BOL-001'
        })],
        {}
      );
    });

    it('should require location for admission', async () => {
      const admissionData = {
        partId: 'PART-001',
        customerId: 'CUST-001',
        status: 'ADMITTED',
        qty: 100
        // Missing location
      };

      const result = await PreadmissionService.processAdmission(admissionData, {});
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Storage location is required for admission');
      expect(DatabaseService.insert).not.toHaveBeenCalled();
    });

    it('should handle lot creation failure gracefully', async () => {
      DatabaseService.insert.mockResolvedValueOnce({
        success: false,
        error: 'Database constraint violation'
      });

      const admissionData = {
        partId: 'PART-001',
        customerId: 'CUST-001',
        status: 'ADMITTED',
        qty: 100,
        location: 'A-01-01'
      };

      const result = await PreadmissionService.processAdmission(admissionData, {});
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Database constraint violation');
    });
  });

  describe('searchPreadmissions', () => {
    it('should search across multiple fields', async () => {
      const mockData = [
        { id: 1, admissionId: 'ADM-001', e214: 'E214-123', bol: null, container: null },
        { id: 2, admissionId: 'ADM-002', e214: null, bol: 'BOL-123', container: null },
        { id: 3, admissionId: 'ADM-003', e214: null, bol: null, container: 'CONT-123' }
      ];
      DatabaseService.select.mockResolvedValue({ success: true, data: mockData });

      const result = await PreadmissionService.searchPreadmissions('123');
      
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(3); // All contain '123' in different fields
    });

    it('should apply filters along with search', async () => {
      const mockData = [
        { id: 1, admissionId: 'ADM-001', status: 'Pending', customerId: 'CUST-001' },
        { id: 2, admissionId: 'ADM-002', status: 'Approved', customerId: 'CUST-001' },
        { id: 3, admissionId: 'TEST-001', status: 'Pending', customerId: 'CUST-002' }
      ];
      DatabaseService.select.mockResolvedValue({ success: true, data: mockData });

      const filters = { status: 'Pending', customerId: 'CUST-001' };
      const result = await PreadmissionService.searchPreadmissions('ADM', filters);
      
      expect(DatabaseService.select).toHaveBeenCalledWith('preadmissions', {
        filters: [
          { column: 'status', value: 'Pending' },
          { column: 'customerId', value: 'CUST-001' }
        ],
        orderBy: 'created_at.desc'
      });
      
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1); // Only ADM-001 matches both filters and search
    });
  });

  describe('getPreadmissionStats', () => {
    it('should calculate comprehensive statistics', async () => {
      const mockData = [
        { id: 1, status: 'Pending', customerId: 'CUST-001', total_value: 1000, created_at: '2024-01-01' },
        { id: 2, status: 'Approved', customerId: 'CUST-001', total_value: 2000, created_at: '2024-01-02' },
        { id: 3, status: 'Pending', customerId: 'CUST-002', total_value: 1500, created_at: '2024-01-03' }
      ];
      DatabaseService.select.mockResolvedValue({ success: true, data: mockData });

      const result = await PreadmissionService.getPreadmissionStats();
      
      expect(result.success).toBe(true);
      expect(result.data.total).toBe(3);
      expect(result.data.by_status).toEqual({
        'Pending': 2,
        'Approved': 1
      });
      expect(result.data.by_customer).toEqual({
        'CUST-001': 2,
        'CUST-002': 1
      });
      expect(result.data.total_value).toBe(4500);
    });

    it('should filter statistics by date range', async () => {
      const mockData = [
        { id: 1, status: 'Pending', created_at: '2024-01-01T10:00:00Z' },
        { id: 2, status: 'Approved', created_at: '2024-01-15T10:00:00Z' },
        { id: 3, status: 'Pending', created_at: '2024-01-30T10:00:00Z' }
      ];
      DatabaseService.select.mockResolvedValue({ success: true, data: mockData });

      const dateRange = {
        startDate: '2024-01-10',
        endDate: '2024-01-20'
      };
      
      const result = await PreadmissionService.getPreadmissionStats(dateRange);
      
      expect(result.success).toBe(true);
      expect(result.data.total).toBe(1); // Only one record in date range
    });
  });

  describe('error handling', () => {
    it('should handle database connection errors', async () => {
      DatabaseService.select.mockRejectedValue(new Error('Connection timeout'));

      const result = await PreadmissionService.getAllPreadmissions();
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Connection timeout');
    });

    it('should handle validation errors properly', async () => {
      const invalidData = {}; // Missing all required fields

      const result = await PreadmissionService.createPreadmission(invalidData);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Validation failed');
      expect(result.validationErrors).toContain('Admission ID is required');
      expect(result.validationErrors).toContain('Customer ID is required');
    });
  });
});