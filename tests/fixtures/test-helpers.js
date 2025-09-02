// tests/fixtures/test-helpers.js
// Helper functions for test setup and utilities

const testData = require('./test-data');
const mockApiResponses = require('./mock-api-responses');

/**
 * Helper functions for setting up test environments
 */
const testHelpers = {
  /**
   * Create a mock user for authentication tests
   */
  createMockUser: (role = 'admin') => {
    return { ...testData.users[role] };
  },

  /**
   * Create a mock authentication context
   */
  createMockAuthContext: (user = null) => ({
    user: user || testData.users.admin,
    isAuthenticated: !!user,
    login: jest.fn().mockResolvedValue({ success: true }),
    logout: jest.fn(),
    loading: false,
    error: null
  }),

  /**
   * Create a mock app context with notifications
   */
  createMockAppContext: () => ({
    showSuccess: jest.fn(),
    showError: jest.fn(),
    showWarning: jest.fn(),
    showInfo: jest.fn(),
    notifications: [],
    loading: false,
    globalError: null
  }),

  /**
   * Create a mock query client for React Query tests
   */
  createMockQueryClient: () => {
    const { QueryClient } = require('@tanstack/react-query');
    return new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          cacheTime: 0
        },
        mutations: {
          retry: false
        }
      }
    });
  },

  /**
   * Mock API service functions
   */
  mockApiServices: {
    receiving: {
      getAllPreadmissions: jest.fn(),
      getPreadmissionById: jest.fn(),
      createPreadmission: jest.fn(),
      updatePreadmissionStatus: jest.fn(),
      completeDockAudit: jest.fn(),
      verifyFTZCompliance: jest.fn(),
      getAuditPhotos: jest.fn(),
      getReceivingStats: jest.fn()
    },
    shipping: {
      getAllPreshipments: jest.fn(),
      getPreshipmentById: jest.fn(),
      createPreshipment: jest.fn(),
      updateStatus: jest.fn(),
      generateLabels: jest.fn(),
      completeDriverSignoff: jest.fn(),
      fileWithCBP: jest.fn(),
      getPreshipmentStats: jest.fn(),
      consolidateShipments: jest.fn(),
      trackShipment: jest.fn()
    },
    inventory: {
      getInventoryItems: jest.fn(),
      getInventoryItem: jest.fn(),
      reserveInventory: jest.fn()
    },
    customers: {
      getCustomers: jest.fn(),
      getCustomer: jest.fn()
    }
  },

  /**
   * Set up successful API mocks
   */
  setupSuccessfulApiMocks: () => {
    // Receiving service mocks
    testHelpers.mockApiServices.receiving.getAllPreadmissions
      .mockResolvedValue(mockApiResponses.receiving.getPreadmissions);
    testHelpers.mockApiServices.receiving.getPreadmissionById
      .mockResolvedValue(mockApiResponses.receiving.getPreadmissionById);
    testHelpers.mockApiServices.receiving.createPreadmission
      .mockResolvedValue(mockApiResponses.receiving.createPreadmission);
    testHelpers.mockApiServices.receiving.completeDockAudit
      .mockResolvedValue(mockApiResponses.receiving.completeDockAudit);

    // Shipping service mocks
    testHelpers.mockApiServices.shipping.getAllPreshipments
      .mockResolvedValue(mockApiResponses.shipping.getPreshipments);
    testHelpers.mockApiServices.shipping.getPreshipmentById
      .mockResolvedValue(mockApiResponses.shipping.getPreshipmentById);
    testHelpers.mockApiServices.shipping.createPreshipment
      .mockResolvedValue(mockApiResponses.shipping.createPreshipment);
    testHelpers.mockApiServices.shipping.generateLabels
      .mockResolvedValue(mockApiResponses.shipping.generateLabels);
    testHelpers.mockApiServices.shipping.completeDriverSignoff
      .mockResolvedValue(mockApiResponses.shipping.completeDriverSignoff);

    // Inventory service mocks
    testHelpers.mockApiServices.inventory.getInventoryItems
      .mockResolvedValue(mockApiResponses.inventory.getInventoryItems);
    
    // Customer service mocks
    testHelpers.mockApiServices.customers.getCustomers
      .mockResolvedValue(mockApiResponses.customers.getCustomers);
  },

  /**
   * Set up error API mocks
   */
  setupErrorApiMocks: () => {
    // Network errors
    Object.values(testHelpers.mockApiServices).forEach(service => {
      Object.values(service).forEach(mockFn => {
        mockFn.mockRejectedValue(new Error('Network request failed'));
      });
    });
  },

  /**
   * Clear all API mocks
   */
  clearApiMocks: () => {
    Object.values(testHelpers.mockApiServices).forEach(service => {
      Object.values(service).forEach(mockFn => {
        mockFn.mockClear();
      });
    });
  },

  /**
   * Create mock file for upload testing
   */
  createMockFile: (name = 'test-file.jpg', type = 'image/jpeg', content = 'mock file content') => {
    return new File([content], name, { type });
  },

  /**
   * Create multiple mock files
   */
  createMockFiles: (count = 3, namePrefix = 'test-file') => {
    return Array.from({ length: count }, (_, index) => 
      testHelpers.createMockFile(`${namePrefix}-${index + 1}.jpg`)
    );
  },

  /**
   * Mock FormData for file upload tests
   */
  mockFormData: () => {
    const mockAppend = jest.fn();
    const mockGet = jest.fn();
    const mockGetAll = jest.fn();
    const mockDelete = jest.fn();
    const mockSet = jest.fn();

    global.FormData = jest.fn(() => ({
      append: mockAppend,
      get: mockGet,
      getAll: mockGetAll,
      delete: mockDelete,
      set: mockSet
    }));

    return { mockAppend, mockGet, mockGetAll, mockDelete, mockSet };
  },

  /**
   * Mock canvas for signature testing
   */
  mockCanvas: () => {
    const mockContext = {
      fillStyle: '',
      fillRect: jest.fn(),
      beginPath: jest.fn(),
      moveTo: jest.fn(),
      lineTo: jest.fn(),
      stroke: jest.fn(),
      scale: jest.fn(),
      lineCap: '',
      lineJoin: '',
      strokeStyle: '',
      lineWidth: 0,
      drawImage: jest.fn()
    };

    const mockToBlob = jest.fn((callback) => {
      const blob = new Blob(['mock canvas data'], { type: 'image/png' });
      callback(blob);
    });

    HTMLCanvasElement.prototype.getContext = jest.fn(() => mockContext);
    HTMLCanvasElement.prototype.toBlob = mockToBlob;
    HTMLCanvasElement.prototype.getBoundingClientRect = jest.fn(() => ({
      left: 0,
      top: 0,
      width: 400,
      height: 150
    }));

    return { mockContext, mockToBlob };
  },

  /**
   * Mock media devices for camera testing
   */
  mockMediaDevices: () => {
    const mockStream = {
      getTracks: jest.fn(() => [{ stop: jest.fn() }])
    };

    Object.defineProperty(navigator, 'mediaDevices', {
      value: {
        getUserMedia: jest.fn(() => Promise.resolve(mockStream))
      }
    });

    return mockStream;
  },

  /**
   * Mock URL object for blob handling
   */
  mockURL: () => {
    global.URL.createObjectURL = jest.fn(() => 'mock-blob-url');
    global.URL.revokeObjectURL = jest.fn();
  },

  /**
   * Mock window methods for download/print testing
   */
  mockWindow: () => {
    const mockPrintWindow = { focus: jest.fn() };
    global.window.open = jest.fn(() => mockPrintWindow);
    
    const mockLink = {
      href: '',
      download: '',
      click: jest.fn()
    };
    
    jest.spyOn(document, 'createElement').mockImplementation((tagName) => {
      if (tagName === 'a') return mockLink;
      return document.createElement(tagName);
    });
    
    jest.spyOn(document.body, 'appendChild').mockImplementation(() => {});
    jest.spyOn(document.body, 'removeChild').mockImplementation(() => {});

    return { mockPrintWindow, mockLink };
  },

  /**
   * Create performance test data
   */
  createPerformanceData: {
    largePreadmissionSet: testData.performanceData.largePreadmissionSet,
    largeShipmentSet: testData.performanceData.largeShipmentSet
  },

  /**
   * Wait for async operations in tests
   */
  waitFor: async (callback, options = {}) => {
    const { timeout = 1000, interval = 50 } = options;
    const start = Date.now();
    
    while (Date.now() - start < timeout) {
      try {
        await callback();
        return;
      } catch (error) {
        await new Promise(resolve => setTimeout(resolve, interval));
      }
    }
    
    throw new Error(`waitFor timeout after ${timeout}ms`);
  },

  /**
   * Simulate user interactions
   */
  userInteractions: {
    fillForm: async (user, formData) => {
      for (const [field, value] of Object.entries(formData)) {
        const element = document.querySelector(`[name="${field}"], [data-testid="${field}-input"]`);
        if (element) {
          await user.clear(element);
          await user.type(element, value);
        }
      }
    },
    
    selectOption: async (user, fieldName, value) => {
      const select = document.querySelector(`[name="${fieldName}"], [data-testid="${fieldName}-select"]`);
      if (select) {
        await user.selectOptions(select, value);
      }
    },
    
    checkBox: async (user, fieldName, checked = true) => {
      const checkbox = document.querySelector(`[name="${fieldName}"], [data-testid="${fieldName}-checkbox"]`);
      if (checkbox && checkbox.checked !== checked) {
        await user.click(checkbox);
      }
    },
    
    uploadFiles: async (user, inputSelector, files) => {
      const input = document.querySelector(inputSelector);
      if (input) {
        await user.upload(input, files);
      }
    }
  },

  /**
   * Assert helpers for common test scenarios
   */
  assertions: {
    expectSuccessToast: (mockShowSuccess, message) => {
      expect(mockShowSuccess).toHaveBeenCalledWith(
        expect.stringContaining(message)
      );
    },
    
    expectErrorToast: (mockShowError, message) => {
      expect(mockShowError).toHaveBeenCalledWith(
        expect.stringContaining(message)
      );
    },
    
    expectApiCall: (mockFn, expectedArgs) => {
      expect(mockFn).toHaveBeenCalledWith(...expectedArgs);
    },
    
    expectFormValidation: (container, errors) => {
      errors.forEach(error => {
        expect(container.getByText(error)).toBeInTheDocument();
      });
    },
    
    expectLoadingState: (container) => {
      expect(container.getByText(/loading|processing/i)).toBeInTheDocument();
    },
    
    expectEmptyState: (container, message = 'No items found') => {
      expect(container.getByText(message)).toBeInTheDocument();
    }
  },

  /**
   * Mock date for consistent testing
   */
  mockDate: (mockDate = '2024-01-20T10:00:00.000Z') => {
    const OriginalDate = Date;
    const mockDateObj = new OriginalDate(mockDate);
    
    global.Date = jest.fn(() => mockDateObj);
    global.Date.now = jest.fn(() => mockDateObj.getTime());
    global.Date.UTC = OriginalDate.UTC;
    global.Date.parse = OriginalDate.parse;
    
    Object.setPrototypeOf(global.Date, OriginalDate);
    
    jest.spyOn(global.Date.prototype, 'toISOString').mockReturnValue(mockDate);
    
    return () => {
      global.Date = OriginalDate;
    };
  },

  /**
   * Setup common test environment
   */
  setupTestEnvironment: () => {
    // Mock console methods to reduce noise
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    
    // Mock common browser APIs
    testHelpers.mockURL();
    testHelpers.mockCanvas();
    testHelpers.mockMediaDevices();
    testHelpers.mockWindow();
    testHelpers.mockFormData();
    
    // Set up successful API mocks by default
    testHelpers.setupSuccessfulApiMocks();
  },

  /**
   * Cleanup test environment
   */
  cleanupTestEnvironment: () => {
    jest.restoreAllMocks();
    testHelpers.clearApiMocks();
  }
};

module.exports = testHelpers;