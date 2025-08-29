// Enhanced Main React application for ICRS SPARC frontend
// Integrates modern patterns: lazy loading, enhanced state management, real-time updates, and comprehensive error handling

import React, { useEffect, useState, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { ReactQueryDevtools } from 'react-query/devtools';
import { Toaster } from 'react-hot-toast';

// Context providers
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AppProvider } from './contexts/AppContext';

// Enhanced components
import EnhancedErrorBoundary, { RouteErrorBoundary } from './components/shared/EnhancedErrorBoundary';
import { PageSkeleton } from './components/shared/LoadingStates';
import Sidebar from './components/shared/Sidebar';

// Lazy-loaded route components
import {
  LazyLogin,
  LazyDashboard,
  LazyInventory,
  LazyPreAdmissions,
  LazyPreShipments,
  LazyParts,
  LazyCustomers,
  LazyHTSBrowser,
  LazyEntrySummaryGroups,
  LazyReports,
  LazyAdmin,
  preloadCriticalRoutes
} from './components/shared/LazyRouteComponents';

// State management
import { useAppStore } from './stores/useAppStore';
import realtimeService from './services/RealtimeService';

// Hooks
import { usePageRealtimeUpdates, useRealtimeConnectionStatus } from './hooks/useRealtimeSubscription';

// Styles
import './styles/index.css';

// Enhanced React Query client with improved configuration
const createQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        // Don't retry on authentication errors
        if (error?.response?.status === 401 || error?.response?.status === 403) {
          return false;
        }
        return failureCount < 3;
      },
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      onError: (error) => {
        console.error('Query error:', error);
        // Error notifications are handled by useEnhancedQuery
      }
    },
    mutations: {
      retry: (failureCount, error) => {
        if (error?.response?.status === 401 || error?.response?.status === 403) {
          return false;
        }
        return failureCount < 2;
      },
      onError: (error) => {
        console.error('Mutation error:', error);
        // Error notifications are handled by useEnhancedMutation
      }
    }
  }
});

// Enhanced Protected Route component with role-based access
const ProtectedRoute = ({ children, requiredRole = null, preloadRoutes = [] }) => {
  const { user, isAuthenticated, loading, hasPermission } = useAuth();
  const { ui } = useAppStore();

  // Preload related routes on component mount
  useEffect(() => {
    preloadRoutes.forEach(route => {
      import(`./components/pages/${route}`).catch(() => {});
    });
  }, [preloadRoutes]);

  if (loading) {
    return <PageSkeleton contentType="dashboard" />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && !hasPermission(requiredRole)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md">
          <div className="flex justify-center mb-4">
            <svg className="w-16 h-16 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.728-.833-2.498 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
          <p className="text-gray-600 mb-6">
            You don't have the required permissions to access this page.
            {requiredRole && ` This page requires '${requiredRole}' role.`}
          </p>
          <div className="space-y-3">
            <button
              onClick={() => window.history.back()}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Go Back
            </button>
            <a
              href="/dashboard"
              className="block w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
            >
              Go to Dashboard
            </a>
          </div>
        </div>
      </div>
    );
  }

  return children;
};

// Enhanced layout component with real-time connection status
const AppLayout = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const { ui } = useAppStore();
  const { connectionStatus, isOnline } = useRealtimeConnectionStatus();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!isAuthenticated) {
    return children;
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)}
        user={user}
      />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile header with connection status */}
        <div className="md:hidden flex items-center justify-between p-4 bg-white border-b">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          
          <div className="flex items-center space-x-2">
            <h1 className="text-lg font-semibold text-gray-900">ICRS SPARC</h1>
            {/* Connection status indicator */}
            <div className="flex items-center space-x-1">
              <div className={`w-2 h-2 rounded-full ${
                !isOnline ? 'bg-gray-400' :
                connectionStatus === 'connected' ? 'bg-green-500' :
                connectionStatus === 'connecting' ? 'bg-yellow-500' :
                'bg-red-500'
              }`} />
              {!isOnline && (
                <span className="text-xs text-gray-500">Offline</span>
              )}
            </div>
          </div>
          
          <div className="w-10" /> {/* Spacer */}
        </div>

        {/* Main content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

// Real-time setup component
const RealtimeProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const { realtime } = useAppStore();

  useEffect(() => {
    if (isAuthenticated && user) {
      // Initialize real-time service with user token
      const token = user.access_token || localStorage.getItem('access_token');
      if (token) {
        realtimeService.initialize(token);
      }
    }

    return () => {
      // Cleanup on unmount
      if (!isAuthenticated) {
        realtimeService.disconnect();
      }
    };
  }, [isAuthenticated, user]);

  return children;
};

// Global notification system
const GlobalNotifications = () => {
  const { ui } = useAppStore();

  return (
    <>
      {/* React Hot Toast notifications */}
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            duration: 3000,
            style: {
              background: '#059669',
            },
          },
          error: {
            duration: 5000,
            style: {
              background: '#DC2626',
            },
          },
          loading: {
            style: {
              background: '#3B82F6',
            },
          },
        }}
      />

      {/* Custom notification system overlay */}
      {ui.isOffline && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-yellow-600 text-white text-center py-2 text-sm">
          <div className="flex items-center justify-center space-x-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.728-.833-2.498 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <span>You're currently offline. Some features may not work properly.</span>
          </div>
        </div>
      )}
    </>
  );
};

