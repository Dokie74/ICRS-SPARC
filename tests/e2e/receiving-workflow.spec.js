// tests/e2e/receiving-workflow.spec.js
// End-to-end tests for complete receiving workflow from Pre-Admissions to Inventory

const { test, expect } = require('@playwright/test');

test.describe('Receiving Workflow - Pre-Admissions to Inventory', () => {
  let adminUser;
  
  test.beforeEach(async ({ page }) => {
    // Set up test environment
    await page.goto('/login');
    
    // Login as admin user with receiving permissions
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

  test('Complete receiving workflow: Pre-Admission → Arrived → Inspecting → Accepted → Inventory', async ({ page }) => {
    // Step 1: Navigate to Receiving page
    await page.click('[data-testid="receiving-nav-link"]');
    await expect(page).toHaveURL('/receiving');
    await expect(page.locator('h1')).toContainText('FTZ Receiving');

    // Step 2: Verify FTZ workflow description is visible
    await expect(page.locator('[data-testid="ftz-workflow-description"]')).toContainText(
      'Foreign Trade Zone receiving process'
    );

    // Step 3: Check for pending pre-admissions
    await page.click('[data-testid="pending-admissions-tab"]');
    await expect(page.locator('[data-testid="preadmissions-table"]')).toBeVisible();

    // Step 4: Create a new pre-admission (if none exist)
    const pendingRows = page.locator('[data-testid="preadmission-row"]');
    if (await pendingRows.count() === 0) {
      // Create a test pre-admission
      await page.click('[data-testid="create-preadmission-button"]');
      await page.fill('[data-testid="container-number-input"]', 'TEST-CONT-001');
      await page.fill('[data-testid="bol-number-input"]', 'BOL-TEST-12345');
      await page.fill('[data-testid="customer-name-input"]', 'Test Customer Inc');
      await page.fill('[data-testid="description-input"]', 'Test goods for FTZ processing');
      await page.selectOption('[data-testid="urgency-select"]', 'normal');
      await page.click('[data-testid="submit-preadmission-button"]');
      
      // Wait for creation success
      await expect(page.locator('[data-testid="success-toast"]')).toContainText('Pre-admission created');
    }

    // Step 5: Select first pending pre-admission
    const firstPreadmission = page.locator('[data-testid="preadmission-row"]').first();
    const containerNumber = await firstPreadmission.locator('[data-testid="container-number"]').textContent();
    
    // Step 6: Mark as "Arrived"
    await firstPreadmission.locator('[data-testid="mark-arrived-button"]').click();
    await expect(page.locator('[data-testid="success-toast"]')).toContainText('marked as arrived');
    
    // Verify status changed to "Arrived"
    await page.click('[data-testid="arrived-tab"]');
    const arrivedItem = page.locator(`[data-container="${containerNumber}"]`).first();
    await expect(arrivedItem.locator('[data-testid="status-badge"]')).toContainText('Arrived');

    // Step 7: Initiate Dock Audit
    await arrivedItem.locator('[data-testid="start-audit-button"]').click();
    await expect(page.locator('[data-testid="dock-audit-modal"]')).toBeVisible();
    await expect(page.locator('[data-testid="modal-title"]')).toContainText(`Dock Audit - ${containerNumber}`);

    // Step 8: Fill out dock audit form
    await page.selectOption('[data-testid="container-condition-select"]', 'good');
    await page.fill('[data-testid="seal-number-input"]', 'SEAL-12345');
    
    // Check compliance boxes
    await page.check('[data-testid="seal-verified-checkbox"]');
    await page.check('[data-testid="ftz-compliance-checkbox"]');
    await page.check('[data-testid="documentation-complete-checkbox"]');
    
    // Fill temperature and weight if applicable
    await page.fill('[data-testid="temperature-input"]', '72°F');
    await page.fill('[data-testid="weight-input"]', '25000 lbs');
    
    // Add inspector notes
    await page.fill('[data-testid="inspector-notes-textarea"]', 'Container in good condition. All seals intact.');
    
    // Step 9: Take photos for documentation
    // Simulate photo upload (mock for E2E testing)
    const fileInput = page.locator('[data-testid="photo-upload-input"]');
    await fileInput.setInputFiles('./tests/fixtures/sample-dock-photo.jpg');
    
    // Verify photo was added
    await expect(page.locator('[data-testid="photo-gallery"]')).toContainText('Captured Photos (1)');
    
    // Step 10: Set audit result and inspector information
    await page.selectOption('[data-testid="audit-result-select"]', 'accepted');
    await page.fill('[data-testid="inspector-name-input"]', 'John Inspector');
    
    // Step 11: Complete dock audit
    await page.click('[data-testid="complete-audit-button"]');
    await expect(page.locator('[data-testid="success-toast"]')).toContainText('Dock audit completed');
    
    // Modal should close
    await expect(page.locator('[data-testid="dock-audit-modal"]')).not.toBeVisible();

    // Step 12: Verify item moved to "Inspecting" status
    await page.click('[data-testid="inspecting-tab"]');
    const inspectingItem = page.locator(`[data-container="${containerNumber}"]`).first();
    await expect(inspectingItem.locator('[data-testid="status-badge"]')).toContainText('Inspecting');
    
    // Step 13: Complete inspection and accept goods
    await inspectingItem.locator('[data-testid="complete-inspection-button"]').click();
    
    // Fill inspection results
    await page.selectOption('[data-testid="inspection-result-select"]', 'accepted');
    await page.fill('[data-testid="inspection-notes-textarea"]', 'Goods match documentation. Quality acceptable.');
    await page.click('[data-testid="submit-inspection-button"]');
    
    await expect(page.locator('[data-testid="success-toast"]')).toContainText('Inspection completed');

    // Step 14: Verify FTZ compliance verification
    await page.click('[data-testid="verify-ftz-compliance-button"]');
    await expect(page.locator('[data-testid="ftz-compliance-modal"]')).toBeVisible();
    
    // Complete FTZ verification
    await page.check('[data-testid="documentation-verified-checkbox"]');
    await page.check('[data-testid="customs-cleared-checkbox"]');
    await page.check('[data-testid="zone-entry-authorized-checkbox"]');
    await page.fill('[data-testid="ftz-notes-textarea"]', 'All FTZ requirements met. Entry authorized.');
    await page.click('[data-testid="confirm-ftz-compliance-button"]');
    
    await expect(page.locator('[data-testid="success-toast"]')).toContainText('FTZ compliance verified');

    // Step 15: Process final admission to inventory
    await page.click('[data-testid="process-admission-button"]');
    
    // Fill admission details
    await page.fill('[data-testid="lot-number-input"]', `LOT-${Date.now()}`);
    await page.selectOption('[data-testid="storage-location-select"]', 'ZONE-A-001');
    await page.fill('[data-testid="quantity-input"]', '1000');
    await page.selectOption('[data-testid="unit-select"]', 'pieces');
    await page.click('[data-testid="process-to-inventory-button"]');
    
    await expect(page.locator('[data-testid="success-toast"]')).toContainText('Processed to inventory');

    // Step 16: Verify item appears in inventory
    await page.click('[data-testid="inventory-nav-link"]');
    await expect(page).toHaveURL('/inventory');
    
    // Search for the processed item
    await page.fill('[data-testid="inventory-search-input"]', containerNumber);
    await page.click('[data-testid="search-button"]');
    
    const inventoryItem = page.locator(`[data-container="${containerNumber}"]`).first();
    await expect(inventoryItem).toBeVisible();
    await expect(inventoryItem.locator('[data-testid="status-badge"]')).toContainText('In Inventory');
  });

  test('Handle rejection during dock audit', async ({ page }) => {
    // Navigate to receiving page
    await page.click('[data-testid="receiving-nav-link"]');
    
    // Create a pre-admission for rejection test
    await page.click('[data-testid="create-preadmission-button"]');
    await page.fill('[data-testid="container-number-input"]', 'REJECT-CONT-001');
    await page.fill('[data-testid="bol-number-input"]', 'BOL-REJECT-001');
    await page.fill('[data-testid="customer-name-input"]', 'Test Customer - Reject');
    await page.fill('[data-testid="description-input"]', 'Test goods - will be rejected');
    await page.click('[data-testid="submit-preadmission-button"]');
    
    // Mark as arrived
    const preadmission = page.locator('[data-container="REJECT-CONT-001"]').first();
    await preadmission.locator('[data-testid="mark-arrived-button"]').click();
    
    // Start dock audit
    await page.click('[data-testid="arrived-tab"]');
    const arrivedItem = page.locator('[data-container="REJECT-CONT-001"]').first();
    await arrivedItem.locator('[data-testid="start-audit-button"]').click();
    
    // Fill audit form with rejection
    await page.selectOption('[data-testid="container-condition-select"]', 'damaged');
    await page.fill('[data-testid="seal-number-input"]', 'SEAL-BROKEN');
    await page.fill('[data-testid="discrepancies-textarea"]', 'Container shows significant damage. Seal appears broken.');
    
    // Set result as rejected
    await page.selectOption('[data-testid="audit-result-select"]', 'rejected');
    await page.fill('[data-testid="rejection-reason-textarea"]', 'Container damaged, seal compromised, goods potentially contaminated');
    await page.fill('[data-testid="inspector-name-input"]', 'Safety Inspector');
    
    // Complete audit
    await page.click('[data-testid="complete-audit-button"]');
    await expect(page.locator('[data-testid="success-toast"]')).toContainText('Dock audit completed');
    
    // Verify item moved to rejected status
    await page.click('[data-testid="rejected-tab"]');
    const rejectedItem = page.locator('[data-container="REJECT-CONT-001"]').first();
    await expect(rejectedItem.locator('[data-testid="status-badge"]')).toContainText('Rejected');
    await expect(rejectedItem.locator('[data-testid="rejection-reason"]')).toContainText('Container damaged');
  });

  test('Handle urgent priority items', async ({ page }) => {
    // Navigate to receiving page
    await page.click('[data-testid="receiving-nav-link"]');
    
    // Create urgent pre-admission
    await page.click('[data-testid="create-preadmission-button"]');
    await page.fill('[data-testid="container-number-input"]', 'URGENT-CONT-001');
    await page.fill('[data-testid="bol-number-input"]', 'BOL-URGENT-001');
    await page.fill('[data-testid="customer-name-input"]', 'Priority Customer');
    await page.fill('[data-testid="description-input"]', 'Time-sensitive goods');
    await page.selectOption('[data-testid="urgency-select"]', 'urgent');
    await page.click('[data-testid="submit-preadmission-button"]');
    
    // Verify urgent item appears at top with priority indicator
    const urgentItem = page.locator('[data-container="URGENT-CONT-001"]').first();
    await expect(urgentItem.locator('[data-testid="priority-indicator"]')).toContainText('URGENT');
    await expect(urgentItem.locator('[data-testid="priority-badge"]')).toHaveClass(/bg-red/);
    
    // Verify it's sorted at the top of the list
    const firstRow = page.locator('[data-testid="preadmission-row"]').first();
    await expect(firstRow.locator('[data-testid="container-number"]')).toContainText('URGENT-CONT-001');
  });

  test('FTZ compliance validation workflow', async ({ page }) => {
    // Navigate to receiving page
    await page.click('[data-testid="receiving-nav-link"]');
    
    // Create pre-admission for FTZ testing
    await page.click('[data-testid="create-preadmission-button"]');
    await page.fill('[data-testid="container-number-input"]', 'FTZ-TEST-001');
    await page.fill('[data-testid="bol-number-input"]', 'BOL-FTZ-001');
    await page.fill('[data-testid="customer-name-input"]', 'FTZ Test Customer');
    await page.fill('[data-testid="description-input"]', 'Goods requiring FTZ compliance');
    await page.click('[data-testid="submit-preadmission-button"]');
    
    // Process through to inspecting
    const preadmission = page.locator('[data-container="FTZ-TEST-001"]').first();
    await preadmission.locator('[data-testid="mark-arrived-button"]').click();
    
    await page.click('[data-testid="arrived-tab"]');
    const arrivedItem = page.locator('[data-container="FTZ-TEST-001"]').first();
    await arrivedItem.locator('[data-testid="start-audit-button"]').click();
    
    // Quick audit completion
    await page.selectOption('[data-testid="container-condition-select"]', 'good');
    await page.fill('[data-testid="seal-number-input"]', 'FTZ-SEAL-001');
    await page.check('[data-testid="ftz-compliance-checkbox"]');
    await page.selectOption('[data-testid="audit-result-select"]', 'accepted');
    await page.fill('[data-testid="inspector-name-input"]', 'FTZ Inspector');
    await page.click('[data-testid="complete-audit-button"]');
    
    // Test FTZ compliance verification
    await page.click('[data-testid="inspecting-tab"]');
    const inspectingItem = page.locator('[data-container="FTZ-TEST-001"]').first();
    await inspectingItem.locator('[data-testid="verify-ftz-compliance-button"]').click();
    
    // Comprehensive FTZ compliance check
    await expect(page.locator('[data-testid="ftz-compliance-modal"]')).toBeVisible();
    await expect(page.locator('[data-testid="ftz-checklist"]')).toBeVisible();
    
    // Verify all FTZ requirements
    await page.check('[data-testid="customs-documentation-checkbox"]');
    await page.check('[data-testid="entry-permit-checkbox"]');
    await page.check('[data-testid="zone-authorization-checkbox"]');
    await page.check('[data-testid="tariff-classification-checkbox"]');
    await page.check('[data-testid="country-origin-checkbox"]');
    
    // Add FTZ compliance notes
    await page.fill('[data-testid="ftz-compliance-notes"]', 'All documentation verified. FTZ entry requirements met.');
    
    // Upload compliance documentation
    await page.locator('[data-testid="compliance-docs-upload"]').setInputFiles('./tests/fixtures/ftz-compliance-doc.pdf');
    
    await page.click('[data-testid="confirm-ftz-compliance-button"]');
    await expect(page.locator('[data-testid="success-toast"]')).toContainText('FTZ compliance verified');
    
    // Verify FTZ badge appears
    await expect(inspectingItem.locator('[data-testid="ftz-compliant-badge"]')).toBeVisible();
  });

  test('Photo documentation and audit trail', async ({ page }) => {
    // Navigate to receiving
    await page.click('[data-testid="receiving-nav-link"]');
    
    // Create pre-admission for photo testing
    await page.click('[data-testid="create-preadmission-button"]');
    await page.fill('[data-testid="container-number-input"]', 'PHOTO-TEST-001');
    await page.fill('[data-testid="bol-number-input"]', 'BOL-PHOTO-001');
    await page.fill('[data-testid="customer-name-input"]', 'Photo Test Customer');
    await page.fill('[data-testid="description-input"]', 'Goods requiring photo documentation');
    await page.click('[data-testid="submit-preadmission-button"]');
    
    // Process to audit
    const preadmission = page.locator('[data-container="PHOTO-TEST-001"]').first();
    await preadmission.locator('[data-testid="mark-arrived-button"]').click();
    
    await page.click('[data-testid="arrived-tab"]');
    const arrivedItem = page.locator('[data-container="PHOTO-TEST-001"]').first();
    await arrivedItem.locator('[data-testid="start-audit-button"]').click();
    
    // Test photo capture functionality
    await page.click('[data-testid="start-camera-button"]');
    await expect(page.locator('[data-testid="camera-preview"]')).toBeVisible();
    
    // Simulate camera capture
    await page.click('[data-testid="capture-photo-button"]');
    await expect(page.locator('[data-testid="photo-gallery"]')).toContainText('Captured Photos (1)');
    
    // Upload additional photos
    await page.locator('[data-testid="photo-upload-input"]').setInputFiles([
      './tests/fixtures/container-exterior.jpg',
      './tests/fixtures/container-interior.jpg',
      './tests/fixtures/seal-close-up.jpg'
    ]);
    
    await expect(page.locator('[data-testid="photo-gallery"]')).toContainText('Captured Photos (4)');
    
    // Verify photos can be removed
    await page.click('[data-testid="remove-photo-button"]');
    await expect(page.locator('[data-testid="photo-gallery"]')).toContainText('Captured Photos (3)');
    
    // Complete audit with photos
    await page.selectOption('[data-testid="container-condition-select"]', 'good');
    await page.fill('[data-testid="seal-number-input"]', 'PHOTO-SEAL-001');
    await page.selectOption('[data-testid="audit-result-select"]', 'accepted');
    await page.fill('[data-testid="inspector-name-input"]', 'Photo Inspector');
    await page.click('[data-testid="complete-audit-button"]');
    
    // Verify audit trail and photos are preserved
    await page.click('[data-testid="view-audit-history-button"]');
    await expect(page.locator('[data-testid="audit-history-modal"]')).toBeVisible();
    await expect(page.locator('[data-testid="audit-photos"]')).toContainText('3 photos');
    await expect(page.locator('[data-testid="audit-timestamp"]')).toBeVisible();
  });

  test('Error handling and validation', async ({ page }) => {
    // Test network error handling
    await page.route('**/api/receiving/**', route => route.abort());
    
    await page.click('[data-testid="receiving-nav-link"]');
    
    // Should show error message when API fails
    await expect(page.locator('[data-testid="error-message"]')).toContainText('Failed to load receiving data');
    
    // Test form validation
    await page.unroute('**/api/receiving/**');
    await page.reload();
    
    await page.click('[data-testid="create-preadmission-button"]');
    await page.click('[data-testid="submit-preadmission-button"]'); // Submit empty form
    
    // Should show validation errors
    await expect(page.locator('[data-testid="validation-error"]')).toContainText('Container number is required');
    await expect(page.locator('[data-testid="validation-error"]')).toContainText('BOL number is required');
  });

  test('Performance with large datasets', async ({ page }) => {
    // Test with large number of pre-admissions
    await page.click('[data-testid="receiving-nav-link"]');
    
    // Enable pagination if many items exist
    const itemCount = await page.locator('[data-testid="preadmission-row"]').count();
    
    if (itemCount > 10) {
      // Test pagination
      await expect(page.locator('[data-testid="pagination"]')).toBeVisible();
      
      // Test search functionality
      await page.fill('[data-testid="search-input"]', 'TEST-CONT');
      await page.waitForTimeout(500); // Debounce
      
      // Should filter results
      const filteredCount = await page.locator('[data-testid="preadmission-row"]').count();
      expect(filteredCount).toBeLessThan(itemCount);
    }
    
    // Test sorting functionality
    await page.click('[data-testid="sort-by-date-button"]');
    await page.waitForLoadState('networkidle');
    
    // Verify items are reordered
    const firstItemAfterSort = page.locator('[data-testid="preadmission-row"]').first();
    await expect(firstItemAfterSort).toBeVisible();
  });
});