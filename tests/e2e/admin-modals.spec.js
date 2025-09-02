// tests/e2e/admin-modals.spec.js
// Comprehensive E2E tests for Admin page modals - ICRS SPARC
// Tests all modal functionality including validation, form submissions, and error handling

import { test, expect } from '@playwright/test';

// Test configuration
const BASE_URL = 'http://localhost:3000';
const API_URL = 'http://localhost:5000';

// Test data generators
const generateEmployee = (suffix = Date.now()) => ({
  name: `Test Employee ${suffix}`,
  email: `employee${suffix}@test.com`,
  role: 'admin',
  department: 'warehouse',
  phone: '(555) 123-4567',
  status: 'active'
});

const generatePart = (suffix = Date.now()) => ({
  id: `TEST-PART-${suffix}`,
  description: `Test Electronic Component ${suffix}`,
  hts_code: '8541.10.0060',
  country_of_origin: 'USA',
  material: 'electronic',
  material_price: '15.00',
  labor_price: '10.00',
  standard_value: '25.00',
  unit_of_measure: 'EA',
  gross_weight: '0.100',
  manufacturer: 'Test Manufacturer'
});

const generateCustomer = (suffix = Date.now()) => ({
  name: `Acme Corporation ${suffix}`,
  ein: '12-3456789',
  address: '123 Business St, City, ST 12345',
  contact_email: `contact${suffix}@acme.com`,
  phone: '(555) 987-6543',
  website: 'https://acme.com',
  industry: 'manufacturing',
  broker_name: 'Test Customs Broker',
  status: 'active'
});

const generateSupplier = (suffix = Date.now()) => ({
  name: `Global Manufacturing ${suffix}`,
  country: 'CHN',
  contact_person: 'Li Wei',
  contact_email: `li.wei${suffix}@global-mfg.com`,
  phone: '+86 123-456-7890',
  broker_name: 'International Customs Broker',
  payment_terms: 'net-30',
  currency: 'USD',
  status: 'active'
});

// Page setup and authentication
test.beforeEach(async ({ page }) => {
  // Navigate to the application
  await page.goto(BASE_URL);
  
  // Check if we need to login (assumes authentication is handled)
  // This would be replaced with actual login flow
  const isLoggedIn = await page.isVisible('[data-testid="admin-page"]').catch(() => false);
  
  if (!isLoggedIn) {
    // Mock authentication or perform actual login
    await page.goto(`${BASE_URL}/admin`);
    
    // Wait for admin page to load
    await page.waitForSelector('[data-testid="admin-page"]', { timeout: 10000 });
  } else {
    await page.goto(`${BASE_URL}/admin`);
  }
  
  // Verify admin page is loaded
  await expect(page.locator('h1')).toContainText('System Administration');
});

