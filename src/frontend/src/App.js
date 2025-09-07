// src/frontend/App.js
// Main React application for ICRS SPARC frontend
// Provides routing, authentication, and global state management

import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';

// Context providers
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AppProvider, useApp } from './contexts/AppContext';

// Components
import ErrorBoundary from './components/shared/ErrorBoundary';
import LoadingSpinner from './components/shared/LoadingSpinner';
import Sidebar from './components/shared/Sidebar';
import ModalContainer from './components/modals/ModalContainer';

// Pages
import Login from './components/pages/Login';
import Dashboard from './components/pages/Dashboard';
import Inventory from './components/pages/Inventory';
import PreAdmissions from './components/pages/PreAdmissions';
import PreShipments from './components/pages/PreShipments';
import Shipping from './components/pages/Shipping';
import Receiving from './components/pages/Receiving';
import Parts from './components/pages/Parts';
import Reports from './components/pages/Reports';
import Admin from './components/pages/Admin';
import HTSBrowser from './components/pages/HTSBrowser';
import EntrySummaryGroups from './components/pages/EntrySummaryGroups';

// Styles
import './styles/index.css';

// Create React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        // Don't retry on authentication errors
        if (error?.status === 401) return false;
        return failureCount < 3;
      },
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
    mutations: {
      retry: (failureCount, error) => {
        if (error?.status === 401) return false;
        return failureCount < 1;
      }
    }
  }
});

// Protected Route component
const ProtectedRoute = ({ children, requiredRole = null }) => {
  const { user, isAuthenticated, loading, hasPermission } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && !hasPermission(requiredRole)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  return children;
};

// Main layout component
const AppLayout = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
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
        {/* Mobile header */}
        <div className="md:hidden flex items-center justify-between p-4 bg-white border-b">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <h1 className="text-lg font-semibold text-gray-900">ICRS SPARC</h1>
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

// Data loader component that handles post-auth initialization
const AuthDataLoader = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  const { initializeApp } = useApp();
  
  useEffect(() => {
    if (isAuthenticated && user) {
      // Load app data after successful authentication
      initializeApp();
    }
  }, [isAuthenticated, user, initializeApp]);
  
  return children;
};

// Main App component
const App = () => {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <AppProvider>
            <AuthDataLoader>
              <Router
                future={{
                  v7_startTransition: true,
                  v7_relativeSplatPath: true
                }}
              >
              <AppLayout>
                <Routes>
                  {/* Public routes */}
                  <Route path="/login" element={<Login />} />
                  
                  {/* Protected routes */}
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
                      <ProtectedRoute>
                        <Dashboard />
                      </ProtectedRoute>
                    } 
                  />
                  
                  <Route 
                    path="/inventory" 
                    element={
                      <ProtectedRoute>
                        <Inventory />
                      </ProtectedRoute>
                    } 
                  />
                  
                  <Route 
                    path="/preadmissions" 
                    element={
                      <ProtectedRoute>
                        <PreAdmissions />
                      </ProtectedRoute>
                    } 
                  />
                  
                  <Route 
                    path="/preshipments" 
                    element={
                      <ProtectedRoute>
                        <PreShipments />
                      </ProtectedRoute>
                    } 
                  />
                  
                  <Route 
                    path="/shipping" 
                    element={
                      <ProtectedRoute>
                        <Shipping />
                      </ProtectedRoute>
                    } 
                  />
                  
                  <Route 
                    path="/receiving" 
                    element={
                      <ProtectedRoute>
                        <Receiving />
                      </ProtectedRoute>
                    } 
                  />
                  
                  <Route 
                    path="/parts" 
                    element={
                      <ProtectedRoute>
                        <Parts />
                      </ProtectedRoute>
                    } 
                  />
                  
                  
                  <Route 
                    path="/hts-browser" 
                    element={
                      <ProtectedRoute>
                        <HTSBrowser />
                      </ProtectedRoute>
                    } 
                  />
                  
                  <Route 
                    path="/entry-summary-groups" 
                    element={
                      <ProtectedRoute requiredRole="manager">
                        <EntrySummaryGroups />
                      </ProtectedRoute>
                    } 
                  />
                  
                  <Route 
                    path="/reports" 
                    element={
                      <ProtectedRoute requiredRole="manager">
                        <Reports />
                      </ProtectedRoute>
                    } 
                  />
                  
                  <Route 
                    path="/admin" 
                    element={
                      <ProtectedRoute requiredRole="admin">
                        <Admin />
                      </ProtectedRoute>
                    } 
                  />
                  
                  {/* Catch-all route */}
                  <Route 
                    path="*" 
                    element={
                      <div className="flex items-center justify-center min-h-screen">
                        <div className="text-center">
                          <h2 className="text-2xl font-bold text-gray-900 mb-4">Page Not Found</h2>
                          <p className="text-gray-600 mb-4">The page you're looking for doesn't exist.</p>
                          <a href="/dashboard" className="text-blue-600 hover:text-blue-500">
                            Go to Dashboard
                          </a>
                        </div>
                      </div>
                    } 
                  />
                </Routes>
              </AppLayout>
              
              {/* Global toast notifications */}
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
                }}
              />
              
              {/* Modal System */}
              <ModalContainer />
            </Router>
            </AuthDataLoader>
          </AppProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;