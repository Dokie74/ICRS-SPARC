// src/frontend/contexts/AuthContext.js
// Authentication context for ICRS SPARC frontend
// Manages user authentication state and permissions

import React, { createContext, useContext, useReducer, useEffect } from 'react';
import apiClient from '../services/api-client';
import toast from 'react-hot-toast';

// Initial state
const initialState = {
  user: null,
  isAuthenticated: false,
  loading: true,
  permissions: [],
  employee: null,
  error: null
};

// Action types
const AUTH_ACTIONS = {
  SET_LOADING: 'SET_LOADING',
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_ERROR: 'LOGIN_ERROR',
  LOGOUT: 'LOGOUT',
  SET_USER: 'SET_USER',
  SET_PERMISSIONS: 'SET_PERMISSIONS',
  SET_EMPLOYEE: 'SET_EMPLOYEE',
  CLEAR_ERROR: 'CLEAR_ERROR'
};

// Auth reducer
const authReducer = (state, action) => {
  switch (action.type) {
    case AUTH_ACTIONS.SET_LOADING:
      return {
        ...state,
        loading: action.payload
      };

    case AUTH_ACTIONS.LOGIN_SUCCESS:
      return {
        ...state,
        user: action.payload.user,
        isAuthenticated: true,
        loading: false,
        error: null
      };

    case AUTH_ACTIONS.LOGIN_ERROR:
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        loading: false,
        error: action.payload,
        permissions: [],
        employee: null
      };

    case AUTH_ACTIONS.LOGOUT:
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        loading: false,
        permissions: [],
        employee: null,
        error: null
      };

    case AUTH_ACTIONS.SET_USER:
      return {
        ...state,
        user: action.payload,
        isAuthenticated: !!action.payload,
        loading: false
      };

    case AUTH_ACTIONS.SET_PERMISSIONS:
      return {
        ...state,
        permissions: action.payload || []
      };

    case AUTH_ACTIONS.SET_EMPLOYEE:
      return {
        ...state,
        employee: action.payload
      };

    case AUTH_ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        error: null
      };

    default:
      return state;
  }
};

// Create context
const AuthContext = createContext(null);

