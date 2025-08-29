// src/frontend/contexts/AppContext.js
// Application context for ICRS SPARC frontend
// Manages global app state, notifications, and shared data

import React, { createContext, useContext, useReducer, useEffect } from 'react';
import apiClient from '../services/api-client';
import toast from 'react-hot-toast';

// Initial state
const initialState = {
  // UI state
  sidebarCollapsed: false,
  darkMode: false,
  
  // Data loading states
  loading: {
    customers: false,
    parts: false,
    locations: false,
    suppliers: false
  },
  
  // Cached reference data
  customers: [],
  parts: [],
  locations: [],
  suppliers: [],
  materials: [],
  
  // App settings
  settings: {
    dateFormat: 'MM/dd/yyyy',
    currency: 'USD',
    timezone: 'America/New_York',
    itemsPerPage: 25
  },
  
  // Real-time data
  dashboardStats: null,
  notifications: [],
  alerts: [],
  
  // Error state
  errors: {}
};

// Action types
const APP_ACTIONS = {
  SET_LOADING: 'SET_LOADING',
  SET_SIDEBAR_COLLAPSED: 'SET_SIDEBAR_COLLAPSED',
  SET_DARK_MODE: 'SET_DARK_MODE',
  SET_CUSTOMERS: 'SET_CUSTOMERS',
  SET_PARTS: 'SET_PARTS',
  SET_LOCATIONS: 'SET_LOCATIONS',
  SET_SUPPLIERS: 'SET_SUPPLIERS',
  SET_MATERIALS: 'SET_MATERIALS',
  SET_DASHBOARD_STATS: 'SET_DASHBOARD_STATS',
  ADD_NOTIFICATION: 'ADD_NOTIFICATION',
  REMOVE_NOTIFICATION: 'REMOVE_NOTIFICATION',
  SET_ALERTS: 'SET_ALERTS',
  SET_ERROR: 'SET_ERROR',
  CLEAR_ERROR: 'CLEAR_ERROR',
  UPDATE_SETTINGS: 'UPDATE_SETTINGS'
};

// App reducer
const appReducer = (state, action) => {
  switch (action.type) {
    case APP_ACTIONS.SET_LOADING:
      return {
        ...state,
        loading: {
          ...state.loading,
          [action.payload.key]: action.payload.value
        }
      };

    case APP_ACTIONS.SET_SIDEBAR_COLLAPSED:
      return {
        ...state,
        sidebarCollapsed: action.payload
      };

    case APP_ACTIONS.SET_DARK_MODE:
      return {
        ...state,
        darkMode: action.payload
      };

    case APP_ACTIONS.SET_CUSTOMERS:
      return {
        ...state,
        customers: action.payload
      };

    case APP_ACTIONS.SET_PARTS:
      return {
        ...state,
        parts: action.payload
      };

    case APP_ACTIONS.SET_LOCATIONS:
      return {
        ...state,
        locations: action.payload
      };

    case APP_ACTIONS.SET_SUPPLIERS:
      return {
        ...state,
        suppliers: action.payload
      };

    case APP_ACTIONS.SET_MATERIALS:
      return {
        ...state,
        materials: action.payload
      };

    case APP_ACTIONS.SET_DASHBOARD_STATS:
      return {
        ...state,
        dashboardStats: action.payload
      };

    case APP_ACTIONS.ADD_NOTIFICATION:
      return {
        ...state,
        notifications: [...state.notifications, action.payload]
      };

    case APP_ACTIONS.REMOVE_NOTIFICATION:
      return {
        ...state,
        notifications: state.notifications.filter(n => n.id !== action.payload)
      };

    case APP_ACTIONS.SET_ALERTS:
      return {
        ...state,
        alerts: action.payload
      };

    case APP_ACTIONS.SET_ERROR:
      return {
        ...state,
        errors: {
          ...state.errors,
          [action.payload.key]: action.payload.error
        }
      };

    case APP_ACTIONS.CLEAR_ERROR:
      const { [action.payload]: removed, ...remainingErrors } = state.errors;
      return {
        ...state,
        errors: remainingErrors
      };

    case APP_ACTIONS.UPDATE_SETTINGS:
      return {
        ...state,
        settings: {
          ...state.settings,
          ...action.payload
        }
      };

    default:
      return state;
  }
};

// Create context
const AppContext = createContext(null);

