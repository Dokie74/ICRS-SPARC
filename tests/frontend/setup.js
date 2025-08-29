// Jest setup file for frontend tests
// Configures testing environment with necessary mocks and utilities

import '@testing-library/jest-dom';
import 'jest-canvas-mock';

// Mock window.matchMedia for responsive components
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

// Mock IntersectionObserver for components that use it
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  observe() {
    return null;
  }
  disconnect() {
    return null;
  }
  unobserve() {
    return null;
  }
};

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  observe() {
    return null;
  }
  disconnect() {
    return null;
  }
  unobserve() {
    return null;
  }
};

// Mock navigator.clipboard
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: jest.fn().mockImplementation(() => Promise.resolve()),
    readText: jest.fn().mockImplementation(() => Promise.resolve(''))
  }
});

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true
});

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

// Mock sessionStorage
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.sessionStorage = sessionStorageMock;

// Mock WebSocket
global.WebSocket = class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  constructor(url) {
    this.url = url;
    this.readyState = MockWebSocket.CONNECTING;
    this.onopen = null;
    this.onclose = null;
    this.onmessage = null;
    this.onerror = null;
  }

  send = jest.fn();
  close = jest.fn();
  addEventListener = jest.fn();
  removeEventListener = jest.fn();
};

// Mock fetch for API calls
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    statusText: 'OK',
    json: () => Promise.resolve({ success: true, data: {} }),
    text: () => Promise.resolve(''),
    blob: () => Promise.resolve(new Blob()),
    clone: () => ({ json: () => Promise.resolve({ success: true, data: {} }) }),
    headers: new Headers(),
  })
);

// Mock URL.createObjectURL
global.URL.createObjectURL = jest.fn(() => 'mocked-url');
global.URL.revokeObjectURL = jest.fn();

// Mock console methods to reduce noise in tests
const originalError = console.error;
const originalWarn = console.warn;

beforeAll(() => {
  console.error = (...args) => {
    // Only show actual errors, not React warnings in tests
    if (typeof args[0] === 'string' && args[0].includes('Warning:')) {
      return;
    }
    originalError.call(console, ...args);
  };
  
  console.warn = (...args) => {
    // Suppress certain warnings in tests
    if (typeof args[0] === 'string' && (
      args[0].includes('componentWillReceiveProps') ||
      args[0].includes('componentWillUpdate') ||
      args[0].includes('componentWillMount')
    )) {
      return;
    }
    originalWarn.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
  console.warn = originalWarn;
});

// Global test utilities
export const createMockUser = (overrides = {}) => ({
  id: 'user-123',
  email: 'test@example.com',
  user_metadata: { name: 'Test User' },
  app_metadata: { role: 'warehouse_staff' },
  created_at: '2025-01-01T00:00:00.000Z',
  updated_at: '2025-01-01T00:00:00.000Z',
  ...overrides
});

export const createMockApiResponse = (data = {}, success = true) => ({
  success,
  data: success ? data : undefined,
  error: success ? undefined : 'Test error',
  timestamp: new Date().toISOString()
});

export const createMockInventoryLot = (overrides = {}) => ({
  id: 'L-123456',
  part_id: 'part-123',
  customer_id: 'customer-123',
  status: 'In Stock',
  original_quantity: 100,
  current_quantity: 75,
  admission_date: '2025-01-01T00:00:00.000Z',
  created_at: '2025-01-01T00:00:00.000Z',
  updated_at: '2025-01-01T00:00:00.000Z',
  ...overrides
});

export const createMockCustomer = (overrides = {}) => ({
  id: 'customer-123',
  name: 'Test Customer Inc.',
  code: 'TEST001',
  address: {
    street: '123 Test St',
    city: 'Test City',
    state: 'TS',
    zip: '12345',
    country: 'US'
  },
  contact_info: {
    primary_contact: 'John Doe',
    phone: '555-1234',
    email: 'john@testcustomer.com'
  },
  active: true,
  created_at: '2025-01-01T00:00:00.000Z',
  updated_at: '2025-01-01T00:00:00.000Z',
  ...overrides
});

export const createMockPart = (overrides = {}) => ({
  id: 'part-123',
  description: 'Test Part Description',
  part_number: 'TP-001',
  material: 'Steel',
  hts_code: '1234.56.7890',
  unit_of_measure: 'EA',
  country_of_origin: 'US',
  standard_value: 10.00,
  active: true,
  created_at: '2025-01-01T00:00:00.000Z',
  updated_at: '2025-01-01T00:00:00.000Z',
  ...overrides
});

// Mock providers for testing
export const createMockAuthContext = (overrides = {}) => ({
  user: createMockUser(),
  isAuthenticated: true,
  loading: false,
  hasPermission: jest.fn(() => true),
  login: jest.fn(),
  logout: jest.fn(),
  ...overrides
});

export const createMockQueryClient = () => {
  const { QueryClient } = require('react-query');
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
    logger: {
      log: () => {},
      warn: () => {},
      error: () => {},
    },
  });
};

// Test wrapper components
export const TestWrapper = ({ children, queryClient, authContext, initialStoreState }) => {
  const { QueryClientProvider } = require('react-query');
  const { AuthProvider } = require('../../src/frontend/contexts/AuthContext');
  
  return (
    <QueryClientProvider client={queryClient || createMockQueryClient()}>
      <AuthProvider value={authContext || createMockAuthContext()}>
        {children}
      </AuthProvider>
    </QueryClientProvider>
  );
};

// Custom render function for testing
export const customRender = (ui, options = {}) => {
  const { render } = require('@testing-library/react');
  const {
    queryClient = createMockQueryClient(),
    authContext = createMockAuthContext(),
    initialStoreState = {},
    ...renderOptions
  } = options;

  const Wrapper = ({ children }) => (
    <TestWrapper
      queryClient={queryClient}
      authContext={authContext}
      initialStoreState={initialStoreState}
    >
      {children}
    </TestWrapper>
  );

  return render(ui, { wrapper: Wrapper, ...renderOptions });
};

// Wait for async operations
export const waitForLoadingToFinish = () => 
  new Promise(resolve => setTimeout(resolve, 0));

// Mock timers utility
export const mockTimers = () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });
};

// API response delay utility for testing loading states
export const delayedResponse = (response, delay = 100) => 
  new Promise(resolve => setTimeout(() => resolve(response), delay));

// Error boundary testing utility
export const throwError = (message = 'Test error') => {
  throw new Error(message);
};

export default {
  createMockUser,
  createMockApiResponse,
  createMockInventoryLot,
  createMockCustomer,
  createMockPart,
  createMockAuthContext,
  createMockQueryClient,
  TestWrapper,
  customRender,
  waitForLoadingToFinish,
  mockTimers,
  delayedResponse,
  throwError
};