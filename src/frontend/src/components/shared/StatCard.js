// src/frontend/components/shared/StatCard.js
// Reusable statistics card component for admin dashboard sections
// SPARC-compliant shared component

import React from 'react';
import clsx from 'clsx';

const StatCard = ({ 
  title, 
  value, 
  icon, 
  variant = 'default',
  subtitle = null,
  loading = false,
  onClick = null,
  className = ''
}) => {
  const variants = {
    default: 'bg-white border-gray-200',
    primary: 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200',
    success: 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200',
    warning: 'bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200',
    danger: 'bg-gradient-to-r from-red-50 to-pink-50 border-red-200'
  };

  const iconColors = {
    default: 'text-gray-600',
    primary: 'text-blue-600',
    success: 'text-green-600',
    warning: 'text-yellow-600',
    danger: 'text-red-600'
  };

  const Component = onClick ? 'button' : 'div';

  return (
    <Component
      className={clsx(
        'border rounded-lg p-6 transition-all duration-200',
        variants[variant],
        onClick && 'cursor-pointer hover:shadow-md hover:scale-[1.02]',
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-center">
        {icon && (
          <div className="flex-shrink-0 mr-4">
            <div className="w-12 h-12 rounded-lg bg-white/80 flex items-center justify-center shadow-sm">
              <i className={clsx(icon, 'text-xl', iconColors[variant])}></i>
            </div>
          </div>
        )}
        
        <div className="flex-1">
          <div className="flex items-baseline space-x-2">
            {loading ? (
              <div className="animate-pulse">
                <div className="h-8 bg-gray-200 rounded w-20"></div>
              </div>
            ) : (
              <div className="text-2xl font-bold text-gray-900">{value}</div>
            )}
          </div>
          
          <div className="mt-1">
            {loading ? (
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-24"></div>
              </div>
            ) : (
              <div className="text-sm font-medium text-gray-600">{title}</div>
            )}
          </div>
          
          {subtitle && !loading && (
            <div className="text-xs text-gray-500 mt-1">{subtitle}</div>
          )}
        </div>
      </div>
    </Component>
  );
};

export default StatCard;