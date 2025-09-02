// tests/backend/admin-api.test.js
// Integration tests for Admin API endpoints used by modals - ICRS SPARC
// Tests API contracts, validation, and database interactions

import { jest } from '@jest/globals';
import request from 'supertest';

// Mock the app setup (would normally be imported)
const app = {
  post: jest.fn(),
  put: jest.fn(),
  get: jest.fn(),
  delete: jest.fn(),
  listen: jest.fn()
};

// Mock Supabase client
const mockSupabase = {
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  single: jest.fn().mockReturnThis(),
  then: jest.fn()
};

// Mock authentication middleware
const mockAuth = {
  requireAuth: jest.fn((req, res, next) => {
    req.user = { id: 1, role: 'admin' };
    next();
  }),
  requirePermission: jest.fn((permission) => (req, res, next) => {
    req.user = { id: 1, role: 'admin', permissions: ['admin'] };
    next();
  })
};

describe('Admin API Endpoints', () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Employee API (/api/admin/employees)', () => {
    
    describe('POST /api/admin/employees', () => {
      
      test('creates employee with valid data', async () => {
        const employeeData = {
          name: 'John Doe',
          email: 'john@example.com',
          role: 'admin',
          department: 'IT',
          phone: '(555) 123-4567',
          status: 'active'
        };

        // Mock successful database insertion
        mockSupabase.insert.mockResolvedValueOnce({
          data: [{ id: 1, ...employeeData }],
          error: null
        });

        const response = await request(app)
          .post('/api/admin/employees')
          .send(employeeData)
          .expect(200);

        expect(response.body).toEqual({
          success: true,
          data: { id: 1, ...employeeData }
        });

        expect(mockSupabase.from).toHaveBeenCalledWith('employees');
        expect(mockSupabase.insert).toHaveBeenCalledWith([employeeData]);
      });

      test('validates required fields', async () => {
        const invalidData = {
          email: 'john@example.com'
          // Missing required name and role
        };

        const response = await request(app)
          .post('/api/admin/employees')
          .send(invalidData)
          .expect(400);

        expect(response.body).toEqual({
          success: false,
          error: 'Name and role are required'
        });
      });

      test('validates email format', async () => {
        const invalidData = {
          name: 'John Doe',
          email: 'invalid-email',
          role: 'admin'
        };

        const response = await request(app)
          .post('/api/admin/employees')
          .send(invalidData)
          .expect(400);

        expect(response.body).toEqual({
          success: false,
          error: 'Invalid email format'
        });
      });

      test('prevents duplicate emails', async () => {
        const employeeData = {
          name: 'John Doe',
          email: 'john@example.com',
          role: 'admin'
        };

        // Mock database error for duplicate email
        mockSupabase.insert.mockResolvedValueOnce({
          data: null,
          error: { code: '23505', message: 'duplicate key value violates unique constraint' }
        });

        const response = await request(app)
          .post('/api/admin/employees')
          .send(employeeData)
          .expect(409);

        expect(response.body).toEqual({
          success: false,
          error: 'Email already exists'
        });
      });

      test('handles database errors gracefully', async () => {
        const employeeData = {
          name: 'John Doe',
          email: 'john@example.com',
          role: 'admin'
        };

        mockSupabase.insert.mockResolvedValueOnce({
          data: null,
          error: { message: 'Database connection failed' }
        });

        const response = await request(app)
          .post('/api/admin/employees')
          .send(employeeData)
          .expect(500);

        expect(response.body).toEqual({
          success: false,
          error: 'Failed to create employee'
        });
      });

    });

    describe('PUT /api/admin/employees/:id', () => {
      
      test('updates employee with valid data', async () => {
        const updateData = {
          name: 'John Smith',
          email: 'john.smith@example.com',
          role: 'manager'
        };

        mockSupabase.update.mockResolvedValueOnce({
          data: [{ id: 1, ...updateData }],
          error: null
        });

        const response = await request(app)
          .put('/api/admin/employees/1')
          .send(updateData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(mockSupabase.update).toHaveBeenCalledWith(updateData);
        expect(mockSupabase.eq).toHaveBeenCalledWith('id', '1');
      });

      test('returns 404 for non-existent employee', async () => {
        mockSupabase.update.mockResolvedValueOnce({
          data: [],
          error: null
        });

        const response = await request(app)
          .put('/api/admin/employees/999')
          .send({ name: 'Updated Name' })
          .expect(404);

        expect(response.body).toEqual({
          success: false,
          error: 'Employee not found'
        });
      });

    });

  });

  describe('Parts API (/api/admin/parts)', () => {
    
    describe('POST /api/admin/parts', () => {
      
      test('creates part with complete data', async () => {
        const partData = {
          id: 'TEST-PART-001',
          description: 'Test Electronic Component',
          hts_code: '8541.10.0060',
          country_of_origin: 'USA',
          material: 'electronic',
          standard_value: 25.00,
          material_price: 15.00,
          labor_price: 10.00,
          unit_of_measure: 'EA',
          gross_weight: 0.100
        };

        mockSupabase.insert.mockResolvedValueOnce({
          data: [partData],
          error: null
        });

        const response = await request(app)
          .post('/api/admin/parts')
          .send(partData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toEqual(partData);
      });

      test('validates HTS code format', async () => {
        const invalidData = {
          id: 'TEST-001',
          description: 'Test part',
          hts_code: 'invalid-format'
        };

        const response = await request(app)
          .post('/api/admin/parts')
          .send(invalidData)
          .expect(400);

        expect(response.body).toEqual({
          success: false,
          error: 'HTS code must be in format XXXX.XX.XXXX'
        });
      });

      test('validates numeric fields', async () => {
        const invalidData = {
          id: 'TEST-001',
          description: 'Test part',
          standard_value: 'not-a-number'
        };

        const response = await request(app)
          .post('/api/admin/parts')
          .send(invalidData)
          .expect(400);

        expect(response.body).toEqual({
          success: false,
          error: 'Standard value must be a valid number'
        });
      });

      test('prevents duplicate part IDs', async () => {
        const partData = {
          id: 'EXISTING-PART',
          description: 'Test part'
        };

        mockSupabase.insert.mockResolvedValueOnce({
          data: null,
          error: { code: '23505', message: 'duplicate key' }
        });

        const response = await request(app)
          .post('/api/admin/parts')
          .send(partData)
          .expect(409);

        expect(response.body).toEqual({
          success: false,
          error: 'Part ID already exists'
        });
      });

    });

  });

  describe('Customer API (/api/admin/customers)', () => {
    
    describe('POST /api/admin/customers', () => {
      
      test('creates customer with contacts', async () => {
        const customerData = {
          name: 'Acme Corporation',
          ein: '12-3456789',
          address: '123 Business St',
          contact_email: 'contact@acme.com',
          contacts: [{
            name: 'Jane Smith',
            email: 'jane@acme.com',
            phone: '(555) 123-4567',
            is_primary: true
          }]
        };

        // Mock customer creation
        mockSupabase.insert.mockResolvedValueOnce({
          data: [{ id: 1, ...customerData }],
          error: null
        });

        const response = await request(app)
          .post('/api/admin/customers')
          .send(customerData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(mockSupabase.insert).toHaveBeenCalledWith([
          expect.objectContaining({
            name: 'Acme Corporation',
            ein: '12-3456789'
          })
        ]);
      });

      test('validates EIN format', async () => {
        const invalidData = {
          name: 'Test Company',
          ein: 'invalid-ein'
        };

        const response = await request(app)
          .post('/api/admin/customers')
          .send(invalidData)
          .expect(400);

        expect(response.body).toEqual({
          success: false,
          error: 'EIN must be in format XX-XXXXXXX'
        });
      });

      test('requires at least one contact', async () => {
        const invalidData = {
          name: 'Test Company',
          contacts: []
        };

        const response = await request(app)
          .post('/api/admin/customers')
          .send(invalidData)
          .expect(400);

        expect(response.body).toEqual({
          success: false,
          error: 'At least one contact is required'
        });
      });

      test('validates contact email formats', async () => {
        const invalidData = {
          name: 'Test Company',
          contacts: [{
            name: 'Contact',
            email: 'invalid-email'
          }]
        };

        const response = await request(app)
          .post('/api/admin/customers')
          .send(invalidData)
          .expect(400);

        expect(response.body).toEqual({
          success: false,
          error: 'Invalid contact email format'
        });
      });

    });

  });

  describe('Supplier API (/api/admin/suppliers)', () => {
    
    describe('POST /api/admin/suppliers', () => {
      
      test('creates supplier with all sections', async () => {
        const supplierData = {
          name: 'Global Manufacturing',
          country: 'CHN',
          contact_person: 'Li Wei',
          contact_email: 'li@global.com',
          broker_name: 'International Broker',
          broker_contact: 'John Broker',
          broker_contact_email: 'john@broker.com',
          payment_terms: 'net-30',
          currency: 'USD',
          contacts: [{
            name: 'Li Wei',
            email: 'li@global.com',
            is_primary: true
          }]
        };

        mockSupabase.insert.mockResolvedValueOnce({
          data: [{ id: 1, ...supplierData }],
          error: null
        });

        const response = await request(app)
          .post('/api/admin/suppliers')
          .send(supplierData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(mockSupabase.insert).toHaveBeenCalledWith([
          expect.objectContaining({
            name: 'Global Manufacturing',
            country: 'CHN'
          })
        ]);
      });

      test('requires country field', async () => {
        const invalidData = {
          name: 'Test Supplier'
          // Missing required country
        };

        const response = await request(app)
          .post('/api/admin/suppliers')
          .send(invalidData)
          .expect(400);

        expect(response.body).toEqual({
          success: false,
          error: 'Country is required'
        });
      });

      test('validates email formats for broker contacts', async () => {
        const invalidData = {
          name: 'Test Supplier',
          country: 'USA',
          broker_contact_email: 'invalid-email'
        };

        const response = await request(app)
          .post('/api/admin/suppliers')
          .send(invalidData)
          .expect(400);

        expect(response.body).toEqual({
          success: false,
          error: 'Invalid broker email format'
        });
      });

    });

  });

  describe('Authentication and Authorization', () => {
    
    test('requires authentication for all endpoints', async () => {
      // Mock unauthenticated request
      mockAuth.requireAuth.mockImplementationOnce((req, res, next) => {
        res.status(401).json({ error: 'Unauthorized' });
      });

      const response = await request(app)
        .post('/api/admin/employees')
        .send({})
        .expect(401);

      expect(response.body.error).toBe('Unauthorized');
    });

    test('requires admin permission', async () => {
      // Mock insufficient permissions
      mockAuth.requirePermission.mockImplementationOnce(() => (req, res, next) => {
        res.status(403).json({ error: 'Insufficient permissions' });
      });

      const response = await request(app)
        .post('/api/admin/employees')
        .send({})
        .expect(403);

      expect(response.body.error).toBe('Insufficient permissions');
    });

  });

  describe('Error Handling', () => {
    
    test('handles malformed JSON gracefully', async () => {
      const response = await request(app)
        .post('/api/admin/employees')
        .set('Content-Type', 'application/json')
        .send('invalid json')
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Invalid JSON'
      });
    });

    test('handles database connection failures', async () => {
      mockSupabase.insert.mockRejectedValueOnce(new Error('Connection timeout'));

      const response = await request(app)
        .post('/api/admin/employees')
        .send({
          name: 'Test',
          email: 'test@example.com',
          role: 'admin'
        })
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        error: 'Database error'
      });
    });

    test('sanitizes sensitive information in error responses', async () => {
      mockSupabase.insert.mockResolvedValueOnce({
        data: null,
        error: { 
          message: 'password "secret123" is too weak',
          details: 'Full stack trace with sensitive data'
        }
      });

      const response = await request(app)
        .post('/api/admin/employees')
        .send({
          name: 'Test',
          email: 'test@example.com',
          role: 'admin'
        })
        .expect(500);

      // Should not expose sensitive database details
      expect(response.body.error).not.toContain('secret123');
      expect(response.body.error).not.toContain('stack trace');
    });

  });

  describe('Data Validation Edge Cases', () => {
    
    test('handles extremely long strings gracefully', async () => {
      const longString = 'a'.repeat(10000);
      
      const response = await request(app)
        .post('/api/admin/employees')
        .send({
          name: longString,
          email: 'test@example.com',
          role: 'admin'
        })
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Name exceeds maximum length'
      });
    });

    test('handles special characters in names', async () => {
      const specialCharsData = {
        name: "José María O'Connor-Smith",
        email: 'jose@example.com',
        role: 'admin'
      };

      mockSupabase.insert.mockResolvedValueOnce({
        data: [specialCharsData],
        error: null
      });

      const response = await request(app)
        .post('/api/admin/employees')
        .send(specialCharsData)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('prevents SQL injection in part IDs', async () => {
      const maliciousData = {
        id: "'; DROP TABLE parts; --",
        description: 'Malicious part'
      };

      // Should be sanitized/rejected before reaching database
      const response = await request(app)
        .post('/api/admin/parts')
        .send(maliciousData)
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Invalid part ID format'
      });
    });

  });

  describe('Performance and Rate Limiting', () => {
    
    test('handles high volume of concurrent requests', async () => {
      const requests = [];
      
      for (let i = 0; i < 100; i++) {
        requests.push(
          request(app)
            .post('/api/admin/employees')
            .send({
              name: `Test User ${i}`,
              email: `test${i}@example.com`,
              role: 'admin'
            })
        );
      }

      mockSupabase.insert.mockResolvedValue({
        data: [{ id: 1 }],
        error: null
      });

      const responses = await Promise.all(requests);
      
      // All requests should succeed (or fail gracefully)
      responses.forEach(response => {
        expect([200, 429]).toContain(response.status); // 200 or rate limited
      });
    });

    test('implements rate limiting for admin endpoints', async () => {
      // Mock rate limit exceeded
      const responses = [];
      
      for (let i = 0; i < 10; i++) {
        const response = await request(app)
          .post('/api/admin/employees')
          .send({
            name: `Test ${i}`,
            email: `test${i}@example.com`,
            role: 'admin'
          });
        responses.push(response);
      }

      // At least one request should be rate limited
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

  });

});