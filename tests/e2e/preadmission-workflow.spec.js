// tests/e2e/preadmission-workflow.spec.js
// End-to-end testing for complete preadmission to admission workflow

const { test, expect } = require('@playwright/test');

// Page object models for better test maintainability
class LoginPage {
  constructor(page) {
    this.page = page;
    this.emailInput = page.getByTestId('email-input');
    this.passwordInput = page.getByTestId('password-input');
    this.loginButton = page.getByTestId('login-button');
    this.errorMessage = page.getByTestId('error-message');
  }

  async login(email, password) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }

  async expectErrorMessage(message) {
    await expect(this.errorMessage).toContainText(message);
  }
}

class DashboardPage {
  constructor(page) {
    this.page = page;
    this.sidebarNav = page.getByTestId('sidebar-nav');
    this.preadmissionsLink = page.getByTestId('nav-preadmissions');
    this.inventoryLink = page.getByTestId('nav-inventory');
    this.dashboardMetrics = page.getByTestId('dashboard-metrics');
    this.userMenu = page.getByTestId('user-menu');
  }

  async navigateToPreadmissions() {
    await this.preadmissionsLink.click();
    await this.page.waitForURL('**/preadmissions');
  }

  async navigateToInventory() {
    await this.inventoryLink.click();
    await this.page.waitForURL('**/inventory');
  }

  async waitForDashboardLoad() {
    await expect(this.dashboardMetrics).toBeVisible();
  }
}

class PreadmissionsPage {
  constructor(page) {
    this.page = page;
    this.createButton = page.getByTestId('create-preadmission-button');
    this.searchInput = page.getByTestId('search-preadmissions');
    this.statusFilter = page.getByTestId('status-filter');
    this.preadmissionTable = page.getByTestId('preadmissions-table');
    this.paginationInfo = page.getByTestId('pagination-info');
  }

  async createPreadmission() {
    await this.createButton.click();
  }

  async searchPreadmissions(searchTerm) {
    await this.searchInput.fill(searchTerm);
    await this.page.waitForTimeout(300); // Debounce delay
  }

  async filterByStatus(status) {
    await this.statusFilter.selectOption(status);
  }

  async getPreadmissionRow(manifestNumber) {
    return this.page.getByTestId(`preadmission-row-${manifestNumber}`);
  }

  async clickProcessButton(manifestNumber) {
    const row = await this.getPreadmissionRow(manifestNumber);
    await row.getByTestId('process-button').click();
  }
}

class PreadmissionModal {
  constructor(page) {
    this.page = page;
    this.modal = page.getByTestId('preadmission-modal');
    this.customerSelect = page.getByTestId('customer-select');
    this.partSelect = page.getByTestId('part-select');
    this.quantityInput = page.getByTestId('quantity-input');
    this.manifestNumberInput = page.getByTestId('manifest-number-input');
    this.conveyanceNameInput = page.getByTestId('conveyance-name-input');
    this.importDateInput = page.getByTestId('import-date-input');
    this.portInput = page.getByTestId('port-input');
    this.bolInput = page.getByTestId('bill-of-lading-input');
    this.totalValueInput = page.getByTestId('total-value-input');
    this.notesTextarea = page.getByTestId('notes-textarea');
    this.saveButton = page.getByTestId('save-preadmission');
    this.cancelButton = page.getByTestId('cancel-button');
    this.validationErrors = page.getByTestId('validation-errors');
  }

  async fillPreadmissionData(data) {
    if (data.customer) await this.customerSelect.selectOption(data.customer);
    if (data.part) await this.partSelect.selectOption(data.part);
    if (data.quantity) await this.quantityInput.fill(data.quantity.toString());
    if (data.manifestNumber) await this.manifestNumberInput.fill(data.manifestNumber);
    if (data.conveyanceName) await this.conveyanceNameInput.fill(data.conveyanceName);
    if (data.importDate) await this.importDateInput.fill(data.importDate);
    if (data.port) await this.portInput.fill(data.port);
    if (data.billOfLading) await this.bolInput.fill(data.billOfLading);
    if (data.totalValue) await this.totalValueInput.fill(data.totalValue.toString());
    if (data.notes) await this.notesTextarea.fill(data.notes);
  }

  async save() {
    await this.saveButton.click();
  }

  async cancel() {
    await this.cancelButton.click();
  }

  async expectValidationErrors() {
    await expect(this.validationErrors).toBeVisible();
  }
}

