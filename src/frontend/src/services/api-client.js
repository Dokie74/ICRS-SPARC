// src/frontend/services/api-client.js
// Centralized API client service for ICRS SPARC frontend
// Replaces direct Supabase calls with standardized backend API integration

class ApiClient {
  constructor() {
    // Intelligent API URL detection for different environments
    this.baseURL = this.getBaseURL();
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

  // Intelligent API URL detection for different environments
  getBaseURL() {
    // If explicitly set via environment variable, use it
    if (process.env.REACT_APP_API_URL) {
      return process.env.REACT_APP_API_URL;
    }

    // For production/deployment, use relative API path
    if (process.env.NODE_ENV === 'production' || window.location.hostname !== 'localhost') {
      return '/api';
    }

    // For local development, use localhost backend
    return 'http://localhost:5001';
  }

  // Set authentication token with secure storage
  setToken(token, persistent = false) {
    this.token = token;
    if (token) {
      if (persistent) {
        // Only use localStorage if user explicitly wants to stay logged in
        localStorage.setItem('icrs_auth_token', token);
        sessionStorage.removeItem('icrs_auth_token');
      } else {
        // Default to sessionStorage for better security
        sessionStorage.setItem('icrs_auth_token', token);
        localStorage.removeItem('icrs_auth_token');
      }
    } else {
      // Clear both storage types
      localStorage.removeItem('icrs_auth_token');
      sessionStorage.removeItem('icrs_auth_token');
    }
  }

  // Set current user with secure storage
  setUser(user, persistent = false) {
    this.user = user;
    if (user) {
      const userData = JSON.stringify(user);
      if (persistent) {
        localStorage.setItem('icrs_user', userData);
        sessionStorage.removeItem('icrs_user');
      } else {
        sessionStorage.setItem('icrs_user', userData);
        localStorage.removeItem('icrs_user');
      }
    } else {
      localStorage.removeItem('icrs_user');
      sessionStorage.removeItem('icrs_user');
    }
  }

  // Get current user from secure storage
  getCurrentUser() {
    if (!this.user) {
      // Try sessionStorage first, then localStorage as fallback
      let storedUser = sessionStorage.getItem('icrs_user') || localStorage.getItem('icrs_user');
      this.user = storedUser ? JSON.parse(storedUser) : null;
    }
    return this.user;
  }

  // Initialize from secure storage
  initialize() {
    // Try sessionStorage first, then localStorage as fallback
    const token = sessionStorage.getItem('icrs_auth_token') || localStorage.getItem('icrs_auth_token');
    const user = sessionStorage.getItem('icrs_user') || localStorage.getItem('icrs_user');

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
        this.setToken(result.data.session.access_token);
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
        this.setToken(result.data.session.access_token);
        this.setUser(result.data.user);
      }
      return result;
    },

    getProfile: async () => {
      return this.get('/auth/profile');
    },

    updateProfile: async (profileData) => {
      return this.put('/auth/profile', profileData);
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
      return this.get('/parts/search', { q: query, ...params });
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
      return this.put(`/preadmission/${id}/status`, { status, notes });
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
      return this.get('/dashboard/performance', params);
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
export const { auth, inventory, parts, customers, preadmission, dashboard, utils } = apiClient;