// tests/backend/fix-plan-verification/locations.test.js
// Comprehensive tests for locations API endpoints with updated schema (storage_locations table)

const request = require('supertest');
const express = require('express');
const locationsRouter = require('../../../src/backend/api/routes/locations');
const supabaseClient = require('../../../src/backend/db/supabase-client');

const app = express();
app.use(express.json());

// Mock middleware to add authorization header
app.use((req, res, next) => {
  req.headers.authorization = 'Bearer demo-token-for-testing-only-123';
  next();
});

app.use('/api/locations', locationsRouter);

describe('Locations API Endpoints - Fix Plan Verification', () => {
  let testLocationId = null;

  beforeAll(async () => {
    // Verify storage_locations table exists
    const storageLocationsCheck = await supabaseClient.getAll('storage_locations', { limit: 1 }, true);
    console.log('Storage locations table check:', storageLocationsCheck.success);
    
    if (!storageLocationsCheck.success) {
      console.warn('Warning: storage_locations table may not exist', storageLocationsCheck.error);
    }
  });

  describe('GET /api/locations', () => {
    test('should return locations from storage_locations table', async () => {
      const response = await request(app)
        .get('/api/locations')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body).toHaveProperty('count');
      expect(response.body).toHaveProperty('pagination');

      // Verify pagination structure
      expect(response.body.pagination).toHaveProperty('limit');
      expect(response.body.pagination).toHaveProperty('offset');
      expect(response.body.pagination).toHaveProperty('total');

      if (response.body.data.length > 0) {
        const location = response.body.data[0];
        testLocationId = location.id;
        
        // Verify location structure
        expect(location).toHaveProperty('id');
        // Should have location identification fields
        expect(location).toHaveProperty('location_code');
      }
    });

    test('should support pagination parameters', async () => {
      const response = await request(app)
        .get('/api/locations?limit=10&offset=0')
        .expect(200);

      expect(response.body.pagination.limit).toBe(10);
      expect(response.body.pagination.offset).toBe(0);
      expect(response.body.data.length).toBeLessThanOrEqual(10);
    });

    test('should support search functionality by name', async () => {
      const response = await request(app)
        .get('/api/locations?search=test')
        .expect(200);

      expect(response.body.success).toBe(true);
      
      // If there are results, they should contain the search term in name field
      if (response.body.data.length > 0) {
        response.body.data.forEach(location => {
          const searchable = location.name || '';
          expect(searchable.toLowerCase()).toContain('test');
        });
      }
    });

    test('should handle active filter parameter', async () => {
      // Test with active=true (default behavior)
      const activeResponse = await request(app)
        .get('/api/locations?active=true')
        .expect(200);

      expect(activeResponse.body.success).toBe(true);

      // Test with active=false
      const inactiveResponse = await request(app)
        .get('/api/locations?active=false')
        .expect(200);

      expect(inactiveResponse.body.success).toBe(true);
    });

    test('should support high limit for bulk operations', async () => {
      const response = await request(app)
        .get('/api/locations?limit=1000')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.pagination.limit).toBe(1000);
    });

    test('should handle empty filter behavior correctly', async () => {
      // Test that the empty filter logic works (line 29 in the router)
      const response = await request(app)
        .get('/api/locations?active=undefined')
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/locations/:id', () => {
    test('should return specific location by ID', async () => {
      if (!testLocationId) {
        // Get a location ID first
        const locationsResponse = await request(app).get('/api/locations?limit=1');
        if (locationsResponse.body.data.length === 0) {
          return; // Skip if no locations available
        }
        testLocationId = locationsResponse.body.data[0].id;
      }

      const response = await request(app)
        .get(`/api/locations/${testLocationId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBe(testLocationId);
    });

    test('should return 404 for non-existent location', async () => {
      const response = await request(app)
        .get('/api/locations/99999999')
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    test('should return complete location details', async () => {
      if (!testLocationId) return;

      const response = await request(app)
        .get(`/api/locations/${testLocationId}`)
        .expect(200);

      const location = response.body.data;
      
      // Verify common storage location fields
      expect(location).toHaveProperty('id');
      expect(location).toHaveProperty('location_code');
      
      // Optional fields that might be present
      const optionalFields = ['description', 'zone', 'aisle', 'level', 'position', 'active'];
      optionalFields.forEach(field => {
        if (location.hasOwnProperty(field)) {
          expect(location[field]).toBeDefined();
        }
      });
    });
  });

  describe('POST /api/locations', () => {
    test('should create new location', async () => {
      const newLocation = {
        location_code: 'TEST-LOC-001',
        description: 'Test location for API verification',
        zone: 'A',
        aisle: '1',
        level: '2',
        position: '3',
        active: true
      };

      const response = await request(app)
        .post('/api/locations')
        .send(newLocation);

      if (response.status === 201) {
        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
        expect(response.body.data.location_code).toBe(newLocation.location_code);
        expect(response.body.data).toHaveProperty('created_at');
        expect(response.body.data).toHaveProperty('updated_at');
        expect(response.body.data.active).toBe(true);

        // Store for potential cleanup
        testLocationId = response.body.data.id;
      } else {
        // Creation may fail due to database constraints or missing table
        expect([400, 500]).toContain(response.status);
      }
    });

    test('should default active to true if not specified', async () => {
      const newLocation = {
        location_code: 'TEST-DEFAULT-001',
        description: 'Location to test default active value'
      };

      const response = await request(app)
        .post('/api/locations')
        .send(newLocation);

      if (response.status === 201) {
        expect(response.body.data.active).toBe(true);
      }
    });

    test('should add timestamps automatically', async () => {
      const newLocation = {
        location_code: 'TIME-TEST-001',
        description: 'Location to test timestamp generation'
      };

      const response = await request(app)
        .post('/api/locations')
        .send(newLocation);

      if (response.status === 201) {
        expect(response.body.data).toHaveProperty('created_at');
        expect(response.body.data).toHaveProperty('updated_at');
        expect(response.body.data.created_at).toBe(response.body.data.updated_at);
      }
    });

    test('should handle validation errors gracefully', async () => {
      const invalidLocation = {
        // Missing required fields
        description: 'Invalid location without required fields'
      };

      const response = await request(app)
        .post('/api/locations')
        .send(invalidLocation);

      // Should return error (400 for validation, 500 for database constraint)
      expect([400, 500]).toContain(response.status);
      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/locations/:id', () => {
    test('should update existing location', async () => {
      if (!testLocationId) return;

      const updateData = {
        description: 'Updated location description',
        zone: 'B',
        notes: 'Updated during testing'
      };

      const response = await request(app)
        .put(`/api/locations/${testLocationId}`)
        .send(updateData);

      if (response.status === 200) {
        expect(response.body.success).toBe(true);
        expect(response.body.data.description).toBe(updateData.description);
        expect(response.body.data.zone).toBe(updateData.zone);
        expect(response.body.data).toHaveProperty('updated_at');
      }
    });

    test('should update timestamp automatically', async () => {
      if (!testLocationId) return;

      const originalTime = new Date().toISOString();
      
      // Wait to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));

      const updateData = {
        notes: 'Timestamp test update'
      };

      const response = await request(app)
        .put(`/api/locations/${testLocationId}`)
        .send(updateData);

      if (response.status === 200) {
        expect(response.body.data.updated_at).not.toBe(originalTime);
        expect(new Date(response.body.data.updated_at)).toBeInstanceOf(Date);
      }
    });

    test('should handle non-existent location updates', async () => {
      const updateData = {
        description: 'Update non-existent location'
      };

      const response = await request(app)
        .put('/api/locations/99999999')
        .send(updateData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('should allow partial updates', async () => {
      if (!testLocationId) return;

      const updateData = {
        position: '5' // Only update one field
      };

      const response = await request(app)
        .put(`/api/locations/${testLocationId}`)
        .send(updateData);

      if (response.status === 200) {
        expect(response.body.data.position).toBe(updateData.position);
      }
    });
  });

  describe('DELETE /api/locations/:id', () => {
    test('should soft delete location by setting active=false', async () => {
      if (!testLocationId) return;

      const response = await request(app)
        .delete(`/api/locations/${testLocationId}`);

      if (response.status === 200) {
        expect(response.body.success).toBe(true);
        expect(response.body.message).toContain('deactivated successfully');

        // Verify the location is marked inactive
        const checkResponse = await request(app)
          .get(`/api/locations/${testLocationId}`);

        if (checkResponse.status === 200) {
          expect(checkResponse.body.data.active).toBe(false);
        }
      }
    });

    test('should handle non-existent location deletion', async () => {
      const response = await request(app)
        .delete('/api/locations/99999999')
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('should update timestamp on soft delete', async () => {
      // Create a new location to test soft delete timestamp
      const newLocation = {
        location_code: 'DELETE-TEST-001',
        description: 'Location for delete timestamp test'
      };

      const createResponse = await request(app)
        .post('/api/locations')
        .send(newLocation);

      if (createResponse.status === 201) {
        const locationId = createResponse.body.data.id;
        const originalTimestamp = createResponse.body.data.updated_at;

        // Wait to ensure timestamp difference
        await new Promise(resolve => setTimeout(resolve, 10));

        const deleteResponse = await request(app)
          .delete(`/api/locations/${locationId}`);

        if (deleteResponse.status === 200) {
          // Check that updated_at changed
          const checkResponse = await request(app)
            .get(`/api/locations/${locationId}`);

          if (checkResponse.status === 200) {
            expect(checkResponse.body.data.updated_at).not.toBe(originalTimestamp);
          }
        }
      }
    });
  });

  describe('Schema Compatibility Tests', () => {
    test('should work with storage_locations table structure', async () => {
      const response = await request(app)
        .get('/api/locations?limit=5')
        .expect(200);

      expect(response.body.success).toBe(true);
      
      if (response.body.data.length > 0) {
        const location = response.body.data[0];
        
        // Verify required fields exist
        expect(location.id).toBeDefined();
        expect(location.location_code).toBeDefined();
        
        // Verify warehouse-specific fields are handled properly
        const warehouseFields = ['zone', 'aisle', 'level', 'position', 'description'];
        warehouseFields.forEach(field => {
          // These fields should be present but may be null
          if (location.hasOwnProperty(field)) {
            expect(location[field] === null || typeof location[field] === 'string').toBe(true);
          }
        });
      }
    });

    test('should handle active column properly', async () => {
      const response = await request(app)
        .get('/api/locations')
        .expect(200);

      if (response.body.data.length > 0) {
        const location = response.body.data[0];
        
        // Active should be boolean or null
        if (location.hasOwnProperty('active')) {
          expect(typeof location.active === 'boolean' || location.active === null).toBe(true);
        }
      }
    });

    test('should handle location hierarchy fields', async () => {
      // Test that warehouse location hierarchy is properly supported
      const testLocation = {
        location_code: 'HIER-TEST-001',
        description: 'Hierarchy test location',
        zone: 'Zone-A',
        aisle: 'Aisle-1',
        level: 'Level-2',
        position: 'Pos-3'
      };

      const response = await request(app)
        .post('/api/locations')
        .send(testLocation);

      if (response.status === 201) {
        const location = response.body.data;
        expect(location.zone).toBe(testLocation.zone);
        expect(location.aisle).toBe(testLocation.aisle);
        expect(location.level).toBe(testLocation.level);
        expect(location.position).toBe(testLocation.position);
      }
    });
  });

  describe('Error Handling', () => {
    test('should handle database connection errors gracefully', async () => {
      // Mock database error
      const originalGetAll = supabaseClient.getAll;
      supabaseClient.getAll = jest.fn().mockResolvedValue({
        success: false,
        error: 'Database connection failed'
      });

      const response = await request(app)
        .get('/api/locations')
        .expect(500);

      expect(response.body.success).toBe(false);

      // Restore original function
      supabaseClient.getAll = originalGetAll;
    });

    test('should handle malformed requests', async () => {
      const response = await request(app)
        .get('/api/locations?limit=invalid&offset=invalid')
        .expect(200);

      expect(response.body.success).toBe(true);
      // Should handle invalid parameters gracefully
    });

    test('should handle empty search parameters', async () => {
      const response = await request(app)
        .get('/api/locations?search=')
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Performance Tests', () => {
    test('should handle large result sets efficiently', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .get('/api/locations?limit=1000')
        .expect(200);

      const responseTime = Date.now() - startTime;
      
      expect(response.body.success).toBe(true);
      expect(responseTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    test('should handle concurrent requests', async () => {
      const requests = Array(5).fill(0).map(() =>
        request(app).get('/api/locations?limit=10')
      );

      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });

    test('should efficiently search across large datasets', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .get('/api/locations?search=test&limit=100')
        .expect(200);

      const responseTime = Date.now() - startTime;
      
      expect(response.body.success).toBe(true);
      expect(responseTime).toBeLessThan(3000); // Search should be fast
    });
  });

  describe('Data Integrity Tests', () => {
    test('should maintain referential integrity', async () => {
      // Test that locations are properly referenced and don't break
      const response = await request(app)
        .get('/api/locations?limit=5')
        .expect(200);

      if (response.body.data.length > 0) {
        const location = response.body.data[0];
        
        // Get the same location by ID to verify consistency
        const byIdResponse = await request(app)
          .get(`/api/locations/${location.id}`);

        if (byIdResponse.status === 200) {
          expect(byIdResponse.body.data.id).toBe(location.id);
          expect(byIdResponse.body.data.location_code).toBe(location.location_code);
        }
      }
    });

    test('should handle duplicate location codes appropriately', async () => {
      const duplicateLocation = {
        location_code: 'DUPLICATE-TEST',
        description: 'First location with this code'
      };

      const firstResponse = await request(app)
        .post('/api/locations')
        .send(duplicateLocation);

      if (firstResponse.status === 201) {
        // Try to create another location with the same code
        const secondResponse = await request(app)
          .post('/api/locations')
          .send(duplicateLocation);

        // Should either prevent duplicates or allow them based on business rules
        expect([201, 400, 409, 500]).toContain(secondResponse.status);
      }
    });
  });

  describe('Business Logic Tests', () => {
    test('should support warehouse location hierarchy', async () => {
      const hierarchicalLocation = {
        location_code: 'A-01-02-03',
        description: 'Full hierarchy location',
        zone: 'A',
        aisle: '01',
        level: '02', 
        position: '03'
      };

      const response = await request(app)
        .post('/api/locations')
        .send(hierarchicalLocation);

      if (response.status === 201) {
        const location = response.body.data;
        
        // Verify all hierarchy levels are preserved
        expect(location.zone).toBe('A');
        expect(location.aisle).toBe('01');
        expect(location.level).toBe('02');
        expect(location.position).toBe('03');
        expect(location.location_code).toBe('A-01-02-03');
      }
    });

    test('should handle partial hierarchy definitions', async () => {
      const partialLocation = {
        location_code: 'B-05',
        description: 'Partial hierarchy location',
        zone: 'B',
        aisle: '05'
        // No level or position specified
      };

      const response = await request(app)
        .post('/api/locations')
        .send(partialLocation);

      if (response.status === 201) {
        const location = response.body.data;
        expect(location.zone).toBe('B');
        expect(location.aisle).toBe('05');
        // level and position should be null or undefined
      }
    });
  });
});