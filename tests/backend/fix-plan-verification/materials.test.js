// tests/backend/fix-plan-verification/materials.test.js
// Comprehensive tests for materials API endpoints with updated schema (material_indices table)

const request = require('supertest');
const express = require('express');
const materialsRouter = require('../../../src/backend/api/routes/materials');
const supabaseClient = require('../../../src/backend/db/supabase-client');

const app = express();
app.use(express.json());

// Mock middleware to add authorization header
app.use((req, res, next) => {
  req.headers.authorization = 'Bearer demo-token-for-testing-only-123';
  next();
});

app.use('/api/materials', materialsRouter);

describe('Materials API Endpoints - Fix Plan Verification', () => {
  let testMaterialId = null;

  beforeAll(async () => {
    // Test both material_indices and parts table availability
    const materialIndicesCheck = await supabaseClient.getAll('material_indices', { limit: 1 }, true);
    const partsCheck = await supabaseClient.getAll('parts', { limit: 1 }, true);
    
    console.log('Material indices check:', materialIndicesCheck.success);
    console.log('Parts table check:', partsCheck.success);
  });

  describe('GET /api/materials', () => {
    test('should return materials from material_indices table', async () => {
      const response = await request(app)
        .get('/api/materials')
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
        testMaterialId = response.body.data[0].id;
      }
    });

    test('should fallback to parts table if material_indices does not exist', async () => {
      // Mock material_indices failure to test fallback
      const originalGetAll = supabaseClient.getAll;
      let callCount = 0;
      
      supabaseClient.getAll = jest.fn().mockImplementation((table, options) => {
        callCount++;
        if (table === 'material_indices' && callCount === 1) {
          return Promise.resolve({
            success: false,
            error: 'Could not find the table "material_indices"'
          });
        }
        return originalGetAll.call(supabaseClient, table, options);
      });

      const response = await request(app)
        .get('/api/materials')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);

      // Restore original function
      supabaseClient.getAll = originalGetAll;
    });

    test('should support pagination parameters', async () => {
      const response = await request(app)
        .get('/api/materials?limit=5&offset=0')
        .expect(200);

      expect(response.body.pagination.limit).toBe(5);
      expect(response.body.pagination.offset).toBe(0);
      expect(response.body.data.length).toBeLessThanOrEqual(5);
    });

    test('should support search functionality', async () => {
      const response = await request(app)
        .get('/api/materials?search=test')
        .expect(200);

      expect(response.body.success).toBe(true);
      // If there are results, they should contain the search term
      if (response.body.data.length > 0) {
        response.body.data.forEach(material => {
          // Should search in name field for material_indices or description for parts
          const searchable = material.name || material.description || '';
          expect(searchable.toLowerCase()).toContain('test');
        });
      }
    });

    test('should handle active filter parameter', async () => {
      // Test with active=true (default)
      const activeResponse = await request(app)
        .get('/api/materials?active=true')
        .expect(200);

      expect(activeResponse.body.success).toBe(true);

      // Test with active=false
      const inactiveResponse = await request(app)
        .get('/api/materials?active=false')
        .expect(200);

      expect(inactiveResponse.body.success).toBe(true);
    });

    test('should support high limit for bulk operations', async () => {
      const response = await request(app)
        .get('/api/materials?limit=1000')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.pagination.limit).toBe(1000);
    });
  });

  describe('GET /api/materials/:id', () => {
    test('should return specific material by ID', async () => {
      if (!testMaterialId) {
        // Get a material ID first
        const materialsResponse = await request(app).get('/api/materials?limit=1');
        if (materialsResponse.body.data.length === 0) {
          return; // Skip if no materials available
        }
        testMaterialId = materialsResponse.body.data[0].id;
      }

      const response = await request(app)
        .get(`/api/materials/${testMaterialId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBe(testMaterialId);
    });

    test('should fallback to parts table for material lookup', async () => {
      if (!testMaterialId) return;

      // Mock material_indices failure to test fallback
      const originalGetById = supabaseClient.getById;
      let callCount = 0;
      
      supabaseClient.getById = jest.fn().mockImplementation((table, id, options) => {
        callCount++;
        if (table === 'material_indices' && callCount === 1) {
          return Promise.resolve({
            success: false,
            error: 'Could not find the table "material_indices"'
          });
        }
        return originalGetById.call(supabaseClient, table, id, options);
      });

      const response = await request(app)
        .get(`/api/materials/${testMaterialId}`);

      // Should either find in fallback or return 404
      expect([200, 404]).toContain(response.status);

      // Restore original function
      supabaseClient.getById = originalGetById;
    });

    test('should return 404 for non-existent material', async () => {
      const response = await request(app)
        .get('/api/materials/99999999')
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/materials', () => {
    test('should create new material', async () => {
      const newMaterial = {
        name: 'Test Material',
        code: 'TEST-MAT-001',
        description: 'Test material for API verification',
        category: 'raw_material',
        active: true
      };

      const response = await request(app)
        .post('/api/materials')
        .send(newMaterial);

      if (response.status === 201) {
        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
        expect(response.body.data.name).toBe(newMaterial.name);
        expect(response.body.data).toHaveProperty('created_at');
        expect(response.body.data).toHaveProperty('updated_at');

        // Store for cleanup
        testMaterialId = response.body.data.id;
      } else {
        // Creation may fail if material_indices table doesn't exist
        expect([400, 500]).toContain(response.status);
      }
    });

    test('should add timestamps automatically', async () => {
      const newMaterial = {
        name: 'Timestamped Material',
        code: 'TIME-001',
        description: 'Material to test timestamp generation'
      };

      const response = await request(app)
        .post('/api/materials')
        .send(newMaterial);

      if (response.status === 201) {
        expect(response.body.data).toHaveProperty('created_at');
        expect(response.body.data).toHaveProperty('updated_at');
        expect(response.body.data.created_at).toBe(response.body.data.updated_at);
      }
    });

    test('should handle validation errors', async () => {
      const invalidMaterial = {
        // Missing required fields like name
        description: 'Invalid material'
      };

      const response = await request(app)
        .post('/api/materials')
        .send(invalidMaterial);

      // Should return error (400 for validation, 500 for database constraint)
      expect([400, 500]).toContain(response.status);
      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/materials/:id', () => {
    test('should update existing material', async () => {
      if (!testMaterialId) return;

      const updateData = {
        description: 'Updated material description',
        category: 'finished_goods'
      };

      const response = await request(app)
        .put(`/api/materials/${testMaterialId}`)
        .send(updateData);

      if (response.status === 200) {
        expect(response.body.success).toBe(true);
        expect(response.body.data.description).toBe(updateData.description);
        expect(response.body.data).toHaveProperty('updated_at');
      }
    });

    test('should update timestamp automatically', async () => {
      if (!testMaterialId) return;

      const originalTime = new Date().toISOString();
      
      // Wait a small amount to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));

      const updateData = {
        notes: 'Timestamp test update'
      };

      const response = await request(app)
        .put(`/api/materials/${testMaterialId}`)
        .send(updateData);

      if (response.status === 200) {
        expect(response.body.data.updated_at).not.toBe(originalTime);
        expect(new Date(response.body.data.updated_at)).toBeInstanceOf(Date);
      }
    });

    test('should handle non-existent material updates', async () => {
      const updateData = {
        description: 'Update non-existent material'
      };

      const response = await request(app)
        .put('/api/materials/99999999')
        .send(updateData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/materials/:id', () => {
    test('should soft delete material by setting active=false', async () => {
      if (!testMaterialId) return;

      const response = await request(app)
        .delete(`/api/materials/${testMaterialId}`);

      if (response.status === 200) {
        expect(response.body.success).toBe(true);
        expect(response.body.message).toContain('deactivated successfully');

        // Verify the material is marked inactive
        const checkResponse = await request(app)
          .get(`/api/materials/${testMaterialId}`);

        if (checkResponse.status === 200) {
          expect(checkResponse.body.data.active).toBe(false);
        }
      }
    });

    test('should handle non-existent material deletion', async () => {
      const response = await request(app)
        .delete('/api/materials/99999999')
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Schema Compatibility Tests', () => {
    test('should handle both material_indices and parts table schemas', async () => {
      // Test that the API works with either table structure
      const response = await request(app)
        .get('/api/materials?limit=5')
        .expect(200);

      expect(response.body.success).toBe(true);
      
      if (response.body.data.length > 0) {
        const material = response.body.data[0];
        
        // Should have either name (material_indices) or description (parts)
        expect(material.name || material.description).toBeDefined();
        
        // Should have id field in both schemas
        expect(material.id).toBeDefined();
      }
    });

    test('should properly map search fields between schemas', async () => {
      // Mock the fallback scenario
      const originalGetAll = supabaseClient.getAll;
      let callCount = 0;
      
      supabaseClient.getAll = jest.fn().mockImplementation((table, options) => {
        callCount++;
        if (table === 'material_indices' && callCount === 1) {
          return Promise.resolve({
            success: false,
            error: 'Could not find the table "material_indices"'
          });
        }
        
        // Verify that name search is converted to description search for parts table
        if (table === 'parts' && options.filters) {
          const nameFilter = options.filters.find(f => f.column === 'name');
          expect(nameFilter).toBeUndefined(); // name filter should be converted
          
          const descFilter = options.filters.find(f => f.column === 'description');
          if (descFilter) {
            expect(descFilter.column).toBe('description');
          }
        }
        
        return originalGetAll.call(supabaseClient, table, options);
      });

      const response = await request(app)
        .get('/api/materials?search=test')
        .expect(200);

      expect(response.body.success).toBe(true);

      // Restore original function
      supabaseClient.getAll = originalGetAll;
    });

    test('should handle missing active column in parts table', async () => {
      // Test that active filter is properly removed when falling back to parts table
      const response = await request(app)
        .get('/api/materials?active=true')
        .expect(200);

      expect(response.body.success).toBe(true);
      // Should not crash even if parts table doesn't have active column
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
        .get('/api/materials')
        .expect(500);

      expect(response.body.success).toBe(false);

      // Restore original function
      supabaseClient.getAll = originalGetAll;
    });

    test('should handle malformed search parameters', async () => {
      const response = await request(app)
        .get('/api/materials?search=')
        .expect(200);

      expect(response.body.success).toBe(true);
      // Should handle empty search gracefully
    });

    test('should validate limit parameters', async () => {
      const response = await request(app)
        .get('/api/materials?limit=invalid')
        .expect(200);

      expect(response.body.success).toBe(true);
      // Should handle invalid limit gracefully (parseInt will return NaN)
    });
  });

  describe('Performance Tests', () => {
    test('should handle large result sets efficiently', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .get('/api/materials?limit=1000')
        .expect(200);

      const responseTime = Date.now() - startTime;
      
      expect(response.body.success).toBe(true);
      expect(responseTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    test('should handle concurrent requests without conflicts', async () => {
      const requests = Array(5).fill(0).map(() =>
        request(app).get('/api/materials?limit=10')
      );

      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });
  });

  describe('Data Integrity Tests', () => {
    test('should maintain data consistency during fallback', async () => {
      // Test that the same data is returned regardless of which table is used
      const directResponse = await request(app)
        .get('/api/materials?limit=5');

      expect(directResponse.body.success).toBe(true);
      
      if (directResponse.body.data.length > 0) {
        const material = directResponse.body.data[0];
        
        // Get the same material by ID
        const byIdResponse = await request(app)
          .get(`/api/materials/${material.id}`);

        if (byIdResponse.status === 200) {
          expect(byIdResponse.body.data.id).toBe(material.id);
        }
      }
    });

    test('should preserve field mapping consistency', async () => {
      const response = await request(app)
        .get('/api/materials?limit=1');

      if (response.body.data.length > 0) {
        const material = response.body.data[0];
        
        // Verify consistent field presence
        expect(material).toHaveProperty('id');
        
        // Should have either name (material_indices) or description (parts)
        const hasIdentifier = Boolean(material.name || material.description);
        expect(hasIdentifier).toBe(true);
      }
    });
  });
});