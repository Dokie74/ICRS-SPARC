// tests/e2e/shipping-workflow.spec.js
// End-to-end tests for complete shipping workflow from Inventory to Pre-Shipments to Shipped

const { test, expect } = require('@playwright/test');

test.describe('Shipping Workflow - Inventory to Pre-Shipments to Shipped', () => {
  let adminUser;
  
  test.beforeEach(async ({ page }) => {
    // Set up test environment
    await page.goto('/login');
    
    // Login as admin user with shipping permissions
    adminUser = {
      email: 'admin@icrs-sparc.com',
      password: 'test123',
      role: 'admin'
    };
    
    await page.fill('[data-testid="email-input"]', adminUser.email);
    await page.fill('[data-testid="password-input"]', adminUser.password);
    await page.click('[data-testid="login-button"]');
    
    // Wait for successful login
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
  });

  test('Complete shipping workflow: Draft → Pending Pick → Pulled → Generate Labels → Ready for Pickup → Shipped', async ({ page }) => {
    // Step 1: Navigate to Shipping page
    await page.click('[data-testid="shipping-nav-link"]');
    await expect(page).toHaveURL('/shipping');
    await expect(page.locator('h1')).toContainText('Shipping Management');

    // Step 2: Verify shipping workflow stages are visible
    await expect(page.locator('[data-testid="workflow-stages"]')).toBeVisible();
    await expect(page.locator('[data-testid="stage-draft"]')).toContainText('Draft');
    await expect(page.locator('[data-testid="stage-pending-pick"]')).toContainText('Pending Pick');
    await expect(page.locator('[data-testid="stage-pulled"]')).toContainText('Pulled');

    // Step 3: Create a new pre-shipment (if none exist)
    const draftRows = page.locator('[data-testid="shipment-row"]');
    if (await draftRows.count() === 0) {
      await page.click('[data-testid="create-preshipment-button"]');
      await page.fill('[data-testid="shipment-id-input"]', 'SHIP-TEST-001');
      await page.selectOption('[data-testid="customer-select"]', 'Test Customer Inc');
      await page.fill('[data-testid="destination-input"]', '123 Test St, Test City, TX 12345');
      await page.selectOption('[data-testid="carrier-select"]', 'UPS');
      await page.selectOption('[data-testid="service-select"]', 'Ground');
      
      // Add items to shipment
      await page.click('[data-testid="add-item-button"]');
      await page.selectOption('[data-testid="inventory-item-select"]', 'TEST-ITEM-001');
      await page.fill('[data-testid="quantity-input"]', '100');
      await page.click('[data-testid="confirm-add-item-button"]');
      
      await page.click('[data-testid="submit-preshipment-button"]');
      await expect(page.locator('[data-testid="success-toast"]')).toContainText('Pre-shipment created');
    }

    // Step 4: Select first draft shipment
    await page.click('[data-testid="draft-tab"]');
    const firstShipment = page.locator('[data-testid="shipment-row"]').first();
    const shipmentId = await firstShipment.locator('[data-testid="shipment-id"]').textContent();

    // Step 5: Move to "Pending Pick" stage
    await firstShipment.locator('[data-testid="update-status-button"]').click();
    await page.selectOption('[data-testid="status-select"]', 'Pending Pick');
    await page.fill('[data-testid="status-notes-input"]', 'Ready for warehouse picking');
    await page.click('[data-testid="confirm-status-update"]');
    
    await expect(page.locator('[data-testid="success-toast"]')).toContainText('Status updated');

    // Step 6: Verify shipment appears in "Pending Pick" tab
    await page.click('[data-testid="pending-pick-tab"]');
    const pendingShipment = page.locator(`[data-shipment-id="${shipmentId}"]`).first();
    await expect(pendingShipment.locator('[data-testid="status-badge"]')).toContainText('Pending Pick');

    // Step 7: Move to "Pulled" stage with picking details
    await pendingShipment.locator('[data-testid="mark-pulled-button"]').click();
    await expect(page.locator('[data-testid="picking-modal"]')).toBeVisible();
    
    // Fill picking information
    await page.fill('[data-testid="picker-name-input"]', 'John Picker');
    await page.fill('[data-testid="pick-location-input"]', 'ZONE-A-001');
    await page.check('[data-testid="item-verified-checkbox"]');
    await page.fill('[data-testid="actual-quantity-input"]', '100');
    await page.fill('[data-testid="picking-notes-textarea"]', 'All items picked successfully. Quality verified.');
    
    // Upload picking confirmation photo
    await page.locator('[data-testid="picking-photo-upload"]').setInputFiles('./tests/fixtures/picked-items.jpg');
    
    await page.click('[data-testid="confirm-picking-button"]');
    await expect(page.locator('[data-testid="success-toast"]')).toContainText('Items marked as pulled');

    // Step 8: Verify shipment moved to "Pulled" tab
    await page.click('[data-testid="pulled-tab"]');
    const pulledShipment = page.locator(`[data-shipment-id="${shipmentId}"]`).first();
    await expect(pulledShipment.locator('[data-testid="status-badge"]')).toContainText('Pulled');

    // Step 9: Generate shipping labels
    await pulledShipment.locator('[data-testid="generate-labels-button"]').click();
    await expect(page.locator('[data-testid="print-labels-modal"]')).toBeVisible();

    // Fill label generation form
    await page.selectOption('[data-testid="carrier-select"]', 'UPS');
    await page.selectOption('[data-testid="service-type-select"]', 'Ground');
    await page.fill('[data-testid="weight-input"]', '15.5');
    await page.fill('[data-testid="length-input"]', '12');
    await page.fill('[data-testid="width-input"]', '8');
    await page.fill('[data-testid="height-input"]', '6');
    await page.fill('[data-testid="insurance-value-input"]', '500.00');
    await page.check('[data-testid="delivery-confirmation-checkbox"]');
    
    await page.click('[data-testid="generate-labels-button"]');
    
    // Wait for label generation
    await expect(page.locator('[data-testid="success-toast"]')).toContainText('Shipping labels generated');
    await expect(page.locator('[data-testid="generated-labels"]')).toBeVisible();
    
    // Verify tracking number appears
    await expect(page.locator('[data-testid="tracking-number"]')).toBeVisible();
    
    await page.click('[data-testid="done-button"]');
    await expect(page.locator('[data-testid="print-labels-modal"]')).not.toBeVisible();

    // Step 10: Verify shipment moved to "Ready for Pickup"
    await page.click('[data-testid="ready-pickup-tab"]');
    const readyShipment = page.locator(`[data-shipment-id="${shipmentId}"]`).first();
    await expect(readyShipment.locator('[data-testid="status-badge"]')).toContainText('Ready for Pickup');
    await expect(readyShipment.locator('[data-testid="tracking-number"]')).toBeVisible();

    // Step 11: Process driver signoff
    await readyShipment.locator('[data-testid="driver-signoff-button"]').click();
    await expect(page.locator('[data-testid="driver-signoff-modal"]')).toBeVisible();

    // Fill driver information
    await page.fill('[data-testid="driver-name-input"]', 'Mike Driver');
    await page.fill('[data-testid="driver-license-input"]', 'DL123456789');
    await page.fill('[data-testid="truck-number-input"]', 'TRUCK-001');
    await page.fill('[data-testid="trailer-number-input"]', 'TRAILER-001');
    await page.fill('[data-testid="package-count-input"]', '1');
    
    // Verify pickup details
    await page.check('[data-testid="weight-confirmed-checkbox"]');
    await page.check('[data-testid="condition-verified-checkbox"]');
    
    await page.fill('[data-testid="delivery-notes-textarea"]', 'Package in good condition. Handle with care.');
    
    // Digital signature (simulate drawing)
    const signatureCanvas = page.locator('[data-testid="signature-canvas"]');
    await signatureCanvas.click({ position: { x: 50, y: 50 } });
    await page.mouse.down();
    await page.mouse.move(150, 100);
    await page.mouse.up();
    
    // Wait for signature to be captured
    await expect(page.locator('[data-testid="signature-captured"]')).toBeVisible();
    
    await page.click('[data-testid="complete-signoff-button"]');
    await expect(page.locator('[data-testid="success-toast"]')).toContainText('Driver signoff completed');

    // Step 12: Verify shipment moved to "Shipped"
    await page.click('[data-testid="shipped-tab"]');
    const shippedItem = page.locator(`[data-shipment-id="${shipmentId}"]`).first();
    await expect(shippedItem.locator('[data-testid="status-badge"]')).toContainText('Shipped');
    await expect(shippedItem.locator('[data-testid="ship-date"]')).toBeVisible();
    await expect(shippedItem.locator('[data-testid="driver-info"]')).toContainText('Mike Driver');

    // Step 13: Verify CBP filing (if applicable)
    if (await page.locator('[data-testid="cbp-filing-required"]').isVisible()) {
      await shippedItem.locator('[data-testid="file-cbp-button"]').click();
      await expect(page.locator('[data-testid="cbp-filing-modal"]')).toBeVisible();
      
      // Fill CBP filing information
      await page.fill('[data-testid="export-declaration-input"]', 'EXP-2024-001');
      await page.selectOption('[data-testid="commodity-code-select"]', '123456');
      await page.fill('[data-testid="value-input"]', '5000.00');
      await page.selectOption('[data-testid="destination-country-select"]', 'CA');
      
      await page.click('[data-testid="submit-cbp-filing"]');
      await expect(page.locator('[data-testid="success-toast"]')).toContainText('CBP filing submitted');
      
      // Verify CBP filing status
      await expect(shippedItem.locator('[data-testid="cbp-status"]')).toContainText('Filed');
    }

    // Step 14: Generate shipping report
    await page.click('[data-testid="generate-report-button"]');
    await page.selectOption('[data-testid="report-type-select"]', 'shipping-summary');
    await page.fill('[data-testid="date-range-start"]', '2024-01-01');
    await page.fill('[data-testid="date-range-end"]', '2024-12-31');
    await page.click('[data-testid="generate-report-submit"]');
    
    await expect(page.locator('[data-testid="success-toast"]')).toContainText('Report generated');
    await expect(page.locator('[data-testid="download-report-link"]')).toBeVisible();
  });

  test('Handle package consolidation', async ({ page }) => {
    // Navigate to shipping page
    await page.click('[data-testid="shipping-nav-link"]');
    
    // Create multiple pre-shipments for the same customer
    const shipments = ['SHIP-CONS-001', 'SHIP-CONS-002', 'SHIP-CONS-003'];
    
    for (const shipmentId of shipments) {
      await page.click('[data-testid="create-preshipment-button"]');
      await page.fill('[data-testid="shipment-id-input"]', shipmentId);
      await page.selectOption('[data-testid="customer-select"]', 'Consolidation Customer');
      await page.fill('[data-testid="destination-input"]', '456 Consolidation St, Same City, TX 12345');
      await page.selectOption('[data-testid="carrier-select"]', 'UPS');
      
      await page.click('[data-testid="add-item-button"]');
      await page.selectOption('[data-testid="inventory-item-select"]', 'CONS-ITEM-001');
      await page.fill('[data-testid="quantity-input"]', '50');
      await page.click('[data-testid="confirm-add-item-button"]');
      
      await page.click('[data-testid="submit-preshipment-button"]');
    }
    
    // Select multiple shipments for consolidation
    await page.click('[data-testid="draft-tab"]');
    for (const shipmentId of shipments) {
      await page.check(`[data-shipment-id="${shipmentId}"] [data-testid="select-checkbox"]`);
    }
    
    // Consolidate shipments
    await page.click('[data-testid="consolidate-shipments-button"]');
    await expect(page.locator('[data-testid="consolidation-modal"]')).toBeVisible();
    
    await page.fill('[data-testid="consolidated-shipment-id"]', 'SHIP-CONSOLIDATED-001');
    await page.selectOption('[data-testid="consolidation-reason-select"]', 'cost-optimization');
    await page.fill('[data-testid="consolidation-notes"]', 'Consolidating multiple small shipments to reduce shipping costs');
    
    await page.click('[data-testid="confirm-consolidation"]');
    await expect(page.locator('[data-testid="success-toast"]')).toContainText('Shipments consolidated');
    
    // Verify consolidated shipment appears
    const consolidatedShipment = page.locator('[data-shipment-id="SHIP-CONSOLIDATED-001"]');
    await expect(consolidatedShipment).toBeVisible();
    await expect(consolidatedShipment.locator('[data-testid="item-count"]')).toContainText('150'); // 3 x 50 items
  });

  test('Handle express/rush shipments', async ({ page }) => {
    // Navigate to shipping page
    await page.click('[data-testid="shipping-nav-link"]');
    
    // Create rush shipment
    await page.click('[data-testid="create-preshipment-button"]');
    await page.fill('[data-testid="shipment-id-input"]', 'SHIP-RUSH-001');
    await page.selectOption('[data-testid="customer-select"]', 'Rush Customer');
    await page.fill('[data-testid="destination-input"]', '789 Express Ave, Rush City, TX 12345');
    await page.selectOption('[data-testid="priority-select"]', 'rush');
    await page.selectOption('[data-testid="carrier-select"]', 'FedEx');
    await page.selectOption('[data-testid="service-select"]', 'Express Overnight');
    
    await page.click('[data-testid="add-item-button"]');
    await page.selectOption('[data-testid="inventory-item-select"]', 'RUSH-ITEM-001');
    await page.fill('[data-testid="quantity-input"]', '25');
    await page.click('[data-testid="confirm-add-item-button"]');
    
    await page.click('[data-testid="submit-preshipment-button"]');
    
    // Verify rush shipment has priority indicators
    const rushShipment = page.locator('[data-shipment-id="SHIP-RUSH-001"]');
    await expect(rushShipment.locator('[data-testid="priority-badge"]')).toContainText('RUSH');
    await expect(rushShipment.locator('[data-testid="priority-badge"]')).toHaveClass(/bg-red/);
    
    // Verify it appears at top of list (sorted by priority)
    const firstRow = page.locator('[data-testid="shipment-row"]').first();
    await expect(firstRow.locator('[data-testid="shipment-id"]')).toContainText('SHIP-RUSH-001');
    
    // Test expedited processing
    await rushShipment.locator('[data-testid="expedite-processing-button"]').click();
    await expect(page.locator('[data-testid="expedite-modal"]')).toBeVisible();
    
    await page.selectOption('[data-testid="expedite-reason-select"]', 'customer-request');
    await page.fill('[data-testid="expedite-notes"]', 'Customer requires immediate shipment for critical delivery');
    await page.click('[data-testid="confirm-expedite"]');
    
    await expect(page.locator('[data-testid="success-toast"]')).toContainText('Shipment expedited');
    await expect(rushShipment.locator('[data-testid="expedited-badge"]')).toBeVisible();
  });

  test('Handle international shipments with customs documentation', async ({ page }) => {
    // Navigate to shipping page
    await page.click('[data-testid="shipping-nav-link"]');
    
    // Create international shipment
    await page.click('[data-testid="create-preshipment-button"]');
    await page.fill('[data-testid="shipment-id-input"]', 'SHIP-INTL-001');
    await page.selectOption('[data-testid="customer-select"]', 'International Customer');
    await page.fill('[data-testid="destination-input"]', '123 International St, Toronto, ON M1M 1M1, Canada');
    await page.selectOption('[data-testid="destination-country-select"]', 'CA');
    await page.selectOption('[data-testid="carrier-select"]', 'FedEx');
    await page.selectOption('[data-testid="service-select"]', 'International Priority');
    
    await page.click('[data-testid="add-item-button"]');
    await page.selectOption('[data-testid="inventory-item-select"]', 'INTL-ITEM-001');
    await page.fill('[data-testid="quantity-input"]', '75');
    await page.fill('[data-testid="unit-value-input"]', '25.00');
    await page.selectOption('[data-testid="country-origin-select"]', 'US');
    await page.fill('[data-testid="hs-code-input"]', '123456.78');
    await page.click('[data-testid="confirm-add-item-button"]');
    
    await page.click('[data-testid="submit-preshipment-button"]');
    
    // Process through to label generation
    const intlShipment = page.locator('[data-shipment-id="SHIP-INTL-001"]');
    await intlShipment.locator('[data-testid="update-status-button"]').click();
    await page.selectOption('[data-testid="status-select"]', 'Pending Pick');
    await page.click('[data-testid="confirm-status-update"]');
    
    await page.click('[data-testid="pending-pick-tab"]');
    await intlShipment.locator('[data-testid="mark-pulled-button"]').click();
    await page.fill('[data-testid="picker-name-input"]', 'International Picker');
    await page.check('[data-testid="item-verified-checkbox"]');
    await page.fill('[data-testid="actual-quantity-input"]', '75');
    await page.click('[data-testid="confirm-picking-button"]');
    
    // Generate labels with customs forms
    await page.click('[data-testid="pulled-tab"]');
    await intlShipment.locator('[data-testid="generate-labels-button"]').click();
    
    // Verify customs form options appear
    await expect(page.locator('[data-testid="print-customs-form-checkbox"]')).toBeVisible();
    await page.check('[data-testid="print-customs-form-checkbox"]');
    
    await page.fill('[data-testid="weight-input"]', '25.0');
    await page.fill('[data-testid="length-input"]', '15');
    await page.fill('[data-testid="width-input"]', '12');
    await page.fill('[data-testid="height-input"]', '8');
    await page.fill('[data-testid="insurance-value-input"]', '1875.00'); // 75 x $25
    
    await page.click('[data-testid="generate-labels-button"]');
    
    // Verify customs form is generated
    await expect(page.locator('[data-testid="generated-labels"]')).toContainText('Customs Form');
    await expect(page.locator('[data-testid="commercial-invoice"]')).toBeVisible();
    
    await page.click('[data-testid="done-button"]');
    
    // Verify international shipment badges
    await expect(intlShipment.locator('[data-testid="international-badge"]')).toBeVisible();
    await expect(intlShipment.locator('[data-testid="customs-docs-badge"]')).toBeVisible();
  });

  test('Handle hazardous materials shipments', async ({ page }) => {
    // Navigate to shipping page
    await page.click('[data-testid="shipping-nav-link"]');
    
    // Create hazmat shipment
    await page.click('[data-testid="create-preshipment-button"]');
    await page.fill('[data-testid="shipment-id-input"]', 'SHIP-HAZMAT-001');
    await page.selectOption('[data-testid="customer-select"]', 'Chemical Company');
    await page.fill('[data-testid="destination-input"]', '321 Chemical Blvd, Industrial City, TX 12345');
    await page.check('[data-testid="hazmat-checkbox"]');
    
    // Fill hazmat information
    await page.selectOption('[data-testid="hazmat-class-select"]', 'Class 3 - Flammable Liquids');
    await page.fill('[data-testid="un-number-input"]', 'UN1993');
    await page.fill('[data-testid="proper-shipping-name"]', 'Flammable liquids, n.o.s.');
    await page.selectOption('[data-testid="packing-group-select"]', 'II');
    
    await page.selectOption('[data-testid="carrier-select"]', 'UPS');
    await page.selectOption('[data-testid="service-select"]', 'Ground'); // Ground only for hazmat
    
    await page.click('[data-testid="add-item-button"]');
    await page.selectOption('[data-testid="inventory-item-select"]', 'HAZMAT-ITEM-001');
    await page.fill('[data-testid="quantity-input"]', '10');
    await page.click('[data-testid="confirm-add-item-button"]');
    
    await page.click('[data-testid="submit-preshipment-button"]');
    
    // Verify hazmat indicators and restrictions
    const hazmatShipment = page.locator('[data-shipment-id="SHIP-HAZMAT-001"]');
    await expect(hazmatShipment.locator('[data-testid="hazmat-badge"]')).toBeVisible();
    await expect(hazmatShipment.locator('[data-testid="hazmat-warning"]')).toContainText('Hazardous Materials');
    
    // Verify restricted service options
    await hazmatShipment.locator('[data-testid="view-details-button"]').click();
    await expect(page.locator('[data-testid="service-restrictions"]')).toContainText('Air transport restricted');
    
    // Process through to label generation with hazmat documentation
    await hazmatShipment.locator('[data-testid="update-status-button"]').click();
    await page.selectOption('[data-testid="status-select"]', 'Pending Pick');
    await page.click('[data-testid="confirm-status-update"]');
    
    await page.click('[data-testid="pending-pick-tab"]');
    await hazmatShipment.locator('[data-testid="mark-pulled-button"]').click();
    
    // Special hazmat picking requirements
    await page.fill('[data-testid="picker-name-input"]', 'Certified Hazmat Handler');
    await page.fill('[data-testid="hazmat-certification-input"]', 'HAZMAT-CERT-12345');
    await page.check('[data-testid="hazmat-training-verified-checkbox"]');
    await page.check('[data-testid="item-verified-checkbox"]');
    await page.fill('[data-testid="actual-quantity-input"]', '10');
    
    await page.click('[data-testid="confirm-picking-button"]');
    
    // Generate hazmat labels
    await page.click('[data-testid="pulled-tab"]');
    await hazmatShipment.locator('[data-testid="generate-labels-button"]').click();
    
    // Verify hazmat-specific label options
    await expect(page.locator('[data-testid="hazmat-labels-section"]')).toBeVisible();
    await page.check('[data-testid="hazmat-placards-checkbox"]');
    await page.check('[data-testid="shipper-declaration-checkbox"]');
    
    await page.fill('[data-testid="weight-input"]', '50.0');
    await page.click('[data-testid="generate-labels-button"]');
    
    // Verify hazmat documentation is generated
    await expect(page.locator('[data-testid="hazmat-documents"]')).toContainText('Shipper\'s Declaration');
    await expect(page.locator('[data-testid="hazmat-placards"]')).toBeVisible();
  });

  test('Track shipment status and handle exceptions', async ({ page }) => {
    // Navigate to shipping page
    await page.click('[data-testid="shipping-nav-link"]');
    
    // Create and process a shipment to shipped status
    await page.click('[data-testid="create-preshipment-button"]');
    await page.fill('[data-testid="shipment-id-input"]', 'SHIP-TRACK-001');
    await page.selectOption('[data-testid="customer-select"]', 'Tracking Customer');
    await page.fill('[data-testid="destination-input"]', '555 Tracking St, Monitor City, TX 12345');
    await page.click('[data-testid="submit-preshipment-button"]');
    
    // Fast-forward through workflow
    const trackingShipment = page.locator('[data-shipment-id="SHIP-TRACK-001"]');
    
    // Move through stages quickly
    await trackingShipment.locator('[data-testid="update-status-button"]').click();
    await page.selectOption('[data-testid="status-select"]', 'Shipped');
    await page.click('[data-testid="confirm-status-update"]');
    
    // Add tracking number manually for testing
    await page.click('[data-testid="shipped-tab"]');
    await trackingShipment.locator('[data-testid="edit-tracking-button"]').click();
    await page.fill('[data-testid="tracking-number-input"]', '1Z999AA1234567890');
    await page.click('[data-testid="save-tracking-button"]');
    
    // Test tracking integration
    await trackingShipment.locator('[data-testid="track-shipment-button"]').click();
    await expect(page.locator('[data-testid="tracking-modal"]')).toBeVisible();
    
    // Verify tracking information displays
    await expect(page.locator('[data-testid="tracking-status"]')).toBeVisible();
    await expect(page.locator('[data-testid="tracking-events"]')).toBeVisible();
    
    // Test exception handling
    await page.click('[data-testid="report-exception-button"]');
    await page.selectOption('[data-testid="exception-type-select"]', 'delivery-delay');
    await page.fill('[data-testid="exception-description"]', 'Package delayed due to weather conditions');
    await page.click('[data-testid="submit-exception"]');
    
    await expect(page.locator('[data-testid="success-toast"]')).toContainText('Exception reported');
    await expect(trackingShipment.locator('[data-testid="exception-badge"]')).toBeVisible();
    
    // Test customer notification
    await trackingShipment.locator('[data-testid="notify-customer-button"]').click();
    await page.selectOption('[data-testid="notification-type-select"]', 'delay-notification');
    await page.fill('[data-testid="notification-message"]', 'Your shipment has been delayed but is en route.');
    await page.click('[data-testid="send-notification"]');
    
    await expect(page.locator('[data-testid="success-toast"]')).toContainText('Customer notified');
  });

  test('Generate and validate shipping reports', async ({ page }) => {
    // Navigate to shipping page
    await page.click('[data-testid="shipping-nav-link"]');
    
    // Access reports section
    await page.click('[data-testid="reports-tab"]');
    await expect(page.locator('[data-testid="reports-section"]')).toBeVisible();
    
    // Test different report types
    const reportTypes = [
      'daily-shipments',
      'carrier-performance',
      'shipping-costs',
      'delivery-performance'
    ];
    
    for (const reportType of reportTypes) {
      await page.selectOption('[data-testid="report-type-select"]', reportType);
      await page.fill('[data-testid="date-range-start"]', '2024-01-01');
      await page.fill('[data-testid="date-range-end"]', '2024-01-31');
      
      if (reportType === 'carrier-performance') {
        await page.selectOption('[data-testid="carrier-filter-select"]', 'UPS');
      }
      
      await page.click('[data-testid="generate-report-button"]');
      
      // Verify report generation
      await expect(page.locator('[data-testid="report-generating"]')).toBeVisible();
      await expect(page.locator('[data-testid="report-ready"]')).toBeVisible({ timeout: 10000 });
      
      // Test report download
      await page.click('[data-testid="download-report-button"]');
      
      // Verify download initiated (check for download event)
      const downloadPromise = page.waitForEvent('download');
      await page.click('[data-testid="download-pdf-button"]');
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toContain(reportType);
    }
    
    // Test report scheduling
    await page.click('[data-testid="schedule-report-button"]');
    await page.selectOption('[data-testid="report-frequency-select"]', 'weekly');
    await page.selectOption('[data-testid="delivery-method-select"]', 'email');
    await page.fill('[data-testid="recipient-email-input"]', 'admin@company.com');
    await page.click('[data-testid="schedule-report-submit"]');
    
    await expect(page.locator('[data-testid="success-toast"]')).toContainText('Report scheduled');
  });

  test('Handle bulk operations and batch processing', async ({ page }) => {
    // Navigate to shipping page
    await page.click('[data-testid="shipping-nav-link"]');
    
    // Create multiple shipments for batch testing
    const shipmentIds = [];
    for (let i = 1; i <= 5; i++) {
      const shipmentId = `SHIP-BATCH-00${i}`;
      shipmentIds.push(shipmentId);
      
      await page.click('[data-testid="create-preshipment-button"]');
      await page.fill('[data-testid="shipment-id-input"]', shipmentId);
      await page.selectOption('[data-testid="customer-select"]', 'Batch Customer');
      await page.fill('[data-testid="destination-input"]', `${i}00 Batch St, Batch City, TX 1234${i}`);
      await page.click('[data-testid="submit-preshipment-button"]');
    }
    
    // Test bulk status update
    await page.click('[data-testid="draft-tab"]');
    
    // Select multiple shipments
    for (const shipmentId of shipmentIds) {
      await page.check(`[data-shipment-id="${shipmentId}"] [data-testid="select-checkbox"]`);
    }
    
    // Bulk update status
    await page.click('[data-testid="bulk-actions-button"]');
    await page.selectOption('[data-testid="bulk-action-select"]', 'update-status');
    await page.selectOption('[data-testid="bulk-status-select"]', 'Pending Pick');
    await page.fill('[data-testid="bulk-notes-input"]', 'Bulk status update for batch processing');
    await page.click('[data-testid="confirm-bulk-action"]');
    
    await expect(page.locator('[data-testid="success-toast"]')).toContainText('5 shipments updated');
    
    // Test bulk label generation
    await page.click('[data-testid="pending-pick-tab"]');
    
    // Select shipments again
    for (const shipmentId of shipmentIds) {
      await page.check(`[data-shipment-id="${shipmentId}"] [data-testid="select-checkbox"]`);
    }
    
    await page.click('[data-testid="bulk-actions-button"]');
    await page.selectOption('[data-testid="bulk-action-select"]', 'generate-labels');
    
    // Fill bulk label settings
    await page.selectOption('[data-testid="bulk-carrier-select"]', 'UPS');
    await page.selectOption('[data-testid="bulk-service-select"]', 'Ground');
    await page.fill('[data-testid="default-weight-input"]', '10.0');
    await page.fill('[data-testid="default-dimensions"]', '12x8x6');
    
    await page.click('[data-testid="confirm-bulk-labels"]');
    
    // Verify bulk label generation
    await expect(page.locator('[data-testid="bulk-processing-modal"]')).toBeVisible();
    await expect(page.locator('[data-testid="processing-progress"]')).toBeVisible();
    
    // Wait for completion
    await expect(page.locator('[data-testid="bulk-complete"]')).toBeVisible({ timeout: 30000 });
    await expect(page.locator('[data-testid="labels-generated-count"]')).toContainText('5 labels');
    
    await page.click('[data-testid="close-bulk-modal"]');
    
    // Verify shipments moved to ready for pickup
    await page.click('[data-testid="ready-pickup-tab"]');
    for (const shipmentId of shipmentIds) {
      const shipment = page.locator(`[data-shipment-id="${shipmentId}"]`);
      await expect(shipment).toBeVisible();
      await expect(shipment.locator('[data-testid="tracking-number"]')).toBeVisible();
    }
  });

  test('Error handling and recovery', async ({ page }) => {
    // Test network error handling
    await page.route('**/api/shipping/**', route => route.abort());
    
    await page.click('[data-testid="shipping-nav-link"]');
    
    // Should show error message when API fails
    await expect(page.locator('[data-testid="error-message"]')).toContainText('Failed to load shipping data');
    
    // Test retry functionality
    await page.unroute('**/api/shipping/**');
    await page.click('[data-testid="retry-button"]');
    
    await expect(page.locator('[data-testid="shipping-table"]')).toBeVisible();
    
    // Test form validation errors
    await page.click('[data-testid="create-preshipment-button"]');
    await page.click('[data-testid="submit-preshipment-button"]'); // Submit empty form
    
    // Should show validation errors
    await expect(page.locator('[data-testid="validation-error"]')).toContainText('Shipment ID is required');
    await expect(page.locator('[data-testid="validation-error"]')).toContainText('Customer is required');
    
    // Test label generation failure recovery
    await page.fill('[data-testid="shipment-id-input"]', 'SHIP-ERROR-001');
    await page.selectOption('[data-testid="customer-select"]', 'Error Test Customer');
    await page.click('[data-testid="submit-preshipment-button"]');
    
    const errorShipment = page.locator('[data-shipment-id="SHIP-ERROR-001"]');
    await errorShipment.locator('[data-testid="update-status-button"]').click();
    await page.selectOption('[data-testid="status-select"]', 'Pulled');
    await page.click('[data-testid="confirm-status-update"]');
    
    // Mock label generation failure
    await page.route('**/api/shipping/*/labels', route => {
      route.fulfill({ 
        status: 500, 
        body: JSON.stringify({ error: 'Label service temporarily unavailable' })
      });
    });
    
    await page.click('[data-testid="pulled-tab"]');
    await errorShipment.locator('[data-testid="generate-labels-button"]').click();
    await page.fill('[data-testid="weight-input"]', '10.0');
    await page.click('[data-testid="generate-labels-button"]');
    
    // Should show error and retry option
    await expect(page.locator('[data-testid="error-message"]')).toContainText('Label service temporarily unavailable');
    await expect(page.locator('[data-testid="retry-labels-button"]')).toBeVisible();
    
    // Test successful retry
    await page.unroute('**/api/shipping/*/labels');
    await page.click('[data-testid="retry-labels-button"]');
    
    await expect(page.locator('[data-testid="success-toast"]')).toContainText('Shipping labels generated');
  });
});