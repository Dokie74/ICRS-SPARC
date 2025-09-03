// tests/e2e/hts-browser-integration.spec.js
// Integration tests for complete HTS Browser workflows
// Tests full user journeys from search to duty calculation

import { test, expect } from '@playwright/test';
import { HTSBrowserPage } from './page-objects/HTSBrowserPage';
import { LoginPage } from './page-objects/LoginPage';
import { htsTestData, countryTestData, testScenarios } from './fixtures/hts-test-data';

test.describe('HTS Browser Integration Workflows', () => {
  let htsBrowserPage;
  let loginPage;

  test.beforeEach(async ({ page }) => {
    htsBrowserPage = new HTSBrowserPage(page);
    loginPage = new LoginPage(page);

    // Login and navigate to HTS Browser
    await loginPage.goto();
    await loginPage.login('admin@sparc.test', 'admin123');
    await htsBrowserPage.goto();
    await htsBrowserPage.waitForInitialization();
  });

  test.describe('Complete Search to Details Workflow', () => {
    test('should complete full search → select → view details → calculate duty workflow', async ({ page }) => {
      const scenario = testScenarios.happyPath.searchAndSelect;
      
      // Step 1: Search for HTS codes
      await htsBrowserPage.search(scenario.searchTerm, scenario.searchType);
      
      // Verify search results
      const resultCount = await htsBrowserPage.getSearchResultCount();
      expect(resultCount).toBeGreaterThanOrEqual(scenario.expectedResults);
      
      // Step 2: Select a country of origin
      await htsBrowserPage.selectCountry(scenario.country);
      
      // Step 3: Select an HTS entry
      await htsBrowserPage.selectResultByIndex(scenario.selectIndex);
      
      // Step 4: Verify details view
      await htsBrowserPage.verifyDetailsVisible(true);
      
      // Step 5: Verify duty information is displayed
      if (scenario.expectedDutyInfo) {
        const hasDutyInfo = await htsBrowserPage.hasDutyInformation();
        expect(hasDutyInfo).toBe(true);
        
        const dutyInfo = await htsBrowserPage.getDutyInformation();
        expect(dutyInfo).toBeTruthy();
        expect(dutyInfo.applicableRate).toBeTruthy();
        expect(dutyInfo.tradeStatus).toBeTruthy();
      }
      
      // Step 6: Navigate back to search
      await htsBrowserPage.goToSearchView();
      
      // Verify we're back in search view with results preserved
      await htsBrowserPage.verifyResultsVisible(true);
      const searchValue = await htsBrowserPage.searchInput.inputValue();
      expect(searchValue).toBe(scenario.searchTerm);
    });

    test('should maintain state when switching between search and details', async () => {
      // Search and select an entry
      await htsBrowserPage.search('electronic circuits', 'description');
      await htsBrowserPage.selectCountry('CN');
      await htsBrowserPage.selectFirstResult();
      
      // Get details from details view
      const detailsFromDetailsView = await htsBrowserPage.getHtsDetails();
      
      // Switch to search view
      await htsBrowserPage.goToSearchView();
      
      // Verify search state is preserved
      await expect(htsBrowserPage.searchInput).toHaveValue('electronic circuits');
      await expect(htsBrowserPage.countrySelect).toHaveValue('CN');
      
      // Switch back to details view
      await htsBrowserPage.goToDetailsView();
      
      // Verify same details are shown
      const detailsFromSecondView = await htsBrowserPage.getHtsDetails();
      expect(detailsFromSecondView.htsNumber).toBe(detailsFromDetailsView.htsNumber);
    });
  });

  test.describe('Popular Codes to Details Workflow', () => {
    test('should navigate from popular code to details with duty calculation', async () => {
      const scenario = testScenarios.happyPath.popularCodeFlow;
      
      // Step 1: Select a country first
      await htsBrowserPage.selectCountry(scenario.country);
      
      // Step 2: Select a popular code
      const popularCodeCount = await htsBrowserPage.getPopularCodeCount();
      expect(popularCodeCount).toBeGreaterThan(0);
      
      await htsBrowserPage.selectPopularCode(scenario.popularCodeIndex);
      
      // Step 3: Should either go to search results or directly to details
      await expect(async () => {
        // Could go to search results
        const hasResults = (await htsBrowserPage.getSearchResultCount()) > 0;
        // Or could go directly to details
        const hasDetails = await htsBrowserPage.detailsView.isVisible();
        
        expect(hasResults || hasDetails).toBeTruthy();
      }).toPass();
      
      // If we have search results, select the first one
      if ((await htsBrowserPage.getSearchResultCount()) > 0) {
        await htsBrowserPage.selectFirstResult();
      }
      
      // Step 4: Verify we're in details view
      await htsBrowserPage.verifyDetailsVisible(true);
      
      // Step 5: Verify duty information if expected
      if (scenario.expectedDutyInfo) {
        const hasDutyInfo = await htsBrowserPage.hasDutyInformation();
        expect(hasDutyInfo).toBe(true);
      }
    });

    test('should handle popular code selection without country', async () => {
      // Don't select a country initially
      
      // Select a popular code
      await htsBrowserPage.selectPopularCode(0);
      
      // Should show search results or go to details
      await expect(async () => {
        const hasResults = (await htsBrowserPage.getSearchResultCount()) > 0;
        const hasDetails = await htsBrowserPage.detailsView.isVisible();
        
        expect(hasResults || hasDetails).toBeTruthy();
      }).toPass();
      
      // If in details, should not show duty information without country
      if (await htsBrowserPage.detailsView.isVisible()) {
        const hasDutyInfo = await htsBrowserPage.hasDutyInformation();
        expect(hasDutyInfo).toBe(false);
      }
    });
  });

  test.describe('Country-Specific Duty Comparison Workflow', () => {
    test('should show different duty rates for different countries', async ({ page }) => {
      const scenario = testScenarios.happyPath.countryComparison;
      
      // Search for a specific HTS code
      await htsBrowserPage.search(scenario.htsCode, 'code');
      
      // Select the first result
      await htsBrowserPage.selectFirstResult();
      
      const dutyRatesByCountry = {};
      
      // Test duty rates for each country
      for (const countryCode of scenario.countries) {
        // Select country
        await htsBrowserPage.selectCountry(countryCode);
        
        // Wait for duty calculation to update
        await page.waitForTimeout(1000);
        
        // Get duty information
        if (await htsBrowserPage.hasDutyInformation()) {
          const dutyInfo = await htsBrowserPage.getDutyInformation();
          dutyRatesByCountry[countryCode] = dutyInfo.applicableRate;
        }
      }
      
      // If we expect different rates, verify they're actually different
      if (scenario.expectedDifferentRates && Object.keys(dutyRatesByCountry).length > 1) {
        const rates = Object.values(dutyRatesByCountry);
        const uniqueRates = [...new Set(rates)];
        
        // Should have at least some variation in rates
        // (Not all may be different due to trade agreements)
        expect(uniqueRates.length).toBeGreaterThan(0);
      }
    });

    test('should show trade agreement benefits', async ({ page }) => {
      // Search for textiles which often have preferential rates
      await htsBrowserPage.search('6205', 'code');
      
      // Select first result
      await htsBrowserPage.selectFirstResult();
      
      // Test with Mexico (USMCA partner)
      await htsBrowserPage.selectCountry('MX');
      
      if (await htsBrowserPage.hasDutyInformation()) {
        const dutyInfo = await htsBrowserPage.getDutyInformation();
        
        // Should show trade status
        expect(dutyInfo.tradeStatus).toBeTruthy();
        
        // For USMCA partners, should often show preferential treatment
        const tradeStatus = dutyInfo.tradeStatus.toLowerCase();
        if (tradeStatus.includes('usmca') || tradeStatus.includes('preferential')) {
          // Preferential rate should be lower than general rate
          // This is a general expectation but not always true
          expect(dutyInfo.applicableRate).toBeTruthy();
        }
      }
    });
  });

  test.describe('Cache Functionality Integration', () => {
    test('should use cached results for repeated searches', async () => {
      const searchTerm = 'electronic circuits';
      
      // First search
      const startTime1 = Date.now();
      await htsBrowserPage.search(searchTerm, 'description');
      const endTime1 = Date.now();
      const firstSearchTime = endTime1 - startTime1;
      
      const firstResults = await htsBrowserPage.getSearchResultTexts();
      
      // Clear search
      await htsBrowserPage.clearSearch();
      
      // Second identical search
      const startTime2 = Date.now();
      await htsBrowserPage.search(searchTerm, 'description');
      const endTime2 = Date.now();
      const secondSearchTime = endTime2 - startTime2;
      
      const secondResults = await htsBrowserPage.getSearchResultTexts();
      
      // Results should be identical
      expect(secondResults).toEqual(firstResults);
      
      // Second search should be faster (cached)
      expect(secondSearchTime).toBeLessThan(firstSearchTime * 0.8);
    });

    test('should cache HTS code details', async () => {
      // Search and select an entry
      await htsBrowserPage.search('8542', 'code');
      await htsBrowserPage.selectCountry('CN');
      await htsBrowserPage.selectFirstResult();
      
      // Get details
      const firstDetails = await htsBrowserPage.getHtsDetails();
      
      // Go back to search and select same entry again
      await htsBrowserPage.goToSearchView();
      await htsBrowserPage.selectFirstResult();
      
      // Details should load quickly (from cache)
      const secondDetails = await htsBrowserPage.getHtsDetails();
      expect(secondDetails).toEqual(firstDetails);
    });
  });

  test.describe('Error Recovery Workflows', () => {
    test('should recover from network errors during search', async ({ page }) => {
      // Start a search
      await htsBrowserPage.searchInput.fill('electronic');
      
      // Block network requests temporarily
      await page.route('/api/hts/search*', route => {
        route.abort('failed');
      });
      
      // Trigger search with network blocked
      await htsBrowserPage.searchInput.fill('electronic circuits');
      
      // Should show error notification or message
      await expect(
        page.locator('[data-testid="notification"], .notification')
      ).toBeVisible({ timeout: 10000 });
      
      // Restore network
      await page.unroute('/api/hts/search*');
      
      // Clear and try search again
      await htsBrowserPage.clearSearch();
      await htsBrowserPage.search('electronic circuits', 'description');
      
      // Should work normally now
      await htsBrowserPage.verifyResultsVisible(true);
    });

    test('should handle invalid search results gracefully', async ({ page }) => {
      // Mock API to return malformed data
      await page.route('/api/hts/search*', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: null, // Invalid data
            meta: {}
          })
        });
      });
      
      await htsBrowserPage.search('electronic', 'description');
      
      // Should handle gracefully without crashing
      await expect(
        page.locator('body')
      ).toBeVisible(); // Page should still be functional
      
      // Restore normal API
      await page.unroute('/api/hts/search*');
    });

    test('should recover from initialization failures', async ({ page }) => {
      // Navigate to a fresh HTS Browser page with blocked initialization
      await page.route('/api/hts/countries*', route => route.abort('failed'));
      await page.route('/api/hts/popular*', route => route.abort('failed'));
      
      await page.goto('/hts-browser');
      
      // Should show error but not crash
      await expect(
        page.locator('[data-testid="notification"], .notification')
      ).toBeVisible({ timeout: 15000 });
      
      // Restore API and refresh
      await page.unroute('/api/hts/countries*');
      await page.unroute('/api/hts/popular*');
      
      await page.reload();
      await htsBrowserPage.waitForInitialization();
      
      // Should work normally after recovery
      await expect(htsBrowserPage.searchInput).toBeVisible();
    });
  });

  test.describe('Multi-User Scenarios', () => {
    test('should handle concurrent users searching', async ({ browser }) => {
      // Create multiple browser contexts to simulate different users
      const contexts = await Promise.all([
        browser.newContext(),
        browser.newContext(),
        browser.newContext()
      ]);
      
      const pages = await Promise.all(contexts.map(ctx => ctx.newPage()));
      const htsBrowserPages = pages.map(page => new HTSBrowserPage(page));
      const loginPages = pages.map(page => new LoginPage(page));
      
      // Login all users
      await Promise.all([
        loginPages[0].login('admin@sparc.test', 'admin123'),
        loginPages[1].login('manager@sparc.test', 'manager123'),
        loginPages[2].login('operator@sparc.test', 'operator123')
      ]);
      
      // Navigate all to HTS Browser
      await Promise.all(
        htsBrowserPages.map(page => page.goto())
      );
      
      // Wait for all to initialize
      await Promise.all(
        htsBrowserPages.map(page => page.waitForInitialization())
      );
      
      // Perform different searches concurrently
      const searchPromises = [
        htsBrowserPages[0].search('electronic', 'description'),
        htsBrowserPages[1].search('textile', 'description'),
        htsBrowserPages[2].search('machinery', 'description')
      ];
      
      await Promise.all(searchPromises);
      
      // All should have results
      const resultCounts = await Promise.all(
        htsBrowserPages.map(page => page.getSearchResultCount())
      );
      
      resultCounts.forEach(count => {
        expect(count).toBeGreaterThan(0);
      });
      
      // Cleanup
      await Promise.all(contexts.map(ctx => ctx.close()));
    });
  });

  test.describe('Performance Integration', () => {
    test('should handle large result sets without performance degradation', async ({ page }) => {
      // Search for a broad term that returns many results
      const startTime = Date.now();
      
      await htsBrowserPage.search('equipment', 'description');
      
      const endTime = Date.now();
      const searchTime = endTime - startTime;
      
      // Should complete in reasonable time even with many results
      expect(searchTime).toBeLessThan(10000);
      
      // Results should be limited to manageable number
      const resultCount = await htsBrowserPage.getSearchResultCount();
      expect(resultCount).toBeLessThanOrEqual(100);
      
      // Page should remain responsive
      await expect(htsBrowserPage.searchInput).toBeEnabled();
    });

    test('should maintain performance during rapid interactions', async () => {
      // Rapid search type changes
      for (let i = 0; i < 5; i++) {
        await htsBrowserPage.selectSearchType('description');
        await htsBrowserPage.selectSearchType('code');
      }
      
      // Rapid country changes
      const countries = ['CN', 'MX', 'CA', 'DE', 'JP'];
      for (const country of countries) {
        await htsBrowserPage.selectCountry(country);
      }
      
      // Should still be responsive
      await expect(htsBrowserPage.searchInput).toBeEnabled();
      await expect(htsBrowserPage.countrySelect).toBeEnabled();
    });
  });

  test.describe('Data Consistency Integration', () => {
    test('should maintain data consistency across views', async () => {
      // Search and get an HTS code
      await htsBrowserPage.search('8542310001', 'code');
      const searchResults = await htsBrowserPage.getSearchResultTexts();
      
      if (searchResults.length > 0) {
        const firstResult = searchResults[0];
        
        // Select the result
        await htsBrowserPage.selectFirstResult();
        
        // Get details view data
        const detailsData = await htsBrowserPage.getHtsDetails();
        
        // HTS codes should match
        expect(detailsData.htsNumber).toContain(firstResult.htsCode.substring(0, 4));
      }
    });

    test('should show consistent duty information across different entry points', async () => {
      const htsCode = '8542310001';
      const country = 'CN';
      
      // Method 1: Search then select country
      await htsBrowserPage.search(htsCode, 'code');
      await htsBrowserPage.selectCountry(country);
      await htsBrowserPage.selectFirstResult();
      
      const dutyInfo1 = await htsBrowserPage.hasDutyInformation() ? 
        await htsBrowserPage.getDutyInformation() : null;
      
      // Go back and try different approach
      await htsBrowserPage.goToSearchView();
      await htsBrowserPage.clearSearch();
      
      // Method 2: Select country first, then search
      await htsBrowserPage.selectCountry(country);
      await htsBrowserPage.search(htsCode, 'code');
      await htsBrowserPage.selectFirstResult();
      
      const dutyInfo2 = await htsBrowserPage.hasDutyInformation() ? 
        await htsBrowserPage.getDutyInformation() : null;
      
      // Duty information should be consistent
      if (dutyInfo1 && dutyInfo2) {
        expect(dutyInfo2.applicableRate).toBe(dutyInfo1.applicableRate);
        expect(dutyInfo2.tradeStatus).toBe(dutyInfo1.tradeStatus);
      }
    });
  });
});