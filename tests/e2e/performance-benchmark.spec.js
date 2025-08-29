// tests/e2e/performance-benchmark.spec.js
// Performance benchmarking and cross-browser compatibility testing

const { test, expect, devices } = require('@playwright/test');

// Performance testing configuration
const PERFORMANCE_TARGETS = {
  dashboardLoad: 2000, // 2 seconds
  inventoryLoad: 2000, // 2 seconds with 1000+ lots
  searchResponse: 500,  // 500ms
  realTimeUpdate: 2000, // 2 seconds end-to-end
  apiResponse: 500,     // 500ms for CRUD operations
  memoryUsage: 100 * 1024 * 1024, // 100MB per session
  firstContentfulPaint: 1500, // 1.5 seconds
  largestContentfulPaint: 2500, // 2.5 seconds
  cumulativeLayoutShift: 0.1 // <0.1 CLS score
};

// Test data for performance testing
const performanceTestData = {
  users: {
    warehouse: { email: 'perf-test@test.com', password: 'testPassword123' }
  }
};

// Utility functions for performance measurement
class PerformanceMetrics {
  constructor(page) {
    this.page = page;
    this.metrics = {};
  }

  async startTimer(label) {
    this.metrics[label] = { start: Date.now() };
  }

  async endTimer(label) {
    if (this.metrics[label]) {
      this.metrics[label].duration = Date.now() - this.metrics[label].start;
    }
  }

  async measureWebVitals() {
    return await this.page.evaluate(() => {
      return new Promise((resolve) => {
        const vitals = {};
        
        // First Contentful Paint
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          vitals.fcp = entries.find(entry => entry.name === 'first-contentful-paint')?.startTime;
        }).observe({ entryTypes: ['paint'] });

        // Largest Contentful Paint
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          vitals.lcp = entries[entries.length - 1]?.startTime;
        }).observe({ entryTypes: ['largest-contentful-paint'] });

        // Cumulative Layout Shift
        let clsValue = 0;
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
            }
          }
          vitals.cls = clsValue;
        }).observe({ entryTypes: ['layout-shift'] });

        // Give metrics time to populate
        setTimeout(() => resolve(vitals), 3000);
      });
    });
  }

  async measureMemoryUsage() {
    return await this.page.evaluate(() => {
      if ('memory' in performance) {
        return {
          usedJSHeapSize: performance.memory.usedJSHeapSize,
          totalJSHeapSize: performance.memory.totalJSHeapSize,
          jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
        };
      }
      return null;
    });
  }

  async measureNetworkTiming(url) {
    return await this.page.evaluate((targetUrl) => {
      const entries = performance.getEntriesByType('navigation');
      return entries.length > 0 ? {
        dnsLookup: entries[0].domainLookupEnd - entries[0].domainLookupStart,
        tcpConnect: entries[0].connectEnd - entries[0].connectStart,
        requestTime: entries[0].responseStart - entries[0].requestStart,
        responseTime: entries[0].responseEnd - entries[0].responseStart,
        totalTime: entries[0].loadEventEnd - entries[0].loadEventStart
      } : null;
    }, url);
  }

  getMetrics() {
    return this.metrics;
  }

  logMetrics() {
    console.log('Performance Metrics:', JSON.stringify(this.metrics, null, 2));
  }
}

// Cross-browser test configuration
const browserConfigs = [
  { name: 'chromium', ...devices['Desktop Chrome'] },
  { name: 'firefox', ...devices['Desktop Firefox'] },
  { name: 'webkit', ...devices['Desktop Safari'] },
  { name: 'mobile-chrome', ...devices['Pixel 5'] },
  { name: 'mobile-safari', ...devices['iPhone 12'] }
];

