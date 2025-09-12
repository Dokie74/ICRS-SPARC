// src/frontend/services/api-client.js
// Centralized API client service for ICRS SPARC frontend
// Replaces direct Supabase calls with standardized backend API integration

class ApiClient {
  constructor() {
    // Smart API URL detection - tries to auto-discover backend
    this.baseURL = this.discoverApiUrl();
    this.token = null;
    this.user = null;
    
    // Request/response interceptors for consistent handling
    this.requestInterceptors = [];
    this.responseInterceptors = [];
    
    // Add default request interceptor for authentication
    this.addRequestInterceptor((config) => {
      if (this.token) {
        config.headers = {
          ...config.headers,
          'Authorization': `Bearer ${this.token}`
        };
      }
      return config;
    });
    
    // Add default response interceptor for error handling
    this.addResponseInterceptor(
      (response) => response,
      (error) => {
        if (error.status === 401) {
          this.handleAuthError();
        }
        return Promise.reject(error);
      }
    );
  }

  // Smart API URL discovery - tries multiple approaches to find the backend
  discoverApiUrl() {
    // Priority 1: Use environment variable if explicitly set
    if (process.env.REACT_APP_API_URL) {
      return process.env.REACT_APP_API_URL;
    }
    
    // Priority 2: Use current host with common API ports
    const currentHost = window.location.hostname;
    const commonPorts = [5001, 5000, 8000, 3000];
    
    // For development, try localhost with common ports
    if (currentHost === 'localhost' || currentHost === '127.0.0.1') {
      // Default to 5001 for our current setup
      return `http://${currentHost}:5001`;
    }
    
    // Priority 3: For production, assume same host with standard ports
    if (window.location.protocol === 'https:') {
      return `https://${currentHost}/api`;
    } else {
      return `http://${currentHost}:5001`;
    }
  }

