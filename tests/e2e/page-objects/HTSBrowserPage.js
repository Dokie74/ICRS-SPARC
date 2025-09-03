// tests/e2e/page-objects/HTSBrowserPage.js
// Page Object Model for HTS Browser functionality
// Provides reusable methods for interacting with the HTS Browser UI

export class HTSBrowserPage {
  constructor(page) {
    this.page = page;
    
    // Main page elements
    this.pageTitle = page.getByText('HTS Browser');
    this.serviceStatusIndicator = page.locator('[data-testid="service-status"]');
    
    // Navigation tabs
    this.searchTab = page.getByRole('button', { name: 'Search & Browse' });
    this.detailsTab = page.locator('button').filter({ hasText: /Details - \d/ });
    
    // Search controls
    this.searchInput = page.locator('input[placeholder*="Search by"]');
    this.descriptionButton = page.getByRole('button', { name: 'Description' });
    this.codeButton = page.getByRole('button', { name: 'HTS Code' });
    this.countrySelect = page.locator('select').first();
    
    // Popular codes
    this.popularCodesSection = page.locator('div').filter({ hasText: 'Popular HTS Categories:' });
    this.popularCodeButtons = page.locator('button').filter({ hasText: /^\d+.*-.*/ });
    
    // Search results
    this.searchResultsHeader = page.locator('h3').filter({ hasText: /Search Results|HTS Codes/ });
    this.searchResultItems = page.locator('[data-testid="search-result"], .cursor-pointer').filter({ hasText: /^\d{4}/ });
    this.loadingSpinner = page.locator('.animate-spin');
    this.noResultsMessage = page.getByText(/No HTS codes found|Enter at least 2 characters/);
    
    // Views
    this.searchView = page.locator('[data-testid="search-view"]').or(
      page.locator('div').filter({ hasText: 'Search Controls' })
    );
    this.detailsView = page.locator('[data-testid="details-view"]').or(
      page.getByText('HTS Code Details').locator('..')
    );
    
    // Details view elements
    this.backToSearchButton = page.getByRole('button', { name: '← Back to Search' });
    this.htsNumberField = page.locator('[data-testid="hts-number"]');
    this.htsDescriptionField = page.locator('[data-testid="hts-description"]');
    this.dutyInfoPanel = page.locator('[data-testid="duty-info"]');
  }

  // Navigation methods
  async goto() {
    await this.page.goto('/hts-browser');
    return this.page.waitForLoadState('networkidle');
  }

  // Wait for service initialization
  async waitForInitialization(timeout = 30000) {
    // Wait for loading spinner to disappear
    await this.page.waitForSelector('.animate-spin', { state: 'hidden', timeout });
    
    // Wait for page title to be visible
    await this.pageTitle.waitFor({ state: 'visible' });
    
    // Wait for search input to be ready
    await this.searchInput.waitFor({ state: 'visible' });
    
    // Small delay to ensure all initialization is complete
    await this.page.waitForTimeout(500);
  }

  // Search type selection
  async selectSearchType(type) {
    if (type === 'description') {
      await this.descriptionButton.click();
    } else if (type === 'code') {
      await this.codeButton.click();
    } else {
      throw new Error(`Invalid search type: ${type}. Must be 'description' or 'code'`);
    }
    
    // Wait for UI to update
    await this.page.waitForTimeout(200);
  }

  // Country selection
  async selectCountry(countryCode) {
    await this.countrySelect.selectOption(countryCode);
    
    // Wait for any duty calculations to update
    await this.page.waitForTimeout(1000);
  }

  // Search operations
  async search(term, type = 'description') {
    await this.selectSearchType(type);
    await this.searchInput.fill(term);
    return this.waitForSearchResults();
  }

  async waitForSearchResults(timeout = 10000) {
    // Wait for either results to appear or no results message
    await Promise.race([
      this.searchResultItems.first().waitFor({ state: 'visible', timeout }),
      this.noResultsMessage.waitFor({ state: 'visible', timeout }),
      this.loadingSpinner.waitFor({ state: 'hidden', timeout })
    ]);
    
    // Additional wait for debouncing to complete
    await this.page.waitForTimeout(500);
  }

  // Result interaction
  async selectFirstResult() {
    await this.searchResultItems.first().click();
    return this.waitForDetailsView();
  }

  async selectResultByIndex(index) {
    await this.searchResultItems.nth(index).click();
    return this.waitForDetailsView();
  }

  async waitForDetailsView(timeout = 5000) {
    // Wait for details tab to appear
    await this.detailsTab.waitFor({ state: 'visible', timeout });
    
    // Wait for details view to be visible
    await this.detailsView.waitFor({ state: 'visible', timeout });
    
    // Wait for HTS details to load
    await this.page.waitForTimeout(500);
  }

  // Popular codes interaction
  async selectPopularCode(index = 0) {
    await this.popularCodeButtons.nth(index).click();
    
    // Wait for navigation to complete
    await this.page.waitForTimeout(1000);
  }

  async getPopularCodeCount() {
    return this.popularCodeButtons.count();
  }

  // Results analysis
  async getSearchResultCount() {
    return this.searchResultItems.count();
  }

