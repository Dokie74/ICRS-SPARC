// Comprehensive loading states and skeleton components for ICRS SPARC
// Provides consistent loading experiences across all components

import React from 'react';
import { componentStyles, getColor, getSpacing } from '../../utils/design-tokens';
import { useIsLoading, useAppStore } from '../../stores/useAppStore';

// Base loading spinner component
const LoadingSpinner = ({ 
  size = 'medium', 
  color = 'primary', 
  className = '',
  showText = false,
  text = 'Loading...'
}) => {
  const sizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-6 h-6', 
    large: 'w-8 h-8',
    xlarge: 'w-12 h-12'
  };
  
  const colorClasses = {
    primary: 'text-blue-600',
    white: 'text-white',
    gray: 'text-gray-500',
    success: 'text-green-600',
    error: 'text-red-600'
  };

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className="flex flex-col items-center space-y-2">
        <svg 
          className={`animate-spin ${sizeClasses[size]} ${colorClasses[color]}`}
          fill="none" 
          viewBox="0 0 24 24"
        >
          <circle 
            className="opacity-25" 
            cx="12" 
            cy="12" 
            r="10" 
            stroke="currentColor" 
            strokeWidth="4"
          />
          <path 
            className="opacity-75" 
            fill="currentColor" 
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
        {showText && (
          <p className={`text-sm ${colorClasses[color]} animate-pulse`}>
            {text}
          </p>
        )}
      </div>
    </div>
  );
};

// Pulse animation for skeleton loading
const SkeletonPulse = ({ className = '', children }) => (
  <div className={`animate-pulse ${className}`}>
    {children}
  </div>
);

// Basic skeleton elements
const SkeletonLine = ({ width = 'full', height = '4', className = '' }) => (
  <div 
    className={`bg-gray-200 rounded h-${height} ${width === 'full' ? 'w-full' : `w-${width}`} ${className}`}
  />
);

const SkeletonCircle = ({ size = '12', className = '' }) => (
  <div 
    className={`bg-gray-200 rounded-full w-${size} h-${size} ${className}`}
  />
);

const SkeletonAvatar = ({ size = 'medium', className = '' }) => {
  const sizeClasses = {
    small: 'w-8 h-8',
    medium: 'w-12 h-12',
    large: 'w-16 h-16'
  };

  return (
    <div className={`bg-gray-200 rounded-full ${sizeClasses[size]} ${className}`} />
  );
};

// Complex skeleton components for specific use cases

