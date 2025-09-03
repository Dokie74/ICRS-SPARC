// tests/e2e/helpers/test-helpers.js
// Utility functions and helpers for HTS Browser E2E tests
// Provides common testing utilities, mock data generators, and assertion helpers

import { expect } from '@playwright/test';

// Authentication helpers
export const authHelpers = {
  async loginAsAdmin(page) {
    const response = await page.request.post('/api/auth/login', {
      data: {
        email: 'admin@sparc.test',
        password: 'admin123'
      }
    });
    
    if (!response.ok()) {
      throw new Error(`Login failed: ${response.status()}`);
    }
    
    const data = await response.json();
    return data.token;
  },

  async loginAsRole(page, role) {
    const credentials = {
      admin: { email: 'admin@sparc.test', password: 'admin123' },
      manager: { email: 'manager@sparc.test', password: 'manager123' },
      operator: { email: 'operator@sparc.test', password: 'operator123' },
      viewer: { email: 'viewer@sparc.test', password: 'viewer123' }
    };
    
    const creds = credentials[role];
    if (!creds) {
      throw new Error(`Unknown role: ${role}`);
    }
    
    const response = await page.request.post('/api/auth/login', {
      data: creds
    });
    
    if (!response.ok()) {
      throw new Error(`Login as ${role} failed: ${response.status()}`);
    }
    
    const data = await response.json();
    return data.token;
  }
};

// Mock data generators
export const mockGenerators = {
  generateHtsEntry(overrides = {}) {
    const baseEntry = {
      htsno: '8542310001',
      description: 'Electronic integrated circuits: Processors and controllers',
      general: '0%',
      special: 'Free (A+, AU, B, BH, CA, CL, CO, D, E, IL, JO, KR, MA, MX, OM, P, PA, PE, S, SG)',
      other: '35%',
      units: ['No.'],
      indent: 2
    };
    
    return { ...baseEntry, ...overrides };
  },

  generateSearchResults(count, searchTerm = 'electronic') {
    return Array(count).fill().map((_, i) => {
      const htsCode = `8542${String(i + 1).padStart(6, '0')}`;
      return this.generateHtsEntry({
        htsno: htsCode,
        description: `${searchTerm} component ${i + 1} - integrated circuits`,
        general: `${(i % 10)}%`
      });
    });
  },

  generateCountryList() {
    return [
      { code: 'CN', name: 'China' },
      { code: 'MX', name: 'Mexico' },
      { code: 'CA', name: 'Canada' },
      { code: 'DE', name: 'Germany' },
      { code: 'JP', name: 'Japan' },
      { code: 'KR', name: 'South Korea' },
      { code: 'VN', name: 'Vietnam' },
      { code: 'IN', name: 'India' },
      { code: 'GB', name: 'United Kingdom' },
      { code: 'FR', name: 'France' }
    ];
  },

  generatePopularCodes(count = 10) {
    const categories = [
      'Electronic integrated circuits',
      'Cotton shirts and blouses',
      'Pumps for liquids',
      'Electric motors',
      'Synthetic fabric',
      'Machinery parts',
      'Chemical compounds',
      'Metal components',
      'Plastic products',
      'Rubber materials'
    ];
    
    return Array(count).fill().map((_, i) => {
      const categoryIndex = i % categories.length;
      const htsCode = `${8540 + categoryIndex}${String(i + 1).padStart(4, '0')}`;
      
      return {
        htsno: htsCode,
        description: categories[categoryIndex],
        category: 'Popular'
      };
    });
  },

  generateDutyInfo(countryCode, htsCode) {
    const dutyRates = {
      CN: { base: '25%', status: 'Section 301 Tariffs' },
      MX: { base: 'Free', status: 'USMCA Preferential' },
      CA: { base: 'Free', status: 'USMCA Preferential' },
      DE: { base: '0%', status: 'MFN' },
      JP: { base: '0%', status: 'MFN' },
      DEFAULT: { base: '10%', status: 'General Rate' }
    };
    
    const countryRate = dutyRates[countryCode] || dutyRates.DEFAULT;
    
    return {
      applicable: countryRate.base,
      general: '10%',
      tradeStatus: countryRate.status,
      specialNote: countryCode === 'MX' || countryCode === 'CA' ? 
        'Free under USMCA agreement' : null,
      verified: true,
      source: 'USITC'
    };
  }
};