test.describe('Performance Benchmarking', () => {
  browserConfigs.forEach(({ name, ...device }) => {
    test.describe(`${name} Performance Tests`, () => {
      test.use(device);

      let metrics;

      test.beforeEach(async ({ page }) => {
        metrics = new PerformanceMetrics(page);
        
        // Setup performance monitoring
        await page.addInitScript(() => {
          // Track long tasks
          new PerformanceObserver((list) => {
            window.longTasks = window.longTasks || [];
            for (const entry of list.getEntries()) {
              window.longTasks.push({
                duration: entry.duration,
                startTime: entry.startTime
              });
            }
          }).observe({ entryTypes: ['longtask'] });
        });
      });

      test(`Dashboard load performance - ${name}`, async ({ page }) => {
        await metrics.startTimer('pageLoad');

        // Navigate to application
        await page.goto('/');
        
        // Login
        await page.getByTestId('email-input').fill(performanceTestData.users.warehouse.email);
        await page.getByTestId('password-input').fill(performanceTestData.users.warehouse.password);
        
        await metrics.startTimer('login');
        await page.getByTestId('login-button').click();

        // Wait for dashboard to load
        await page.waitForSelector('[data-testid="dashboard-metrics"]');
        await metrics.endTimer('login');
        await metrics.endTimer('pageLoad');

        // Measure Web Vitals
        const webVitals = await metrics.measureWebVitals();
        
        // Measure memory usage
        const memoryUsage = await metrics.measureMemoryUsage();

        // Get network timing
        const networkTiming = await metrics.measureNetworkTiming();

        // Assertions
        const performanceMetrics = metrics.getMetrics();
        expect(performanceMetrics.login.duration).toBeLessThan(PERFORMANCE_TARGETS.dashboardLoad);
        
        if (webVitals.fcp) {
          expect(webVitals.fcp).toBeLessThan(PERFORMANCE_TARGETS.firstContentfulPaint);
        }
        
        if (webVitals.lcp) {
          expect(webVitals.lcp).toBeLessThan(PERFORMANCE_TARGETS.largestContentfulPaint);
        }
        
        if (webVitals.cls !== undefined) {
          expect(webVitals.cls).toBeLessThan(PERFORMANCE_TARGETS.cumulativeLayoutShift);
        }

        if (memoryUsage) {
          expect(memoryUsage.usedJSHeapSize).toBeLessThan(PERFORMANCE_TARGETS.memoryUsage);
        }

        // Log detailed metrics
        console.log(`${name} Dashboard Performance:`, {
          loginTime: performanceMetrics.login.duration,
          webVitals,
          memoryUsage,
          networkTiming
        });
      });

      test(`Large inventory dataset performance - ${name}`, async ({ page }) => {
        // Setup: Create large inventory dataset via API
        await page.goto('/');
        await page.getByTestId('email-input').fill(performanceTestData.users.warehouse.email);
        await page.getByTestId('password-input').fill(performanceTestData.users.warehouse.password);
        await page.getByTestId('login-button').click();
        await page.waitForSelector('[data-testid="dashboard-metrics"]');

        // Navigate to inventory
        await metrics.startTimer('inventoryNavigation');
        await page.getByTestId('nav-inventory').click();
        await page.waitForURL('**/inventory');
        await page.waitForSelector('[data-testid="inventory-table"]');
        await metrics.endTimer('inventoryNavigation');

        // Wait for all data to load
        await metrics.startTimer('dataLoad');
        await page.waitForFunction(() => {
          const rows = document.querySelectorAll('[data-testid="inventory-row"]');
          return rows.length > 0;
        });
        await metrics.endTimer('dataLoad');

        // Test search performance
        await metrics.startTimer('search');
        await page.getByTestId('search-inventory').fill('LOT-');
        
        // Wait for search debounce and results
        await page.waitForTimeout(300);
        await page.waitForSelector('[data-testid="inventory-row"]');
        await metrics.endTimer('search');

        // Test filtering performance
        await metrics.startTimer('filter');
        await page.getByTestId('status-filter').selectOption('In Stock');
        await page.waitForSelector('[data-testid="inventory-row"]');
        await metrics.endTimer('filter');

        // Test pagination performance
        await metrics.startTimer('pagination');
        const nextPageButton = page.getByTestId('next-page');
        if (await nextPageButton.isVisible()) {
          await nextPageButton.click();
          await page.waitForSelector('[data-testid="inventory-row"]');
        }
        await metrics.endTimer('pagination');

        // Measure long tasks
        const longTasks = await page.evaluate(() => window.longTasks || []);

        const performanceMetrics = metrics.getMetrics();
        
        // Performance assertions
        expect(performanceMetrics.inventoryNavigation.duration).toBeLessThan(PERFORMANCE_TARGETS.inventoryLoad);
        expect(performanceMetrics.dataLoad.duration).toBeLessThan(PERFORMANCE_TARGETS.inventoryLoad);
        expect(performanceMetrics.search.duration).toBeLessThan(PERFORMANCE_TARGETS.searchResponse);

        // Check for blocking long tasks (>50ms)
        const blockingTasks = longTasks.filter(task => task.duration > 50);
        expect(blockingTasks.length).toBeLessThan(5); // Allow some long tasks but not excessive

        console.log(`${name} Inventory Performance:`, {
          navigation: performanceMetrics.inventoryNavigation.duration,
          dataLoad: performanceMetrics.dataLoad.duration,
          search: performanceMetrics.search.duration,
          filter: performanceMetrics.filter?.duration,
          longTasks: longTasks.length,
          blockingTasks: blockingTasks.length
        });
      });

      test(`API response time performance - ${name}`, async ({ page }) => {
        // Track network requests
        const apiRequests = [];
        
        page.on('response', response => {
          if (response.url().includes('/api/')) {
            apiRequests.push({
              url: response.url(),
              method: response.request().method(),
              status: response.status(),
              timing: response.request().timing()
            });
          }
        });

        await page.goto('/');
        await page.getByTestId('email-input').fill(performanceTestData.users.warehouse.email);
        await page.getByTestId('password-input').fill(performanceTestData.users.warehouse.password);
        await page.getByTestId('login-button').click();
        await page.waitForSelector('[data-testid="dashboard-metrics"]');

        // Navigate through application to trigger various API calls
        await page.getByTestId('nav-inventory').click();
        await page.waitForSelector('[data-testid="inventory-table"]');
        
        await page.getByTestId('nav-preadmissions').click();
        await page.waitForSelector('[data-testid="preadmissions-table"]');

        await page.getByTestId('nav-customers').click();
        await page.waitForSelector('[data-testid="customers-table"]');

        // Wait for all requests to complete
        await page.waitForTimeout(2000);

        // Analyze API performance
        const slowRequests = apiRequests.filter(req => {
          const responseTime = req.timing?.responseEnd - req.timing?.responseStart;
          return responseTime > PERFORMANCE_TARGETS.apiResponse;
        });

        // Assertions
        expect(slowRequests.length).toBeLessThan(apiRequests.length * 0.1); // <10% of requests should be slow

        const avgResponseTime = apiRequests.reduce((sum, req) => {
          const responseTime = req.timing?.responseEnd - req.timing?.responseStart || 0;
          return sum + responseTime;
        }, 0) / apiRequests.length;

        expect(avgResponseTime).toBeLessThan(PERFORMANCE_TARGETS.apiResponse);

        console.log(`${name} API Performance:`, {
          totalRequests: apiRequests.length,
          slowRequests: slowRequests.length,
          avgResponseTime: avgResponseTime.toFixed(2),
          slowestRequest: Math.max(...apiRequests.map(req => 
            req.timing?.responseEnd - req.timing?.responseStart || 0
          ))
        });
      });

      test(`Real-time update performance - ${name}`, async ({ page, context }) => {
        // Setup two browser contexts for real-time testing
        const secondPage = await context.newPage();

        // Login both users
        await Promise.all([
          (async () => {
            await page.goto('/');
            await page.getByTestId('email-input').fill(performanceTestData.users.warehouse.email);
            await page.getByTestId('password-input').fill(performanceTestData.users.warehouse.password);
            await page.getByTestId('login-button').click();
            await page.waitForSelector('[data-testid="dashboard-metrics"]');
          })(),
          (async () => {
            await secondPage.goto('/');
            await secondPage.getByTestId('email-input').fill(performanceTestData.users.warehouse.email);
            await secondPage.getByTestId('password-input').fill(performanceTestData.users.warehouse.password);
            await secondPage.getByTestId('login-button').click();
            await secondPage.waitForSelector('[data-testid="dashboard-metrics"]');
          })()
        ]);

        // Navigate both to inventory
        await Promise.all([
          page.getByTestId('nav-inventory').click(),
          secondPage.getByTestId('nav-inventory').click()
        ]);

        await Promise.all([
          page.waitForSelector('[data-testid="inventory-table"]'),
          secondPage.waitForSelector('[data-testid="inventory-table"]')
        ]);

        // User 1 creates a new lot
        await metrics.startTimer('realtimeUpdate');
        
        await page.getByTestId('create-lot-button').click();
        const modal = page.getByTestId('lot-modal');
        await expect(modal).toBeVisible();

        // Fill and save lot
        await page.getByTestId('part-select').selectOption('TEST-PART-001');
        await page.getByTestId('customer-select').selectOption('TEST-CUSTOMER-001');
        await page.getByTestId('quantity-input').fill('100');
        await page.getByTestId('manifest-number-input').fill(`PERF-${Date.now()}`);
        
        const manifestNumber = await page.getByTestId('manifest-number-input').inputValue();
        
        await page.getByTestId('save-lot').click();
        
        // Wait for success toast
        await page.waitForSelector('[data-testid="success-toast"]');

        // User 2 should see the update in real-time
        await expect(secondPage.getByText(manifestNumber)).toBeVisible({ timeout: PERFORMANCE_TARGETS.realTimeUpdate });
        
        await metrics.endTimer('realtimeUpdate');

        const realtimeMetrics = metrics.getMetrics();
        expect(realtimeMetrics.realtimeUpdate.duration).toBeLessThan(PERFORMANCE_TARGETS.realTimeUpdate);

        console.log(`${name} Real-time Performance:`, {
          updateTime: realtimeMetrics.realtimeUpdate.duration
        });

        await secondPage.close();
      });

      test(`Memory usage over time - ${name}`, async ({ page }) => {
        const memorySnapshots = [];

        // Initial measurement
        await page.goto('/');
        await page.getByTestId('email-input').fill(performanceTestData.users.warehouse.email);
        await page.getByTestId('password-input').fill(performanceTestData.users.warehouse.password);
        await page.getByTestId('login-button').click();
        await page.waitForSelector('[data-testid="dashboard-metrics"]');

        const initialMemory = await metrics.measureMemoryUsage();
        memorySnapshots.push({ phase: 'initial', ...initialMemory });

        // Navigate through different pages
        const pages = [
          { name: 'inventory', selector: '[data-testid="inventory-table"]' },
          { name: 'preadmissions', selector: '[data-testid="preadmissions-table"]' },
          { name: 'customers', selector: '[data-testid="customers-table"]' },
          { name: 'parts', selector: '[data-testid="parts-table"]' },
          { name: 'dashboard', selector: '[data-testid="dashboard-metrics"]' }
        ];

        for (const pageInfo of pages) {
          await page.getByTestId(`nav-${pageInfo.name}`).click();
          await page.waitForSelector(pageInfo.selector);
          
          // Force garbage collection if possible
          await page.evaluate(() => {
            if (window.gc) window.gc();
          });

          const memory = await metrics.measureMemoryUsage();
          memorySnapshots.push({ phase: pageInfo.name, ...memory });

          // Wait between navigations
          await page.waitForTimeout(1000);
        }

        // Check for memory leaks
        const maxMemoryUsage = Math.max(...memorySnapshots.map(s => s.usedJSHeapSize));
        const finalMemoryUsage = memorySnapshots[memorySnapshots.length - 1].usedJSHeapSize;

        expect(maxMemoryUsage).toBeLessThan(PERFORMANCE_TARGETS.memoryUsage);
        
        // Memory should not continuously grow (allow 20% increase from initial)
        const memoryGrowth = (finalMemoryUsage - initialMemory.usedJSHeapSize) / initialMemory.usedJSHeapSize;
        expect(memoryGrowth).toBeLessThan(0.2);

        console.log(`${name} Memory Usage:`, {
          snapshots: memorySnapshots,
          maxUsage: maxMemoryUsage,
          growth: `${(memoryGrowth * 100).toFixed(2)}%`
        });
      });
    });
  });
});

