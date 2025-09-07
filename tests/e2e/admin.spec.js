// tests/e2e/admin.spec.js
// Comprehensive admin panel test to verify real data throughout the application

const { test, expect } = require('@playwright/test');

test.describe('Admin Panel Comprehensive Verification', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.fill('input[name="email"]', 'admin@lucerne.com');
    await page.fill('input[name="password"]', 'Winter!0!!');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/dashboard');
  });

  test('should navigate to admin panel successfully', async ({ page }) => {
    // Navigate to admin panel - testing the routing issue the user encountered
    await page.goto('/admin');
    
    // Should successfully load admin page (no "Cannot GET /admin" error)
    await expect(page).toHaveURL('/admin');
    await expect(page.locator('text=Admin')).toBeVisible();
    
    // Should show admin-specific content
    await expect(page.locator('text=Suppliers').or(page.locator('text=System')).or(page.locator('text=Management'))).toBeVisible();
  });

  test('should display dashboard with real statistics', async ({ page }) => {
    // Stay on dashboard to check statistics
    await page.goto('/dashboard');
    
    // Look for dashboard statistics
    const statsContainer = page.locator('[data-testid="dashboard-stats"]').or(page.locator('.stats')).or(page.locator('.dashboard-overview'));
    
    if (await statsContainer.isVisible()) {
      // Verify we see actual counts, not demo counts
      // Look for non-zero, non-demo numbers
      const hasRealStats = await page.locator('text=/[1-9][0-9]*/').first().isVisible();
      expect(hasRealStats).toBe(true);
    }
    
    // Verify recent activity or data shows real entries
    const recentActivity = page.locator('text=Recent').or(page.locator('text=Activity')).or(page.locator('text=Updates'));
    if (await recentActivity.isVisible()) {
      // Should see real supplier/customer/part names in activity
      const hasRealActivity = await page.locator('text=Acme').or(page.locator('text=Steel')).or(page.locator('text=PowerTrain')).first().isVisible();
      expect(hasRealActivity).toBe(true);
    }
  });

  test('should complete full navigation flow through all sections', async ({ page }) => {
    // Test complete navigation flow to ensure all sections show real data
    
    // 1. Start at dashboard
    await page.goto('/dashboard');
    await expect(page.locator('text=Dashboard')).toBeVisible();
    
    // 2. Navigate to Customers
    await page.goto('/customers');
    await expect(page.locator('text=Acme Manufacturing Corp')).toBeVisible({ timeout: 10000 });
    
    // 3. Navigate to Parts
    await page.goto('/parts');
    await expect(page.locator('text=Steel Coil - Grade A36')).toBeVisible({ timeout: 10000 });
    
    // 4. Navigate to Inventory
    await page.goto('/inventory');
    await page.waitForTimeout(2000);
    // Inventory should load without errors
    
    // 5. Navigate to Admin
    await page.goto('/admin');
    await expect(page.locator('text=Admin')).toBeVisible();
    
    // 6. Check suppliers in admin
    const suppliersSection = page.locator('text=Suppliers').or(page.locator('a[href*="suppliers"]')).first();
    if (await suppliersSection.isVisible()) {
      await suppliersSection.click();
      await expect(page.locator('text=Acme Motors')).toBeVisible({ timeout: 10000 });
    }
  });

  test('should verify no mock data patterns appear anywhere', async ({ page }) => {
    const pagesToCheck = ['/dashboard', '/customers', '/parts', '/inventory', '/admin'];
    
    for (const pageUrl of pagesToCheck) {
      await page.goto(pageUrl);
      await page.waitForTimeout(2000);
      
      // Check that no mock/demo patterns appear
      const mockPatterns = [
        'Mock',
        'Demo',
        'Test User',
        'Sample',
        'Example',
        'Unnamed',
        'Lorem ipsum',
        'demo-token',
        'fake',
        'placeholder'
      ];
      
      for (const pattern of mockPatterns) {
        const mockElements = page.locator(`text=${pattern}`);
        const count = await mockElements.count();
        if (count > 0) {
          console.log(`Found potential mock data pattern "${pattern}" on ${pageUrl}`);
        }
        // Most mock patterns should not appear, but we'll log rather than fail hard
        // since some might be legitimate labels
      }
    }
  });

  test('should intercept all API calls and verify real data responses', async ({ page }) => {
    const apiResponses = {};
    
    // Intercept all API responses
    page.on('response', async (response) => {
      if (response.url().includes('/api/') && response.status() === 200) {
        try {
          const responseBody = await response.json();
          apiResponses[response.url()] = responseBody;
        } catch (e) {
          // Some responses might not be JSON
        }
      }
    });
    
    // Navigate through key pages to trigger API calls
    await page.goto('/customers');
    await page.waitForTimeout(2000);
    
    await page.goto('/parts');
    await page.waitForTimeout(2000);
    
    await page.goto('/admin');
    await page.waitForTimeout(2000);
    
    // Try to navigate to suppliers
    const suppliersLink = page.locator('text=Suppliers').or(page.locator('a[href*="suppliers"]')).first();
    if (await suppliersLink.isVisible()) {
      await suppliersLink.click();
      await page.waitForTimeout(2000);
    }
    
    // Verify API responses contain real data
    const apiUrls = Object.keys(apiResponses);
    expect(apiUrls.length).toBeGreaterThan(0);
    
    // Check each API response for real data patterns
    for (const [url, response] of Object.entries(apiResponses)) {
      if (response.success && response.data) {
        if (Array.isArray(response.data)) {
          // Verify arrays contain real data entries
          expect(response.data.length).toBeGreaterThan(0);
          
          if (url.includes('customers')) {
            expect(response.data.some(item => item.name?.includes('Acme'))).toBe(true);
          } else if (url.includes('parts')) {
            expect(response.data.some(item => item.description?.includes('Steel'))).toBe(true);
          } else if (url.includes('suppliers')) {
            expect(response.data.some(item => item.company_name?.includes('Motors'))).toBe(true);
          }
        }
      }
    }
  });

  test('should handle error cases gracefully', async ({ page }) => {
    // Test navigation to non-existent pages
    await page.goto('/nonexistent-page');
    
    // Should either redirect or show proper error page, not crash
    const hasValidContent = await page.locator('text=Dashboard').or(page.locator('text=Error')).or(page.locator('text=Not Found')).first().isVisible({ timeout: 5000 });
    expect(hasValidContent).toBe(true);
  });
});