// Network simulation helpers
export const networkHelpers = {
  // Simulate slow network
  async simulateSlowNetwork(page, delayMs = 2000) {
    await page.route('/api/hts/**', async route => {
      await new Promise(resolve => setTimeout(resolve, delayMs));
      route.continue();
    });
  },

  // Simulate network failure
  async simulateNetworkFailure(page, endpoints = ['/api/hts/**']) {
    for (const endpoint of endpoints) {
      await page.route(endpoint, route => {
        route.abort('failed');
      });
    }
  },

  // Simulate server error
  async simulateServerError(page, statusCode = 500, endpoints = ['/api/hts/**']) {
    for (const endpoint of endpoints) {
      await page.route(endpoint, route => {
        route.fulfill({
          status: statusCode,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: `Server error (${statusCode})`
          })
        });
      });
    }
  },

  // Simulate intermittent failures
  async simulateIntermittentFailure(page, failureRate = 0.3) {
    await page.route('/api/hts/**', route => {
      if (Math.random() < failureRate) {
        route.abort('failed');
      } else {
        route.continue();
      }
    });
  },

  // Restore normal network behavior
  async restoreNetwork(page) {
    await page.unroute('/api/hts/**');
  }
};

// Performance measurement helpers
export const performanceHelpers = {
  async measureSearchTime(htsBrowserPage, searchTerm, searchType = 'description') {
    const startTime = performance.now();
    
    await htsBrowserPage.search(searchTerm, searchType);
    
    const endTime = performance.now();
    return endTime - startTime;
  },

  async measurePageLoadTime(page, url) {
    const startTime = performance.now();
    
    await page.goto(url);
    await page.waitForLoadState('networkidle');
    
    const endTime = performance.now();
    return endTime - startTime;
  },

  async measureInteractionTime(page, action) {
    const startTime = performance.now();
    
    await action();
    
    const endTime = performance.now();
    return endTime - startTime;
  },

  // Get page performance metrics
  async getPerformanceMetrics(page) {
    return await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0];
      const paintEntries = performance.getEntriesByType('paint');
      
      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        firstPaint: paintEntries.find(entry => entry.name === 'first-paint')?.startTime || null,
        firstContentfulPaint: paintEntries.find(entry => entry.name === 'first-contentful-paint')?.startTime || null
      };
    });
  }
};

// Data validation helpers
export const validationHelpers = {
  validateHtsEntry(entry) {
    expect(entry).toBeDefined();
    expect(entry.htsno).toMatch(/^\d{4,10}$/);
    expect(typeof entry.description).toBe('string');
    expect(entry.description.length).toBeGreaterThan(0);
    
    if (entry.general) {
      expect(typeof entry.general).toBe('string');
    }
    
    if (entry.units) {
      expect(Array.isArray(entry.units)).toBe(true);
    }
  },

  validateSearchResults(results) {
    expect(Array.isArray(results)).toBe(true);
    
    results.forEach(result => {
      this.validateHtsEntry(result);
    });
  },

  validateDutyInfo(dutyInfo) {
    expect(dutyInfo).toBeDefined();
    expect(typeof dutyInfo.applicable).toBe('string');
    expect(typeof dutyInfo.tradeStatus).toBe('string');
    
    if (dutyInfo.specialNote) {
      expect(typeof dutyInfo.specialNote).toBe('string');
    }
  },

  validateApiResponse(response) {
    expect(response).toBeDefined();
    expect(typeof response.success).toBe('boolean');
    
    if (response.success) {
      expect(response.data).toBeDefined();
    } else {
      expect(typeof response.error).toBe('string');
    }
  }
};

// UI interaction helpers
export const uiHelpers = {
  async waitForElementWithRetry(page, selector, options = {}) {
    const maxRetries = options.retries || 3;
    const timeout = options.timeout || 5000;
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        await page.locator(selector).waitFor({ 
          state: 'visible', 
          timeout: timeout / maxRetries 
        });
        return;
      } catch (error) {
        if (i === maxRetries - 1) {
          throw error;
        }
        await page.waitForTimeout(500);
      }
    }
  },

  async clickWithRetry(page, selector, options = {}) {
    const maxRetries = options.retries || 3;
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        await page.locator(selector).click({ timeout: 2000 });
        return;
      } catch (error) {
        if (i === maxRetries - 1) {
          throw error;
        }
        await page.waitForTimeout(500);
      }
    }
  },

  async typeWithDelay(page, selector, text, delay = 100) {
    const element = page.locator(selector);
    await element.clear();
    
    for (const char of text) {
      await element.type(char);
      await page.waitForTimeout(delay);
    }
  },

  async scrollIntoViewIfNeeded(page, selector) {
    await page.locator(selector).scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);
  }
};

