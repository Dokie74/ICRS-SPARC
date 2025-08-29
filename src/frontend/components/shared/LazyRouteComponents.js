// Lazy-loaded route components with proper error handling and loading fallbacks
// Implements code splitting for all major routes with enhanced error boundaries

import React, { lazy, Suspense } from 'react';
import { RouteErrorBoundary } from './EnhancedErrorBoundary';
import LoadingSpinner from './LoadingSpinner';

// Loading fallback components
const RouteLoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="text-center">
      <LoadingSpinner size="large" />
      <p className="mt-4 text-gray-600">Loading page...</p>
    </div>
  </div>
);

const RouteLoadingError = ({ error, retry }) => (
  <div className="flex items-center justify-center min-h-screen bg-gray-50">
    <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6 text-center">
      <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
        <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01" />
        </svg>
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to Load Page</h3>
      <p className="text-sm text-gray-600 mb-4">
        The page failed to load. This might be due to a network error or the page being temporarily unavailable.
      </p>
      <div className="flex gap-2 justify-center">
        <button
          onClick={retry}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Try Again
        </button>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Refresh Page
        </button>
      </div>
    </div>
  </div>
);

// Enhanced lazy loading with error handling
const createLazyComponent = (importFn, componentName) => {
  return lazy(() => 
    importFn().catch(error => {
      console.error(`Failed to load ${componentName}:`, error);
      return {
        default: (props) => (
          <RouteLoadingError 
            error={error}
            retry={() => window.location.reload()}
            {...props}
          />
        )
      };
    })
  );
};

// Higher-order component for lazy routes with enhanced features
const withLazyRoute = (LazyComponent, options = {}) => {
  const {
    fallback = <RouteLoadingSpinner />,
    errorTitle = 'Page Loading Error',
    errorMessage = 'This page failed to load. Please try refreshing or navigate to another page.',
    preloadDelay = 0,
    componentName = 'Unknown'
  } = options;

  const LazyRouteWrapper = (props) => {
    // Preload component on hover/focus if delay is specified
    React.useEffect(() => {
      if (preloadDelay > 0) {
        const timer = setTimeout(() => {
          // Force preload by creating a component instance
          React.createElement(LazyComponent);
        }, preloadDelay);

        return () => clearTimeout(timer);
      }
    }, []);

    return (
      <RouteErrorBoundary
        title={errorTitle}
        message={errorMessage}
        componentName={componentName}
      >
        <Suspense fallback={fallback}>
          <LazyComponent {...props} />
        </Suspense>
      </RouteErrorBoundary>
    );
  };

  LazyRouteWrapper.displayName = `LazyRoute(${componentName})`;
  
  // Add preload method
  LazyRouteWrapper.preload = () => {
    React.createElement(LazyComponent);
  };

  return LazyRouteWrapper;
};

// Lazy-loaded page components
export const LazyDashboard = withLazyRoute(
  createLazyComponent(
    () => import('../pages/Dashboard'),
    'Dashboard'
  ),
  {
    componentName: 'Dashboard',
    errorTitle: 'Dashboard Loading Error',
    errorMessage: 'The dashboard failed to load. Please refresh the page to try again.',
    preloadDelay: 2000 // Preload after 2 seconds
  }
);

export const LazyInventory = withLazyRoute(
  createLazyComponent(
    () => import('../pages/Inventory'),
    'Inventory'
  ),
  {
    componentName: 'Inventory',
    errorTitle: 'Inventory Loading Error',
    errorMessage: 'The inventory page failed to load. Please refresh to try again.'
  }
);

export const LazyPreAdmissions = withLazyRoute(
  createLazyComponent(
    () => import('../pages/PreAdmissions'),
    'PreAdmissions'
  ),
  {
    componentName: 'PreAdmissions',
    errorTitle: 'Pre-Admissions Loading Error',
    errorMessage: 'The pre-admissions page failed to load. Please refresh to try again.'
  }
);

export const LazyPreShipments = withLazyRoute(
  createLazyComponent(
    () => import('../pages/PreShipments'),
    'PreShipments'
  ),
  {
    componentName: 'PreShipments',
    errorTitle: 'Pre-Shipments Loading Error',
    errorMessage: 'The pre-shipments page failed to load. Please refresh to try again.'
  }
);