// Main App component with all enhancements
const EnhancedApp = () => {
  const [queryClient] = useState(() => createQueryClient());

  // Preload critical routes on app startup
  useEffect(() => {
    preloadCriticalRoutes();
  }, []);

  return (
    <EnhancedErrorBoundary
      title="Application Error"
      message="The application encountered an unexpected error. Please refresh the page or contact support if the issue persists."
    >
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <AppProvider>
            <RealtimeProvider>
              <Router>
                <AppLayout>
                  <Suspense fallback={<PageSkeleton contentType="dashboard" />}>
                    <Routes>
                      {/* Public routes */}
                      <Route 
                        path="/login" 
                        element={
                          <RouteErrorBoundary>
                            <LazyLogin />
                          </RouteErrorBoundary>
                        } 
                      />
                      
                      {/* Protected routes with lazy loading */}
                      <Route 
                        path="/" 
                        element={
                          <ProtectedRoute>
                            <Navigate to="/dashboard" replace />
                          </ProtectedRoute>
                        } 
                      />
                      
                      <Route 
                        path="/dashboard" 
                        element={
                          <ProtectedRoute preloadRoutes={['Inventory', 'PreAdmissions']}>
                            <RouteErrorBoundary>
                              <LazyDashboard />
                            </RouteErrorBoundary>
                          </ProtectedRoute>
                        } 
                      />
                      
                      <Route 
                        path="/inventory" 
                        element={
                          <ProtectedRoute preloadRoutes={['Parts']}>
                            <RouteErrorBoundary>
                              <LazyInventory />
                            </RouteErrorBoundary>
                          </ProtectedRoute>
                        } 
                      />
                      
                      <Route 
                        path="/preadmissions" 
                        element={
                          <ProtectedRoute preloadRoutes={['Customers', 'Parts']}>
                            <RouteErrorBoundary>
                              <LazyPreAdmissions />
                            </RouteErrorBoundary>
                          </ProtectedRoute>
                        } 
                      />
                      
                      <Route 
                        path="/preshipments" 
                        element={
                          <ProtectedRoute preloadRoutes={['Inventory']}>
                            <RouteErrorBoundary>
                              <LazyPreShipments />
                            </RouteErrorBoundary>
                          </ProtectedRoute>
                        } 
                      />
                      
                      <Route 
                        path="/parts" 
                        element={
                          <ProtectedRoute preloadRoutes={['HTSBrowser']}>
                            <RouteErrorBoundary>
                              <LazyParts />
                            </RouteErrorBoundary>
                          </ProtectedRoute>
                        } 
                      />
                      
                      <Route 
                        path="/customers" 
                        element={
                          <ProtectedRoute>
                            <RouteErrorBoundary>
                              <LazyCustomers />
                            </RouteErrorBoundary>
                          </ProtectedRoute>
                        } 
                      />
                      
                      <Route 
                        path="/hts-browser" 
                        element={
                          <ProtectedRoute>
                            <RouteErrorBoundary>
                              <LazyHTSBrowser />
                            </RouteErrorBoundary>
                          </ProtectedRoute>
                        } 
                      />
                      
                      <Route 
                        path="/entry-summary-groups" 
                        element={
                          <ProtectedRoute requiredRole="manager">
                            <RouteErrorBoundary>
                              <LazyEntrySummaryGroups />
                            </RouteErrorBoundary>
                          </ProtectedRoute>
                        } 
                      />
                      
                      <Route 
                        path="/reports" 
                        element={
                          <ProtectedRoute requiredRole="manager">
                            <RouteErrorBoundary>
                              <LazyReports />
                            </RouteErrorBoundary>
                          </ProtectedRoute>
                        } 
                      />
                      
                      <Route 
                        path="/admin" 
                        element={
                          <ProtectedRoute requiredRole="admin">
                            <RouteErrorBoundary>
                              <LazyAdmin />
                            </RouteErrorBoundary>
                          </ProtectedRoute>
                        } 
                      />
                      
                      {/* Enhanced 404 page */}
                      <Route 
                        path="*" 
                        element={
                          <div className="flex items-center justify-center min-h-screen bg-gray-50">
                            <div className="text-center max-w-md">
                              <div className="flex justify-center mb-6">
                                <svg className="w-20 h-20 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 20a7.962 7.962 0 01-5-1.709M15 11V9a6 6 0 00-12 0v2" />
                                </svg>
                              </div>
                              <h1 className="text-4xl font-bold text-gray-900 mb-4">404</h1>
                              <h2 className="text-xl font-semibold text-gray-700 mb-4">Page Not Found</h2>
                              <p className="text-gray-600 mb-8">
                                The page you're looking for doesn't exist or has been moved.
                              </p>
                              <div className="space-y-3">
                                <button
                                  onClick={() => window.history.back()}
                                  className="w-full px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                  Go Back
                                </button>
                                <a
                                  href="/dashboard"
                                  className="block w-full px-6 py-3 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
                                >
                                  Go to Dashboard
                                </a>
                              </div>
                            </div>
                          </div>
                        } 
                      />
                    </Routes>
                  </Suspense>
                </AppLayout>
                
                {/* Global notifications */}
                <GlobalNotifications />
              </Router>
            </RealtimeProvider>
          </AppProvider>
        </AuthProvider>
        
        {/* React Query DevTools (only in development) */}
        {process.env.NODE_ENV === 'development' && (
          <ReactQueryDevtools initialIsOpen={false} />
        )}
      </QueryClientProvider>
    </EnhancedErrorBoundary>
  );
};

export default EnhancedApp;