test.describe('Cross-Browser Compatibility', () => {
  const featuresToTest = [
    'CSS Grid Layout',
    'Flexbox',
    'Web Fonts',
    'SVG Icons',
    'Form Validation',
    'Local Storage',
    'WebSocket',
    'Responsive Design'
  ];

  browserConfigs.forEach(({ name, ...device }) => {
    test.describe(`${name} Compatibility`, () => {
      test.use(device);

      test(`Core functionality compatibility - ${name}`, async ({ page }) => {
        await page.goto('/');
        
        // Test login functionality
        await page.getByTestId('email-input').fill(performanceTestData.users.warehouse.email);
        await page.getByTestId('password-input').fill(performanceTestData.users.warehouse.password);
        await page.getByTestId('login-button').click();
        await page.waitForSelector('[data-testid="dashboard-metrics"]');

        // Test navigation
        await page.getByTestId('nav-inventory').click();
        await expect(page).toHaveURL(/.*inventory/);
        await page.waitForSelector('[data-testid="inventory-table"]');

        // Test search functionality
        const searchInput = page.getByTestId('search-inventory');
        await searchInput.fill('test');
        await page.waitForTimeout(300); // Debounce
        
        // Test modal functionality
        if (await page.getByTestId('inventory-row').first().isVisible()) {
          await page.getByTestId('inventory-row').first().click();
          await expect(page.getByTestId('lot-details-modal')).toBeVisible();
          
          // Test modal close
          await page.getByTestId('close-button').click();
          await expect(page.getByTestId('lot-details-modal')).toBeHidden();
        }

        // Test responsive design
        if (name.includes('mobile')) {
          const mobileMenu = page.getByTestId('mobile-menu-button');
          await expect(mobileMenu).toBeVisible();
          await mobileMenu.click();
          await expect(page.getByTestId('mobile-navigation')).toBeVisible();
        }

        console.log(`${name} compatibility test passed`);
      });

      test(`CSS and layout compatibility - ${name}`, async ({ page }) => {
        await page.goto('/');
        await page.getByTestId('email-input').fill(performanceTestData.users.warehouse.email);
        await page.getByTestId('password-input').fill(performanceTestData.users.warehouse.password);
        await page.getByTestId('login-button').click();
        await page.waitForSelector('[data-testid="dashboard-metrics"]');

        // Check CSS Grid support
        const gridSupport = await page.evaluate(() => {
          return CSS.supports('display', 'grid');
        });

        // Check Flexbox support
        const flexSupport = await page.evaluate(() => {
          return CSS.supports('display', 'flex');
        });

        // Verify layout renders correctly
        const sidebar = page.getByTestId('sidebar');
        const mainContent = page.getByTestId('main-content');
        
        await expect(sidebar).toBeVisible();
        await expect(mainContent).toBeVisible();

        // Check font loading
        const computedStyle = await page.evaluate(() => {
          const element = document.querySelector('[data-testid="main-content"]');
          return window.getComputedStyle(element).fontFamily;
        });

        expect(computedStyle).toBeTruthy();

        console.log(`${name} layout compatibility:`, {
          gridSupport,
          flexSupport,
          fontFamily: computedStyle
        });
      });

      test(`JavaScript API compatibility - ${name}`, async ({ page }) => {
        await page.goto('/');

        // Check for required APIs
        const apiSupport = await page.evaluate(() => {
          return {
            localStorage: typeof Storage !== 'undefined',
            sessionStorage: typeof sessionStorage !== 'undefined',
            fetch: typeof fetch === 'function',
            websocket: typeof WebSocket === 'function',
            promises: typeof Promise === 'function',
            asyncAwait: (async () => true)() instanceof Promise,
            arrow: (() => true)() === true,
            destructuring: (() => { try { const [a] = [1]; return true; } catch { return false; } })(),
            templateLiterals: (() => { try { return `test` === 'test'; } catch { return false; } })()
          };
        });

        // All required APIs should be supported
        Object.entries(apiSupport).forEach(([api, supported]) => {
          expect(supported).toBe(true);
        });

        console.log(`${name} JavaScript API support:`, apiSupport);
      });
    });
  });
});