  // Set authentication token
  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('icrs_auth_token', token);
    } else {
      localStorage.removeItem('icrs_auth_token');
    }
  }

  // Set current user
  setUser(user) {
    this.user = user;
    if (user) {
      localStorage.setItem('icrs_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('icrs_user');
    }
  }

  // Get current user
  getCurrentUser() {
    if (!this.user) {
      const storedUser = localStorage.getItem('icrs_user');
      this.user = storedUser ? JSON.parse(storedUser) : null;
    }
    return this.user;
  }

  // Initialize from localStorage
  initialize() {
    const token = localStorage.getItem('icrs_auth_token');
    const user = localStorage.getItem('icrs_user');
    
    if (token) {
      this.token = token;
    }
    
    if (user) {
      this.user = JSON.parse(user);
    }
  }

  // Handle authentication errors
  handleAuthError() {
    this.setToken(null);
    this.setUser(null);
    
    // Redirect to login if not already there
    if (window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
  }

  // Add request interceptor
  addRequestInterceptor(interceptor) {
    this.requestInterceptors.push(interceptor);
  }

  // Add response interceptor
  addResponseInterceptor(onFulfilled, onRejected) {
    this.responseInterceptors.push({ onFulfilled, onRejected });
  }

  // Apply request interceptors
  async applyRequestInterceptors(config) {
    let finalConfig = config;
    for (const interceptor of this.requestInterceptors) {
      finalConfig = await interceptor(finalConfig);
    }
    return finalConfig;
  }

  // Apply response interceptors
  async applyResponseInterceptors(response, isError = false) {
    let finalResponse = response;
    for (const interceptor of this.responseInterceptors) {
      try {
        if (isError && interceptor.onRejected) {
          finalResponse = await interceptor.onRejected(finalResponse);
        } else if (!isError && interceptor.onFulfilled) {
          finalResponse = await interceptor.onFulfilled(finalResponse);
        }
      } catch (error) {
        finalResponse = error;
        isError = true;
      }
    }
    if (isError) {
      throw finalResponse;
    }
    return finalResponse;
  }

  // Core HTTP methods
  async request(endpoint, options = {}) {
    const config = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    };

    // Apply request interceptors
    const finalConfig = await this.applyRequestInterceptors(config);

    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, finalConfig);
      let data;

      // Handle non-JSON responses
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      if (!response.ok) {
        // Temporary debug logging for auth issues
        if (endpoint.includes('/auth/')) {
          console.log('Auth error response:', { status: response.status, data });
        }
        const error = new Error(data.error || `HTTP ${response.status}`);
        error.status = response.status;
        error.data = data;
        throw error;
      }

      // Apply response interceptors
      const result = await this.applyResponseInterceptors({ data, status: response.status });
      return result.data;
    } catch (error) {
      // Apply error response interceptors
      await this.applyResponseInterceptors(error, true);
      throw error;
    }
  }

  async get(endpoint, params = {}) {
    const query = new URLSearchParams(params).toString();
    const url = query ? `${endpoint}?${query}` : endpoint;
    return this.request(url);
  }

  async post(endpoint, data = {}) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async put(endpoint, data = {}) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async patch(endpoint, data = {}) {
    return this.request(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  }

  async delete(endpoint) {
    return this.request(endpoint, {
      method: 'DELETE'
    });
  }

  // Authentication API methods
  auth = {
    login: async (email, password) => {
      const result = await this.post('/auth/login', { email, password });
      if (result.success && result.data) {
        // Handle auth response structure: result.data.session.access_token
        const token = result.data.session?.access_token || result.data.access_token;
        this.setToken(token);
        this.setUser(result.data.user);
      }
      return result;
    },

    register: async (userData) => {
      return this.post('/auth/register', userData);
    },

    logout: async () => {
      try {
        await this.post('/auth/logout');
      } finally {
        this.setToken(null);
        this.setUser(null);
      }
    },

    refresh: async () => {
      const result = await this.post('/auth/refresh');
      if (result.success && result.data) {
        this.setToken(result.data.access_token);
        this.setUser(result.data.user);
      }
      return result;
    },

    getProfile: async () => {
      return this.get('/auth/me');
    },

    updateProfile: async (profileData) => {
      return this.put('/auth/me', profileData);
    }
  };

  // Inventory API methods
  inventory = {
    getLots: async (params = {}) => {
      return this.get('/inventory/lots', params);
    },

    getLot: async (id) => {
      return this.get(`/inventory/lots/${id}`);
    },

    createLot: async (lotData) => {
      return this.post('/inventory/lots', lotData);
    },

    updateLot: async (id, lotData) => {
      return this.put(`/inventory/lots/${id}`, lotData);
    },

    deleteLot: async (id) => {
      return this.delete(`/inventory/lots/${id}`);
    },

    getTransactions: async (params = {}) => {
      return this.get('/inventory/transactions', params);
    },

    createTransaction: async (transactionData) => {
      return this.post('/inventory/transactions', transactionData);
    }
  };

  // Parts API methods
  parts = {
    getAll: async (params = {}) => {
      return this.get('/parts', params);
    },

    getById: async (id) => {
      return this.get(`/parts/${id}`);
    },

    create: async (partData) => {
      return this.post('/parts', partData);
    },

    update: async (id, partData) => {
      return this.put(`/parts/${id}`, partData);
    },

    delete: async (id) => {
      return this.delete(`/parts/${id}`);
    },

    search: async (query, params = {}) => {
      return this.get('/parts', { search: query, ...params });
    }
  };

  // Customers API methods
  customers = {
    getAll: async (params = {}) => {
      return this.get('/customers', params);
    },

    getById: async (id) => {
      return this.get(`/customers/${id}`);
    },

    create: async (customerData) => {
      return this.post('/customers', customerData);
    },

    update: async (id, customerData) => {
      return this.put(`/customers/${id}`, customerData);
    },

    delete: async (id) => {
      return this.delete(`/customers/${id}`);
    }
  };

  // Preadmission API methods
  preadmission = {
    getAll: async (params = {}) => {
      return this.get('/preadmission', params);
    },

    getById: async (id) => {
      return this.get(`/preadmission/${id}`);
    },

    create: async (preadmissionData) => {
      return this.post('/preadmission', preadmissionData);
    },

    update: async (id, preadmissionData) => {
      return this.put(`/preadmission/${id}`, preadmissionData);
    },

    delete: async (id) => {
      return this.delete(`/preadmission/${id}`);
    },

    updateStatus: async (id, status, notes = '') => {
      return this.put(`/preadmission/${id}`, { status, notes });
    }
  };

  // Preshipment API methods
  preshipments = {
    getAll: async (params = {}) => {
      return this.get('/preshipments', params);
    },

    getById: async (id) => {
      return this.get(`/preshipments/${id}`);
    },

    create: async (preshipmentData) => {
      return this.post('/preshipments', preshipmentData);
    },

    update: async (id, preshipmentData) => {
      return this.put(`/preshipments/${id}`, preshipmentData);
    },

    delete: async (id) => {
      return this.delete(`/preshipments/${id}`);
    },

    updateStatus: async (id, status, notes = '') => {
      return this.put(`/preshipments/${id}`, { status, notes });
    },

    generateEntryS: async (id) => {
      // Note: /preshipments/:id/generate-entry-summary endpoint does not exist
      console.warn('preshipments.generateEntryS: /preshipments/:id/generate-entry-summary endpoint not implemented');
      return {
        success: false,
        error: 'Entry summary generation not implemented',
        message: 'This feature is planned for future development'
      };
    },

    fileWithCBP: async (id) => {
      // CRITICAL SECURITY: Block mock CBP operations to prevent customs regulation violations
      const error = new Error(
        'BLOCKED: Mock CBP filing operations are not permitted. ' +
        'This operation has been disabled to prevent customs regulation violations. ' +
        'Contact your system administrator to implement proper CBP integration.'
      );
      error.code = 'CBP_MOCK_BLOCKED';
      error.severity = 'CRITICAL';
      
      console.error('SECURITY BLOCK: Attempted preshipment CBP filing with mock implementation', { 
        preshipmentId: id, 
        timestamp: new Date().toISOString(),
        reason: 'Preventing customs regulation violations'
      });
      
      throw error;
    },

    validateACEEntry: async (entryData) => {
      // Note: /preshipments/validate-ace-entry endpoint does not exist
      console.warn('preshipments.validateACEEntry: /preshipments/validate-ace-entry endpoint not implemented');
      return {
        success: false,
        error: 'ACE entry validation not implemented',
        message: 'ACE validation system is planned for future development'
      };
    },

    getStats: async () => {
      // Note: /preshipments/stats/dashboard endpoint does not exist - using regular preshipments list
      console.warn('preshipments.getStats: /preshipments/stats/dashboard endpoint not implemented, generating basic stats from /preshipments');
      try {
        const preshipments = await this.get('/preshipments');
        if (preshipments.success && preshipments.data) {
          const data = preshipments.data;
          return {
            success: true,
            data: {
              total: data.length,
              pending: data.filter(p => p.status === 'pending').length,
              completed: data.filter(p => p.status === 'completed').length,
              in_progress: data.filter(p => p.status === 'in_progress').length
            }
          };
        }
        return { success: true, data: { total: 0, pending: 0, completed: 0, in_progress: 0 } };
      } catch (error) {
        return { success: false, error: error.message };
      }
    }
  };

  // Materials API methods
  materials = {
    getAll: async (params = {}) => {
      return this.get('/materials', params);
    },

    getById: async (id) => {
      return this.get(`/materials/${id}`);
    },

    create: async (materialData) => {
      return this.post('/materials', materialData);
    },

    update: async (id, materialData) => {
      return this.put(`/materials/${id}`, materialData);
    },

    delete: async (id) => {
      return this.delete(`/materials/${id}`);
    },

    search: async (query, params = {}) => {
      return this.get('/materials', { search: query, ...params });
    }
  };

  // Suppliers API methods
  suppliers = {
    getAll: async (params = {}) => {
      return this.get('/suppliers', params);
    },

    getById: async (id) => {
      return this.get(`/suppliers/${id}`);
    },

    create: async (supplierData) => {
      return this.post('/suppliers', supplierData);
    },

    update: async (id, supplierData) => {
      return this.put(`/suppliers/${id}`, supplierData);
    },

    delete: async (id) => {
      return this.delete(`/suppliers/${id}`);
    },

    search: async (query, params = {}) => {
      return this.get('/suppliers', { search: query, ...params });
    }
  };

  // Storage Locations API methods  
  locations = {
    getAll: async (params = {}) => {
      return this.get('/locations', params);
    },

    getById: async (id) => {
      return this.get(`/locations/${id}`);
    },

    create: async (locationData) => {
      return this.post('/locations', locationData);
    },

    update: async (id, locationData) => {
      return this.put(`/locations/${id}`, locationData);
    },

    delete: async (id) => {
      return this.delete(`/locations/${id}`);
    },

    search: async (query, params = {}) => {
      // Note: /locations/search endpoint does not exist - using main locations endpoint with filter
      console.warn('locations.search: /locations/search endpoint not implemented, using /locations with filter');
      return this.get('/locations', { search: query, ...params });
    }
  };

  // Dashboard API methods
  dashboard = {
    getStats: async () => {
      return this.get('/dashboard/stats');
    },

    getInventorySummary: async () => {
      return this.get('/dashboard/inventory-summary');
    },

    getRecentActivity: async (params = {}) => {
      return this.get('/dashboard/recent-activity', params);
    },

    getAlerts: async () => {
      return this.get('/dashboard/alerts');
    },

    getPerformanceMetrics: async (params = {}) => {
      // Note: /dashboard/performance endpoint does not exist - generating basic metrics
      console.warn('dashboard.getPerformanceMetrics: /dashboard/performance endpoint not implemented, returning placeholder metrics');
      return {
        success: true,
        data: {
          responseTime: Math.floor(Math.random() * 100) + 50,
          throughput: Math.floor(Math.random() * 1000) + 500,
          errorRate: Math.random() * 5,
          uptime: 99.5 + Math.random() * 0.5,
          message: 'Placeholder metrics - real performance monitoring not implemented'
        }
      };
    }
  };

  // Utility methods
  utils = {
    healthCheck: async () => {
      return this.get('/health');
    },

    getApiInfo: async () => {
      return this.get('/');
    }
  };
}

// Create singleton instance
const apiClient = new ApiClient();

// Initialize from localStorage on app start
apiClient.initialize();

export default apiClient;

// Export individual API groups for convenience
export const { auth, inventory, parts, customers, materials, suppliers, locations, preadmission, preshipments, dashboard, utils } = apiClient;