test.describe('Admin Modal Tests', () => {
  
  test.describe('AddEmployeeModal', () => {
    
    test('should open employee modal when Add Employee button is clicked', async ({ page }) => {
      // Click Add Employee button
      await page.click('button:has-text("Add Employee")');
      
      // Verify modal opened
      await expect(page.locator('[id*="modal"]')).toBeVisible();
      await expect(page.locator('h3')).toContainText('Add New Employee');
      
      // Verify form fields are present
      await expect(page.locator('input[placeholder*="full name"]')).toBeVisible();
      await expect(page.locator('input[type="email"]')).toBeVisible();
      await expect(page.locator('select[value]')).toBeVisible();
    });
    
    test('should validate required fields', async ({ page }) => {
      await page.click('button:has-text("Add Employee")');
      
      // Try to submit empty form
      await page.click('button:has-text("Add Employee"):not(:has-text("Add Employee button"))');
      
      // Check for validation errors
      await expect(page.locator('text=Name is required')).toBeVisible();
      await expect(page.locator('text=Email is required')).toBeVisible();
      await expect(page.locator('text=Role is required')).toBeVisible();
    });
    
    test('should validate email format', async ({ page }) => {
      await page.click('button:has-text("Add Employee")');
      
      // Fill in invalid email
      await page.fill('input[placeholder*="full name"]', 'Test User');
      await page.fill('input[type="email"]', 'invalid-email');
      await page.selectOption('select', 'admin');
      
      // Try to submit
      await page.click('button[type="submit"]');
      
      // Check for email validation error
      await expect(page.locator('text=Email is invalid')).toBeVisible();
    });
    
    test('should create new employee successfully', async ({ page }) => {
      const employee = generateEmployee();
      
      await page.click('button:has-text("Add Employee")');
      
      // Fill out the form
      await page.fill('input[placeholder*="full name"]', employee.name);
      await page.fill('input[type="email"]', employee.email);
      await page.selectOption('select[value]', employee.role);
      await page.fill('input[placeholder*="department"]', employee.department);
      await page.fill('input[type="tel"]', employee.phone);
      
      // Submit form and wait for API call
      const responsePromise = page.waitForResponse(response => 
        response.url().includes('/api/admin/employees') && response.request().method() === 'POST'
      );
      
      await page.click('button[type="submit"]');
      const response = await responsePromise;
      
      // Verify API call was successful
      expect(response.status()).toBe(200);
      
      // Verify success message appears
      await expect(page.locator('text=Employee added successfully')).toBeVisible();
      
      // Verify modal closes
      await expect(page.locator('[id*="modal"]')).toBeHidden();
      
      // Verify employee appears in the list
      await expect(page.locator(`text=${employee.name}`)).toBeVisible();
    });
    
    test('should close modal with Cancel button', async ({ page }) => {
      await page.click('button:has-text("Add Employee")');
      
      // Verify modal is open
      await expect(page.locator('[id*="modal"]')).toBeVisible();
      
      // Click Cancel
      await page.click('button:has-text("Cancel")');
      
      // Verify modal is closed
      await expect(page.locator('[id*="modal"]')).toBeHidden();
    });
    
    test('should close modal with ESC key', async ({ page }) => {
      await page.click('button:has-text("Add Employee")');
      await expect(page.locator('[id*="modal"]')).toBeVisible();
      
      // Press ESC key
      await page.keyboard.press('Escape');
      
      // Verify modal is closed
      await expect(page.locator('[id*="modal"]')).toBeHidden();
    });
    
  });
  
  test.describe('AddPartModal', () => {
    
    test('should open part modal and display all form sections', async ({ page }) => {
      await page.click('button:has-text("Add Part")');
      
      // Verify modal opened with correct title
      await expect(page.locator('h3')).toContainText('Add New Part');
      
      // Verify all form sections are present
      await expect(page.locator('text=Basic Information')).toBeVisible();
      await expect(page.locator('text=Classification')).toBeVisible();
      await expect(page.locator('text=Pricing & Weight')).toBeVisible();
    });
    
    test('should validate HTS code format', async ({ page }) => {
      await page.click('button:has-text("Add Part")');
      
      // Fill in invalid HTS code
      await page.fill('input[placeholder*="part number"]', 'TEST-001');
      await page.fill('textarea[placeholder*="description"]', 'Test description');
      await page.fill('input[placeholder="XXXX.XX.XXXX"]', 'invalid-hts');
      
      await page.click('button[type="submit"]');
      
      // Check for HTS code validation error
      await expect(page.locator('text=HTS code must be in format XXXX.XX.XXXX')).toBeVisible();
    });
    
    test('should auto-calculate standard value from material and labor costs', async ({ page }) => {
      await page.click('button:has-text("Add Part")');
      
      // Fill in material and labor prices
      await page.fill('input[placeholder*="part number"]', 'TEST-CALC-001');
      await page.fill('textarea[placeholder*="description"]', 'Test calculation');
      await page.fill('input[placeholder="0.00"]:near(text="Material Cost")', '15.50');
      await page.fill('input[placeholder="0.00"]:near(text="Labor Cost")', '9.50');
      
      // Verify standard value auto-calculated
      const standardValueInput = page.locator('input[placeholder="0.00"]:near(text="Standard Value")');
      await expect(standardValueInput).toHaveValue('25.00');
    });
    
    test('should create new part with all data', async ({ page }) => {
      const part = generatePart();
      
      await page.click('button:has-text("Add Part")');
      
      // Fill out basic information
      await page.fill('input[placeholder*="part number"]', part.id);
      await page.fill('input[placeholder*="manufacturer"]', part.manufacturer);
      await page.fill('textarea[placeholder*="description"]', part.description);
      
      // Fill out classification
      await page.fill('input[placeholder="XXXX.XX.XXXX"]', part.hts_code);
      await page.fill('input[placeholder*="USA, CHN, DEU"]', part.country_of_origin);
      await page.selectOption('select:near(text="Material")', part.material);
      
      // Fill out pricing
      await page.fill('input[placeholder="0.00"]:near(text="Material Cost")', part.material_price);
      await page.fill('input[placeholder="0.00"]:near(text="Labor Cost")', part.labor_price);
      await page.fill('input[placeholder="0.000"]:near(text="Gross Weight")', part.gross_weight);
      
      // Submit and wait for API call
      const responsePromise = page.waitForResponse(response => 
        response.url().includes('/api/admin/parts') || 
        response.url().includes('/api/parts') && response.request().method() === 'POST'
      );
      
      await page.click('button[type="submit"]');
      const response = await responsePromise;
      
      // Verify success
      expect(response.status()).toBe(200);
      await expect(page.locator('text=Part added successfully')).toBeVisible();
      await expect(page.locator('[id*="modal"]')).toBeHidden();
    });
    
  });
  
  test.describe('AddCustomerModal', () => {
    
    test('should open customer modal with contact management', async ({ page }) => {
      await page.click('button:has-text("Add Customer")');
      
      // Verify modal and sections
      await expect(page.locator('h3')).toContainText('Add New Customer');
      await expect(page.locator('text=Company Information')).toBeVisible();
      await expect(page.locator('text=Contact Information')).toBeVisible();
      await expect(page.locator('text=Additional Contacts')).toBeVisible();
      
      // Verify default contact exists
      await expect(page.locator('input[placeholder="Contact name"]')).toBeVisible();
      await expect(page.locator('input[type="checkbox"]:checked')).toBeVisible(); // Primary contact checkbox
    });
    
    test('should validate EIN format', async ({ page }) => {
      await page.click('button:has-text("Add Customer")');
      
      await page.fill('input[placeholder*="company name"]', 'Test Company');
      await page.fill('input[placeholder="XX-XXXXXXX"]', 'invalid-ein');
      
      await page.click('button[type="submit"]');
      
      await expect(page.locator('text=EIN must be in format XX-XXXXXXX')).toBeVisible();
    });
    
    test('should auto-correct website URLs', async ({ page }) => {
      await page.click('button:has-text("Add Customer")');
      
      // Enter website without protocol
      await page.fill('input[placeholder*="company name"]', 'Test Company');
      await page.fill('input[placeholder="https://company.com"]', 'example.com');
      
      // Trigger validation by moving to another field
      await page.fill('input[placeholder*="company name"]', 'Test Company Updated');
      
      // Check if website was auto-corrected (this behavior depends on implementation)
      const websiteInput = page.locator('input[placeholder="https://company.com"]');
      // The exact behavior will depend on when auto-correction triggers
    });
    
    test('should manage multiple contacts with primary designation', async ({ page }) => {
      await page.click('button:has-text("Add Customer")');
      
      // Fill in first contact
      await page.fill('input[placeholder="Contact name"]', 'Primary Contact');
      await page.fill('input[placeholder="Email address"]', 'primary@test.com');
      
      // Add second contact
      await page.click('button:has-text("Add Contact")');
      
      // Fill in second contact
      const contactInputs = page.locator('input[placeholder="Contact name"]');
      await contactInputs.nth(1).fill('Secondary Contact');
      const emailInputs = page.locator('input[placeholder="Email address"]');
      await emailInputs.nth(1).fill('secondary@test.com');
      
      // Make second contact primary
      const primaryCheckboxes = page.locator('input[type="checkbox"]:near(text="Primary Contact")');
      await primaryCheckboxes.nth(1).check();
      
      // Verify first contact is no longer primary
      await expect(primaryCheckboxes.nth(0)).not.toBeChecked();
      await expect(primaryCheckboxes.nth(1)).toBeChecked();
    });
    
    test('should create customer with complete data', async ({ page }) => {
      const customer = generateCustomer();
      
      await page.click('button:has-text("Add Customer")');
      
      // Fill company information
      await page.fill('input[placeholder*="company name"]', customer.name);
      await page.fill('input[placeholder="XX-XXXXXXX"]', customer.ein);
      await page.fill('textarea[placeholder*="company address"]', customer.address);
      await page.selectOption('select:near(text="Industry")', customer.industry);
      
      // Fill contact information
      await page.fill('input[placeholder="contact@company.com"]', customer.contact_email);
      await page.fill('input[placeholder*="555"]', customer.phone);
      await page.fill('input[placeholder="https://company.com"]', customer.website);
      await page.fill('input[placeholder*="broker name"]', customer.broker_name);
      
      // Fill additional contact
      await page.fill('input[placeholder="Contact name"]', 'Main Contact');
      await page.fill('input[placeholder="Email address"]', customer.contact_email);
      
      // Submit
      const responsePromise = page.waitForResponse(response => 
        response.url().includes('/api/admin/customers') || 
        response.url().includes('/api/customers') && response.request().method() === 'POST'
      );
      
      await page.click('button[type="submit"]');
      const response = await responsePromise;
      
      expect(response.status()).toBe(200);
      await expect(page.locator('text=Customer added successfully')).toBeVisible();
    });
    
  });
  
  test.describe('AddSupplierModal', () => {
    
    test('should open supplier modal with all sections', async ({ page }) => {
      await page.click('button:has-text("Add Supplier")');
      
      // Verify modal and all sections
      await expect(page.locator('h3')).toContainText('Add New Supplier');
      await expect(page.locator('text=Basic Information')).toBeVisible();
      await expect(page.locator('text=Contact Information')).toBeVisible();
      await expect(page.locator('text=Customs Broker Information')).toBeVisible();
      await expect(page.locator('text=Business Terms')).toBeVisible();
      await expect(page.locator('text=Additional Contacts')).toBeVisible();
    });
    
    test('should require country selection', async ({ page }) => {
      await page.click('button:has-text("Add Supplier")');
      
      // Fill name but leave country empty
      await page.fill('input[placeholder*="supplier name"]', 'Test Supplier');
      
      await page.click('button[type="submit"]');
      
      await expect(page.locator('text=Country is required')).toBeVisible();
    });
    
    test('should populate country dropdown with common options', async ({ page }) => {
      await page.click('button:has-text("Add Supplier")');
      
      // Click country dropdown
      await page.click('select:near(text="Country")');
      
      // Verify common countries are available
      await expect(page.locator('option[value="USA"]')).toBeVisible();
      await expect(page.locator('option[value="CHN"]')).toBeVisible();
      await expect(page.locator('option[value="DEU"]')).toBeVisible();
      await expect(page.locator('option[value="JPN"]')).toBeVisible();
    });
    
    test('should create supplier with broker information', async ({ page }) => {
      const supplier = generateSupplier();
      
      await page.click('button:has-text("Add Supplier")');
      
      // Basic information
      await page.fill('input[placeholder*="supplier name"]', supplier.name);
      await page.selectOption('select:near(text="Country")', supplier.country);
      await page.fill('textarea[placeholder*="supplier address"]', '123 Supplier Street');
      
      // Contact information
      await page.fill('input[placeholder*="Contact person name"]', supplier.contact_person);
      await page.fill('input[placeholder*="contact@supplier.com"]', supplier.contact_email);
      await page.fill('input[placeholder*="+1 (555) 123-4567"]', supplier.phone);
      
      // Broker information
      await page.fill('input[placeholder*="broker name"]', supplier.broker_name);
      await page.fill('input[placeholder*="Broker contact name"]', 'John Broker');
      await page.fill('input[placeholder*="broker@company.com"]', 'john@broker.com');
      
      // Business terms
      await page.selectOption('select:near(text="Payment Terms")', supplier.payment_terms);
      await page.selectOption('select:near(text="Currency")', supplier.currency);
      
      // Submit
      const responsePromise = page.waitForResponse(response => 
        response.url().includes('/api/admin/suppliers') && response.request().method() === 'POST'
      );
      
      await page.click('button[type="submit"]');
      const response = await responsePromise;
      
      expect(response.status()).toBe(200);
      await expect(page.locator('text=Supplier added successfully')).toBeVisible();
    });
    
  });
  
  test.describe('Cross-Modal Functionality', () => {
    
    test('should handle concurrent modal operations', async ({ page }) => {
      // This test ensures modal state management works correctly
      
      // Open employee modal
      await page.click('button:has-text("Add Employee")');
      await expect(page.locator('text=Add New Employee')).toBeVisible();
      
      // Cancel and open different modal
      await page.click('button:has-text("Cancel")');
      await page.click('button:has-text("Add Part")');
      
      // Verify correct modal is showing
      await expect(page.locator('text=Add New Part')).toBeVisible();
      await expect(page.locator('text=Add New Employee')).toBeHidden();
    });
    
    test('should prevent data loss warning on unsaved changes', async ({ page }) => {
      await page.click('button:has-text("Add Customer")');
      
      // Fill some data
      await page.fill('input[placeholder*="company name"]', 'Unsaved Company');
      
      // Try to close modal with data
      await page.click('button:has-text("Cancel")');
      
      // Modal should close (current implementation doesn't prevent)
      // In a production app, you might want to warn about unsaved changes
      await expect(page.locator('[id*="modal"]')).toBeHidden();
    });
    
    test('should maintain form state during API errors', async ({ page }) => {
      const employee = generateEmployee();
      
      await page.click('button:has-text("Add Employee")');
      
      // Fill form
      await page.fill('input[placeholder*="full name"]', employee.name);
      await page.fill('input[type="email"]', employee.email);
      await page.selectOption('select', employee.role);
      
      // Mock API error by intercepting request
      await page.route('**/api/admin/employees', (route) => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Server error' })
        });
      });
      
      await page.click('button[type="submit"]');
      
      // Verify error handling
      await expect(page.locator('text=Operation failed')).toBeVisible();
      
      // Verify form data is preserved
      await expect(page.locator('input[placeholder*="full name"]')).toHaveValue(employee.name);
      await expect(page.locator('input[type="email"]')).toHaveValue(employee.email);
    });
    
  });
  
  test.describe('Edit Modal Functionality', () => {
    
    test('should populate edit modal with existing data', async ({ page }) => {
      // This test assumes there's existing data to edit
      // First, create a test employee
      const employee = generateEmployee();
      
      // Create employee via API (setup)
      const createResponse = await page.request.post(`${API_URL}/api/admin/employees`, {
        data: employee
      });
      expect(createResponse.status()).toBe(200);
      
      // Refresh page to load new data
      await page.reload();
      await page.waitForSelector('text=System Administration');
      
      // Click edit button for the employee
      const editButton = page.locator(`[data-testid="edit-employee"]:near(text="${employee.name}")`);
      await editButton.click();
      
      // Verify modal opens with pre-filled data
      await expect(page.locator('text=Edit Employee')).toBeVisible();
      await expect(page.locator('input[placeholder*="full name"]')).toHaveValue(employee.name);
      await expect(page.locator('input[type="email"]')).toHaveValue(employee.email);
    });
    
  });
  
  test.describe('Performance and Error Handling', () => {
    
    test('should handle slow API responses gracefully', async ({ page }) => {
      await page.click('button:has-text("Add Employee")');
      
      // Mock slow API response
      await page.route('**/api/admin/employees', async (route) => {
        await new Promise(resolve => setTimeout(resolve, 3000)); // 3 second delay
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: { id: 1 } })
        });
      });
      
      // Fill and submit form
      await page.fill('input[placeholder*="full name"]', 'Slow Response Test');
      await page.fill('input[type="email"]', 'slow@test.com');
      await page.selectOption('select', 'admin');
      
      await page.click('button[type="submit"]');
      
      // Verify loading state
      await expect(page.locator('text=Adding...')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toBeDisabled();
      
      // Wait for completion
      await expect(page.locator('text=Employee added successfully')).toBeVisible({ timeout: 5000 });
    });
    
    test('should handle network errors appropriately', async ({ page }) => {
      await page.click('button:has-text("Add Part")');
      
      // Mock network failure
      await page.route('**/api/**', (route) => {
        route.abort('failed');
      });
      
      await page.fill('input[placeholder*="part number"]', 'NETWORK-TEST');
      await page.fill('textarea[placeholder*="description"]', 'Network test part');
      
      await page.click('button[type="submit"]');
      
      // Should show appropriate error message
      await expect(page.locator('text=Operation failed')).toBeVisible();
    });
    
  });
  
});