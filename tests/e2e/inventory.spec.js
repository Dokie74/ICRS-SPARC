// tests/e2e/inventory.spec.js
// Test to verify real parts and inventory data is displayed

const { test, expect } = require('@playwright/test');

test.describe('Inventory and Parts Data Verification', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.fill('input[name="email"]', 'admin@lucerne.com');
    await page.fill('input[name="password"]', 'Winter!0!!');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/dashboard');
  });

  test('should display real parts data from database', async ({ page }) => {
    // Navigate to parts page
    await page.goto('/parts');
    
    // Wait for parts data to load
    await page.waitForTimeout(2000);
    
    // Check for real parts from our API test results
    const realPartNames = [
      'Steel Coil - Grade A36',
      'Aluminum Sheet - 6061-T6',
      'Electronic Component - IC Chip',
      'Plastic Resin - HDPE'
    ];
    
    for (const partName of realPartNames) {
      await expect(page.locator(`text=${partName}`)).toBeVisible({ timeout: 10000 });
    }
    
    // Verify parts codes are real
    await expect(page.locator('text=STL-A36-001')).toBeVisible();
    await expect(page.locator('text=ALU-6061-002')).toBeVisible();
    await expect(page.locator('text=ELEC-IC-003')).toBeVisible();
    await expect(page.locator('text=PLS-HDPE-004')).toBeVisible();
  });

  test('should intercept parts API and verify real data', async ({ page }) => {
    let partsApiResponse = null;
    
    page.on('response', async (response) => {
      if (response.url().includes('/api/parts') && response.status() === 200) {
        partsApiResponse = await response.json();
      }
    });
    
    // Navigate to parts page
    await page.goto('/parts');
    await page.waitForTimeout(3000);
    
    // Verify API response contains real data
    expect(partsApiResponse).toBeTruthy();
    expect(partsApiResponse.success).toBe(true);
    expect(partsApiResponse.data).toBeTruthy();
    expect(Array.isArray(partsApiResponse.data)).toBe(true);
    
    const parts = partsApiResponse.data;
    const partDescriptions = parts.map(p => p.description);
    
    expect(partDescriptions).toContain('Hot-rolled steel coil, ASTM A36 grade');
    expect(partDescriptions).toContain('Aluminum sheet, alloy 6061-T6, 0.125" thickness');
    expect(partDescriptions).toContain('Integrated circuit chip, ARM Cortex-M4');
    expect(partDescriptions).toContain('High-density polyethylene resin pellets');
    
    // Verify parts have proper database structure
    parts.forEach(part => {
      expect(part.id).toBeTruthy();
      expect(part.name).toBeTruthy();
      expect(part.description).toBeTruthy();
      expect(part.code).toBeTruthy();
      expect(part.category).toBeTruthy();
      expect(typeof part.standard_cost).toBe('number');
      expect(part.active).toBe(true);
    });
  });

  test('should display inventory lots with real data', async ({ page }) => {
    // Navigate to inventory page
    await page.goto('/inventory');
    await page.waitForTimeout(2000);
    
    // Look for inventory lots or related data
    // Inventory might be displayed as lots or transactions
    const inventoryContent = page.locator('table').or(page.locator('[data-testid="inventory-grid"]'));
    
    if (await inventoryContent.isVisible()) {
      // Verify we see real inventory data, not mock data
      // Look for actual part references or customer references
      const hasRealData = await page.locator('text=STL-A36-001').or(page.locator('text=ALU-6061-002')).first().isVisible();
      expect(hasRealData).toBe(true);
    }
  });

  test('should show parts with detailed specifications', async ({ page }) => {
    await page.goto('/parts');
    
    // Click on a part to view details
    const steelPart = page.locator('text=Steel Coil - Grade A36').first();
    if (await steelPart.isVisible()) {
      await steelPart.click();
      
      // Verify detailed part information
      await expect(page.locator('text=Hot-rolled steel coil, ASTM A36 grade')).toBeVisible();
      await expect(page.locator('text=Raw Materials')).toBeVisible(); // Category
      await expect(page.locator('text=650')).toBeVisible(); // Standard cost
      await expect(page.locator('text=MT')).toBeVisible(); // Unit of measure
      await expect(page.locator('text=7208.52.00')).toBeVisible(); // HS code
      await expect(page.locator('text=China')).toBeVisible(); // Country of origin
    }
  });

  test('should filter parts by category', async ({ page }) => {
    await page.goto('/parts');
    
    // Look for category filter
    const categoryFilter = page.locator('select[name*="category"]').or(page.locator('input[placeholder*="category"]')).first();
    
    if (await categoryFilter.isVisible()) {
      // Filter by Raw Materials category
      if (await categoryFilter.locator('option').first().isVisible()) {
        await categoryFilter.selectOption('Raw Materials');
      } else {
        await categoryFilter.fill('Raw Materials');
      }
      
      await page.waitForTimeout(1000);
      
      // Should show raw materials parts
      await expect(page.locator('text=Steel Coil - Grade A36')).toBeVisible();
      await expect(page.locator('text=Aluminum Sheet - 6061-T6')).toBeVisible();
      
      // Should not show electronics parts
      await expect(page.locator('text=Electronic Component - IC Chip')).not.toBeVisible();
    }
  });

  test('should display parts with correct pricing', async ({ page }) => {
    await page.goto('/parts');
    
    // Verify parts show real pricing data
    await expect(page.locator('text=650').and(page.locator('text=Steel Coil'))).toBeVisible(); // Steel coil cost
    await expect(page.locator('text=3.25').and(page.locator('text=Aluminum Sheet'))).toBeVisible(); // Aluminum cost
    await expect(page.locator('text=15.5').and(page.locator('text=IC Chip'))).toBeVisible(); // IC chip cost
    await expect(page.locator('text=1.85').and(page.locator('text=HDPE'))).toBeVisible(); // HDPE cost
  });
});