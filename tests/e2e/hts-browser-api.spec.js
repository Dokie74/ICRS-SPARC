// tests/e2e/hts-browser-api.spec.js
// API-focused E2E tests for HTS Browser backend endpoints
// Tests the API layer with real network calls and error scenarios

import { test, expect } from '@playwright/test';
import { htsTestData, countryTestData, mockApiResponses } from './fixtures/hts-test-data';

test.describe('HTS Browser API Endpoints', () => {
  let authToken;
  let baseURL;

  test.beforeEach(async ({ page, baseURL: testBaseURL }) => {
    baseURL = testBaseURL || 'http://localhost:5000';
    
    // Login to get authentication token
    const loginResponse = await page.request.post(`${baseURL}/api/auth/login`, {
      data: {
        email: 'admin@sparc.test',
        password: 'admin123'
      }
    });
    
    expect(loginResponse.ok()).toBeTruthy();
    const loginData = await loginResponse.json();
    authToken = loginData.token;
  });

  test.describe('GET /api/hts/search', () => {
    test('should search HTS codes by description', async ({ request }) => {
      const response = await request.get(`${baseURL}/api/hts/search`, {
        headers: { 'Authorization': `Bearer ${authToken}` },
        params: {
          q: 'electronic circuits',
          type: 'description',
          limit: 50
        }
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.data.length).toBeGreaterThan(0);
      expect(data.meta).toEqual(expect.objectContaining({
        searchTerm: 'electronic circuits',
        searchType: 'description',
        limit: 50
      }));
      
      // Verify result structure
      const firstResult = data.data[0];
      expect(firstResult).toEqual(expect.objectContaining({
        htsno: expect.any(String),
        description: expect.any(String)
      }));
      
      // Should contain search term in description (case insensitive)
      expect(firstResult.description.toLowerCase()).toMatch(/electronic|circuits/);
    });

    test('should search HTS codes by code number', async ({ request }) => {
      const response = await request.get(`${baseURL}/api/hts/search`, {
        headers: { 'Authorization': `Bearer ${authToken}` },
        params: {
          q: '8542',
          type: 'code',
          limit: 25
        }
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.data.length).toBeGreaterThan(0);
      
      // All results should contain the search code
      data.data.forEach(result => {
        expect(result.htsno).toContain('8542');
      });
    });

    test('should include duty information when country specified', async ({ request }) => {
      const response = await request.get(`${baseURL}/api/hts/search`, {
        headers: { 'Authorization': `Bearer ${authToken}` },
        params: {
          q: '8542',
          type: 'code',
          countryOfOrigin: 'CN'
        }
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      
      expect(data.success).toBe(true);
      expect(data.meta.countryOfOrigin).toBe('CN');
      
      // Results should include duty information
      if (data.data.length > 0) {
        const firstResult = data.data[0];
        if (firstResult.dutyInfo) {
          expect(firstResult.dutyInfo).toEqual(expect.objectContaining({
            applicable: expect.any(String),
            tradeStatus: expect.any(String)
          }));
        }
      }
    });

    test('should return empty results for invalid search', async ({ request }) => {
      const response = await request.get(`${baseURL}/api/hts/search`, {
        headers: { 'Authorization': `Bearer ${authToken}` },
        params: {
          q: 'invalidterm123xyz',
          type: 'description'
        }
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(0);
      expect(data.meta.resultCount).toBe(0);
    });

    test('should reject search terms less than 2 characters', async ({ request }) => {
      const response = await request.get(`${baseURL}/api/hts/search`, {
        headers: { 'Authorization': `Bearer ${authToken}` },
        params: {
          q: 'a',
          type: 'description'
        }
      });

      expect(response.status()).toBe(400);
      const data = await response.json();
      
      expect(data.success).toBe(false);
      expect(data.error).toContain('at least 2 characters');
    });

    test('should require authentication', async ({ request }) => {
      const response = await request.get(`${baseURL}/api/hts/search`, {
        params: {
          q: 'electronic',
          type: 'description'
        }
      });

      expect(response.status()).toBe(401);
    });

    test('should respect rate limiting', async ({ request }) => {
      // Make many rapid requests to test rate limiting
      const promises = Array(10).fill().map(() => 
        request.get(`${baseURL}/api/hts/search`, {
          headers: { 'Authorization': `Bearer ${authToken}` },
          params: {
            q: 'test' + Math.random(),
            type: 'description'
          }
        })
      );

      const responses = await Promise.all(promises);
      
      // All should succeed under normal rate limits
      responses.forEach(response => {
        expect([200, 429]).toContain(response.status());
      });
    });
  });

  test.describe('GET /api/hts/code/:htsCode', () => {
    test('should get specific HTS code information', async ({ request }) => {
      const htsCode = '8542310001';
      
      const response = await request.get(`${baseURL}/api/hts/code/${htsCode}`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      
      expect(data.success).toBe(true);
      expect(data.data).toEqual(expect.objectContaining({
        htsno: expect.stringContaining(htsCode.substring(0, 4)),
        description: expect.any(String),
        general: expect.any(String)
      }));
    });

    test('should include duty information when country specified', async ({ request }) => {
      const htsCode = '8542310001';
      
      const response = await request.get(`${baseURL}/api/hts/code/${htsCode}`, {
        headers: { 'Authorization': `Bearer ${authToken}` },
        params: {
          countryOfOrigin: 'CN'
        }
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      
      expect(data.success).toBe(true);
      if (data.data.dutyInfo) {
        expect(data.data.dutyInfo).toEqual(expect.objectContaining({
          applicable: expect.any(String),
          tradeStatus: expect.any(String)
        }));
      }
    });

    test('should return 404 for invalid HTS code', async ({ request }) => {
      const response = await request.get(`${baseURL}/api/hts/code/99999999`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });

      expect(response.status()).toBe(404);
      const data = await response.json();
      
      expect(data.success).toBe(false);
      expect(data.error).toContain('not found');
    });

    test('should require authentication', async ({ request }) => {
      const response = await request.get(`${baseURL}/api/hts/code/8542310001`);

      expect(response.status()).toBe(401);
    });
  });

  test.describe('POST /api/hts/duty-rate', () => {
    test('should calculate duty rate for HTS code and country', async ({ request }) => {
      const response = await request.post(`${baseURL}/api/hts/duty-rate`, {
        headers: { 'Authorization': `Bearer ${authToken}` },
        data: {
          htsCode: '8542310001',
          countryOfOrigin: 'CN'
        }
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      
      expect(data.success).toBe(true);
      expect(data.data).toEqual(expect.objectContaining({
        htsCode: '8542310001',
        countryOfOrigin: 'CN',
        htsEntry: expect.any(Object),
        dutyInfo: expect.any(Object)
      }));
      
      expect(data.data.dutyInfo).toEqual(expect.objectContaining({
        applicable: expect.any(String),
        tradeStatus: expect.any(String)
      }));
    });

    test('should return 404 for invalid HTS code', async ({ request }) => {
      const response = await request.post(`${baseURL}/api/hts/duty-rate`, {
        headers: { 'Authorization': `Bearer ${authToken}` },
        data: {
          htsCode: '99999999',
          countryOfOrigin: 'CN'
        }
      });

      expect(response.status()).toBe(404);
      const data = await response.json();
      
      expect(data.success).toBe(false);
      expect(data.error).toContain('HTS code not found');
    });

    test('should validate request body', async ({ request }) => {
      const response = await request.post(`${baseURL}/api/hts/duty-rate`, {
        headers: { 'Authorization': `Bearer ${authToken}` },
        data: {
          htsCode: '8542310001'
          // Missing countryOfOrigin
        }
      });

      expect(response.status()).toBe(400);
    });

    test('should validate country code format', async ({ request }) => {
      const response = await request.post(`${baseURL}/api/hts/duty-rate`, {
        headers: { 'Authorization': `Bearer ${authToken}` },
        data: {
          htsCode: '8542310001',
          countryOfOrigin: 'INVALID' // Too long
        }
      });

      expect(response.status()).toBe(400);
    });
  });

  test.describe('GET /api/hts/popular', () => {
    test('should get popular HTS codes', async ({ request }) => {
      const response = await request.get(`${baseURL}/api/hts/popular`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.data.length).toBeGreaterThan(0);
      expect(data.meta.resultCount).toBe(data.data.length);
      
      // Verify structure of popular codes
      data.data.forEach(code => {
        expect(code).toEqual(expect.objectContaining({
          htsno: expect.any(String),
          description: expect.any(String)
        }));
      });
    });

    test('should respect limit parameter', async ({ request }) => {
      const limit = 5;
      
      const response = await request.get(`${baseURL}/api/hts/popular`, {
        headers: { 'Authorization': `Bearer ${authToken}` },
        params: { limit }
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      
      expect(data.success).toBe(true);
      expect(data.data.length).toBeLessThanOrEqual(limit);
      expect(data.meta.limit).toBe(limit);
    });
  });

  test.describe('GET /api/hts/countries', () => {
    test('should get list of supported countries', async ({ request }) => {
      const response = await request.get(`${baseURL}/api/hts/countries`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.data.length).toBeGreaterThan(0);
      
      // Verify country structure
      data.data.forEach(country => {
        expect(country).toEqual(expect.objectContaining({
          code: expect.any(String),
          name: expect.any(String)
        }));
        expect(country.code).toHaveLength(2);
      });
      
      // Should include major trading partners
      const countryCodes = data.data.map(c => c.code);
      expect(countryCodes).toContain('CN'); // China
      expect(countryCodes).toContain('MX'); // Mexico
      expect(countryCodes).toContain('CA'); // Canada
    });
  });

  test.describe('GET /api/hts/browse', () => {
    test('should browse HTS codes with pagination', async ({ request }) => {
      const response = await request.get(`${baseURL}/api/hts/browse`, {
        headers: { 'Authorization': `Bearer ${authToken}` },
        params: {
          offset: 0,
          limit: 10
        }
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.data.length).toBeLessThanOrEqual(10);
      expect(data.meta).toEqual(expect.objectContaining({
        offset: 0,
        limit: 10,
        total: expect.any(Number),
        resultCount: data.data.length
      }));
    });

    test('should support pagination', async ({ request }) => {
      // Get first page
      const page1 = await request.get(`${baseURL}/api/hts/browse`, {
        headers: { 'Authorization': `Bearer ${authToken}` },
        params: { offset: 0, limit: 5 }
      });
      
      // Get second page
      const page2 = await request.get(`${baseURL}/api/hts/browse`, {
        headers: { 'Authorization': `Bearer ${authToken}` },
        params: { offset: 5, limit: 5 }
      });

      const page1Data = await page1.json();
      const page2Data = await page2.json();
      
      expect(page1Data.success).toBe(true);
      expect(page2Data.success).toBe(true);
      
      // Should have different results
      if (page1Data.data.length > 0 && page2Data.data.length > 0) {
        expect(page1Data.data[0].htsno).not.toBe(page2Data.data[0].htsno);
      }
    });
  });

  test.describe('GET /api/hts/status', () => {
    test('should get HTS service status', async ({ request }) => {
      const response = await request.get(`${baseURL}/api/hts/status`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      
      expect(data.success).toBe(true);
      expect(data.data).toEqual(expect.objectContaining({
        loaded: expect.any(Boolean),
        entryCount: expect.any(Number),
        timestamp: expect.any(String)
      }));
      
      // Should have a reasonable number of entries
      expect(data.data.entryCount).toBeGreaterThan(1000);
    });
  });

  test.describe('POST /api/hts/refresh', () => {
    test('should require admin privileges', async ({ request }) => {
      // Login as non-admin user
      const userLoginResponse = await request.post(`${baseURL}/api/auth/login`, {
        data: {
          email: 'operator@sparc.test',
          password: 'operator123'
        }
      });
      
      const userLoginData = await userLoginResponse.json();
      const userToken = userLoginData.token;

      const response = await request.post(`${baseURL}/api/hts/refresh`, {
        headers: { 'Authorization': `Bearer ${userToken}` }
      });

      expect(response.status()).toBe(403);
      const data = await response.json();
      
      expect(data.success).toBe(false);
      expect(data.error).toContain('Admin privileges required');
    });

    test('should refresh data for admin user', async ({ request }) => {
      const response = await request.post(`${baseURL}/api/hts/refresh`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      
      expect(data.success).toBe(true);
      expect(data.data).toEqual(expect.objectContaining({
        refreshed: true,
        timestamp: expect.any(String)
      }));
    });
  });

  test.describe('Error Handling', () => {
    test('should handle malformed requests gracefully', async ({ request }) => {
      const response = await request.get(`${baseURL}/api/hts/search`, {
        headers: { 'Authorization': `Bearer ${authToken}` },
        params: {
          q: '', // Empty search term
          type: 'invalid_type' // Invalid type
        }
      });

      expect([400, 500]).toContain(response.status());
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
    });

    test('should handle invalid authentication tokens', async ({ request }) => {
      const response = await request.get(`${baseURL}/api/hts/search`, {
        headers: { 'Authorization': 'Bearer invalid_token' },
        params: {
          q: 'electronic',
          type: 'description'
        }
      });

      expect(response.status()).toBe(401);
    });

    test('should handle server errors gracefully', async ({ request, page }) => {
      // This test would require mocking or a test environment that can simulate errors
      // For now, we'll test that error responses have the expected format
      
      const response = await request.get(`${baseURL}/api/hts/search`, {
        headers: { 'Authorization': `Bearer ${authToken}` },
        params: {
          q: 'electronic',
          type: 'description'
        }
      });

      // If successful, verify success format
      if (response.ok()) {
        const data = await response.json();
        expect(data).toEqual(expect.objectContaining({
          success: true,
          data: expect.any(Array),
          meta: expect.any(Object)
        }));
      } else {
        // If error, verify error format
        const data = await response.json();
        expect(data).toEqual(expect.objectContaining({
          success: false,
          error: expect.any(String)
        }));
      }
    });
  });

  test.describe('Performance', () => {
    test('should respond to search requests quickly', async ({ request }) => {
      const startTime = Date.now();
      
      const response = await request.get(`${baseURL}/api/hts/search`, {
        headers: { 'Authorization': `Bearer ${authToken}` },
        params: {
          q: 'electronic',
          type: 'description',
          limit: 50
        }
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(response.ok()).toBeTruthy();
      expect(duration).toBeLessThan(5000); // Should respond within 5 seconds
    });

    test('should handle concurrent requests', async ({ request }) => {
      const searchTerms = ['electronic', 'textile', 'machinery', 'chemical', 'metal'];
      
      const promises = searchTerms.map(term => 
        request.get(`${baseURL}/api/hts/search`, {
          headers: { 'Authorization': `Bearer ${authToken}` },
          params: {
            q: term,
            type: 'description'
          }
        })
      );

      const startTime = Date.now();
      const responses = await Promise.all(promises);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // All requests should succeed
      responses.forEach(response => {
        expect(response.ok()).toBeTruthy();
      });
      
      // Concurrent requests should not take much longer than a single request
      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
    });
  });

  test.describe('Data Integrity', () => {
    test('should return consistent results for same search', async ({ request }) => {
      const searchParams = {
        q: 'electronic circuits',
        type: 'description',
        limit: 20
      };

      // Make two identical requests
      const response1 = await request.get(`${baseURL}/api/hts/search`, {
        headers: { 'Authorization': `Bearer ${authToken}` },
        params: searchParams
      });

      const response2 = await request.get(`${baseURL}/api/hts/search`, {
        headers: { 'Authorization': `Bearer ${authToken}` },
        params: searchParams
      });

      const data1 = await response1.json();
      const data2 = await response2.json();

      expect(data1.success).toBe(true);
      expect(data2.success).toBe(true);
      
      // Results should be identical
      expect(data1.data).toEqual(data2.data);
      expect(data1.meta.resultCount).toBe(data2.meta.resultCount);
    });

    test('should return valid HTS code format in results', async ({ request }) => {
      const response = await request.get(`${baseURL}/api/hts/search`, {
        headers: { 'Authorization': `Bearer ${authToken}` },
        params: {
          q: 'electronic',
          type: 'description',
          limit: 10
        }
      });

      const data = await response.json();
      expect(data.success).toBe(true);
      
      // All HTS codes should be valid format
      data.data.forEach(result => {
        expect(result.htsno).toMatch(/^\d{4,10}$/);
        expect(result.description).toBeTruthy();
        expect(typeof result.description).toBe('string');
      });
    });
  });
});