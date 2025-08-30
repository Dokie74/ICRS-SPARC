// src/frontend/components/shared/TariffDisplay.js
// Tariff information display component for parts with HTS codes
// SPARC-compliant component for showing tariff rates and trade information

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../services/api-client';
import clsx from 'clsx';

const TariffDisplay = ({ 
  partData, 
  compact = false,
  showDetails = false,
  className = '' 
}) => {
  const [showTooltip, setShowTooltip] = useState(false);

  // Fetch tariff data for the part
  const {
    data: tariffData,
    isLoading,
    error
  } = useQuery({
    queryKey: ['tariff', partData?.hts_code, partData?.country_of_origin],
    queryFn: () => apiClient.get('/api/tariff/lookup', {
      hts_code: partData?.hts_code,
      country: partData?.country_of_origin
    }),
    enabled: !!(partData?.hts_code && partData?.country_of_origin),
    staleTime: 24 * 60 * 60 * 1000, // 24 hours - tariff data doesn't change frequently
  });

  // Calculate tariff amounts if we have price data
  const calculations = useMemo(() => {
    if (!tariffData?.success || !partData?.standard_value) return null;

    const price = parseFloat(partData.standard_value) || 0;
    const rates = tariffData.data;

    return {
      mfn: {
        rate: rates.mfn_rate || 0,
        amount: price * (rates.mfn_rate || 0) / 100
      },
      column2: {
        rate: rates.column2_rate || 0,
        amount: price * (rates.column2_rate || 0) / 100
      },
      antidumping: {
        rate: rates.antidumping_rate || 0,
        amount: price * (rates.antidumping_rate || 0) / 100
      },
      total: 0
    };
  }, [tariffData, partData?.standard_value]);

  // Calculate total tariff if calculations are available
  if (calculations) {
    calculations.total = calculations.mfn.amount + calculations.column2.amount + calculations.antidumping.amount;
  }

  // Return early if no HTS code
  if (!partData?.hts_code) {
    return compact ? (
      <span className="text-xs text-gray-400">No HTS</span>
    ) : (
      <div className={clsx('text-sm text-gray-500', className)}>
        No HTS code specified
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return compact ? (
      <div className="inline-flex items-center">
        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
        <span className="ml-1 text-xs text-gray-500">Loading...</span>
      </div>
    ) : (
      <div className={clsx('flex items-center', className)}>
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-sm text-gray-500">Loading tariff data...</span>
      </div>
    );
  }

  // Error state
  if (error || !tariffData?.success) {
    return compact ? (
      <span className="text-xs text-red-500">Tariff error</span>
    ) : (
      <div className={clsx('text-sm text-red-500', className)}>
        Unable to load tariff data
      </div>
    );
  }

  // Compact display for table cells
  if (compact) {
    const rates = tariffData.data;
    const hasRates = rates.mfn_rate > 0 || rates.column2_rate > 0 || rates.antidumping_rate > 0;

    if (!hasRates) {
      return <span className="text-xs text-gray-500">Free</span>;
    }

    return (
      <div 
        className="relative inline-block"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <div className="inline-flex items-center space-x-1">
          {rates.mfn_rate > 0 && (
            <span className="inline-flex px-1.5 py-0.5 rounded text-xs bg-blue-100 text-blue-800">
              {rates.mfn_rate}%
            </span>
          )}
          {rates.column2_rate > 0 && (
            <span className="inline-flex px-1.5 py-0.5 rounded text-xs bg-yellow-100 text-yellow-800">
              +{rates.column2_rate}%
            </span>
          )}
          {rates.antidumping_rate > 0 && (
            <span className="inline-flex px-1.5 py-0.5 rounded text-xs bg-red-100 text-red-800">
              AD: {rates.antidumping_rate}%
            </span>
          )}
        </div>

        {/* Tooltip */}
        {showTooltip && (
          <div className="absolute z-50 bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 p-3 bg-white border border-gray-300 rounded-lg shadow-lg">
            <div className="text-xs space-y-1">
              <div className="font-medium text-gray-900">Tariff Breakdown</div>
              <div className="flex justify-between">
                <span>MFN Rate:</span>
                <span>{rates.mfn_rate || 0}%</span>
              </div>
              {rates.column2_rate > 0 && (
                <div className="flex justify-between">
                  <span>Column 2:</span>
                  <span>{rates.column2_rate}%</span>
                </div>
              )}
              {rates.antidumping_rate > 0 && (
                <div className="flex justify-between">
                  <span>Anti-dumping:</span>
                  <span>{rates.antidumping_rate}%</span>
                </div>
              )}
              {calculations && (
                <>
                  <hr className="my-1" />
                  <div className="flex justify-between font-medium">
                    <span>Total Tariff:</span>
                    <span>${calculations.total.toFixed(2)}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Full display
  const rates = tariffData.data;

  return (
    <div className={clsx('bg-white border border-gray-200 rounded-lg p-4', className)}>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-gray-900">Tariff Information</h4>
        <span className="text-xs text-gray-500">
          HTS: {partData.hts_code}
        </span>
      </div>

      <div className="space-y-3">
        {/* MFN Rate */}
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <span className="inline-flex w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
            <span className="text-sm text-gray-700">MFN Rate</span>
          </div>
          <div className="text-right">
            <div className="text-sm font-medium text-gray-900">{rates.mfn_rate || 0}%</div>
            {calculations && (
              <div className="text-xs text-gray-500">${calculations.mfn.amount.toFixed(2)}</div>
            )}
          </div>
        </div>

        {/* Column 2 Rate */}
        {rates.column2_rate > 0 && (
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <span className="inline-flex w-2 h-2 bg-yellow-500 rounded-full mr-2"></span>
              <span className="text-sm text-gray-700">Column 2</span>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium text-gray-900">{rates.column2_rate}%</div>
              {calculations && (
                <div className="text-xs text-gray-500">${calculations.column2.amount.toFixed(2)}</div>
              )}
            </div>
          </div>
        )}

        {/* Anti-dumping */}
        {rates.antidumping_rate > 0 && (
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <span className="inline-flex w-2 h-2 bg-red-500 rounded-full mr-2"></span>
              <span className="text-sm text-gray-700">Anti-dumping</span>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium text-gray-900">{rates.antidumping_rate}%</div>
              {calculations && (
                <div className="text-xs text-gray-500">${calculations.antidumping.amount.toFixed(2)}</div>
              )}
            </div>
          </div>
        )}

        {/* Total */}
        {calculations && (
          <>
            <hr className="border-gray-200" />
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-900">Total Tariff</span>
              <div className="text-right">
                <div className="text-sm font-bold text-gray-900">
                  ${calculations.total.toFixed(2)}
                </div>
                <div className="text-xs text-gray-500">
                  {((calculations.total / parseFloat(partData.standard_value)) * 100).toFixed(1)}% of value
                </div>
              </div>
            </div>
          </>
        )}

        {/* Additional info */}
        {showDetails && rates.effective_date && (
          <div className="pt-2 border-t border-gray-200">
            <div className="text-xs text-gray-500">
              Rates effective: {new Date(rates.effective_date).toLocaleDateString()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TariffDisplay;