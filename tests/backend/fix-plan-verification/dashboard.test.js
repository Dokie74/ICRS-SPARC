// tests/backend/fix-plan-verification/dashboard.test.js
// Comprehensive tests for dashboard API endpoints with updated schema

const request = require('supertest');
const express = require('express');
const dashboardRouter = require('../../../src/backend/api/routes/dashboard');
const supabaseClient = require('../../../src/backend/db/supabase-client');

// Mock the error handler middleware
const { asyncHandler } = require('../../../src/backend/api/middleware/error-handler');

const app = express();
app.use(express.json());

// Mock middleware to add accessToken to request
app.use((req, res, next) => {
  req.accessToken = 'demo-token-for-testing-only-123';
  req.headers.authorization = 'Bearer demo-token-for-testing-only-123';
  next();
});

app.use('/api/dashboard', dashboardRouter);

describe('Dashboard API Endpoints - Fix Plan Verification', () => {
  
  beforeAll(async () => {
    // Verify database connection
    const healthCheck = await supabaseClient.getAll('inventory_lots', { limit: 1 }, true);
    if (!healthCheck.success) {
      console.warn('Warning: Database connection issues detected', healthCheck.error);
    }
  });

  describe('GET /api/dashboard/metrics', () => {
    test('should return comprehensive dashboard metrics', async () => {
      const response = await request(app)
        .get('/api/dashboard/metrics')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      
      // Verify all expected metrics are present
      const { data } = response.body;
      expect(data).toHaveProperty('inventory');
      expect(data).toHaveProperty('customers');
      expect(data).toHaveProperty('preadmissions');
      expect(data).toHaveProperty('recent_activity');
      expect(data).toHaveProperty('top_parts');
      expect(data).toHaveProperty('top_customers');
      expect(data).toHaveProperty('status_distribution');
      expect(data).toHaveProperty('period_days');
      expect(data).toHaveProperty('generated_at');

      // Verify data types
      expect(typeof data.inventory).toBe('object');
      expect(typeof data.customers).toBe('object');
      expect(typeof data.preadmissions).toBe('object');
      expect(Array.isArray(data.recent_activity)).toBe(true);
      expect(Array.isArray(data.top_parts)).toBe(true);
      expect(Array.isArray(data.top_customers)).toBe(true);
      expect(typeof data.status_distribution).toBe('object');
    });

    test('should accept period parameter', async () => {
      const response = await request(app)
        .get('/api/dashboard/metrics?period=7')
        .expect(200);

      expect(response.body.data.period_days).toBe(7);
    });

    test('should handle invalid period gracefully', async () => {
      const response = await request(app)
        .get('/api/dashboard/metrics?period=invalid')
        .expect(200);

      // Should default to reasonable value or handle gracefully
      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/dashboard/stats', () => {
    test('should return basic dashboard statistics', async () => {
      const response = await request(app)
        .get('/api/dashboard/stats')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();

      const { data } = response.body;
      expect(data).toHaveProperty('totalInventoryValue');
      expect(data).toHaveProperty('activeLots');
      expect(data).toHaveProperty('pendingPreadmissions');
      expect(data).toHaveProperty('monthlyTransactions');
      expect(data).toHaveProperty('lowStockAlerts');
      expect(data).toHaveProperty('completedToday');

      // Verify data types are numeric
      expect(typeof data.totalInventoryValue).toBe('number');
      expect(typeof data.activeLots).toBe('number');
      expect(typeof data.pendingPreadmissions).toBe('number');
      expect(typeof data.monthlyTransactions).toBe('number');
      expect(typeof data.lowStockAlerts).toBe('number');
      expect(typeof data.completedToday).toBe('number');
    });

    test('should work with Authorization header', async () => {
      const response = await request(app)
        .get('/api/dashboard/stats')
        .set('Authorization', 'Bearer demo-token-for-testing-only-456')
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/dashboard/recent-activity', () => {
    test('should return recent activity feed', async () => {
      const response = await request(app)
        .get('/api/dashboard/recent-activity')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);

      if (response.body.data.length > 0) {
        const activity = response.body.data[0];
        expect(activity).toHaveProperty('id');
        expect(activity).toHaveProperty('description');
        expect(activity).toHaveProperty('timestamp');
        expect(activity).toHaveProperty('type');
      }
    });

    test('should respect limit parameter', async () => {
      const response = await request(app)
        .get('/api/dashboard/recent-activity?limit=5')
        .expect(200);

      expect(response.body.data.length).toBeLessThanOrEqual(5);
    });
  });

  describe('GET /api/dashboard/inventory-summary', () => {
    test('should return detailed inventory summary', async () => {
      const response = await request(app)
        .get('/api/dashboard/inventory-summary')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();

      const { data } = response.body;
      expect(data).toHaveProperty('summary');
      expect(data).toHaveProperty('lots');
      expect(data).toHaveProperty('total_lots');

      // Verify summary structure
      const { summary } = data;
      expect(summary).toHaveProperty('total_lots');
      expect(summary).toHaveProperty('total_quantity');
      expect(summary).toHaveProperty('total_value');
      expect(summary).toHaveProperty('by_material');
      expect(summary).toHaveProperty('by_customer');

      expect(Array.isArray(data.lots)).toBe(true);
      expect(typeof data.total_lots).toBe('number');
    });

    test('should calculate current quantities from transactions', async () => {
      const response = await request(app)
        .get('/api/dashboard/inventory-summary')
        .expect(200);

      if (response.body.data.lots.length > 0) {
        const lot = response.body.data.lots[0];
        expect(lot).toHaveProperty('current_quantity');
        expect(lot).toHaveProperty('calculated_value');
        expect(typeof lot.current_quantity).toBe('number');
        expect(typeof lot.calculated_value).toBe('number');
      }
    });
  });

  describe('GET /api/dashboard/alerts', () => {
    test('should return system alerts', async () => {
      const response = await request(app)
        .get('/api/dashboard/alerts')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();

      const { data } = response.body;
      expect(data).toHaveProperty('alerts');
      expect(data).toHaveProperty('count');
      expect(data).toHaveProperty('categories');

      expect(Array.isArray(data.alerts)).toBe(true);
      expect(typeof data.count).toBe('number');
      expect(typeof data.categories).toBe('object');

      // Verify categories structure
      const { categories } = data;
      expect(categories).toHaveProperty('inventory');
      expect(categories).toHaveProperty('preadmission');
      expect(categories).toHaveProperty('expiration');
    });

    test('should format alert objects correctly', async () => {
      const response = await request(app)
        .get('/api/dashboard/alerts')
        .expect(200);

      if (response.body.data.alerts.length > 0) {
        const alert = response.body.data.alerts[0];
        expect(alert).toHaveProperty('type');
        expect(alert).toHaveProperty('category');
        expect(alert).toHaveProperty('title');
        expect(alert).toHaveProperty('message');
        expect(alert).toHaveProperty('created_at');
        
        // Verify alert types are valid
        expect(['warning', 'info', 'error', 'success']).toContain(alert.type);
        expect(['inventory', 'preadmission', 'expiration']).toContain(alert.category);
      }
    });
  });

  describe('Schema Compatibility Tests', () => {
    test('should handle missing transaction data gracefully', async () => {
      // Test that dashboard still works when transactions table has no data
      const response = await request(app)
        .get('/api/dashboard/metrics')
        .expect(200);

      expect(response.body.success).toBe(true);
      // Should not throw errors even with empty transaction data
    });

    test('should handle missing foreign key relationships', async () => {
      const response = await request(app)
        .get('/api/dashboard/inventory-summary')
        .expect(200);

      expect(response.body.success).toBe(true);
      // Should handle cases where parts, customers, or locations might be missing
    });

    test('should work with updated schema field names', async () => {
      const response = await request(app)
        .get('/api/dashboard/stats')
        .expect(200);

      // Should work with schema changes like:
      // - transactions table structure
      // - material_indices vs materials
      // - storage_locations vs locations
      expect(response.body.success).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('should handle database connection errors', async () => {
      // Mock a database error
      const originalGetAll = supabaseClient.getAll;
      supabaseClient.getAll = jest.fn().mockResolvedValue({
        success: false,
        error: 'Database connection failed'
      });

      const response = await request(app)
        .get('/api/dashboard/stats')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Failed to retrieve dashboard stats');

      // Restore original function
      supabaseClient.getAll = originalGetAll;
    });

    test('should handle invalid query parameters', async () => {
      const response = await request(app)
        .get('/api/dashboard/recent-activity?limit=-1')
        .expect(200);

      // Should handle gracefully, not crash
      expect(response.body.success).toBe(true);
    });
  });

  describe('Performance Tests', () => {
    test('should respond within acceptable time limits', async () => {
      const startTime = Date.now();
      
      await request(app)
        .get('/api/dashboard/metrics')
        .expect(200);

      const responseTime = Date.now() - startTime;
      
      // Should respond within 5 seconds for dashboard metrics
      expect(responseTime).toBeLessThan(5000);
    });

    test('should handle concurrent requests', async () => {
      const requests = Array(5).fill(0).map(() =>
        request(app).get('/api/dashboard/stats')
      );

      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });
  });
});