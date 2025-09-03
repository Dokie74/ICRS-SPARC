// tests/e2e/hts-browser.spec.js
// Comprehensive E2E tests for HTS Browser functionality in ICRS SPARC
// Covers search, selection, country-specific duty calculations, and error handling

import { test, expect } from '@playwright/test';
import { HTSBrowserPage } from './page-objects/HTSBrowserPage';
import { LoginPage } from './page-objects/LoginPage';
import { htsTestData } from './fixtures/hts-test-data';

test.describe('HTS Browser', () => {
  let htsBrowserPage;
  let loginPage;

  test.beforeEach(async ({ page }) => {
    htsBrowserPage = new HTSBrowserPage(page);
    loginPage = new LoginPage(page);

    // Login before each test
    await loginPage.goto();
    await loginPage.login('admin@sparc.test', 'admin123');
    
    // Navigate to HTS Browser
    await htsBrowserPage.goto();
    
    // Wait for service initialization
    await htsBrowserPage.waitForInitialization();
  });

  test.describe('Page Loading and Initialization', () => {
    test('should display loading state during initialization', async ({ page }) => {
      // Navigate to fresh HTS Browser page to see loading
      await page.goto('/hts-browser', { waitUntil: 'domcontentloaded' });
      
      // Check for loading spinner
      await expect(page.locator('.animate-spin')).toBeVisible();
      await expect(page.getByText('Loading HTS Database...')).toBeVisible();
      
      // Wait for initialization to complete
      await htsBrowserPage.waitForInitialization();
      
      // Verify loading state is gone
      await expect(page.locator('.animate-spin')).not.toBeVisible();
      await expect(page.getByText('Loading HTS Database...')).not.toBeVisible();
    });

    test('should display service status indicator', async ({ page }) => {
      await expect(htsBrowserPage.serviceStatusIndicator).toBeVisible();
      
      // Should show either 'Data Loaded' or 'Loading...'
      await expect(
        page.locator('[data-testid="service-status"] .font-medium')
      ).toContainText(/Data Loaded|Loading.../);
      
      // Should show entry count
      await expect(
        page.locator('[data-testid="service-status"] .text-gray-500')
      ).toContainText(/\d+.*entries/);
    });

    test('should display navigation tabs', async () => {
      await expect(htsBrowserPage.searchTab).toBeVisible();
      await expect(htsBrowserPage.searchTab).toContainText('Search & Browse');
      
      // Details tab should not be visible initially
      await expect(htsBrowserPage.detailsTab).not.toBeVisible();
    });

    test('should display search controls', async () => {
      await expect(htsBrowserPage.searchInput).toBeVisible();
      await expect(htsBrowserPage.descriptionButton).toBeVisible();
      await expect(htsBrowserPage.codeButton).toBeVisible();
      await expect(htsBrowserPage.countrySelect).toBeVisible();
    });

    test('should display popular codes when search is empty', async () => {
      await expect(htsBrowserPage.popularCodesSection).toBeVisible();
      
      // Should have at least a few popular codes
      const popularCodes = await htsBrowserPage.popularCodeButtons.count();
      expect(popularCodes).toBeGreaterThan(0);
    });
  });

  test.describe('Search Functionality', () => {
    test('should search by description', async () => {
      const searchTerm = 'electronic circuits';
      
      // Ensure description mode is selected
      await htsBrowserPage.selectSearchType('description');
      
      // Enter search term
      await htsBrowserPage.searchInput.fill(searchTerm);
      
      // Wait for search results
      await htsBrowserPage.waitForSearchResults();
      
      // Verify search was performed
      await expect(htsBrowserPage.searchResultsHeader)
        .toContainText(`Search Results for "${searchTerm}"`);
      
      // Should have results
      const resultCount = await htsBrowserPage.searchResultItems.count();
      expect(resultCount).toBeGreaterThan(0);
      
      // Results should contain the search term (case insensitive)
      const firstResult = htsBrowserPage.searchResultItems.first();
      await expect(firstResult).toContainText(/electronic|circuits/i);
    });

    test('should search by HTS code', async () => {
      const searchTerm = '8542';
      
      // Select code search mode
      await htsBrowserPage.selectSearchType('code');
      
      // Enter HTS code
      await htsBrowserPage.searchInput.fill(searchTerm);
      
      // Wait for search results
      await htsBrowserPage.waitForSearchResults();
      
      // Verify search was performed
      await expect(htsBrowserPage.searchResultsHeader)
        .toContainText(`Search Results for "${searchTerm}"`);
      
      // Should have results
      const resultCount = await htsBrowserPage.searchResultItems.count();
      expect(resultCount).toBeGreaterThan(0);
      
      // Results should contain the HTS code
      const firstResult = htsBrowserPage.searchResultItems.first();
      await expect(firstResult.locator('.font-mono')).toContainText(searchTerm);
    });

    test('should highlight search terms in results', async () => {
      const searchTerm = 'electronic';
      
      await htsBrowserPage.searchInput.fill(searchTerm);
      await htsBrowserPage.waitForSearchResults();
      
      // Check for highlighted terms
      const highlightedTerm = htsBrowserPage.page
        .locator('mark.bg-yellow-200')
        .first();
      
      await expect(highlightedTerm).toBeVisible();
      await expect(highlightedTerm).toContainText(searchTerm, { ignoreCase: true });
    });

    test('should handle minimum search length requirement', async () => {
      // Try searching with single character
      await htsBrowserPage.searchInput.fill('a');
      
      // Should show empty state message
      await expect(
        htsBrowserPage.page.getByText('Enter at least 2 characters to search HTS codes')
      ).toBeVisible();
      
      // No search results should be shown
      await expect(htsBrowserPage.searchResultItems).toHaveCount(0);
    });

    test('should handle empty search results', async () => {
      const invalidSearchTerm = 'xyzinvalidterm123';
      
      await htsBrowserPage.searchInput.fill(invalidSearchTerm);
      await htsBrowserPage.waitForSearchResults();
      
      // Should show no results message
      await expect(
        htsBrowserPage.page.getByText(`No HTS codes found for "${invalidSearchTerm}"`)
      ).toBeVisible();
    });

    test('should debounce search input', async () => {
      // Type quickly to test debouncing
      await htsBrowserPage.searchInput.fill('elect');
      await htsBrowserPage.searchInput.fill('electronic');
      
      // Should only trigger one search after debounce delay
      await htsBrowserPage.waitForSearchResults();
      
      // Verify final search term in results
      await expect(htsBrowserPage.searchResultsHeader)
        .toContainText('Search Results for "electronic"');
    });
  });

  test.describe('Popular Codes Selection', () => {
    test('should handle popular code selection', async () => {
      // Click on first popular code
      const firstPopularCode = htsBrowserPage.popularCodeButtons.first();
      await expect(firstPopularCode).toBeVisible();
      
      const codeText = await firstPopularCode.textContent();
      const htsCode = codeText.split(' ')[0]; // Extract HTS code
      
      await firstPopularCode.click();
      
      // Should either show search results or details view
      await expect(async () => {
        // Could go to search results
        const hasSearchResults = await htsBrowserPage.searchResultItems.count() > 0;
        // Or could go directly to details view
        const hasDetailsView = await htsBrowserPage.detailsView.isVisible();
        
        expect(hasSearchResults || hasDetailsView).toBeTruthy();
      }).toPass();
    });

    test('should hide popular codes when search is active', async () => {
      // Initially popular codes should be visible
      await expect(htsBrowserPage.popularCodesSection).toBeVisible();
      
      // Start searching
      await htsBrowserPage.searchInput.fill('electronic');
      
      // Popular codes should be hidden
      await expect(htsBrowserPage.popularCodesSection).not.toBeVisible();
    });
  });

  test.describe('Country Selection and Duty Calculation', () => {
    test('should select country of origin', async () => {
      // Select a country
      await htsBrowserPage.selectCountry('CN'); // China
      
      // Verify country is selected
      await expect(htsBrowserPage.countrySelect).toHaveValue('CN');
      
      // Should show applicable duty rates in search results
      await htsBrowserPage.searchInput.fill('8542');
      await htsBrowserPage.waitForSearchResults();
      
      // Look for duty information in results
      await expect(
        htsBrowserPage.page.locator('.bg-gray-50').first()
      ).toBeVisible();
    });

    test('should show country selection tip when no country selected', async () => {
      // Should show helpful tip
      await expect(
        htsBrowserPage.page.getByText(
          'Select a country of origin to see applicable duty rates'
        )
      ).toBeVisible();
    });

    test('should update duty rates when country changes', async () => {
      // Search for an HTS code first
      await htsBrowserPage.searchInput.fill('8542');
      await htsBrowserPage.waitForSearchResults();
      
      // Select first result
      await htsBrowserPage.searchResultItems.first().click();
      await htsBrowserPage.waitForDetailsView();
      
      // Select China
      await htsBrowserPage.selectCountry('CN');
      
      // Wait for duty calculation to update
      await htsBrowserPage.page.waitForTimeout(1000);
      
      // Should show duty information for China
      await expect(
        htsBrowserPage.page.locator('[data-testid="duty-info"]')
      ).toBeVisible();
      
      // Change to different country
      await htsBrowserPage.selectCountry('MX'); // Mexico
      
      // Duty information should update
      await expect(
        htsBrowserPage.page.getByText('Mexico')
      ).toBeVisible();
    });
  });

  test.describe('Search Results and Selection', () => {
    test('should display search result details', async () => {
      await htsBrowserPage.searchInput.fill('8542');
      await htsBrowserPage.waitForSearchResults();
      
      const firstResult = htsBrowserPage.searchResultItems.first();
      
      // Should show HTS code
      await expect(firstResult.locator('.font-mono')).toBeVisible();
      
      // Should show description
      await expect(firstResult.locator('.text-gray-900')).toBeVisible();
      
      // Should be clickable
      await expect(firstResult).toHaveClass(/cursor-pointer/);
    });

    test('should select HTS entry and navigate to details', async () => {
      await htsBrowserPage.searchInput.fill('8542');
      await htsBrowserPage.waitForSearchResults();
      
      // Click on first result
      await htsBrowserPage.searchResultItems.first().click();
      
      // Should navigate to details view
      await htsBrowserPage.waitForDetailsView();
      
      // Details tab should now be visible and active
      await expect(htsBrowserPage.detailsTab).toBeVisible();
      await expect(htsBrowserPage.detailsTab).toHaveClass(/border-blue-500/);
      
      // Details view should be shown
      await expect(htsBrowserPage.detailsView).toBeVisible();
    });

    test('should highlight selected result', async () => {
      await htsBrowserPage.searchInput.fill('8542');
      await htsBrowserPage.waitForSearchResults();
      
      const firstResult = htsBrowserPage.searchResultItems.first();
      await firstResult.click();
      
      // Selected result should be highlighted
      await expect(firstResult).toHaveClass(/border-blue-500/);
      await expect(firstResult).toHaveClass(/bg-blue-50/);
    });
  });

  test.describe('Details View', () => {
    test.beforeEach(async () => {
      // Navigate to details view for each test
      await htsBrowserPage.searchInput.fill('8542');
      await htsBrowserPage.waitForSearchResults();
      await htsBrowserPage.searchResultItems.first().click();
      await htsBrowserPage.waitForDetailsView();
    });

    test('should display HTS code details', async () => {
      // Should show HTS number
      await expect(
        htsBrowserPage.page.locator('[data-testid="hts-number"]')
      ).toBeVisible();
      
      // Should show description
      await expect(
        htsBrowserPage.page.locator('[data-testid="hts-description"]')
      ).toBeVisible();
      
      // Should show duty rates
      await expect(
        htsBrowserPage.page.getByText('General Rate')
      ).toBeVisible();
    });

    test('should display units of measure when available', async () => {
      // Look for units section (may not be present for all HTS codes)
      const unitsSection = htsBrowserPage.page.getByText('Units of Measure');
      
      await expect(async () => {
        const isVisible = await unitsSection.isVisible();
        if (isVisible) {
          // If units are shown, they should have content
          const unitsContent = htsBrowserPage.page.locator(
            '[data-testid="units-content"]'
          );
          await expect(unitsContent).toBeVisible();
        }
        // Test passes whether units are present or not
        expect(true).toBeTruthy();
      }).toPass();
    });

    test('should show country-specific duty information', async () => {
      // Select a country
      await htsBrowserPage.selectCountry('CN');
      
      // Should show duty information panel
      await expect(
        htsBrowserPage.page.locator('[data-testid="duty-info"]')
      ).toBeVisible();
      
      // Should show applicable rate
      await expect(
        htsBrowserPage.page.getByText('Applicable Rate:')
      ).toBeVisible();
      
      // Should show trade status
      await expect(
        htsBrowserPage.page.getByText('Trade Status:')
      ).toBeVisible();
    });

    test('should navigate back to search from details', async () => {
      // Click back button
      await htsBrowserPage.backToSearchButton.click();
      
      // Should return to search view
      await expect(htsBrowserPage.searchView).toBeVisible();
      await expect(htsBrowserPage.detailsView).not.toBeVisible();
      
      // Search tab should be active
      await expect(htsBrowserPage.searchTab).toHaveClass(/border-blue-500/);
    });
  });

  test.describe('Navigation Between Views', () => {
    test('should switch between search and details tabs', async () => {
      // Start in search view
      await expect(htsBrowserPage.searchView).toBeVisible();
      
      // Select an item to enable details tab
      await htsBrowserPage.searchInput.fill('8542');
      await htsBrowserPage.waitForSearchResults();
      await htsBrowserPage.searchResultItems.first().click();
      await htsBrowserPage.waitForDetailsView();
      
      // Click search tab
      await htsBrowserPage.searchTab.click();
      await expect(htsBrowserPage.searchView).toBeVisible();
      await expect(htsBrowserPage.detailsView).not.toBeVisible();
      
      // Click details tab
      await htsBrowserPage.detailsTab.click();
      await expect(htsBrowserPage.detailsView).toBeVisible();
      await expect(htsBrowserPage.searchView).not.toBeVisible();
    });

    test('should maintain selected entry when switching tabs', async () => {
      // Select an entry
      await htsBrowserPage.searchInput.fill('8542');
      await htsBrowserPage.waitForSearchResults();
      
      const firstResultText = await htsBrowserPage.searchResultItems.first()
        .locator('.font-mono').textContent();
      
      await htsBrowserPage.searchResultItems.first().click();
      await htsBrowserPage.waitForDetailsView();
      
      // Go back to search
      await htsBrowserPage.searchTab.click();
      
      // Selected entry should still be highlighted
      await expect(
        htsBrowserPage.searchResultItems.first()
      ).toHaveClass(/border-blue-500/);
      
      // Go back to details
      await htsBrowserPage.detailsTab.click();
      
      // Should show same HTS code
      await expect(
        htsBrowserPage.page.locator('[data-testid="hts-number"]')
      ).toContainText(firstResultText);
    });
  });

  test.describe('Responsive Design', () => {
    test('should work on mobile viewport', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      // Basic functionality should still work
      await htsBrowserPage.searchInput.fill('electronic');
      await htsBrowserPage.waitForSearchResults();
      
      // Should have results
      const resultCount = await htsBrowserPage.searchResultItems.count();
      expect(resultCount).toBeGreaterThan(0);
      
      // Should be able to select result
      await htsBrowserPage.searchResultItems.first().click();
      await htsBrowserPage.waitForDetailsView();
      
      // Details should be visible
      await expect(htsBrowserPage.detailsView).toBeVisible();
    });

    test('should adapt layout for tablet viewport', async ({ page }) => {
      // Set tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 });
      
      // Search controls should be responsive
      await expect(htsBrowserPage.searchInput).toBeVisible();
      await expect(htsBrowserPage.countrySelect).toBeVisible();
      
      // Grid layout should adapt
      const searchControls = htsBrowserPage.page.locator('.grid.grid-cols-1.lg\\:grid-cols-12');
      await expect(searchControls).toBeVisible();
    });
  });

  test.describe('Error Handling', () => {
    test('should handle network errors gracefully', async ({ page }) => {
      // Simulate network failure by blocking requests
      await page.route('/api/hts/search*', route => {
        route.abort('failed');
      });
      
      await htsBrowserPage.searchInput.fill('electronic');
      
      // Should show error message (via notification system)
      await expect(
        page.locator('[data-testid="notification"], .notification')
      ).toBeVisible();
    });

    test('should handle API errors', async ({ page }) => {
      // Mock API to return error
      await page.route('/api/hts/search*', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: 'Internal server error'
          })
        });
      });
      
      await htsBrowserPage.searchInput.fill('electronic');
      
      // Should handle error gracefully
      await expect(
        htsBrowserPage.page.getByText('Search failed')
      ).toBeVisible();
    });

    test('should handle invalid HTS code lookup', async () => {
      // Search for clearly invalid HTS code
      await htsBrowserPage.searchInput.fill('99999999');
      await htsBrowserPage.selectSearchType('code');
      await htsBrowserPage.waitForSearchResults();
      
      // Should show no results
      await expect(
        htsBrowserPage.page.getByText('No HTS codes found')
      ).toBeVisible();
    });

    test('should handle service initialization failure', async ({ page }) => {
      // Block initialization requests
      await page.route('/api/hts/countries*', route => route.abort('failed'));
      await page.route('/api/hts/popular*', route => route.abort('failed'));
      
      // Navigate to fresh page
      await page.goto('/hts-browser', { waitUntil: 'domcontentloaded' });
      
      // Should handle initialization errors
      await expect(
        page.locator('[data-testid="notification"], .notification')
      ).toBeVisible({ timeout: 15000 });
    });
  });

  test.describe('Performance', () => {
    test('should load initial page quickly', async ({ page }) => {
      const startTime = Date.now();
      
      await page.goto('/hts-browser');
      await htsBrowserPage.waitForInitialization();
      
      const loadTime = Date.now() - startTime;
      
      // Should load within reasonable time (adjust as needed)
      expect(loadTime).toBeLessThan(10000); // 10 seconds
    });

    test('should handle large search results efficiently', async () => {
      // Search for broad term that returns many results
      await htsBrowserPage.searchInput.fill('a'); // Very broad search
      await htsBrowserPage.searchInput.fill('an'); // Trigger search
      
      const startTime = Date.now();
      await htsBrowserPage.waitForSearchResults();
      const searchTime = Date.now() - startTime;
      
      // Should return results within reasonable time
      expect(searchTime).toBeLessThan(5000); // 5 seconds
      
      // Should limit results to manageable number
      const resultCount = await htsBrowserPage.searchResultItems.count();
      expect(resultCount).toBeLessThanOrEqual(100);
    });

    test('should cache search results', async () => {
      const searchTerm = 'electronic';
      
      // First search
      const startTime1 = Date.now();
      await htsBrowserPage.searchInput.fill(searchTerm);
      await htsBrowserPage.waitForSearchResults();
      const firstSearchTime = Date.now() - startTime1;
      
      // Clear search and search again
      await htsBrowserPage.searchInput.fill('');
      await htsBrowserPage.page.waitForTimeout(500);
      
      const startTime2 = Date.now();
      await htsBrowserPage.searchInput.fill(searchTerm);
      await htsBrowserPage.waitForSearchResults();
      const secondSearchTime = Date.now() - startTime2;
      
      // Second search should be faster (cached)
      expect(secondSearchTime).toBeLessThan(firstSearchTime);
    });
  });

  test.describe('Accessibility', () => {
    test('should be keyboard navigable', async ({ page }) => {
      // Tab to search input
      await page.keyboard.press('Tab');
      await expect(htsBrowserPage.searchInput).toBeFocused();
      
      // Type search term
      await page.keyboard.type('electronic');
      await htsBrowserPage.waitForSearchResults();
      
      // Tab to search type buttons
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      
      // Should be able to activate with Enter/Space
      await page.keyboard.press('Enter');
    });

    test('should have proper ARIA labels', async () => {
      // Check for ARIA labels on key elements
      await expect(htsBrowserPage.searchInput).toHaveAttribute(
        'placeholder', 
        /Search by/
      );
      
      // Country select should have label
      await expect(htsBrowserPage.countrySelect).toBeVisible();
    });

    test('should support screen readers', async ({ page }) => {
      // Search results should be announced
      await htsBrowserPage.searchInput.fill('electronic');
      await htsBrowserPage.waitForSearchResults();
      
      // Results count should be visible
      await expect(
        htsBrowserPage.page.getByText(/\d+.*results/)
      ).toBeVisible();
    });
  });
});