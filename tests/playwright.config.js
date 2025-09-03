// tests/playwright.config.js
// Playwright configuration for E2E tests - ICRS SPARC

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  // Test directory
  testDir: './e2e',
  
  // Run tests in files in parallel
  fullyParallel: true,
  
  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,
  
  // Retry on CI only
  retries: process.env.CI ? 2 : 0,
  
  // Opt out of parallel tests on CI
  workers: process.env.CI ? 1 : undefined,
  
  // Reporter to use
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['line']
  ],
  
  // Shared settings for all the projects below
  use: {
    // Base URL to use in actions like await page.goto('/')
    baseURL: 'http://localhost:3000',
    
    // Collect trace when retrying the failed test
    trace: 'on-first-retry',
    
    // Take screenshot on failure
    screenshot: 'only-on-failure',
    
    // Record video on failure
    video: 'retain-on-failure',
    
    // Global timeout for each action
    actionTimeout: 10000,
    
    // Global timeout for navigation
    navigationTimeout: 30000,
  },
  
  // Configure projects for major browsers
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // Additional Chrome-specific options
        launchOptions: {
          args: ['--disable-dev-shm-usage', '--disable-extensions']
        }
      },
    },
    
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    
    // Test against mobile viewports
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
    
    // Test against branded browsers
    {
      name: 'Microsoft Edge',
      use: { 
        ...devices['Desktop Edge'], 
        channel: 'msedge' 
      },
    },
    
    {
      name: 'Google Chrome',
      use: { 
        ...devices['Desktop Chrome'], 
        channel: 'chrome' 
      },
    },
  ],
  
  // Global setup and teardown
  // globalSetup: require.resolve('./setup/global-setup.js'),
  // globalTeardown: require.resolve('./setup/global-teardown.js'),
  
  // Run your local dev server before starting the tests
  // Note: Servers should be started manually for testing
  // webServer: [
  //   {
  //     command: 'npm run frontend:start',
  //     port: 3000,
  //     cwd: '..',
  //     reuseExistingServer: !process.env.CI,
  //     timeout: 120000,
  //   },
  //   {
  //     command: 'npm run dev',
  //     port: 5000,
  //     cwd: '..',
  //     reuseExistingServer: !process.env.CI,
  //     timeout: 120000,
  //   }
  // ],
  
  // Test timeout
  timeout: 30000,
  
  // Expect timeout
  expect: {
    timeout: 10000,
    // Screenshot comparison threshold
    threshold: 0.3,
    // Screenshot comparison mode
    mode: 'pixel'
  },
  
  // Test output directory
  outputDir: 'test-results/',
  
  // Test metadata
  metadata: {
    'Test Suite': 'ICRS SPARC Admin Modals',
    'Environment': process.env.NODE_ENV || 'test',
    'Application': 'ICRS SPARC - Foreign Trade Zone Operations',
    'Test Focus': 'Admin Modal Functionality'
  }
});