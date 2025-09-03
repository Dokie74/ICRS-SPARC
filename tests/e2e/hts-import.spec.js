// tests/e2e/hts-import.spec.js
// Test HTS data import functionality and admin permissions

import { test, expect } from '@playwright/test';

test.describe('HTS Data Import', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page
    await page.goto('http://localhost:3000/login');
    
    // Login with the provided credentials
    await page.fill('input[type="email"]', 'dokonoski@lucerneintl.com');
    await page.fill('input[type="password"]', 'Winter!0!!');
    await page.click('button[type="submit"]');
    
    // Wait for redirect to dashboard
    await page.waitForURL('**/dashboard');
  });

  test('should display HTS Browser page with import button', async ({ page }) => {
    // Navigate to HTS Browser
    await page.goto('http://localhost:3000/hts-browser');
    
    // Check if page loaded properly
    await expect(page.locator('h1')).toContainText('HTS Browser');
    await expect(page.locator('text=Complete USITC Harmonized Tariff Schedule Database')).toBeVisible();
    
    // Check if import button is visible
    await expect(page.locator('button:has-text("Import Latest Data")')).toBeVisible();
  });

  test('should show user permissions and role', async ({ page }) => {
    // Check user display in sidebar
    await page.goto('http://localhost:3000/dashboard');
    
    // Look for user info in sidebar
    await expect(page.locator('text=dokonoski@lucerneintl.com').or(page.locator('text=D'))).toBeVisible();
    
    // Take screenshot for debugging
    await page.screenshot({ path: 'tests/screenshots/user-sidebar.png', fullPage: true });
  });

  test('should test HTS import button click and permissions', async ({ page }) => {
    // Navigate to HTS Browser
    await page.goto('http://localhost:3000/hts-browser');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Try clicking the import button
    const importButton = page.locator('button:has-text("Import Latest Data")');
    await expect(importButton).toBeVisible();
    
    // Listen for console errors
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    // Listen for network requests
    const networkRequests = [];
    page.on('request', request => {
      if (request.url().includes('/api/hts/refresh')) {
        networkRequests.push({
          url: request.url(),
          method: request.method(),
          headers: request.headers()
        });
      }
    });
    
    // Listen for network responses
    const networkResponses = [];
    page.on('response', response => {
      if (response.url().includes('/api/hts/refresh')) {
        networkResponses.push({
          url: response.url(),
          status: response.status(),
          statusText: response.statusText()
        });
      }
    });
    
    // Click the import button
    await importButton.click();
    
    // Wait a moment for the request to complete
    await page.waitForTimeout(3000);
    
    // Check for toast notifications
    const toastContainer = page.locator('[data-testid="toast-container"]').or(page.locator('.react-hot-toast'));
    if (await toastContainer.count() > 0) {
      await expect(toastContainer).toBeVisible();
    }
    
    // Log results for debugging
    console.log('Console Errors:', consoleErrors);
    console.log('Network Requests:', networkRequests);
    console.log('Network Responses:', networkResponses);
    
    // Take screenshot of the result
    await page.screenshot({ path: 'tests/screenshots/hts-import-result.png', fullPage: true });
    
    // Verify the response
    if (networkResponses.length > 0) {
      const response = networkResponses[0];
      console.log(`HTS Import Response: ${response.status} ${response.statusText}`);
      
      if (response.status === 403) {
        console.log('❌ Admin privileges required for HTS data import');
        console.log('Current user does not have admin role');
      } else if (response.status === 200) {
        console.log('✅ HTS data import successful');
      }
    }
  });

  test('should check user role via API', async ({ page }) => {
    // Navigate to any page to ensure we're logged in
    await page.goto('http://localhost:3000/dashboard');
    
    // Intercept auth-related API calls
    let userRole = null;
    
    page.on('response', async response => {
      if (response.url().includes('/api/auth/me') || response.url().includes('/api/user')) {
        try {
          const data = await response.json();
          console.log('User data from API:', data);
          userRole = data.role || data.user?.role;
        } catch (e) {
          console.log('Could not parse user response:', e.message);
        }
      }
    });
    
    // Try to trigger a user info request by navigating
    await page.reload();
    await page.waitForTimeout(2000);
    
    console.log('Detected user role:', userRole);
    
    // Try to access the browser's localStorage to see if we can find user info
    const localStorageData = await page.evaluate(() => {
      const keys = Object.keys(localStorage);
      const data = {};
      keys.forEach(key => {
        try {
          data[key] = JSON.parse(localStorage.getItem(key));
        } catch (e) {
          data[key] = localStorage.getItem(key);
        }
      });
      return data;
    });
    
    console.log('LocalStorage data:', localStorageData);
  });
});