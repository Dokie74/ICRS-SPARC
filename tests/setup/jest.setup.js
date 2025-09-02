// tests/setup/jest.setup.js
// Jest setup and configuration for ICRS SPARC tests

import '@testing-library/jest-dom';
import { jest } from '@jest/globals';

// Mock console methods to reduce noise during testing
global.console = {
  ...console,
  // Keep error and warn for debugging
  error: jest.fn(),
  warn: jest.fn(),
  // Comment out these lines if you want to see logs during testing
  log: jest.fn(),
  info: jest.fn(),
  debug: jest.fn()
};

// Mock window.matchMedia for responsive design tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // Deprecated
    removeListener: jest.fn(), // Deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock requestAnimationFrame
global.requestAnimationFrame = jest.fn(callback => {
  setTimeout(callback, 0);
});

global.cancelAnimationFrame = jest.fn();

// Mock window.getComputedStyle
Object.defineProperty(window, 'getComputedStyle', {
  value: () => ({
    getPropertyValue: () => '',
  }),
});

// Mock scrollIntoView
Element.prototype.scrollIntoView = jest.fn();

// Mock clipboard API
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: jest.fn().mockResolvedValue(),
    readText: jest.fn().mockResolvedValue('')
  }
});

// Mock local storage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Mock session storage
Object.defineProperty(window, 'sessionStorage', {
  value: localStorageMock
});

// Mock fetch for API testing
global.fetch = jest.fn();

// Mock environment variables
process.env = {
  ...process.env,
  NODE_ENV: 'test',
  REACT_APP_API_URL: 'http://localhost:5000',
  REACT_APP_APP_NAME: 'ICRS SPARC Test'
};

// Global test utilities
global.testUtils = {
  // Wait for async operations
  waitFor: async (callback, timeout = 5000) => {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      try {
        await callback();
        return;
      } catch (error) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }
    throw new Error('Timeout waiting for condition');
  },
  
  // Create mock event
  createMockEvent: (type, properties = {}) => ({
    type,
    preventDefault: jest.fn(),
    stopPropagation: jest.fn(),
    target: { value: '' },
    currentTarget: { value: '' },
    ...properties
  }),
  
  // Create mock file
  createMockFile: (name = 'test.csv', type = 'text/csv', content = 'test content') => {
    return new File([content], name, { type });
  }
};

// Setup custom matchers for better assertions
expect.extend({
  toHaveBeenCalledWithObject(received, expected) {
    const calls = received.mock.calls;
    const matchingCall = calls.find(call => {
      return call.some(arg => {
        if (typeof arg === 'object' && arg !== null) {
          return Object.keys(expected).every(key => {
            return arg[key] === expected[key];
          });
        }
        return false;
      });
    });

    if (matchingCall) {
      return {
        message: () => `Expected function not to have been called with object containing ${JSON.stringify(expected)}`,
        pass: true,
      };
    } else {
      return {
        message: () => `Expected function to have been called with object containing ${JSON.stringify(expected)}`,
        pass: false,
      };
    }
  },

  toBeValidEmail(received) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const pass = emailRegex.test(received);
    
    if (pass) {
      return {
        message: () => `Expected ${received} not to be a valid email`,
        pass: true,
      };
    } else {
      return {
        message: () => `Expected ${received} to be a valid email`,
        pass: false,
      };
    }
  },

  toBeValidHTSCode(received) {
    const htsRegex = /^\d{4}\.\d{2}\.\d{4}$/;
    const pass = htsRegex.test(received);
    
    if (pass) {
      return {
        message: () => `Expected ${received} not to be a valid HTS code`,
        pass: true,
      };
    } else {
      return {
        message: () => `Expected ${received} to be a valid HTS code (format: XXXX.XX.XXXX)`,
        pass: false,
      };
    }
  },

  toBeValidEIN(received) {
    const einRegex = /^\d{2}-\d{7}$/;
    const pass = einRegex.test(received);
    
    if (pass) {
      return {
        message: () => `Expected ${received} not to be a valid EIN`,
        pass: true,
      };
    } else {
      return {
        message: () => `Expected ${received} to be a valid EIN (format: XX-XXXXXXX)`,
        pass: false,
      };
    }
  }
});

// Error handling for unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  throw reason;
});

// Cleanup after each test
afterEach(() => {
  // Clear all mocks
  jest.clearAllMocks();
  
  // Clear timers
  jest.clearAllTimers();
  
  // Clear local storage mock
  localStorageMock.clear();
  
  // Reset DOM
  document.body.innerHTML = '';
  
  // Reset fetch mock
  if (global.fetch.mockReset) {
    global.fetch.mockReset();
  }
});

// Setup before each test
beforeEach(() => {
  // Reset console mocks
  global.console.error.mockClear();
  global.console.warn.mockClear();
  
  // Setup default fetch mock responses
  global.fetch.mockImplementation((url) => {
    // Default mock responses for common endpoints
    if (url.includes('/api/admin/employees')) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({ success: true, data: [] })
      });
    }
    
    if (url.includes('/api/admin/parts')) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({ success: true, data: [] })
      });
    }
    
    if (url.includes('/api/admin/customers')) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({ success: true, data: [] })
      });
    }
    
    if (url.includes('/api/admin/suppliers')) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({ success: true, data: [] })
      });
    }
    
    // Default fallback
    return Promise.resolve({
      ok: false,
      status: 404,
      json: async () => ({ error: 'Not Found' })
    });
  });
});

console.log('Jest setup completed for ICRS SPARC tests');