// src/frontend/components/pages/Inventory.js
// Inventory management page - Migrated from original ICRS with SPARC backend integration

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { useApp } from '../../contexts/AppContext';
import apiClient from '../../services/api-client';
import LoadingSpinner from '../shared/LoadingSpinner';

const Inventory = () => {
  const { user, hasPermission } = useAuth();
  const { customers, parts, showError, showSuccess } = useApp();
  
  const [inventoryView, setInventoryView] = useState('lot');
  const [filters, setFilters] = useState({
    lotId: '',
    partId: '',
    customerId: '',
    status: ''
  });

  // Fetch inventory data with React Query
  const {
    data: inventoryData,
    isLoading: inventoryLoading,
    error: inventoryError,
    refetch: refetchInventory
  } = useQuery(
    ['inventory-lots', filters],
    () => apiClient.inventory.getLots({
      limit: 1000,
      customer_id: filters.customerId || undefined,
      part_id: filters.partId || undefined,
      active_only: true
    }),
    {
      refetchInterval: 30000, // Refresh every 30 seconds
      onError: (error) => {
        console.error('Inventory loading error:', error);
        showError('Failed to load inventory data');
      }
    }
  );

  const inventory = inventoryData?.data || [];

  // Filter inventory based on current filters
  const filteredInventory = inventory.filter(item => {
    return (filters.lotId ? item.id.toLowerCase().includes(filters.lotId.toLowerCase()) : true) &&
           (filters.partId ? item.part_id === filters.partId : true) &&
           (filters.customerId ? item.customer_id == filters.customerId : true) &&
           (filters.status ? item.status === filters.status : true);
  });

  const updateFilters = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setFilters({ lotId: '', partId: '', customerId: '', status: '' });
  };

  // Show modal placeholder (will be implemented with proper modal system later)
  const showModal = (modalType, data) => {
    console.log('Modal request:', modalType, data);
    showSuccess(`Opening ${modalType} modal (functionality to be implemented)`);
  };

  const renderLotView = () => {
    if (filteredInventory.length === 0) {
      return (
        <tr>
          <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
            No inventory lots found matching your criteria.
          </td>
        </tr>
      );
    }

    return filteredInventory.map(item => (
      <tr key={item.id} className={item.voided ? 'bg-red-50 text-gray-400 line-through' : 'hover:bg-gray-50'}>
        <td className="px-6 py-4">
          <button
            className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
            onClick={() => showModal('lot-detail-modal', item.id)}
            title={`Database ID: ${item.id}`}
          >
            {item.manifest_number || item.id}
          </button>
        </td>
        <td className="px-6 py-4 font-medium">{item.part_id}</td>
        <td className="px-6 py-4">
          <div className="text-sm">
            {item.location_code ? (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {item.location_code} ({item.current_quantity})
              </span>
            ) : (
              <span className="text-gray-500">No location assigned</span>
            )}
          </div>
        </td>
        <td className="px-6 py-4">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            item.status === 'In Stock' 
              ? 'bg-green-100 text-green-800'
              : item.status === 'Reserved' 
                ? 'bg-yellow-100 text-yellow-800'
                : 'bg-gray-100 text-gray-800'
          }`}>
            {item.status || 'Available'}
          </span>
        </td>
        <td className="px-6 py-4 text-right font-medium">{item.current_quantity?.toLocaleString() || 0}</td>
        <td className="px-6 py-4 text-right">
          <div className="flex justify-end space-x-2">
            {item.voided ? (
              <span className="text-red-600 font-bold text-sm">VOIDED</span>
            ) : (
              <>
                {hasPermission('manager') && (
                  <button
                    className="text-gray-400 hover:text-blue-600 p-1"
                    onClick={() => showModal('manager-override-modal', { action: 'edit', lotId: item.id })}
                    title="Edit lot"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                )}
                {hasPermission('admin') && (
                  <button
                    className="text-gray-400 hover:text-red-600 p-1"
                    onClick={() => showModal('manager-override-modal', { action: 'void', lotId: item.id })}
                    title="Void lot"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </>
            )}
          </div>
        </td>
      </tr>
    ));
  };

  const renderPartView = () => {
    const partSummary = filteredInventory.reduce((acc, item) => {
      if (item.voided) return acc;
      if (!acc[item.part_id]) {
        const part = parts?.find(p => p.id === item.part_id);
        acc[item.part_id] = { 
          qty: 0, 
          part: part || { id: item.part_id, description: 'Unknown Part', standard_value: 0 }
        };
      }
      acc[item.part_id].qty += item.current_quantity || 0;
      return acc;
    }, {});

    const partEntries = Object.entries(partSummary);

    if (partEntries.length === 0) {
      return (
        <tr>
          <td colSpan="4" className="px-6 py-12 text-center text-gray-500">
            No parts found matching your criteria.
          </td>
        </tr>
      );
    }

    return partEntries.map(([partId, summary]) => (
      <tr key={partId} className="hover:bg-gray-50">
        <td className="px-6 py-4 font-medium">{partId}</td>
        <td className="px-6 py-4">{summary.part?.description || 'No description'}</td>
        <td className="px-6 py-4 text-right font-bold">{summary.qty.toLocaleString()}</td>
        <td className="px-6 py-4 text-right font-medium">
          {(summary.qty * (summary.part?.standard_value || 0)).toLocaleString('en-US', {
            style: 'currency',
            currency: 'USD'
          })}
        </td>
      </tr>
    ));
  };

  if (inventoryError) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error Loading Inventory</h3>
              <p className="mt-1 text-sm text-red-700">
                {inventoryError.message || 'Failed to load inventory data. Please try again.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Inventory Management</h1>
            <p className="text-gray-600 mt-1">
              Manage inventory lots with transaction-based quantity tracking
            </p>
          </div>
          <button
            onClick={refetchInventory}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
            disabled={inventoryLoading}
          >
            {inventoryLoading ? (
              <LoadingSpinner size="sm" color="white" />
            ) : (
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            )}
            Refresh
          </button>
        </div>
      </div>
      
      {/* Filter Section */}
      <div className="mb-6 bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label htmlFor="filter-lot" className="block text-sm font-medium text-gray-700 mb-1">
              Lot Number
            </label>
            <input
              type="text"
              id="filter-lot"
              value={filters.lotId}
              onChange={(e) => updateFilters('lotId', e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              placeholder="Search lots..."
            />
          </div>
          <div>
            <label htmlFor="filter-part" className="block text-sm font-medium text-gray-700 mb-1">
              Part Number
            </label>
            <select
              id="filter-part"
              value={filters.partId}
              onChange={(e) => updateFilters('partId', e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            >
              <option value="">All Parts</option>
              {parts?.map(p => (
                <option key={p.id} value={p.id}>{p.id}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="filter-customer" className="block text-sm font-medium text-gray-700 mb-1">
              Customer
            </label>
            <select
              id="filter-customer"
              value={filters.customerId}
              onChange={(e) => updateFilters('customerId', e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            >
              <option value="">All Customers</option>
              {customers?.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="filter-status" className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              id="filter-status"
              value={filters.status}
              onChange={(e) => updateFilters('status', e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            >
              <option value="">All Statuses</option>
              <option value="In Stock">In Stock</option>
              <option value="Reserved">Reserved</option>
              <option value="Depleted">Depleted</option>
              <option value="On Hold">On Hold</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              className="w-full inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50"
              onClick={resetFilters}
            >
              Reset Filters
            </button>
          </div>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">
              {inventoryView === 'lot' ? 'Lot View' : 'Part Number Summary'}
            </h2>
            <div className="flex items-center space-x-3">
              <span className="text-sm font-medium text-gray-700">Lot View</span>
              <button
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  inventoryView === 'part' ? 'bg-blue-600' : 'bg-gray-300'
                }`}
                onClick={() => setInventoryView(inventoryView === 'lot' ? 'part' : 'lot')}
              >
                <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  inventoryView === 'part' ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </button>
              <span className="text-sm font-medium text-gray-700">Part Summary</span>
            </div>
          </div>
        </div>

        {inventoryLoading ? (
          <div className="px-6 py-12 text-center">
            <LoadingSpinner size="lg" />
            <p className="mt-2 text-sm text-gray-600">Loading inventory data...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                {inventoryView === 'lot' ? (
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Lot Number
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Part Number
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Location
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Current Qty
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                ) : (
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Part Number
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Qty
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Value
                    </th>
                  </tr>
                )}
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {inventoryView === 'lot' ? renderLotView() : renderPartView()}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Inventory Audit Section */}
      {hasPermission('manager') && (
        <div className="mt-8 bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Cycle & Physical Inventory</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              className="flex items-center justify-center px-4 py-3 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              onClick={() => showModal('inventory-audit-modal', 'Daily')}
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Daily Cycle Count
            </button>
            <button
              className="flex items-center justify-center px-4 py-3 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
              onClick={() => showModal('inventory-audit-modal', 'Weekly')}
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              Weekly Section Audit
            </button>
            <button
              className="flex items-center justify-center px-4 py-3 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              onClick={() => showModal('inventory-audit-modal', 'Annual')}
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Annual Physical Inventory
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;