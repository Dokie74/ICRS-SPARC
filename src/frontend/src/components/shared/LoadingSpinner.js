// src/frontend/components/shared/LoadingSpinner.js
// Loading spinner components for different use cases

import React from 'react';
import clsx from 'clsx';

// Main loading spinner component
const LoadingSpinner = ({ 
  size = 'md', 
  color = 'blue', 
  className = '', 
  fullScreen = false,
  message = 'Loading...'
}) => {
  const sizeClasses = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12'
  };

  const colorClasses = {
    blue: 'text-blue-600',
    gray: 'text-gray-600',
    green: 'text-green-600',
    red: 'text-red-600',
    yellow: 'text-yellow-600',
    white: 'text-white'
  };

  const spinner = (
    <div className={clsx('flex items-center space-x-2', className)}>
      <svg
        className={clsx(
          'animate-spin',
          sizeClasses[size],
          colorClasses[color]
        )}
        xmlns="http://www.w3.org/2000/svg"
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
      {message && (
        <span className={clsx('text-sm', colorClasses[color])}>
          {message}
        </span>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-white bg-opacity-75 flex items-center justify-center z-50">
        {spinner}
      </div>
    );
  }

  return spinner;
};

// Page loading component
export const PageLoader = ({ message = 'Loading page...' }) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <LoadingSpinner size="xl" color="blue" />
        <p className="mt-4 text-gray-600">{message}</p>
      </div>
    </div>
  );
};

// Card loading skeleton
export const CardSkeleton = ({ rows = 3, className = '' }) => {
  return (
    <div className={clsx('animate-pulse', className)}>
      <div className="bg-gray-300 h-4 rounded mb-3"></div>
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="bg-gray-200 h-3 rounded mb-2"></div>
      ))}
    </div>
  );
};

// Table loading skeleton
export const TableSkeleton = ({ rows = 5, cols = 4 }) => {
  return (
    <div className="animate-pulse">
      <div className="bg-gray-100 rounded-lg">
        {/* Header */}
        <div className="border-b border-gray-200 p-4">
          <div className="grid" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
            {Array.from({ length: cols }).map((_, index) => (
              <div key={index} className="bg-gray-300 h-4 rounded mr-4"></div>
            ))}
          </div>
        </div>
        
        {/* Rows */}
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="border-b border-gray-100 p-4">
            <div className="grid" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
              {Array.from({ length: cols }).map((_, colIndex) => (
                <div key={colIndex} className="bg-gray-200 h-3 rounded mr-4"></div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Button loading state
export const ButtonSpinner = ({ size = 'sm' }) => {
  return (
    <svg
      className={clsx(
        'animate-spin mr-2',
        size === 'xs' && 'w-3 h-3',
        size === 'sm' && 'w-4 h-4',
        size === 'md' && 'w-5 h-5'
      )}
      xmlns="http://www.w3.org/2000/svg"
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
  );
};

// Inline loading indicator
export const InlineLoader = ({ text = 'Loading...' }) => {
  return (
    <div className="flex items-center justify-center py-4">
      <LoadingSpinner size="sm" color="gray" />
      <span className="ml-2 text-gray-600 text-sm">{text}</span>
    </div>
  );
};

// Loading overlay for existing content
export const LoadingOverlay = ({ show, message = 'Loading...', children }) => {
  return (
    <div className="relative">
      {children}
      {show && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
          <LoadingSpinner size="lg" color="blue" message={message} />
        </div>
      )}
    </div>
  );
};

export default LoadingSpinner;