// App provider component
export const AppProvider = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Initialize app data
  useEffect(() => {
    initializeApp();
  }, []);

  // Load user preferences from localStorage
  useEffect(() => {
    const savedSettings = localStorage.getItem('icrs_app_settings');
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings);
        dispatch({
          type: APP_ACTIONS.UPDATE_SETTINGS,
          payload: settings
        });
      } catch (error) {
        console.warn('Could not load saved settings:', error);
      }
    }

    const darkMode = localStorage.getItem('icrs_dark_mode') === 'true';
    dispatch({
      type: APP_ACTIONS.SET_DARK_MODE,
      payload: darkMode
    });

    const sidebarCollapsed = localStorage.getItem('icrs_sidebar_collapsed') === 'true';
    dispatch({
      type: APP_ACTIONS.SET_SIDEBAR_COLLAPSED,
      payload: sidebarCollapsed
    });
  }, []);

  // Save settings to localStorage when they change
  useEffect(() => {
    localStorage.setItem('icrs_app_settings', JSON.stringify(state.settings));
  }, [state.settings]);

  useEffect(() => {
    localStorage.setItem('icrs_dark_mode', state.darkMode.toString());
  }, [state.darkMode]);

  useEffect(() => {
    localStorage.setItem('icrs_sidebar_collapsed', state.sidebarCollapsed.toString());
  }, [state.sidebarCollapsed]);

  // Initialize app
  const initializeApp = async () => {
    try {
      // Load reference data in parallel
      await Promise.all([
        loadCustomers(),
        loadParts(),
        loadLocations(),
        loadMaterials()
      ]);
    } catch (error) {
      console.error('App initialization error:', error);
    }
  };

  // Load customers
  const loadCustomers = async () => {
    dispatch({ type: APP_ACTIONS.SET_LOADING, payload: { key: 'customers', value: true } });
    
    try {
      const result = await apiClient.customers.getAll({ limit: 1000, active: true });
      if (result.success) {
        dispatch({ type: APP_ACTIONS.SET_CUSTOMERS, payload: result.data });
      }
    } catch (error) {
      console.error('Error loading customers:', error);
      dispatch({ 
        type: APP_ACTIONS.SET_ERROR, 
        payload: { key: 'customers', error: error.message } 
      });
    } finally {
      dispatch({ type: APP_ACTIONS.SET_LOADING, payload: { key: 'customers', value: false } });
    }
  };

  // Load parts
  const loadParts = async () => {
    dispatch({ type: APP_ACTIONS.SET_LOADING, payload: { key: 'parts', value: true } });
    
    try {
      const result = await apiClient.parts.getAll({ limit: 1000, active: true });
      if (result.success) {
        dispatch({ type: APP_ACTIONS.SET_PARTS, payload: result.data });
      }
    } catch (error) {
      console.error('Error loading parts:', error);
      dispatch({ 
        type: APP_ACTIONS.SET_ERROR, 
        payload: { key: 'parts', error: error.message } 
      });
    } finally {
      dispatch({ type: APP_ACTIONS.SET_LOADING, payload: { key: 'parts', value: false } });
    }
  };

  // Load locations
  const loadLocations = async () => {
    dispatch({ type: APP_ACTIONS.SET_LOADING, payload: { key: 'locations', value: true } });
    
    try {
      const result = await apiClient.get('/api/locations', { limit: 1000, active: true });
      if (result.success) {
        dispatch({ type: APP_ACTIONS.SET_LOCATIONS, payload: result.data });
      }
    } catch (error) {
      console.error('Error loading locations:', error);
      dispatch({ 
        type: APP_ACTIONS.SET_ERROR, 
        payload: { key: 'locations', error: error.message } 
      });
    } finally {
      dispatch({ type: APP_ACTIONS.SET_LOADING, payload: { key: 'locations', value: false } });
    }
  };

  // Load materials
  const loadMaterials = async () => {
    try {
      const result = await apiClient.get('/api/materials');
      if (result.success) {
        dispatch({ type: APP_ACTIONS.SET_MATERIALS, payload: result.data });
      }
    } catch (error) {
      console.error('Error loading materials:', error);
    }
  };

  // Load dashboard stats
  const loadDashboardStats = async () => {
    try {
      const result = await apiClient.dashboard.getStats();
      if (result.success) {
        dispatch({ type: APP_ACTIONS.SET_DASHBOARD_STATS, payload: result.data });
      }
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
    }
  };

  // Toggle sidebar
  const toggleSidebar = () => {
    dispatch({
      type: APP_ACTIONS.SET_SIDEBAR_COLLAPSED,
      payload: !state.sidebarCollapsed
    });
  };

  // Toggle dark mode
  const toggleDarkMode = () => {
    dispatch({
      type: APP_ACTIONS.SET_DARK_MODE,
      payload: !state.darkMode
    });
  };

  // Update settings
  const updateSettings = (newSettings) => {
    dispatch({
      type: APP_ACTIONS.UPDATE_SETTINGS,
      payload: newSettings
    });
  };

  // Add notification
  const addNotification = (notification) => {
    const id = Date.now() + Math.random();
    const notificationWithId = { ...notification, id };
    
    dispatch({
      type: APP_ACTIONS.ADD_NOTIFICATION,
      payload: notificationWithId
    });

    // Auto-remove notification after specified duration
    if (notification.duration !== 0) {
      setTimeout(() => {
        removeNotification(id);
      }, notification.duration || 5000);
    }

    return id;
  };

  // Remove notification
  const removeNotification = (id) => {
    dispatch({
      type: APP_ACTIONS.REMOVE_NOTIFICATION,
      payload: id
    });
  };

  // Show success notification
  const showSuccess = (message, options = {}) => {
    toast.success(message);
    return addNotification({
      type: 'success',
      message,
      ...options
    });
  };

  // Show error notification
  const showError = (message, options = {}) => {
    toast.error(message);
    return addNotification({
      type: 'error',
      message,
      ...options
    });
  };

  // Show info notification
  const showInfo = (message, options = {}) => {
    toast(message);
    return addNotification({
      type: 'info',
      message,
      ...options
    });
  };

  // Refresh data
  const refreshData = async (dataType) => {
    switch (dataType) {
      case 'customers':
        return loadCustomers();
      case 'parts':
        return loadParts();
      case 'locations':
        return loadLocations();
      case 'dashboard':
        return loadDashboardStats();
      case 'all':
        return initializeApp();
      default:
        console.warn(`Unknown data type: ${dataType}`);
    }
  };

  // Clear error
  const clearError = (key) => {
    dispatch({
      type: APP_ACTIONS.CLEAR_ERROR,
      payload: key
    });
  };

  // Context value
  const value = {
    // State
    ...state,
    
    // Actions
    toggleSidebar,
    toggleDarkMode,
    updateSettings,
    addNotification,
    removeNotification,
    showSuccess,
    showError,
    showInfo,
    refreshData,
    clearError,
    loadDashboardStats
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

// Custom hook to use app context
export const useApp = () => {
  const context = useContext(AppContext);
  
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  
  return context;
};

export default AppContext;