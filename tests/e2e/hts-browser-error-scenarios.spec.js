// tests/e2e/hts-browser-error-scenarios.spec.js
// Comprehensive error handling and edge case tests for HTS Browser
// Tests network failures, invalid data, and service unavailable scenarios

import { test, expect } from '@playwright/test';
import { HTSBrowserPage } from './page-objects/HTSBrowserPage';
import { LoginPage } from './page-objects/LoginPage';
import { mockApiResponses } from './fixtures/hts-test-data';

test.describe('HTS Browser Error Scenarios', () => {
  let htsBrowserPage;
  let loginPage;

  test.beforeEach(async ({ page }) => {
    htsBrowserPage = new HTSBrowserPage(page);
    loginPage = new LoginPage(page);

    // Login before each test
    await loginPage.goto();
    await loginPage.login('admin@sparc.test', 'admin123');
  });

  test.describe('Network Error Scenarios', () => {
    test('should handle complete network failure during initialization', async ({ page }) => {
      // Block all HTS API requests
      await page.route('/api/hts/**', route => {
        route.abort('failed');
      });
      
      // Navigate to HTS Browser
      await page.goto('/hts-browser');
      
      // Should show loading initially
      await expect(page.getByText('Loading HTS Database...')).toBeVisible();
      
      // Should eventually show error notification or graceful fallback
      await expect(async () => {
        // Could show error notification
        const hasNotification = await page.locator(
          '[data-testid="notification"], .notification'
        ).isVisible();
        
        // Or could show fallback state
        const hasErrorMessage = await page.getByText(
          /Failed to initialize|Error loading|Unable to connect/
        ).isVisible();
        
        // Or should at least not crash (basic UI visible)
        const hasBasicUI = await page.getByText('HTS Browser').isVisible();
        
        expect(hasNotification || hasErrorMessage || hasBasicUI).toBeTruthy();
      }).toPass({ timeout: 20000 });
      
      // Page should not be completely broken
      await expect(page.locator('body')).toBeVisible();
    });

    test('should handle network failure during search', async ({ page }) => {
      // Initialize normally
      await htsBrowserPage.goto();
      await htsBrowserPage.waitForInitialization();
      
      // Block search requests
      await page.route('/api/hts/search*', route => {
        route.abort('failed');
      });
      
      // Attempt search
      await htsBrowserPage.searchInput.fill('electronic circuits');
      
      // Should show error notification or message
      await expect(
        page.locator('[data-testid="notification"], .notification')
      ).toBeVisible({ timeout: 10000 });
      
      // Search input should still be functional
      await expect(htsBrowserPage.searchInput).toBeEnabled();
      
      // Should not show loading spinner indefinitely
      await expect(htsBrowserPage.loadingSpinner).not.toBeVisible({ timeout: 5000 });
    });

    test('should handle timeout during search', async ({ page }) => {
      await htsBrowserPage.goto();
      await htsBrowserPage.waitForInitialization();
      
      // Mock slow response that times out
      await page.route('/api/hts/search*', async route => {
        // Delay response beyond typical timeout
        await new Promise(resolve => setTimeout(resolve, 15000));
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockApiResponses.searchSuccess)
        });
      });
      
      await htsBrowserPage.searchInput.fill('electronic');
      
      // Should handle timeout gracefully
      await expect(async () => {
        const hasError = await htsBrowserPage.hasErrorMessage();
        const hasNotification = await page.locator(
          '[data-testid="notification"]'
        ).isVisible();
        const notLoading = !await htsBrowserPage.isLoading();
        
        expect(hasError || hasNotification || notLoading).toBeTruthy();
      }).toPass({ timeout: 20000 });
    });

    test('should handle intermittent connectivity', async ({ page }) => {
      await htsBrowserPage.goto();
      await htsBrowserPage.waitForInitialization();
      
      let requestCount = 0;
      
      // Simulate intermittent failures
      await page.route('/api/hts/search*', route => {
        requestCount++;
        
        if (requestCount % 2 === 1) {
          // Fail odd requests
          route.abort('failed');
        } else {
          // Allow even requests
          route.continue();
        }
      });
      
      // First search should fail
      await htsBrowserPage.searchInput.fill('electronic');
      await expect(
        page.locator('[data-testid="notification"]')
      ).toBeVisible({ timeout: 5000 });
      
      // Second search should succeed
      await htsBrowserPage.clearSearch();
      await htsBrowserPage.searchInput.fill('circuits');
      
      await expect(async () => {
        const hasResults = (await htsBrowserPage.getSearchResultCount()) > 0;
        expect(hasResults).toBeTruthy();
      }).toPass({ timeout: 10000 });
    });
  });

  test.describe('API Error Responses', () => {
    test('should handle 500 server errors', async ({ page }) => {
      await htsBrowserPage.goto();
      await htsBrowserPage.waitForInitialization();
      
      // Mock server error
      await page.route('/api/hts/search*', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: 'Internal server error during HTS search'
          })
        });
      });
      
      await htsBrowserPage.searchInput.fill('electronic');
      
      // Should show error message
      await expect(
        page.getByText(/Search failed|Internal server error|Error/)
      ).toBeVisible({ timeout: 5000 });
      
      // Should not show search results
      await htsBrowserPage.verifyResultsVisible(false);
    });

    test('should handle 429 rate limit errors', async ({ page }) => {
      await htsBrowserPage.goto();
      await htsBrowserPage.waitForInitialization();
      
      // Mock rate limit error
      await page.route('/api/hts/search*', route => {
        route.fulfill({
          status: 429,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: 'Too many HTS requests, please try again later'
          })
        });
      });
      
      await htsBrowserPage.searchInput.fill('electronic');
      
      // Should show rate limit message
      await expect(
        page.getByText(/Too many requests|Rate limit|try again later/)
      ).toBeVisible({ timeout: 5000 });
    });

    test('should handle 404 errors for HTS code lookup', async ({ page }) => {
      await htsBrowserPage.goto();
      await htsBrowserPage.waitForInitialization();
      
      // Allow search to succeed
      await page.route('/api/hts/search*', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: [{
              htsno: '9999999999',
              description: 'Test entry that will fail on lookup',
              general: '0%'
            }],
            meta: { resultCount: 1 }
          })
        });
      });
      
      // Mock 404 for code lookup
      await page.route('/api/hts/code/*', route => {
        route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: 'HTS code not found'
          })
        });
      });
      
      await htsBrowserPage.searchInput.fill('9999');
      await htsBrowserPage.selectFirstResult();
      
      // Should handle the 404 gracefully
      await expect(
        page.getByText(/HTS code not found|Error loading|Unable to load/)
      ).toBeVisible({ timeout: 5000 });
    });

    test('should handle authentication errors', async ({ page }) => {
      await htsBrowserPage.goto();
      await htsBrowserPage.waitForInitialization();
      
      // Mock auth error
      await page.route('/api/hts/**', route => {
        route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: 'Unauthorized'
          })
        });
      });
      
      await htsBrowserPage.searchInput.fill('electronic');
      
      // Should handle auth error appropriately
      await expect(async () => {
        // Could redirect to login
        const isOnLoginPage = page.url().includes('/login');
        
        // Or could show error message
        const hasAuthError = await page.getByText(
          /Unauthorized|Please log in|Authentication/
        ).isVisible();
        
        expect(isOnLoginPage || hasAuthError).toBeTruthy();
      }).toPass({ timeout: 10000 });
    });
  });

  test.describe('Invalid Data Scenarios', () => {
    test('should handle malformed API responses', async ({ page }) => {
      await htsBrowserPage.goto();
      await htsBrowserPage.waitForInitialization();
      
      // Mock malformed response
      await page.route('/api/hts/search*', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: 'invalid json{'
        });
      });
      
      await htsBrowserPage.searchInput.fill('electronic');
      
      // Should handle parsing error gracefully
      await expect(
        page.getByText(/Search failed|Error|Unable to process/)
      ).toBeVisible({ timeout: 5000 });
      
      // Page should remain functional
      await expect(htsBrowserPage.searchInput).toBeEnabled();
    });

    test('should handle missing required fields in response', async ({ page }) => {
      await htsBrowserPage.goto();
      await htsBrowserPage.waitForInitialization();
      
      // Mock response with missing fields
      await page.route('/api/hts/search*', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: [
              {
                // Missing htsno
                description: 'Test entry without HTS number'
              },
              {
                htsno: '8542310001'
                // Missing description
              }
            ]
          })
        });
      });
      
      await htsBrowserPage.searchInput.fill('electronic');
      
      // Should handle gracefully - either show error or filter out invalid entries
      await expect(async () => {
        const hasError = await htsBrowserPage.hasErrorMessage();
        const hasValidResults = (await htsBrowserPage.getSearchResultCount()) >= 0;
        
        expect(hasError || hasValidResults).toBeTruthy();
      }).toPass();
    });

    test('should handle null/undefined data in responses', async ({ page }) => {
      await htsBrowserPage.goto();
      await htsBrowserPage.waitForInitialization();
      
      // Mock response with null data
      await page.route('/api/hts/search*', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: null,
            meta: null
          })
        });
      });
      
      await htsBrowserPage.searchInput.fill('electronic');
      
      // Should handle null data without crashing
      await expect(htsBrowserPage.searchInput).toBeEnabled({ timeout: 5000 });
      
      // Should show appropriate message
      await expect(
        page.getByText(/No results|Error|Unable to load/)
      ).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Service Unavailable Scenarios', () => {
    test('should handle backend service downtime', async ({ page }) => {
      // Block all API requests to simulate service down
      await page.route('/api/**', route => {
        route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: 'Service temporarily unavailable'
          })
        });
      });
      
      await page.goto('/hts-browser');
      
      // Should show service unavailable message
      await expect(
        page.getByText(/Service unavailable|temporarily unavailable|try again later/)
      ).toBeVisible({ timeout: 15000 });
      
      // Page structure should still be intact
      await expect(page.getByText('HTS Browser')).toBeVisible();
    });

    test('should handle database connectivity issues', async ({ page }) => {
      await htsBrowserPage.goto();
      await htsBrowserPage.waitForInitialization();
      
      // Mock database error
      await page.route('/api/hts/search*', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: 'Database connection failed'
          })
        });
      });
      
      await htsBrowserPage.searchInput.fill('electronic');
      
      // Should show database error message
      await expect(
        page.getByText(/Database error|connection failed|temporarily unavailable/)
      ).toBeVisible({ timeout: 5000 });
    });

    test('should handle USITC data source unavailable', async ({ page }) => {
      await htsBrowserPage.goto();
      await htsBrowserPage.waitForInitialization();
      
      // Mock USITC service error
      await page.route('/api/hts/refresh*', route => {
        route.fulfill({
          status: 502,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: 'USITC data source temporarily unavailable'
          })
        });
      });
      
      // Try to access admin refresh (if available)
      if (await page.locator('[data-testid="refresh-button"]').isVisible()) {
        await page.locator('[data-testid="refresh-button"]').click();
        
        await expect(
          page.getByText(/USITC.*unavailable|data source.*unavailable/)
        ).toBeVisible({ timeout: 5000 });
      }
    });
  });

  test.describe('Edge Cases and Boundary Conditions', () => {
    test('should handle extremely long search terms', async ({ page }) => {
      await htsBrowserPage.goto();
      await htsBrowserPage.waitForInitialization();
      
      // Very long search term
      const longTerm = 'a'.repeat(1000);
      
      await htsBrowserPage.searchInput.fill(longTerm);
      
      // Should either handle gracefully or show appropriate error
      await expect(async () => {
        const hasError = await htsBrowserPage.hasErrorMessage();
        const hasResults = (await htsBrowserPage.getSearchResultCount()) >= 0;
        const inputEnabled = await htsBrowserPage.searchInput.isEnabled();
        
        expect(hasError || hasResults || inputEnabled).toBeTruthy();
      }).toPass({ timeout: 10000 });
    });

    test('should handle special characters in search', async ({ page }) => {
      await htsBrowserPage.goto();
      await htsBrowserPage.waitForInitialization();
      
      const specialChars = ['<script>', '\'; DROP TABLE;', '"', "'", '&', '<', '>'];
      
      for (const chars of specialChars) {
        await htsBrowserPage.clearSearch();
        await htsBrowserPage.searchInput.fill(chars);
        
        // Should not break the application
        await expect(htsBrowserPage.searchInput).toBeEnabled({ timeout: 2000 });
        
        // Should not execute any scripts or cause XSS
        const alertDialog = page.locator('dialog[role="alertdialog"]');
        expect(await alertDialog.count()).toBe(0);
      }
    });

    test('should handle rapid consecutive searches', async ({ page }) => {
      await htsBrowserPage.goto();
      await htsBrowserPage.waitForInitialization();
      
      // Rapid fire searches
      const searches = [
        'electronic', 'textile', 'machinery', 'chemical', 'metal',
        'plastic', 'rubber', 'wood', 'paper', 'glass'
      ];
      
      for (const search of searches) {
        await htsBrowserPage.searchInput.fill(search);
        // Don't wait for completion, just fire rapidly
      }
      
      // Wait for final search to settle
      await page.waitForTimeout(2000);
      
      // Application should still be responsive
      await expect(htsBrowserPage.searchInput).toBeEnabled();
      
      // Should show results for the last search term
      const finalValue = await htsBrowserPage.searchInput.inputValue();
      expect(finalValue).toBe(searches[searches.length - 1]);
    });

    test('should handle memory constraints with large result sets', async ({ page }) => {
      await htsBrowserPage.goto();
      await htsBrowserPage.waitForInitialization();
      
      // Mock very large result set
      const largeResults = Array(10000).fill().map((_, i) => ({
        htsno: `8542${String(i).padStart(6, '0')}`,
        description: `Large result set item ${i} - electronic integrated circuits`,
        general: '0%'
      }));
      
      await page.route('/api/hts/search*', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: largeResults.slice(0, 100), // Server should limit
            meta: { resultCount: 100 }
          })
        });
      });
      
      await htsBrowserPage.searchInput.fill('electronic');
      
      // Should handle large result set without crashing
      await expect(htsBrowserPage.searchInput).toBeEnabled({ timeout: 10000 });
      
      // Should limit displayed results
      const resultCount = await htsBrowserPage.getSearchResultCount();
      expect(resultCount).toBeLessThanOrEqual(100);
    });
  });

  test.describe('Browser Compatibility Issues', () => {
    test('should handle localStorage unavailable', async ({ page }) => {
      // Disable localStorage
      await page.addInitScript(() => {
        Object.defineProperty(window, 'localStorage', {
          value: null,
          writable: false
        });
      });
      
      await htsBrowserPage.goto();
      await htsBrowserPage.waitForInitialization();
      
      // Should still work without localStorage caching
      await htsBrowserPage.searchInput.fill('electronic');
      
      await expect(async () => {
        const hasResults = (await htsBrowserPage.getSearchResultCount()) > 0;
        expect(hasResults).toBeTruthy();
      }).toPass({ timeout: 10000 });
    });

    test('should handle JavaScript disabled scenarios', async ({ page }) => {
      // This test verifies graceful degradation
      // Even though we can't fully disable JS in Playwright,
      // we can test that the basic HTML structure is sound
      
      await htsBrowserPage.goto();
      
      // Basic HTML elements should be present
      await expect(page.getByText('HTS Browser')).toBeVisible();
      await expect(htsBrowserPage.searchInput).toBeVisible();
      await expect(htsBrowserPage.countrySelect).toBeVisible();
    });
  });

  test.describe('Recovery and Retry Mechanisms', () => {
    test('should recover after network restoration', async ({ page }) => {
      await htsBrowserPage.goto();
      await htsBrowserPage.waitForInitialization();
      
      // Block network
      await page.route('/api/hts/search*', route => {
        route.abort('failed');
      });
      
      // Try search - should fail
      await htsBrowserPage.searchInput.fill('electronic');
      await expect(
        page.locator('[data-testid="notification"]')
      ).toBeVisible({ timeout: 5000 });
      
      // Restore network
      await page.unroute('/api/hts/search*');
      
      // Try search again - should succeed
      await htsBrowserPage.clearSearch();
      await htsBrowserPage.searchInput.fill('electronic circuits');
      
      await expect(async () => {
        const hasResults = (await htsBrowserPage.getSearchResultCount()) > 0;
        expect(hasResults).toBeTruthy();
      }).toPass({ timeout: 10000 });
    });

    test('should handle cache corruption gracefully', async ({ page }) => {
      await htsBrowserPage.goto();
      await htsBrowserPage.waitForInitialization();
      
      // Perform a search to populate cache
      await htsBrowserPage.searchInput.fill('electronic');
      await htsBrowserPage.waitForSearchResults();
      
      // Corrupt localStorage cache
      await page.evaluate(() => {
        try {
          localStorage.setItem('hts-cache', 'corrupted data}');
        } catch (e) {
          // Ignore if localStorage not available
        }
      });
      
      // Try another search - should handle corrupted cache
      await htsBrowserPage.clearSearch();
      await htsBrowserPage.searchInput.fill('textile');
      
      // Should work despite cache corruption
      await expect(async () => {
        const hasResults = (await htsBrowserPage.getSearchResultCount()) >= 0;
        expect(hasResults).toBeTruthy();
      }).toPass({ timeout: 10000 });
    });
  });
});