// Table skeleton
const TableSkeleton = ({ 
  rows = 5, 
  columns = 4, 
  showHeader = true,
  className = '' 
}) => (
  <SkeletonPulse className={className}>
    <div className="bg-white shadow-sm rounded-lg overflow-hidden">
      {showHeader && (
        <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
          <div className="flex space-x-4">
            {Array.from({ length: columns }, (_, i) => (
              <SkeletonLine key={i} width="20" height="4" />
            ))}
          </div>
        </div>
      )}
      <div className="divide-y divide-gray-200">
        {Array.from({ length: rows }, (_, rowIndex) => (
          <div key={rowIndex} className="px-6 py-4">
            <div className="flex space-x-4 items-center">
              {Array.from({ length: columns }, (_, colIndex) => (
                <SkeletonLine 
                  key={colIndex} 
                  width={colIndex === 0 ? '24' : colIndex === columns - 1 ? '16' : '20'} 
                  height="4" 
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  </SkeletonPulse>
);

// Card skeleton
const CardSkeleton = ({ 
  showAvatar = false, 
  showImage = false,
  lines = 3,
  className = '' 
}) => (
  <SkeletonPulse className={`bg-white rounded-lg shadow-sm border p-6 ${className}`}>
    <div className="space-y-4">
      {showAvatar && (
        <div className="flex items-center space-x-3">
          <SkeletonAvatar size="medium" />
          <div className="space-y-2 flex-1">
            <SkeletonLine width="32" height="4" />
            <SkeletonLine width="24" height="3" />
          </div>
        </div>
      )}
      
      {showImage && (
        <div className="bg-gray-200 rounded-lg h-48 w-full" />
      )}
      
      <div className="space-y-2">
        <SkeletonLine width="full" height="5" />
        {Array.from({ length: lines }, (_, i) => (
          <SkeletonLine 
            key={i} 
            width={i === lines - 1 ? '80' : 'full'} 
            height="4" 
          />
        ))}
      </div>
      
      <div className="flex justify-between items-center pt-2">
        <SkeletonLine width="20" height="4" />
        <SkeletonLine width="16" height="8" />
      </div>
    </div>
  </SkeletonPulse>
);

// Grid skeleton (for card grids)
const GridSkeleton = ({ 
  items = 6, 
  columns = 3, 
  cardProps = {},
  className = '' 
}) => {
  const gridClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
  };

  return (
    <div className={`grid ${gridClasses[columns]} gap-6 ${className}`}>
      {Array.from({ length: items }, (_, i) => (
        <CardSkeleton key={i} {...cardProps} />
      ))}
    </div>
  );
};

// Form skeleton
const FormSkeleton = ({ fields = 5, className = '' }) => (
  <SkeletonPulse className={`bg-white rounded-lg shadow-sm border p-6 ${className}`}>
    <div className="space-y-6">
      <div>
        <SkeletonLine width="48" height="6" className="mb-4" />
        <SkeletonLine width="80" height="3" />
      </div>
      
      {Array.from({ length: fields }, (_, i) => (
        <div key={i} className="space-y-2">
          <SkeletonLine width="32" height="4" />
          <div className="bg-gray-100 rounded border h-10 w-full" />
        </div>
      ))}
      
      <div className="flex justify-end space-x-3 pt-4">
        <div className="bg-gray-200 rounded h-10 w-20" />
        <div className="bg-gray-200 rounded h-10 w-24" />
      </div>
    </div>
  </SkeletonPulse>
);

// Dashboard metrics skeleton
const MetricsSkeleton = ({ metrics = 4, className = '' }) => (
  <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 ${className}`}>
    {Array.from({ length: metrics }, (_, i) => (
      <SkeletonPulse key={i} className="bg-white rounded-lg shadow-sm border p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <SkeletonLine width="24" height="4" />
            <SkeletonCircle size="8" />
          </div>
          <SkeletonLine width="32" height="8" />
          <div className="flex items-center space-x-2">
            <SkeletonLine width="16" height="3" />
            <SkeletonLine width="20" height="3" />
          </div>
        </div>
      </SkeletonPulse>
    ))}
  </div>
);

// Sidebar skeleton
const SidebarSkeleton = ({ items = 8, className = '' }) => (
  <SkeletonPulse className={`bg-white w-64 h-full border-r border-gray-200 ${className}`}>
    <div className="p-4 space-y-6">
      <div className="flex items-center space-x-3">
        <SkeletonCircle size="10" />
        <SkeletonLine width="32" height="5" />
      </div>
      
      <div className="space-y-3">
        {Array.from({ length: items }, (_, i) => (
          <div key={i} className="flex items-center space-x-3 py-2">
            <SkeletonCircle size="5" />
            <SkeletonLine width="28" height="4" />
          </div>
        ))}
      </div>
    </div>
  </SkeletonPulse>
);

// Page skeleton (combines header, sidebar, main content)
const PageSkeleton = ({ 
  showSidebar = true, 
  showHeader = true,
  contentType = 'table',
  className = '' 
}) => (
  <div className={`min-h-screen bg-gray-50 ${className}`}>
    {showHeader && (
      <SkeletonPulse className="bg-white border-b border-gray-200 h-16">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <SkeletonLine width="48" height="6" />
          </div>
          <div className="flex items-center space-x-3">
            <SkeletonCircle size="8" />
            <SkeletonAvatar size="small" />
          </div>
        </div>
      </SkeletonPulse>
    )}
    
    <div className="flex">
      {showSidebar && <SidebarSkeleton />}
      
      <div className="flex-1 p-6">
        <div className="mb-6 space-y-4">
          <SkeletonLine width="64" height="8" />
          <SkeletonLine width="96" height="4" />
        </div>
        
        {contentType === 'table' && <TableSkeleton rows={8} />}
        {contentType === 'grid' && <GridSkeleton items={9} columns={3} />}
        {contentType === 'form' && <FormSkeleton fields={6} />}
        {contentType === 'dashboard' && (
          <div className="space-y-6">
            <MetricsSkeleton />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <CardSkeleton lines={4} />
              <CardSkeleton lines={4} />
            </div>
          </div>
        )}
      </div>
    </div>
  </div>
);

// Loading overlay for existing content
const LoadingOverlay = ({ 
  show, 
  message = 'Loading...', 
  transparent = false,
  className = '' 
}) => {
  if (!show) return null;

  return (
    <div 
      className={`
        absolute inset-0 z-50 flex items-center justify-center
        ${transparent ? 'bg-white bg-opacity-75' : 'bg-white bg-opacity-90'}
        ${className}
      `}
    >
      <div className="text-center">
        <LoadingSpinner size="large" showText text={message} />
      </div>
    </div>
  );
};

// Inline loading for buttons and small components
const InlineLoading = ({ 
  show, 
  size = 'small', 
  className = '',
  children 
}) => {
  if (!show && !children) return null;

  return (
    <div className={`inline-flex items-center ${className}`}>
      {show && <LoadingSpinner size={size} className="mr-2" />}
      {children}
    </div>
  );
};

// Progress bar for multi-step processes
const ProgressBar = ({ 
  progress = 0, 
  total = 100,
  showPercentage = true,
  color = 'primary',
  className = ''
}) => {
  const percentage = Math.round((progress / total) * 100);
  
  const colorClasses = {
    primary: 'bg-blue-600',
    success: 'bg-green-600',
    warning: 'bg-yellow-600',
    error: 'bg-red-600'
  };

  return (
    <div className={`w-full ${className}`}>
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm text-gray-700">Progress</span>
        {showPercentage && (
          <span className="text-sm text-gray-600">{percentage}%</span>
        )}
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className={`h-2 rounded-full ${colorClasses[color]} transition-all duration-300 ease-out`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

// Global loading hook for component-level loading states
const useLoadingState = (key) => {
  const isLoading = useIsLoading(key);
  const { ui } = useAppStore();

  const setLoading = (loading) => {
    ui.setLoadingState(key, loading);
  };

  const withLoading = async (asyncFn) => {
    setLoading(true);
    try {
      const result = await asyncFn();
      return result;
    } finally {
      setLoading(false);
    }
  };

  return {
    isLoading,
    setLoading,
    withLoading
  };
};

// Export all components
export {
  LoadingSpinner,
  SkeletonPulse,
  SkeletonLine,
  SkeletonCircle,
  SkeletonAvatar,
  TableSkeleton,
  CardSkeleton,
  GridSkeleton,
  FormSkeleton,
  MetricsSkeleton,
  SidebarSkeleton,
  PageSkeleton,
  LoadingOverlay,
  InlineLoading,
  ProgressBar,
  useLoadingState
};

export default LoadingSpinner;