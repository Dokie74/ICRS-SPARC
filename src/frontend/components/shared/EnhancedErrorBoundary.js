// Enhanced Error Boundary with comprehensive error handling and reporting
// Provides multiple fallback UI options, error reporting, and developer tools

import React, { Component } from 'react';
import { componentStyles } from '../../utils/design-tokens';

// Error reporting service (placeholder - would integrate with Sentry, etc.)
const reportError = (error, errorInfo, context = {}) => {
  const errorReport = {
    message: error.message,
    stack: error.stack,
    componentStack: errorInfo.componentStack,
    timestamp: new Date().toISOString(),
    url: window.location.href,
    userAgent: navigator.userAgent,
    ...context
  };
  
  // In production, this would send to error reporting service
  console.error('Error reported:', errorReport);
  
  // Store in localStorage for debugging
  try {
    const existingErrors = JSON.parse(localStorage.getItem('error_reports') || '[]');
    existingErrors.push(errorReport);
    // Keep only last 10 errors
    const recentErrors = existingErrors.slice(-10);
    localStorage.setItem('error_reports', JSON.stringify(recentErrors));
  } catch (storageError) {
    console.warn('Could not store error report:', storageError);
  }
};

class EnhancedErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      errorId: null,
      retryAttempts: 0
    };
    
    this.handleRetry = this.handleRetry.bind(this);
    this.handleReport = this.handleReport.bind(this);
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { 
      hasError: true,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error
    console.error('EnhancedErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo
    });
    
    // Report error with context
    reportError(error, errorInfo, {
      errorId: this.state.errorId,
      component: this.props.componentName || 'Unknown',
      userId: this.props.userId,
      route: window.location.pathname,
      retryAttempts: this.state.retryAttempts
    });
  }
  
  handleRetry() {
    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryAttempts: prevState.retryAttempts + 1
    }));
  }
  
  handleReport() {
    // Create detailed error report
    const report = {
      errorId: this.state.errorId,
      error: this.state.error?.message,
      stack: this.state.error?.stack,
      componentStack: this.state.errorInfo?.componentStack,
      steps: 'Please describe what you were doing when this error occurred',
      timestamp: new Date().toISOString()
    };
    
    // Copy to clipboard for easy reporting
    navigator.clipboard.writeText(JSON.stringify(report, null, 2)).then(() => {
      alert('Error details copied to clipboard. Please paste this in your bug report.');
    }).catch(() => {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = JSON.stringify(report, null, 2);
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert('Error details copied to clipboard.');
    });
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback UI from props
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.handleRetry, this.state.errorId);
      }
      
      // Default fallback UI with enhanced design
      const isMinimal = this.props.minimal;
      
      if (isMinimal) {
        return (
          <div 
            className="border border-red-200 rounded-lg p-4 bg-red-50 m-4"
            style={componentStyles.status.error}
          >
            <div className="flex items-start">
              <svg className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.728-.833-2.498 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <div className="flex-1">
                <h3 className="text-sm font-medium text-red-800">
                  {this.props.title || 'Component Error'}
                </h3>
                <p className="text-sm text-red-700 mt-1">
                  {this.props.message || 'This component failed to load.'}
                </p>
                <div className="mt-3 flex space-x-3">
                  <button
                    onClick={this.handleRetry}
                    className="text-sm text-red-700 underline hover:text-red-800"
                  >
                    Try again
                  </button>
                  {this.props.showReport && (
                    <button
                      onClick={this.handleReport}
                      className="text-sm text-red-700 underline hover:text-red-800"
                    >
                      Report issue
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      }
      
      // Full-page error UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <div className="max-w-lg w-full bg-white shadow-lg rounded-lg p-8">
            <div className="flex items-center justify-center w-16 h-16 mx-auto bg-red-100 rounded-full mb-6">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.728-.833-2.498 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">
                {this.props.title || 'Something went wrong'}
              </h1>
              <p className="text-gray-600 mb-6">
                {this.props.message || 'An unexpected error has occurred. Our team has been notified and we\'re working to fix this issue.'}
              </p>
              
              {this.state.errorId && (
                <div className="mb-6 p-3 bg-gray-100 rounded-lg">
                  <p className="text-sm text-gray-700 mb-2">Error ID:</p>
                  <code className="text-xs font-mono text-gray-800 bg-white px-2 py-1 rounded">
                    {this.state.errorId}
                  </code>
                </div>
              )}
              
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={this.handleRetry}
                  className="inline-flex justify-center items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Try Again
                </button>
                
                <button
                  onClick={() => window.location.reload()}
                  className="inline-flex justify-center items-center px-6 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh Page
                </button>
              </div>
              
              <div className="mt-6 flex justify-center gap-4 text-sm text-gray-500">
                <button
                  onClick={this.handleReport}
                  className="hover:text-gray-700 underline"
                >
                  Report this issue
                </button>
                <a 
                  href="/dashboard" 
                  className="hover:text-gray-700 underline"
                >
                  Go to Dashboard
                </a>
              </div>
              
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="mt-6 text-left">
                  <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800">
                    Developer Details
                  </summary>
                  <div className="mt-2 p-3 bg-gray-100 rounded text-xs font-mono text-gray-800 whitespace-pre-wrap overflow-x-auto">
                    <div className="mb-2">
                      <strong>Error:</strong> {this.state.error.message}
                    </div>
                    <div className="mb-2">
                      <strong>Stack:</strong>
                      <pre className="mt-1">{this.state.error.stack}</pre>
                    </div>
                    {this.state.errorInfo && (
                      <div>
                        <strong>Component Stack:</strong>
                        <pre className="mt-1">{this.state.errorInfo.componentStack}</pre>
                      </div>
                    )}
                  </div>
                </details>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Higher-order component for wrapping components with error boundaries
export const withErrorBoundary = (WrappedComponent, errorBoundaryProps = {}) => {
  const WithErrorBoundaryComponent = (props) => (
    <EnhancedErrorBoundary 
      {...errorBoundaryProps}
      componentName={WrappedComponent.displayName || WrappedComponent.name}
    >
      <WrappedComponent {...props} />
    </EnhancedErrorBoundary>
  );
  
  WithErrorBoundaryComponent.displayName = `withErrorBoundary(${WrappedComponent.displayName || WrappedComponent.name})`;
  
  return WithErrorBoundaryComponent;
};

// Hook for function components to handle errors
export const useErrorHandler = () => {
  const [error, setError] = React.useState(null);
  
  const resetError = React.useCallback(() => {
    setError(null);
  }, []);
  
  const handleError = React.useCallback((error) => {
    console.error('Error handled by useErrorHandler:', error);
    setError(error);
    
    // Report the error
    reportError(error, { componentStack: '' }, {
      source: 'useErrorHandler',
      timestamp: new Date().toISOString()
    });
  }, []);
  
  // Throw error to nearest error boundary if one occurs
  React.useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);
  
  return { handleError, resetError };
};

// Route-specific error boundary
export const RouteErrorBoundary = ({ children }) => (
  <EnhancedErrorBoundary
    title="Page Loading Error"
    message="This page failed to load. Please try refreshing or navigate to another page."
    showReport={true}
    minimal={false}
  >
    {children}
  </EnhancedErrorBoundary>
);

// Component-specific error boundary
export const ComponentErrorBoundary = ({ children, componentName }) => (
  <EnhancedErrorBoundary
    title="Component Error"
    message={`The ${componentName} component failed to load.`}
    minimal={true}
    showReport={true}
    componentName={componentName}
  >
    {children}
  </EnhancedErrorBoundary>
);

export default EnhancedErrorBoundary;