  async getSearchResultTexts() {
    const results = [];
    const count = await this.getSearchResultCount();
    
    for (let i = 0; i < count; i++) {
      const result = this.searchResultItems.nth(i);
      const htsCode = await result.locator('.font-mono').textContent();
      const description = await result.locator('.text-gray-900').textContent();
      results.push({ htsCode, description });
    }
    
    return results;
  }

  async hasHighlightedResults() {
    const highlightedElements = this.page.locator('mark.bg-yellow-200');
    return (await highlightedElements.count()) > 0;
  }

  // Details view operations
  async getHtsDetails() {
    await this.waitForDetailsView();
    
    const details = {};
    
    // Get HTS number
    const htsNumberElement = this.page.locator('.font-mono.text-blue-600').first();
    if (await htsNumberElement.isVisible()) {
      details.htsNumber = await htsNumberElement.textContent();
    }
    
    // Get description
    const descriptionElement = this.page.locator('div').filter({ hasText: 'Description' })
      .locator('..').locator('.text-gray-900');
    if (await descriptionElement.isVisible()) {
      details.description = await descriptionElement.textContent();
    }
    
    // Get duty rates
    const generalRateElement = this.page.getByText('General Rate:').locator('..')
      .locator('.text-gray-900.font-medium');
    if (await generalRateElement.isVisible()) {
      details.generalRate = await generalRateElement.textContent();
    }
    
    return details;
  }

  async hasDutyInformation() {
    return this.dutyInfoPanel.isVisible();
  }

  async getDutyInformation() {
    if (!(await this.hasDutyInformation())) {
      return null;
    }
    
    const dutyInfo = {};
    
    // Get applicable rate
    const applicableRateElement = this.page.getByText('Applicable Rate:')
      .locator('..').locator('.font-semibold');
    if (await applicableRateElement.isVisible()) {
      dutyInfo.applicableRate = await applicableRateElement.textContent();
    }
    
    // Get trade status
    const tradeStatusElement = this.page.getByText('Trade Status:')
      .locator('..').locator('.text-blue-900');
    if (await tradeStatusElement.isVisible()) {
      dutyInfo.tradeStatus = await tradeStatusElement.textContent();
    }
    
    return dutyInfo;
  }

  // Navigation between views
  async goToSearchView() {
    if (await this.searchTab.isVisible()) {
      await this.searchTab.click();
    } else if (await this.backToSearchButton.isVisible()) {
      await this.backToSearchButton.click();
    }
    
    await this.searchView.waitFor({ state: 'visible' });
  }

  async goToDetailsView() {
    if (await this.detailsTab.isVisible()) {
      await this.detailsTab.click();
      await this.detailsView.waitFor({ state: 'visible' });
    } else {
      throw new Error('Details tab not available. Select an HTS entry first.');
    }
  }

  // Utility methods
  async clearSearch() {
    await this.searchInput.clear();
    await this.page.waitForTimeout(500);
  }

  async isLoading() {
    return this.loadingSpinner.isVisible();
  }

  async waitForLoadingToComplete(timeout = 10000) {
    await this.loadingSpinner.waitFor({ state: 'hidden', timeout });
  }

  async getResultsCountText() {
    const countElement = this.page.locator('.text-sm.text-gray-500')
      .filter({ hasText: /\d+.*results/ });
    
    if (await countElement.isVisible()) {
      return countElement.textContent();
    }
    
    return null;
  }

  async getNotificationText() {
    const notifications = this.page.locator('[data-testid="notification"], .notification');
    
    if (await notifications.first().isVisible()) {
      return notifications.first().textContent();
    }
    
    return null;
  }

  // Verification helpers
  async verifySearchState(expectedTerm, expectedType) {
    // Verify search term
    await expect(this.searchInput).toHaveValue(expectedTerm);
    
    // Verify search type
    if (expectedType === 'description') {
      await expect(this.descriptionButton).toHaveClass(/bg-blue-600/);
    } else if (expectedType === 'code') {
      await expect(this.codeButton).toHaveClass(/bg-blue-600/);
    }
  }

  async verifyResultsVisible(shouldBeVisible = true) {
    if (shouldBeVisible) {
      await expect(this.searchResultItems.first()).toBeVisible();
    } else {
      await expect(this.searchResultItems.first()).not.toBeVisible();
    }
  }

  async verifyDetailsVisible(shouldBeVisible = true) {
    if (shouldBeVisible) {
      await expect(this.detailsView).toBeVisible();
      await expect(this.detailsTab).toBeVisible();
    } else {
      await expect(this.detailsView).not.toBeVisible();
    }
  }

  // Screenshot helpers for debugging
  async screenshotCurrentState(name) {
    await this.page.screenshot({ 
      path: `test-results/screenshots/${name}-${Date.now()}.png`,
      fullPage: true 
    });
  }

  // Error state checks
  async hasErrorMessage() {
    const errorSelectors = [
      '.text-red-600',
      '.bg-red-50',
      '[data-testid="error"]',
      '.error'
    ];
    
    for (const selector of errorSelectors) {
      if (await this.page.locator(selector).isVisible()) {
        return true;
      }
    }
    
    return false;
  }

  async getErrorMessage() {
    const errorElements = this.page.locator(
      '.text-red-600, .bg-red-50, [data-testid="error"], .error'
    );
    
    if (await errorElements.first().isVisible()) {
      return errorElements.first().textContent();
    }
    
    return null;
  }
}