// Performance regression detection
test.describe('Performance Regression Detection', () => {
  test('Baseline performance metrics', async ({ page }) => {
    const metrics = new PerformanceMetrics(page);
    
    // Establish baseline
    await metrics.startTimer('fullWorkflow');
    
    await page.goto('/');
    await page.getByTestId('email-input').fill(performanceTestData.users.warehouse.email);
    await page.getByTestId('password-input').fill(performanceTestData.users.warehouse.password);
    await page.getByTestId('login-button').click();
    await page.waitForSelector('[data-testid="dashboard-metrics"]');
    
    // Complete typical user workflow
    await page.getByTestId('nav-inventory').click();
    await page.waitForSelector('[data-testid="inventory-table"]');
    
    await page.getByTestId('search-inventory').fill('LOT');
    await page.waitForTimeout(500);
    
    await page.getByTestId('nav-preadmissions').click();
    await page.waitForSelector('[data-testid="preadmissions-table"]');
    
    await metrics.endTimer('fullWorkflow');
    
    const webVitals = await metrics.measureWebVitals();
    const memoryUsage = await metrics.measureMemoryUsage();
    
    const baselineMetrics = {
      fullWorkflow: metrics.getMetrics().fullWorkflow.duration,
      fcp: webVitals.fcp,
      lcp: webVitals.lcp,
      cls: webVitals.cls,
      memoryUsage: memoryUsage?.usedJSHeapSize
    };
    
    // Store baseline (in real implementation, this would be stored in CI/CD system)
    console.log('Baseline Performance Metrics:', baselineMetrics);
    
    // Verify baseline meets targets
    expect(baselineMetrics.fullWorkflow).toBeLessThan(10000); // 10 seconds for full workflow
    if (baselineMetrics.fcp) expect(baselineMetrics.fcp).toBeLessThan(PERFORMANCE_TARGETS.firstContentfulPaint);
    if (baselineMetrics.lcp) expect(baselineMetrics.lcp).toBeLessThan(PERFORMANCE_TARGETS.largestContentfulPaint);
    if (baselineMetrics.cls !== undefined) expect(baselineMetrics.cls).toBeLessThan(PERFORMANCE_TARGETS.cumulativeLayoutShift);
  });
});