// Screenshot and debugging helpers
export const debugHelpers = {
  async takeScreenshotWithTimestamp(page, name) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `test-results/screenshots/${name}-${timestamp}.png`;
    
    await page.screenshot({ 
      path: filename,
      fullPage: true 
    });
    
    return filename;
  },

  async captureConsoleErrors(page) {
    const errors = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    page.on('pageerror', error => {
      errors.push(error.toString());
    });
    
    return () => errors;
  },

  async logPageState(page, htsBrowserPage) {
    const state = {
      url: page.url(),
      title: await page.title(),
      searchValue: await htsBrowserPage.searchInput.inputValue(),
      countryValue: await htsBrowserPage.countrySelect.inputValue(),
      resultCount: await htsBrowserPage.getSearchResultCount(),
      isLoading: await htsBrowserPage.isLoading(),
      timestamp: new Date().toISOString()
    };
    
    console.log('Page State:', JSON.stringify(state, null, 2));
    return state;
  },

  async waitForStableState(page, selector, stableTime = 1000) {
    let lastContent = null;
    let stableStart = null;
    
    while (true) {
      const currentContent = await page.locator(selector).textContent().catch(() => null);
      
      if (currentContent === lastContent) {
        if (!stableStart) {
          stableStart = Date.now();
        } else if (Date.now() - stableStart >= stableTime) {
          break;
        }
      } else {
        stableStart = null;
        lastContent = currentContent;
      }
      
      await page.waitForTimeout(100);
    }
  }
};

// Test data setup helpers
export const setupHelpers = {
  async setupTestEnvironment(page) {
    // Set up any global test state
    await page.addInitScript(() => {
      // Disable animations for faster testing
      const style = document.createElement('style');
      style.textContent = `
        *, *::before, *::after {
          animation-duration: 0.01ms !important;
          animation-delay: 0.01ms !important;
          transition-duration: 0.01ms !important;
          transition-delay: 0.01ms !important;
        }
      `;
      document.head.appendChild(style);
    });
  },

  async mockApiEndpoints(page, mocks = {}) {
    // Search endpoint
    if (mocks.search) {
      await page.route('/api/hts/search*', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mocks.search)
        });
      });
    }
    
    // Countries endpoint
    if (mocks.countries) {
      await page.route('/api/hts/countries*', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mocks.countries)
        });
      });
    }
    
    // Popular codes endpoint
    if (mocks.popular) {
      await page.route('/api/hts/popular*', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mocks.popular)
        });
      });
    }
    
    // Status endpoint
    if (mocks.status) {
      await page.route('/api/hts/status*', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mocks.status)
        });
      });
    }
  },

  async cleanupTestState(page) {
    // Clear any test-specific state
    await page.evaluate(() => {
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch (e) {
        // Ignore if storage not available
      }
    });
    
    // Remove all route handlers
    await page.unroute('**');
  }
};

// Assertion helpers
export const assertionHelpers = {
  async expectSearchResults(htsBrowserPage, expectedCount, operator = 'greaterThan') {
    const actualCount = await htsBrowserPage.getSearchResultCount();
    
    switch (operator) {
      case 'greaterThan':
        expect(actualCount).toBeGreaterThan(expectedCount);
        break;
      case 'greaterThanOrEqual':
        expect(actualCount).toBeGreaterThanOrEqual(expectedCount);
        break;
      case 'equal':
        expect(actualCount).toBe(expectedCount);
        break;
      case 'lessThan':
        expect(actualCount).toBeLessThan(expectedCount);
        break;
      case 'lessThanOrEqual':
        expect(actualCount).toBeLessThanOrEqual(expectedCount);
        break;
      default:
        throw new Error(`Unknown operator: ${operator}`);
    }
  },

  async expectPageTitle(page, expectedTitle) {
    await expect(page).toHaveTitle(new RegExp(expectedTitle, 'i'));
  },

  async expectNotificationMessage(page, expectedMessage) {
    await expect(
      page.locator('[data-testid="notification"], .notification')
    ).toContainText(expectedMessage, { ignoreCase: true });
  },

  async expectErrorMessage(page, expectedError) {
    await expect(
      page.locator('.error, .text-red-600, [data-testid="error"]')
    ).toContainText(expectedError, { ignoreCase: true });
  },

  async expectLoadingState(htsBrowserPage, shouldBeLoading) {
    const isLoading = await htsBrowserPage.isLoading();
    expect(isLoading).toBe(shouldBeLoading);
  }
};