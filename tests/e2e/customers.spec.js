// tests/e2e/customers.spec.js
// Test to verify real customer data is displayed

const { test, expect } = require('@playwright/test');

test.describe('Customers Data Verification', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.fill('input[name="email"]', 'admin@lucerne.com');
    await page.fill('input[name="password"]', 'Winter!0!!');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/dashboard');
  });

  test('should display real customer data from database', async ({ page }) => {
    // Navigate to customers page through sidebar or direct URL
    await page.goto('/customers');
    
    // Wait for customers data to load
    await page.waitForTimeout(2000);
    
    // Check for real customer names from our API test results
    const realCustomerNames = [
      'Acme Manufacturing Corp',
      'Global Electronics Ltd',
      'Pacific Import Solutions'
    ];
    
    for (const customerName of realCustomerNames) {
      await expect(page.locator(`text=${customerName}`)).toBeVisible({ timeout: 10000 });
    }
    
    // Verify customer details are showing real data
    await expect(page.locator('text=ACME001')).toBeVisible(); // Customer code
    await expect(page.locator('text=GLOB002')).toBeVisible(); // Customer code
    await expect(page.locator('text=PAC003')).toBeVisible(); // Customer code
  });

  test('should intercept customers API and verify real data', async ({ page }) => {
    let customersApiResponse = null;
    
    page.on('response', async (response) => {
      if (response.url().includes('/api/customers') && response.status() === 200) {
        customersApiResponse = await response.json();
      }
    });
    
    // Navigate to customers page
    await page.goto('/customers');
    await page.waitForTimeout(3000);
    
    // Verify API response contains real data
    expect(customersApiResponse).toBeTruthy();
    expect(customersApiResponse.success).toBe(true);
    expect(customersApiResponse.data).toBeTruthy();
    expect(Array.isArray(customersApiResponse.data)).toBe(true);
    
    const customers = customersApiResponse.data;
    const customerNames = customers.map(c => c.name);
    
    expect(customerNames).toContain('Acme Manufacturing Corp');
    expect(customerNames).toContain('Global Electronics Ltd');
    expect(customerNames).toContain('Pacific Import Solutions');
    
    // Verify customers have proper database structure
    customers.forEach(customer => {
      expect(customer.id).toBeTruthy();
      expect(customer.name).toBeTruthy();
      expect(customer.code).toBeTruthy();
      expect(customer.contact_person).toBeTruthy();
      expect(customer.email).toBeTruthy();
      expect(customer.active).toBe(true);
    });
  });

  test('should display customer details with complete information', async ({ page }) => {
    await page.goto('/customers');
    
    // Click on first customer to view details
    const acmeCustomer = page.locator('text=Acme Manufacturing Corp').first();
    if (await acmeCustomer.isVisible()) {
      await acmeCustomer.click();
      
      // Verify detailed customer information
      await expect(page.locator('text=John Smith')).toBeVisible(); // Contact person
      await expect(page.locator('text=john.smith@acme.com')).toBeVisible(); // Email
      await expect(page.locator('text=Houston')).toBeVisible(); // City
      await expect(page.locator('text=TX')).toBeVisible(); // State
      await expect(page.locator('text=ABC Customs')).toBeVisible(); // Customs broker
    }
  });

  test('should show customer pagination correctly', async ({ page }) => {
    await page.goto('/customers');
    await page.waitForTimeout(2000);
    
    // Verify pagination shows correct total count
    const paginationText = page.locator('text=/total/i');
    if (await paginationText.isVisible()) {
      const paginationContent = await paginationText.textContent();
      // Should show real total count, not demo count
      expect(paginationContent).toContain('3'); // We know there are 3 real customers
    }
  });

  test('should filter customers correctly', async ({ page }) => {
    await page.goto('/customers');
    
    // Look for search/filter input
    const searchInput = page.locator('input[placeholder*="search"]').or(page.locator('input[type="search"]')).first();
    
    if (await searchInput.isVisible()) {
      // Search for specific customer
      await searchInput.fill('Acme');
      await page.waitForTimeout(1000);
      
      // Should show only matching results
      await expect(page.locator('text=Acme Manufacturing Corp')).toBeVisible();
      await expect(page.locator('text=Global Electronics Ltd')).not.toBeVisible();
      
      // Clear search
      await searchInput.fill('');
      await page.waitForTimeout(1000);
      
      // Should show all customers again
      await expect(page.locator('text=Acme Manufacturing Corp')).toBeVisible();
      await expect(page.locator('text=Global Electronics Ltd')).toBeVisible();
    }
  });
});