// Auth provider component
export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Initialize authentication state
  useEffect(() => {
    initializeAuth();
  }, []);

  // Initialize auth state from stored token
  const initializeAuth = async () => {
    try {
      const currentUser = apiClient.getCurrentUser();
      const token = localStorage.getItem('icrs_auth_token');

      if (token && currentUser) {
        // For demo mode, just verify user exists and restore session
        try {
          dispatch({
            type: AUTH_ACTIONS.LOGIN_SUCCESS,
            payload: { user: currentUser }
          });
          await loadUserPermissions(currentUser);
        } catch (error) {
          // Token is invalid, clear it
          localStorage.removeItem('icrs_auth_token');
          localStorage.removeItem('icrs_user');
          apiClient.setToken(null);
          apiClient.setUser(null);
          dispatch({ type: AUTH_ACTIONS.LOGOUT });
        }
      } else {
        dispatch({ type: AUTH_ACTIONS.LOGOUT });
      }
    } catch (error) {
      console.error('Auth initialization error:', error);
      dispatch({ type: AUTH_ACTIONS.LOGOUT });
    } finally {
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false });
    }
  };

  // Load user permissions and employee data
  const loadUserPermissions = async (user) => {
    try {
      // For demo mode, use role from user metadata
      // In production, this would load from /api/auth/permissions
      const role = user.user_metadata?.role || user.role || 'warehouse_staff';
      const permissions = getPermissionsFromRole(role);
      
      dispatch({
        type: AUTH_ACTIONS.SET_PERMISSIONS,
        payload: permissions
      });
      
      // Create basic employee record from user data for demo
      dispatch({
        type: AUTH_ACTIONS.SET_EMPLOYEE,
        payload: {
          first_name: user.user_metadata?.full_name?.split(' ')[0] || 'Demo',
          last_name: user.user_metadata?.full_name?.split(' ').slice(1).join(' ') || 'User',
          role: role
        }
      });
    } catch (error) {
      console.warn('Could not load user permissions:', error);
      dispatch({ type: AUTH_ACTIONS.SET_PERMISSIONS, payload: [] });
    }
  };
  
  // Helper function to get permissions from role
  const getPermissionsFromRole = (role) => {
    const rolePermissions = {
      admin: ['admin', 'manager', 'warehouse_staff'],
      manager: ['manager', 'warehouse_staff'],
      warehouse_staff: ['warehouse_staff']
    };
    return rolePermissions[role] || ['warehouse_staff'];
  };

  // Login function
  const login = async (email, password) => {
    dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: true });
    dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR });

    try {
      const result = await apiClient.auth.login(email, password);
      
      if (result.success) {
        dispatch({
          type: AUTH_ACTIONS.LOGIN_SUCCESS,
          payload: { user: result.data.user }
        });
        
        await loadUserPermissions(result.data.user);
        
        toast.success('Login successful');
        return { success: true };
      } else {
        throw new Error(result.error || 'Login failed');
      }
    } catch (error) {
      const errorMessage = error.message || 'Login failed. Please try again.';
      dispatch({
        type: AUTH_ACTIONS.LOGIN_ERROR,
        payload: errorMessage
      });
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // Logout function
  const logout = async () => {
    try {
      await apiClient.auth.logout();
    } catch (error) {
      console.warn('Logout API call failed:', error);
    } finally {
      dispatch({ type: AUTH_ACTIONS.LOGOUT });
      toast.success('Logged out successfully');
    }
  };

  // Register function
  const register = async (userData) => {
    dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: true });
    dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR });

    try {
      const result = await apiClient.auth.register(userData);
      
      if (result.success) {
        toast.success('Registration successful. Please login.');
        return { success: true };
      } else {
        throw new Error(result.error || 'Registration failed');
      }
    } catch (error) {
      const errorMessage = error.message || 'Registration failed. Please try again.';
      dispatch({
        type: AUTH_ACTIONS.LOGIN_ERROR,
        payload: errorMessage
      });
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false });
    }
  };

  // Update profile function
  const updateProfile = async (profileData) => {
    try {
      const result = await apiClient.auth.updateProfile(profileData);
      
      if (result.success) {
        dispatch({
          type: AUTH_ACTIONS.SET_USER,
          payload: result.data
        });
        toast.success('Profile updated successfully');
        return { success: true };
      } else {
        throw new Error(result.error || 'Profile update failed');
      }
    } catch (error) {
      const errorMessage = error.message || 'Profile update failed';
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // Check if user has specific permission
  const hasPermission = (permission) => {
    if (!state.isAuthenticated || !state.user) return false;
    
    // Admin has all permissions
    if (state.user.role === 'admin') return true;
    
    // Check specific permissions
    if (Array.isArray(state.permissions)) {
      return state.permissions.includes(permission);
    }
    
    // Fallback to role-based permissions
    const rolePermissions = {
      admin: ['admin', 'manager', 'warehouse_staff'],
      manager: ['manager', 'warehouse_staff'],
      warehouse_staff: ['warehouse_staff']
    };
    
    const userRole = state.user.role || 'warehouse_staff';
    return rolePermissions[userRole]?.includes(permission) || false;
  };

  // Check if user has any of the specified roles
  const hasAnyRole = (roles) => {
    if (!state.isAuthenticated || !state.user) return false;
    
    if (typeof roles === 'string') {
      roles = [roles];
    }
    
    return roles.some(role => hasPermission(role));
  };

  // Get user display name
  const getUserDisplayName = () => {
    if (!state.user) return '';
    
    if (state.employee) {
      return `${state.employee.first_name} ${state.employee.last_name}`.trim() || state.user.email;
    }
    
    return state.user.email;
  };

  // Context value
  const value = {
    // State
    user: state.user,
    isAuthenticated: state.isAuthenticated,
    loading: state.loading,
    permissions: state.permissions,
    employee: state.employee,
    error: state.error,
    
    // Actions
    login,
    logout,
    register,
    updateProfile,
    
    // Utility functions
    hasPermission,
    hasAnyRole,
    getUserDisplayName,
    clearError: () => dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR })
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
};

// HOC for components that require authentication
export const withAuth = (Component, requiredPermission = null) => {
  return function AuthenticatedComponent(props) {
    const { isAuthenticated, hasPermission, loading } = useAuth();
    
    if (loading) {
      return <div>Loading...</div>;
    }
    
    if (!isAuthenticated) {
      return <div>Please log in to access this page.</div>;
    }
    
    if (requiredPermission && !hasPermission(requiredPermission)) {
      return <div>You don't have permission to access this page.</div>;
    }
    
    return <Component {...props} />;
  };
};

export default AuthContext;