class InventoryPage {
  constructor(page) {
    this.page = page;
    this.searchInput = page.getByTestId('search-inventory');
    this.statusFilter = page.getByTestId('status-filter');
    this.customerFilter = page.getByTestId('customer-filter');
    this.inventoryTable = page.getByTestId('inventory-table');
    this.createLotButton = page.getByTestId('create-lot-button');
    this.summaryCards = page.getByTestId('inventory-summary');
  }

  async searchInventory(searchTerm) {
    await this.searchInput.fill(searchTerm);
    await this.page.waitForTimeout(300); // Debounce delay
  }

  async getInventoryRow(lotId) {
    return this.page.getByTestId(`inventory-row-${lotId}`);
  }

  async expectLotInTable(lotId) {
    const row = await this.getInventoryRow(lotId);
    await expect(row).toBeVisible();
  }

  async clickLotDetails(lotId) {
    const row = await this.getInventoryRow(lotId);
    await row.click();
  }

  async waitForTableLoad() {
    await expect(this.inventoryTable).toBeVisible();
    await this.page.waitForSelector('[data-testid="inventory-row"]');
  }
}

class ToastNotifications {
  constructor(page) {
    this.page = page;
  }

  async expectSuccessToast(message) {
    const successToast = this.page.getByTestId('success-toast');
    await expect(successToast).toBeVisible();
    if (message) {
      await expect(successToast).toContainText(message);
    }
    // Wait for toast to disappear
    await expect(successToast).toBeHidden({ timeout: 5000 });
  }

  async expectErrorToast(message) {
    const errorToast = this.page.getByTestId('error-toast');
    await expect(errorToast).toBeVisible();
    if (message) {
      await expect(errorToast).toContainText(message);
    }
  }
}

// Test data setup
const testData = {
  users: {
    warehouseStaff: {
      email: 'warehouse@test.com',
      password: 'testPassword123'
    },
    supervisor: {
      email: 'supervisor@test.com',
      password: 'testPassword123'
    }
  },
  preadmission: {
    customer: 'TEST-CUSTOMER-001',
    part: 'TEST-PART-001',
    quantity: 100,
    manifestNumber: `MAN-E2E-${Date.now()}`,
    conveyanceName: 'Test Vessel E2E',
    importDate: '2024-02-01',
    port: 'Los Angeles',
    billOfLading: `BOL-E2E-${Date.now()}`,
    totalValue: 5000,
    notes: 'E2E test preadmission'
  }
};

