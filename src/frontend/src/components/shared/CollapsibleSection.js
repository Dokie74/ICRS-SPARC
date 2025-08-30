// src/frontend/components/shared/CollapsibleSection.js
// Modern collapsible section component for admin interface
// SPARC-compliant reusable component

import React, { useState } from 'react';
import clsx from 'clsx';

const CollapsibleSection = ({ 
  title, 
  children, 
  icon, 
  defaultOpen = false, 
  headerActions = null,
  badge = null,
  description = null,
  variant = 'default'
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  const variants = {
    default: 'bg-white border border-gray-200',
    primary: 'bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200',
    success: 'bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200',
    warning: 'bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200',
    danger: 'bg-gradient-to-r from-red-50 to-pink-50 border border-red-200'
  };
  
  return (
    <div className={clsx(
      'rounded-xl shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md',
      variants[variant]
    )}>
      <div 
        className="px-6 py-4 cursor-pointer select-none transition-all duration-200 hover:bg-black/5"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {icon && (
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-white/80 flex items-center justify-center shadow-sm">
                <i className={clsx(
                  icon,
                  'text-lg',
                  variant === 'primary' ? 'text-blue-600' :
                  variant === 'success' ? 'text-green-600' :
                  variant === 'warning' ? 'text-yellow-600' :
                  variant === 'danger' ? 'text-red-600' :
                  'text-gray-600'
                )}></i>
              </div>
            )}
            <div>
              <div className="flex items-center space-x-3">
                <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
                {badge && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {badge}
                  </span>
                )}
              </div>
              {description && (
                <p className="text-sm text-gray-600 mt-1">{description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-3">
            {headerActions && (
              <div className="flex items-center space-x-2">
                {headerActions}
              </div>
            )}
            <div className={clsx(
              'transition-transform duration-200',
              isOpen ? 'rotate-180' : ''
            )}>
              <i className="fas fa-chevron-down text-gray-400"></i>
            </div>
          </div>
        </div>
      </div>
      
      <div className={clsx(
        'transition-all duration-300 ease-in-out overflow-hidden',
        isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
      )}>
        <div className="px-6 pb-6 border-t border-black/10">
          <div className="pt-4">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CollapsibleSection;