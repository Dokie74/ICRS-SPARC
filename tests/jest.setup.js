// tests/jest.setup.js
// Global Jest configuration for ICRS SPARC test suites
// Configures test environment, mocks, and utilities for backend, frontend, and integration tests

import 'jest-extended';
import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';
import { configDotenv } from 'dotenv';
import { setupServer } from 'msw/node';
import { handlers } from './mocks/handlers';

// Load test environment variables
configDotenv({ path: '.env.test' });

// Global polyfills for Node.js environment
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Mock WebSocket for real-time features
global.WebSocket = class MockWebSocket {
  constructor(url) {
    this.url = url;
    this.readyState = 1; // OPEN
    this.listeners = {};
    
    setTimeout(() => {
      this.onopen?.({ target: this });
    }, 0);
  }
  
  addEventListener(event, handler) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(handler);
  }
  
  removeEventListener(event, handler) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(h => h !== handler);
    }
  }
  
  send(data) {
    // Mock successful send
    console.debug('Mock WebSocket send:', data);
  }
  
  close() {
    this.readyState = 3; // CLOSED
    this.onclose?.({ target: this });
  }
  
  // Utility method for tests to trigger events
  mockReceiveMessage(data) {
    const event = { data, target: this };
    this.onmessage?.(event);
    this.listeners.message?.forEach(handler => handler(event));
  }
};

// Mock File API for upload tests
global.File = class MockFile {
  constructor(content, name, options = {}) {
    this.content = content;
    this.name = name;
    this.type = options.type || 'text/plain';
    this.size = content.length;
    this.lastModified = Date.now();
  }
  
  text() {
    return Promise.resolve(this.content);
  }
  
  arrayBuffer() {
    return Promise.resolve(new ArrayBuffer(this.size));
  }
};

// Mock FileReader for photo upload tests
global.FileReader = class MockFileReader {
  constructor() {
    this.readyState = 0;
    this.result = null;
    this.error = null;
  }
  
  readAsDataURL(file) {
    setTimeout(() => {
      this.readyState = 2;
      this.result = `data:${file.type};base64,${btoa(file.content)}`;
      this.onload?.({ target: this });
    }, 0);
  }
  
  readAsText(file) {
    setTimeout(() => {
      this.readyState = 2;
      this.result = file.content;
      this.onload?.({ target: this });
    }, 0);
  }
  
  abort() {
    this.readyState = 2;
    this.onabort?.({ target: this });
  }
};

// Mock URL.createObjectURL for file handling
global.URL.createObjectURL = jest.fn((blob) => {
  return `mock://blob/${Date.now()}`;
});
global.URL.revokeObjectURL = jest.fn();

// Mock canvas for signature capture tests
HTMLCanvasElement.prototype.getContext = jest.fn((contextType) => {
  if (contextType === '2d') {
    return {
      clearRect: jest.fn(),
      fillRect: jest.fn(),
      strokeRect: jest.fn(),
      fillText: jest.fn(),
      strokeText: jest.fn(),
      measureText: jest.fn(() => ({ width: 100 })),
      beginPath: jest.fn(),
      moveTo: jest.fn(),
      lineTo: jest.fn(),
      closePath: jest.fn(),
      stroke: jest.fn(),
      fill: jest.fn(),
      save: jest.fn(),
      restore: jest.fn(),
      scale: jest.fn(),
      rotate: jest.fn(),
      translate: jest.fn(),
      transform: jest.fn(),
      setTransform: jest.fn(),
      drawImage: jest.fn(),
      createImageData: jest.fn(),
      getImageData: jest.fn(() => ({
        data: new Uint8ClampedArray(4),
        width: 1,
        height: 1
      })),
      putImageData: jest.fn(),
      toBlob: jest.fn((callback) => {
        callback(new Blob(['mock'], { type: 'image/png' }));
      }),
      toDataURL: jest.fn(() => 'data:image/png;base64,mock')
    };
  }
  return null;
});

// Mock IntersectionObserver for virtual scrolling
global.IntersectionObserver = class MockIntersectionObserver {
  constructor(callback) {
    this.callback = callback;
  }
  
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock ResizeObserver for responsive components
global.ResizeObserver = class MockResizeObserver {
  constructor(callback) {
    this.callback = callback;
  }
  
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock matchMedia for responsive design tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock scrollTo for navigation tests
window.scrollTo = jest.fn();

// Mock crypto for UUID generation in tests
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: jest.fn(() => 'mock-uuid-1234-5678-9012-345678901234'),
    getRandomValues: jest.fn((arr) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    }),
    subtle: {
      digest: jest.fn(() => Promise.resolve(new ArrayBuffer(32))),
      encrypt: jest.fn(() => Promise.resolve(new ArrayBuffer(32))),
      decrypt: jest.fn(() => Promise.resolve(new ArrayBuffer(32)))
    }
  }
});

// Setup MSW server for API mocking
const server = setupServer(...handlers);

// Configure MSW
beforeAll(() => {
  // Start the server
  server.listen({
    onUnhandledRequest: 'warn'
  });
});

afterEach(() => {
  // Reset handlers after each test
  server.resetHandlers();
  
  // Clear all mocks
  jest.clearAllMocks();
  
  // Reset WebSocket mock state
  if (global.mockWebSocketInstances) {
    global.mockWebSocketInstances.forEach(ws => {
      if (ws.readyState !== 3) {
        ws.close();
      }
    });
    global.mockWebSocketInstances = [];
  }
  
  // Clear localStorage and sessionStorage
  localStorage.clear();
  sessionStorage.clear();
});

afterAll(() => {
  // Stop the server
  server.close();
});

// Global test utilities
global.testUtils = {
  // Mock authentication state
  mockAuthUser: (userData = {}) => ({
    id: 'test-user-123',
    email: 'test@example.com',
    role: 'warehouse_staff',
    permissions: ['inventory:read', 'inventory:write'],
    ...userData
  }),
  
  // Mock inventory lot data
  mockInventoryLot: (overrides = {}) => ({
    id: 'TEST-LOT-001',
    part_id: 'PART-001',
    customer_id: 'CUSTOMER-001',
    original_quantity: 100,
    current_quantity: 100,
    status: 'In Stock',
    admission_date: '2024-01-15T10:00:00Z',
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-15T10:00:00Z',
    ...overrides
  }),
  
  // Mock preadmission data
  mockPreadmission: (overrides = {}) => ({
    id: 'PREADM-001',
    customer_id: 'CUSTOMER-001',
    part_id: 'PART-001',
    expected_quantity: 100,
    manifest_number: 'MANIFEST-001',
    status: 'Pending Review',
    created_date: '2024-01-15T08:00:00Z',
    expected_arrival: '2024-01-16T14:00:00Z',
    ...overrides
  }),
  
  // Mock preshipment data
  mockPreshipment: (overrides = {}) => ({
    id: 'PRESHIP-001',
    customer_id: 'CUSTOMER-001',
    lots: ['TEST-LOT-001'],
    requested_quantity: 50,
    status: 'Pending Approval',
    created_date: '2024-01-15T12:00:00Z',
    requested_ship_date: '2024-01-17T10:00:00Z',
    ...overrides
  }),
  
  // Mock API responses
  mockApiResponse: (data, success = true, message = '') => ({
    success,
    data,
    message,
    timestamp: new Date().toISOString()
  }),
  
  // Mock error response
  mockApiError: (message, code = 400, details = {}) => ({
    success: false,
    error: message,
    code,
    details,
    timestamp: new Date().toISOString()
  }),
  
  // Create mock photo file
  mockPhotoFile: (name = 'test-photo.jpg') => new File(
    ['mock photo content'],
    name,
    { type: 'image/jpeg' }
  ),
  
  // Create mock signature data
  mockSignatureData: () => ({
    signature: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
    timestamp: new Date().toISOString(),
    signedBy: 'Test User'
  }),
  
  // Wait for async operations
  waitFor: async (conditionFn, timeout = 5000) => {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      if (await conditionFn()) {
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    throw new Error(`Condition not met within ${timeout}ms`);
  },
  
  // Generate test data arrays
  generateTestLots: (count = 10) => {
    return Array(count).fill().map((_, index) => ({
      id: `TEST-LOT-${String(index + 1).padStart(3, '0')}`,
      part_id: `PART-${String((index % 5) + 1).padStart(3, '0')}`,
      customer_id: `CUSTOMER-${String((index % 3) + 1).padStart(3, '0')}`,
      original_quantity: (index + 1) * 10,
      current_quantity: (index + 1) * 8, // Some consumed
      status: index % 4 === 0 ? 'Low Stock' : 'In Stock',
      admission_date: new Date(Date.now() - (index * 24 * 60 * 60 * 1000)).toISOString(),
      created_at: new Date(Date.now() - (index * 24 * 60 * 60 * 1000)).toISOString(),
      updated_at: new Date(Date.now() - (Math.random() * 24 * 60 * 60 * 1000)).toISOString()
    }));
  }
};

// Custom Jest matchers
expect.extend({
  toBeWithinRange(received, floor, ceiling) {
    const pass = received >= floor && received <= ceiling;
    if (pass) {
      return {
        message: () =>
          `expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true,
      };
    } else {
      return {
        message: () =>
          `expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false,
      };
    }
  },
  
  toHaveValidTimestamp(received) {
    const timestamp = new Date(received);
    const pass = !isNaN(timestamp.getTime());
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid timestamp`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid timestamp`,
        pass: false,
      };
    }
  },
  
  toMatchInventoryLotSchema(received) {
    const requiredFields = ['id', 'part_id', 'customer_id', 'original_quantity', 'current_quantity', 'status'];
    const hasAllFields = requiredFields.every(field => received.hasOwnProperty(field));
    
    if (hasAllFields) {
      return {
        message: () => `expected object not to match inventory lot schema`,
        pass: true,
      };
    } else {
      const missingFields = requiredFields.filter(field => !received.hasOwnProperty(field));
      return {
        message: () => `expected object to match inventory lot schema, missing fields: ${missingFields.join(', ')}`,
        pass: false,
      };
    }
  }
});

// Console configuration for test environments
const originalError = console.error;
beforeAll(() => {
  // Suppress known React warnings in tests
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning: ReactDOM.render is deprecated') ||
       args[0].includes('Warning: componentWillReceiveProps has been renamed'))
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});

// Performance monitoring setup for tests
const performanceObserver = new PerformanceObserver((list) => {
  const entries = list.getEntries();
  entries.forEach((entry) => {
    if (entry.duration > 1000) { // Log slow operations
      console.warn(`Slow operation detected: ${entry.name} took ${entry.duration}ms`);
    }
  });
});

// Only observe in performance-sensitive test environments
if (process.env.NODE_ENV === 'performance-test') {
  performanceObserver.observe({ entryTypes: ['measure', 'navigation', 'resource'] });
}

export default undefined;