test.describe('Preadmission to Admission Workflow', () => {
  let loginPage, dashboardPage, preadmissionsPage, preadmissionModal, inventoryPage, toast;

  test.beforeEach(async ({ page }) => {
    // Initialize page objects
    loginPage = new LoginPage(page);
    dashboardPage = new DashboardPage(page);
    preadmissionsPage = new PreadmissionsPage(page);
    preadmissionModal = new PreadmissionModal(page);
    inventoryPage = new InventoryPage(page);
    toast = new ToastNotifications(page);

    // Navigate to application
    await page.goto('/');
  });

  test('Complete preadmission workflow with performance validation', async ({ page }) => {
    // Track performance metrics
    const performanceMetrics = {};
    
    // Login phase
    const loginStart = Date.now();
    await loginPage.login(testData.users.warehouseStaff.email, testData.users.warehouseStaff.password);
    await dashboardPage.waitForDashboardLoad();
    performanceMetrics.loginTime = Date.now() - loginStart;

    // Verify dashboard loads within performance target
    expect(performanceMetrics.loginTime).toBeLessThan(3000); // 3 second login target

    // Navigate to preadmissions
    const navStart = Date.now();
    await dashboardPage.navigateToPreadmissions();
    await expect(page).toHaveTitle(/preadmissions/i);
    performanceMetrics.navigationTime = Date.now() - navStart;

    expect(performanceMetrics.navigationTime).toBeLessThan(1000); // 1 second navigation target

    // Create new preadmission
    const createStart = Date.now();
    await preadmissionsPage.createPreadmission();
    await expect(preadmissionModal.modal).toBeVisible();

    await preadmissionModal.fillPreadmissionData(testData.preadmission);
    await preadmissionModal.save();

    // Wait for success notification
    await toast.expectSuccessToast('Preadmission created successfully');
    performanceMetrics.createTime = Date.now() - createStart;

    expect(performanceMetrics.createTime).toBeLessThan(2000); // 2 second creation target

    // Verify preadmission appears in table
    const searchStart = Date.now();
    await preadmissionsPage.searchPreadmissions(testData.preadmission.manifestNumber);
    
    const preadmissionRow = await preadmissionsPage.getPreadmissionRow(testData.preadmission.manifestNumber);
    await expect(preadmissionRow).toBeVisible();
    performanceMetrics.searchTime = Date.now() - searchStart;

    expect(performanceMetrics.searchTime).toBeLessThan(500); // 500ms search target

    // Verify preadmission details
    await expect(preadmissionRow).toContainText(testData.preadmission.conveyanceName);
    await expect(preadmissionRow).toContainText(testData.preadmission.quantity.toString());
    await expect(preadmissionRow).toContainText('Pending'); // Default status

    // Process preadmission to admission
    const processStart = Date.now();
    await preadmissionsPage.clickProcessButton(testData.preadmission.manifestNumber);

    // Confirm processing
    const confirmButton = page.getByTestId('confirm-process-button');
    await expect(confirmButton).toBeVisible();
    await confirmButton.click();

    // Wait for processing completion
    await toast.expectSuccessToast('Preadmission processed successfully');
    performanceMetrics.processTime = Date.now() - processStart;

    expect(performanceMetrics.processTime).toBeLessThan(3000); // 3 second processing target

    // Navigate to inventory to verify lot creation
    const inventoryNavStart = Date.now();
    await dashboardPage.navigateToInventory();
    await inventoryPage.waitForTableLoad();
    performanceMetrics.inventoryLoadTime = Date.now() - inventoryNavStart;

    expect(performanceMetrics.inventoryLoadTime).toBeLessThan(2000); // 2 second inventory load target

    // Search for newly created lot
    await inventoryPage.searchInventory(testData.preadmission.manifestNumber);
    
    // Verify lot was created with correct details
    const inventoryRows = page.getByTestId('inventory-row');
    await expect(inventoryRows.first()).toBeVisible();
    
    const firstRow = inventoryRows.first();
    await expect(firstRow).toContainText(testData.preadmission.manifestNumber);
    await expect(firstRow).toContainText(testData.preadmission.quantity.toString());
    await expect(firstRow).toContainText('In Stock'); // Default status for new lots

    // Verify lot details by clicking on it
    await firstRow.click();
    const lotDetailsModal = page.getByTestId('lot-details-modal');
    await expect(lotDetailsModal).toBeVisible();

    // Verify all preadmission data was transferred correctly
    await expect(lotDetailsModal).toContainText(testData.preadmission.conveyanceName);
    await expect(lotDetailsModal).toContainText(testData.preadmission.port);
    await expect(lotDetailsModal).toContainText(testData.preadmission.billOfLading);
    await expect(lotDetailsModal).toContainText(`$${testData.preadmission.totalValue.toLocaleString()}`);

    // Close modal
    const closeButton = lotDetailsModal.getByTestId('close-button');
    await closeButton.click();
    await expect(lotDetailsModal).toBeHidden();

    // Log performance metrics
    console.log('Performance Metrics:', performanceMetrics);

    // Verify all performance targets met
    Object.entries(performanceMetrics).forEach(([metric, time]) => {
      console.log(`${metric}: ${time}ms`);
    });
  });

  test('Handles validation errors gracefully', async ({ page }) => {
    // Login
    await loginPage.login(testData.users.warehouseStaff.email, testData.users.warehouseStaff.password);
    await dashboardPage.waitForDashboardLoad();
    
    // Navigate to preadmissions
    await dashboardPage.navigateToPreadmissions();
    await preadmissionsPage.createPreadmission();
    await expect(preadmissionModal.modal).toBeVisible();

    // Try to save without required fields
    await preadmissionModal.save();
    await preadmissionModal.expectValidationErrors();

    // Fill required fields one by one and verify validation updates
    await preadmissionModal.customerSelect.selectOption(testData.preadmission.customer);
    await preadmissionModal.save();
    await preadmissionModal.expectValidationErrors();

    await preadmissionModal.partSelect.selectOption(testData.preadmission.part);
    await preadmissionModal.save();
    await preadmissionModal.expectValidationErrors();

    // Test invalid quantity
    await preadmissionModal.quantityInput.fill('0');
    await preadmissionModal.save();
    await expect(page.getByText('Quantity must be greater than zero')).toBeVisible();

    await preadmissionModal.quantityInput.fill('-10');
    await preadmissionModal.save();
    await expect(page.getByText('Quantity must be greater than zero')).toBeVisible();

    // Fill valid quantity
    await preadmissionModal.quantityInput.fill(testData.preadmission.quantity.toString());
    await preadmissionModal.manifestNumberInput.fill(testData.preadmission.manifestNumber);

    // Now save should succeed
    await preadmissionModal.save();
    await toast.expectSuccessToast('Preadmission created successfully');
  });

  test('Prevents duplicate manifest numbers', async ({ page }) => {
    // Login and create first preadmission
    await loginPage.login(testData.users.warehouseStaff.email, testData.users.warehouseStaff.password);
    await dashboardPage.waitForDashboardLoad();
    await dashboardPage.navigateToPreadmissions();

    // Create first preadmission
    await preadmissionsPage.createPreadmission();
    await preadmissionModal.fillPreadmissionData(testData.preadmission);
    await preadmissionModal.save();
    await toast.expectSuccessToast();

    // Try to create another with same manifest number
    await preadmissionsPage.createPreadmission();
    await preadmissionModal.fillPreadmissionData(testData.preadmission);
    await preadmissionModal.save();

    // Should show error
    await toast.expectErrorToast('Manifest number already exists');
    
    // Modal should remain open
    await expect(preadmissionModal.modal).toBeVisible();
  });

  test('Supports cancellation without saving', async ({ page }) => {
    await loginPage.login(testData.users.warehouseStaff.email, testData.users.warehouseStaff.password);
    await dashboardPage.waitForDashboardLoad();
    await dashboardPage.navigateToPreadmissions();

    const initialRowCount = await page.getByTestId('preadmission-row').count();

    // Start creating preadmission
    await preadmissionsPage.createPreadmission();
    await preadmissionModal.fillPreadmissionData(testData.preadmission);
    
    // Cancel instead of save
    await preadmissionModal.cancel();
    await expect(preadmissionModal.modal).toBeHidden();

    // Verify no new preadmission was created
    const finalRowCount = await page.getByTestId('preadmission-row').count();
    expect(finalRowCount).toBe(initialRowCount);
  });

  test('Handles concurrent processing attempts', async ({ page, context }) => {
    // Login and create preadmission
    await loginPage.login(testData.users.warehouseStaff.email, testData.users.warehouseStaff.password);
    await dashboardPage.waitForDashboardLoad();
    await dashboardPage.navigateToPreadmissions();

    await preadmissionsPage.createPreadmission();
    await preadmissionModal.fillPreadmissionData(testData.preadmission);
    await preadmissionModal.save();
    await toast.expectSuccessToast();

    // Open second browser tab
    const secondPage = await context.newPage();
    const secondLoginPage = new LoginPage(secondPage);
    const secondDashboardPage = new DashboardPage(secondPage);
    const secondPreadmissionsPage = new PreadmissionsPage(secondPage);

    await secondPage.goto('/');
    await secondLoginPage.login(testData.users.warehouseStaff.email, testData.users.warehouseStaff.password);
    await secondDashboardPage.waitForDashboardLoad();
    await secondDashboardPage.navigateToPreadmissions();

    // Both tabs try to process the same preadmission simultaneously
    await Promise.all([
      preadmissionsPage.clickProcessButton(testData.preadmission.manifestNumber),
      secondPreadmissionsPage.clickProcessButton(testData.preadmission.manifestNumber)
    ]);

    // Confirm both process attempts
    const confirmButton1 = page.getByTestId('confirm-process-button');
    const confirmButton2 = secondPage.getByTestId('confirm-process-button');
    
    await Promise.all([
      confirmButton1.click(),
      confirmButton2.click()
    ]);

    // One should succeed, one should fail
    const toasts = await Promise.allSettled([
      toast.expectSuccessToast('Preadmission processed successfully'),
      new ToastNotifications(secondPage).expectErrorToast('Preadmission has already been processed')
    ]);

    const successCount = toasts.filter(result => result.status === 'fulfilled').length;
    expect(successCount).toBe(1); // Only one should succeed

    await secondPage.close();
  });

  test('Maintains real-time updates across users', async ({ page, context }) => {
    // Setup: User 1 logged in
    await loginPage.login(testData.users.warehouseStaff.email, testData.users.warehouseStaff.password);
    await dashboardPage.waitForDashboardLoad();
    await dashboardPage.navigateToPreadmissions();

    // User 2 in separate tab
    const user2Page = await context.newPage();
    const user2LoginPage = new LoginPage(user2Page);
    const user2DashboardPage = new DashboardPage(user2Page);
    const user2PreadmissionsPage = new PreadmissionsPage(user2Page);

    await user2Page.goto('/');
    await user2LoginPage.login(testData.users.supervisor.email, testData.users.supervisor.password);
    await user2DashboardPage.waitForDashboardLoad();
    await user2DashboardPage.navigateToPreadmissions();

    // User 1 creates preadmission
    await preadmissionsPage.createPreadmission();
    await preadmissionModal.fillPreadmissionData(testData.preadmission);
    await preadmissionModal.save();
    await toast.expectSuccessToast();

    // User 2 should see the new preadmission in real-time
    await user2PreadmissionsPage.searchPreadmissions(testData.preadmission.manifestNumber);
    const user2Row = await user2PreadmissionsPage.getPreadmissionRow(testData.preadmission.manifestNumber);
    await expect(user2Row).toBeVisible({ timeout: 5000 });

    // User 2 processes the preadmission
    await user2PreadmissionsPage.clickProcessButton(testData.preadmission.manifestNumber);
    const confirmButton = user2Page.getByTestId('confirm-process-button');
    await confirmButton.click();
    
    const user2Toast = new ToastNotifications(user2Page);
    await user2Toast.expectSuccessToast();

    // User 1 should see status update in real-time
    const user1Row = await preadmissionsPage.getPreadmissionRow(testData.preadmission.manifestNumber);
    await expect(user1Row).toContainText('Processed', { timeout: 5000 });

    await user2Page.close();
  });

  test('Handles network interruption gracefully', async ({ page, context }) => {
    await loginPage.login(testData.users.warehouseStaff.email, testData.users.warehouseStaff.password);
    await dashboardPage.waitForDashboardLoad();
    await dashboardPage.navigateToPreadmissions();

    // Start creating preadmission
    await preadmissionsPage.createPreadmission();
    await preadmissionModal.fillPreadmissionData(testData.preadmission);

    // Simulate network interruption
    await context.setOffline(true);
    
    // Try to save - should show appropriate error
    await preadmissionModal.save();
    await toast.expectErrorToast('Network connection lost');

    // Modal should remain open with data preserved
    await expect(preadmissionModal.modal).toBeVisible();
    await expect(preadmissionModal.quantityInput).toHaveValue(testData.preadmission.quantity.toString());

    // Restore network
    await context.setOffline(false);

    // Wait for connection restoration notification
    await expect(page.getByText('Connection restored')).toBeVisible({ timeout: 5000 });

    // Save should now work
    await preadmissionModal.save();
    await toast.expectSuccessToast();
  });

  test('Mobile responsive behavior', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await loginPage.login(testData.users.warehouseStaff.email, testData.users.warehouseStaff.password);
    await dashboardPage.waitForDashboardLoad();

    // Mobile navigation should work
    const mobileMenuButton = page.getByTestId('mobile-menu-button');
    await mobileMenuButton.click();
    
    const mobileNav = page.getByTestId('mobile-navigation');
    await expect(mobileNav).toBeVisible();

    await dashboardPage.navigateToPreadmissions();
    await expect(page).toHaveTitle(/preadmissions/i);

    // Table should be horizontally scrollable on mobile
    const table = page.getByTestId('preadmissions-table');
    await expect(table).toHaveCSS('overflow-x', 'auto');

    // Create button should be accessible
    await expect(preadmissionsPage.createButton).toBeVisible();
    await preadmissionsPage.createPreadmission();

    // Modal should be full-screen on mobile
    await expect(preadmissionModal.modal).toBeVisible();
    await expect(preadmissionModal.modal).toHaveCSS('width', '100vw');

    // Form should stack vertically
    const form = page.getByTestId('preadmission-form');
    await expect(form).toHaveCSS('flex-direction', 'column');

    // All form fields should be visible and usable
    await expect(preadmissionModal.customerSelect).toBeVisible();
    await expect(preadmissionModal.partSelect).toBeVisible();
    await expect(preadmissionModal.quantityInput).toBeVisible();

    // Save and cancel buttons should be accessible
    await expect(preadmissionModal.saveButton).toBeVisible();
    await expect(preadmissionModal.cancelButton).toBeVisible();
  });
});