export const LazyParts = withLazyRoute(
  createLazyComponent(
    () => import('../pages/Parts'),
    'Parts'
  ),
  {
    componentName: 'Parts',
    errorTitle: 'Parts Loading Error',
    errorMessage: 'The parts page failed to load. Please refresh to try again.'
  }
);

export const LazyCustomers = withLazyRoute(
  createLazyComponent(
    () => import('../pages/Customers'),
    'Customers'
  ),
  {
    componentName: 'Customers',
    errorTitle: 'Customers Loading Error',
    errorMessage: 'The customers page failed to load. Please refresh to try again.'
  }
);

export const LazyHTSBrowser = withLazyRoute(
  createLazyComponent(
    () => import('../pages/HTSBrowser'),
    'HTSBrowser'
  ),
  {
    componentName: 'HTSBrowser',
    errorTitle: 'HTS Browser Loading Error',
    errorMessage: 'The HTS browser failed to load. Please refresh to try again.'
  }
);

export const LazyEntrySummaryGroups = withLazyRoute(
  createLazyComponent(
    () => import('../pages/EntrySummaryGroups'),
    'EntrySummaryGroups'
  ),
  {
    componentName: 'EntrySummaryGroups',
    errorTitle: 'Entry Summary Groups Loading Error',
    errorMessage: 'The entry summary groups page failed to load. Please refresh to try again.'
  }
);

export const LazyReports = withLazyRoute(
  createLazyComponent(
    () => import('../pages/Reports'),
    'Reports'
  ),
  {
    componentName: 'Reports',
    errorTitle: 'Reports Loading Error',
    errorMessage: 'The reports page failed to load. Please refresh to try again.'
  }
);

export const LazyAdmin = withLazyRoute(
  createLazyComponent(
    () => import('../pages/Admin'),
    'Admin'
  ),
  {
    componentName: 'Admin',
    errorTitle: 'Admin Loading Error',
    errorMessage: 'The admin page failed to load. Please refresh to try again.'
  }
);

// Login doesn't need lazy loading as it's the entry point
export const LazyLogin = withLazyRoute(
  createLazyComponent(
    () => import('../pages/Login'),
    'Login'
  ),
  {
    componentName: 'Login',
    errorTitle: 'Login Loading Error',
    errorMessage: 'The login page failed to load. Please refresh to try again.'
  }
);

// Route preloading utilities
export const preloadRoute = (routeName) => {
  const components = {
    dashboard: LazyDashboard,
    inventory: LazyInventory,
    preadmissions: LazyPreAdmissions,
    preshipments: LazyPreShipments,
    parts: LazyParts,
    customers: LazyCustomers,
    'hts-browser': LazyHTSBrowser,
    'entry-summary-groups': LazyEntrySummaryGroups,
    reports: LazyReports,
    admin: LazyAdmin,
    login: LazyLogin
  };

  const component = components[routeName];
  if (component?.preload) {
    component.preload();
  }
};

export const preloadAllRoutes = () => {
  Object.keys(components).forEach(preloadRoute);
};

// Preload critical routes on app startup
export const preloadCriticalRoutes = () => {
  // Preload dashboard and inventory as they're most commonly used
  preloadRoute('dashboard');
  setTimeout(() => preloadRoute('inventory'), 1000);
};

// Hook for route preloading
export const useRoutePreloader = (routes = []) => {
  React.useEffect(() => {
    routes.forEach(route => {
      setTimeout(() => preloadRoute(route), Math.random() * 2000);
    });
  }, [routes]);
};

// Component for preloading routes on user interaction
export const RoutePreloader = ({ routes = [], children, ...props }) => {
  const handleMouseEnter = () => {
    routes.forEach(route => preloadRoute(route));
  };

  return (
    <div onMouseEnter={handleMouseEnter} {...props}>
      {children}
    </div>
  );
};

export default {
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
  LazyLogin,
  preloadRoute,
  preloadAllRoutes,
  preloadCriticalRoutes,
  useRoutePreloader,
  RoutePreloader,
  withLazyRoute
};