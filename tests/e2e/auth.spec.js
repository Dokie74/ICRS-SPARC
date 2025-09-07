// tests/e2e/auth.spec.js
// Authentication flow test for ICRS SPARC

const { test, expect } = require('@playwright/test');

test.describe('Authentication Flow', () => {
  test('should login successfully with admin credentials', async ({ page }) => {
    // Navigate to the app
    await page.goto('/');
    
    // Should redirect to login page if not authenticated
    await expect(page).toHaveURL('/login');
    
    // Fill in login form with provided credentials
    await page.fill('input[name="email"]', 'admin@lucerne.com');
    await page.fill('input[name="password"]', 'Winter!0!!');
    
    // Submit the form
    await page.click('button[type="submit"]');
    
    // Should redirect to dashboard after successful login
    await expect(page).toHaveURL('/dashboard', { timeout: 10000 });
    
    // Verify we're logged in by checking for user interface elements
    await expect(page.locator('text=ICRS SPARC')).toBeVisible();
    await expect(page.locator('text=Dashboard')).toBeVisible();
  });

  test('should maintain authentication state', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('input[name="email"]', 'admin@lucerne.com');
    await page.fill('input[name="password"]', 'Winter!0!!');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/dashboard');
    
    // Navigate away and back - should stay logged in
    await page.goto('/inventory');
    await expect(page.locator('text=Inventory')).toBeVisible();
    
    // Direct navigation to protected route should work
    await page.goto('/admin');
    await expect(page).toHaveURL('/admin');
  });

  test('should have admin access for admin user', async ({ page }) => {
    // Login with admin credentials
    await page.goto('/login');
    await page.fill('input[name="email"]', 'admin@lucerne.com');
    await page.fill('input[name="password"]', 'Winter!0!!');
    await page.click('button[type="submit"]');
    
    // Navigate to admin section
    await page.goto('/admin');
    
    // Should have access to admin features
    await expect(page.locator('text=Admin')).toBeVisible();
    await expect(page).toHaveURL('/admin');
    
    // Should see admin-specific content
    await expect(page.locator('text=Suppliers').or(page.locator('text=System'))).toBeVisible();
  });
});