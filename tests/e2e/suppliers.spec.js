// tests/e2e/suppliers.spec.js
// Test to verify real supplier data is displayed (addresses original issue)

const { test, expect } = require('@playwright/test');

test.describe('Suppliers Data Verification', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.fill('input[name="email"]', 'admin@lucerne.com');
    await page.fill('input[name="password"]', 'Winter!0!!');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/dashboard');
  });

  test('should display real supplier names from database', async ({ page }) => {
    // Navigate to admin suppliers page
    await page.goto('/admin');
    
    // Look for suppliers section or navigate to it
    const suppliersLink = page.locator('text=Suppliers').or(page.locator('a[href*="suppliers"]')).first();
    if (await suppliersLink.isVisible()) {
      await suppliersLink.click();
    }
    
    // Wait for suppliers data to load
    await page.waitForTimeout(2000);
    
    // Check for real supplier names from our API test results
    // These are the actual suppliers we confirmed exist in the database
    const realSupplierNames = [
      'Acme Motors',
      'PowerTrain Inc'
    ];
    
    for (const supplierName of realSupplierNames) {
      await expect(page.locator(`text=${supplierName}`)).toBeVisible({ timeout: 10000 });
    }
    
    // Verify NO unnamed suppliers appear (the original problem)
    await expect(page.locator('text=Unnamed')).not.toBeVisible();
    await expect(page.locator('text=unnamed')).not.toBeVisible();
    
    // Verify we see actual supplier count (not demo/mock count)
    const supplierRows = page.locator('tr').filter({ hasText: /Acme Motors|PowerTrain Inc/ });
    await expect(supplierRows).toHaveCount(2);
  });

  test('should intercept API calls and verify real data is returned', async ({ page }) => {
    // Set up request interception to verify API responses
    let supplierApiResponse = null;
    
    page.on('response', async (response) => {
      if (response.url().includes('/api/admin/suppliers') && response.status() === 200) {
        supplierApiResponse = await response.json();
      }
    });
    
    // Navigate to suppliers
    await page.goto('/admin');
    
    // Trigger API call by navigating to suppliers section
    const suppliersLink = page.locator('text=Suppliers').or(page.locator('a[href*="suppliers"]')).first();
    if (await suppliersLink.isVisible()) {
      await suppliersLink.click();
    }
    
    // Wait for API response
    await page.waitForTimeout(3000);
    
    // Verify API response contains real data
    expect(supplierApiResponse).toBeTruthy();
    expect(supplierApiResponse.success).toBe(true);
    expect(supplierApiResponse.data).toBeTruthy();
    expect(Array.isArray(supplierApiResponse.data)).toBe(true);
    
    // Verify specific supplier data
    const suppliers = supplierApiResponse.data;
    const supplierNames = suppliers.map(s => s.company_name);
    
    expect(supplierNames).toContain('Acme Motors');
    expect(supplierNames).toContain('PowerTrain Inc');
    
    // Verify suppliers have proper database IDs (not mock IDs)
    expect(suppliers.every(s => Number.isInteger(s.id))).toBe(true);
    
    // Verify no mock/demo patterns
    expect(suppliers.every(s => s.company_name && s.company_name !== 'Unnamed')).toBe(true);
  });

  test('should create a new supplier successfully', async ({ page }) => {
    // Navigate to suppliers section
    await page.goto('/admin');
    
    const suppliersLink = page.locator('text=Suppliers').or(page.locator('a[href*="suppliers"]')).first();
    if (await suppliersLink.isVisible()) {
      await suppliersLink.click();
    }
    
    // Look for add/create button
    const createButton = page.locator('button').filter({ hasText: /Add|Create|New/ }).first();
    if (await createButton.isVisible()) {
      await createButton.click();
      
      // Fill out the form with test data
      await page.fill('input[name="company_name"]', 'Test Supplier E2E');
      await page.fill('input[name="contact_person"]', 'Test Contact');
      await page.fill('input[name="email"]', 'test@e2e.com');
      await page.fill('input[name="phone"]', '555-0123');
      
      // Submit the form
      await page.click('button[type="submit"]');
      
      // Verify the new supplier appears in the list
      await expect(page.locator('text=Test Supplier E2E')).toBeVisible({ timeout: 10000 });
    }
  });

  test('should display supplier details with real database fields', async ({ page }) => {
    // Navigate to suppliers
    await page.goto('/admin');
    
    const suppliersLink = page.locator('text=Suppliers').or(page.locator('a[href*="suppliers"]')).first();
    if (await suppliersLink.isVisible()) {
      await suppliersLink.click();
    }
    
    // Click on a supplier to view details
    const acmeSupplier = page.locator('text=Acme Motors').first();
    if (await acmeSupplier.isVisible()) {
      await acmeSupplier.click();
      
      // Verify real supplier details are shown
      await expect(page.locator('text=Robert Chen')).toBeVisible();
      await expect(page.locator('text=robert@acmemotors.com')).toBeVisible();
      await expect(page.locator('text=555-2001')).toBeVisible();
    }
  });
});