import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useApp } from '../../contexts/AppContext';
import apiClient from '../../services/api-client';

// Status configuration for pre-admissions
const STATUS_CONFIG = {
  'Pending': { color: 'yellow', label: 'Pending', icon: 'fas fa-clock' },
  'In Transit': { color: 'blue', label: 'In Transit', icon: 'fas fa-ship' },
  'Arrived': { color: 'green', label: 'Arrived', icon: 'fas fa-check-circle' },
  'Rejected': { color: 'red', label: 'Rejected', icon: 'fas fa-times-circle' },
  'Processing': { color: 'purple', label: 'Processing', icon: 'fas fa-cogs' }
};

const PreAdmissions = () => {
  const { showSuccess, showError, showModal } = useApp();
  const [filters, setFilters] = useState({
    status: '',
    search: ''
  });

  // Fetch preadmissions data with React Query
  const {
    data: preadmissionsData,
    isLoading: preadmissionsLoading,
    error: preadmissionsError,
    refetch: refetchPreadmissions
  } = useQuery(
    ['preadmissions'],
    () => apiClient.preadmission.getAll(),
    {
      staleTime: 2 * 60 * 1000, // 2 minutes
      cacheTime: 5 * 60 * 1000, // 5 minutes
    }
  );

  const preadmissions = preadmissionsData?.preadmissions || [];

  // Filtered and sorted data
  const filteredPreadmissions = useMemo(() => {
    let filtered = [...preadmissions];

    // Apply status filter
    if (filters.status) {
      filtered = filtered.filter(pa => pa.status === filters.status);
    }

    // Apply search filter
    if (filters.search) {
      const term = filters.search.toLowerCase();
      filtered = filtered.filter(pa => 
        (pa.admission_id && pa.admission_id.toLowerCase().includes(term)) ||
        (pa.container_number && pa.container_number.toLowerCase().includes(term)) ||
        (pa.customer_name && pa.customer_name.toLowerCase().includes(term)) ||
        (pa.reference_number && pa.reference_number.toLowerCase().includes(term))
      );
    }

    // Sort by status priority (active items first) then by expected arrival date
    filtered.sort((a, b) => {
      const aIsFinal = a.status === 'Arrived' || a.status === 'Rejected';
      const bIsFinal = b.status === 'Arrived' || b.status === 'Rejected';
      
      if (aIsFinal === bIsFinal) {
        // Both are same finality, sort by expected arrival date
        const aDate = new Date(a.expected_arrival || '9999-12-31');
        const bDate = new Date(b.expected_arrival || '9999-12-31');
        return aDate - bDate;
      }
      
      // Active items first
      return aIsFinal ? 1 : -1;
    });

    return filtered;
  }, [preadmissions, filters]);

  const updateFilter = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({ status: '', search: '' });
  };

  // Statistics
  const stats = useMemo(() => {
    const total = preadmissions.length;
    const pending = preadmissions.filter(pa => pa.status === 'Pending').length;
    const inTransit = preadmissions.filter(pa => pa.status === 'In Transit').length;
    const arrived = preadmissions.filter(pa => pa.status === 'Arrived').length;
    const processing = preadmissions.filter(pa => pa.status === 'Processing').length;
    
    return { total, pending, inTransit, arrived, processing };
  }, [preadmissions]);

  if (preadmissionsLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (preadmissionsError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <i className="fas fa-exclamation-circle text-red-400"></i>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error loading pre-admissions</h3>
            <div className="mt-2 text-sm text-red-700">
              <p>{preadmissionsError.message}</p>
            </div>
            <div className="mt-4">
              <button
                onClick={() => refetchPreadmissions()}
                className="bg-red-100 px-3 py-2 rounded-md text-sm text-red-800 hover:bg-red-200"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow-sm border border-gray-200 rounded-lg p-6">
        <div className="sm:flex sm:items-center">
          <div className="sm:flex-auto">
            <h1 className="text-2xl font-semibold text-gray-900">Pre-Admissions (Receivables)</h1>
            <p className="mt-1 text-sm text-gray-700">
              Admin function to create receivable records from e214 data before goods arrive.
            </p>
          </div>
          <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              onClick={() => showModal('create-preadmission-modal')}
            >
              <i className="fas fa-plus mr-2"></i>
              Create New Pre-Admission
            </button>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <i className="fas fa-clipboard-list text-blue-600"></i>
              </div>
            </div>
            <div className="ml-3">
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              <p className="text-sm text-gray-600">Total</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                <i className="fas fa-clock text-yellow-600"></i>
              </div>
            </div>
            <div className="ml-3">
              <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
              <p className="text-sm text-gray-600">Pending</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <i className="fas fa-ship text-blue-600"></i>
              </div>
            </div>
            <div className="ml-3">
              <p className="text-2xl font-bold text-gray-900">{stats.inTransit}</p>
              <p className="text-sm text-gray-600">In Transit</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <i className="fas fa-cogs text-purple-600"></i>
              </div>
            </div>
            <div className="ml-3">
              <p className="text-2xl font-bold text-gray-900">{stats.processing}</p>
              <p className="text-sm text-gray-600">Processing</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <i className="fas fa-check-circle text-green-600"></i>
              </div>
            </div>
            <div className="ml-3">
              <p className="text-2xl font-bold text-gray-900">{stats.arrived}</p>
              <p className="text-sm text-gray-600">Arrived</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white shadow-sm border border-gray-200 rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <i className="fas fa-search text-gray-400"></i>
            </div>
            <input
              type="text"
              placeholder="Search by admission ID, container, or customer..."
              value={filters.search}
              onChange={(e) => updateFilter('search', e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div>
            <select
              value={filters.status}
              onChange={(e) => updateFilter('status', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Statuses</option>
              {Object.entries(STATUS_CONFIG).map(([status, config]) => (
                <option key={status} value={status}>{config.label}</option>
              ))}
            </select>
          </div>
          
          <div className="flex items-center">
            <button
              onClick={clearFilters}
              className="w-full px-3 py-2 text-sm font-medium text-gray-600 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-all duration-200"
            >
              <i className="fas fa-undo mr-2"></i>
              Clear Filters
            </button>
          </div>
        </div>
        
        <div className="mt-4 text-sm text-gray-600">
          Showing {filteredPreadmissions.length} of {preadmissions.length} pre-admissions
          {(filters.status || filters.search) && (
            <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full">(filtered)</span>
          )}
        </div>
      </div>

      {/* Pre-Admissions Table */}
      <div className="bg-white shadow-sm border border-gray-200 rounded-lg overflow-hidden">
        {filteredPreadmissions.length === 0 ? (
          <div className="p-12 text-center">
            <i className="fas fa-clipboard-list text-4xl text-gray-400 mb-4"></i>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {preadmissions.length === 0 ? 'No pre-admissions yet' : 'No matching pre-admissions'}
            </h3>
            <p className="text-gray-600 mb-4">
              {preadmissions.length === 0 
                ? 'Get started by creating your first pre-admission record.' 
                : 'Try adjusting your search or filter criteria.'}
            </p>
            {preadmissions.length === 0 ? (
              <button
                onClick={() => showModal('create-preadmission-modal')}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                <i className="fas fa-plus mr-2"></i>
                Create First Pre-Admission
              </button>
            ) : (
              <button
                onClick={clearFilters}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gray-600 hover:bg-gray-700"
              >
                <i className="fas fa-undo mr-2"></i>
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                    Admission ID
                  </th>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Container / Reference
                  </th>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Customer
                  </th>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Expected Arrival
                  </th>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Status
                  </th>
                  <th className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {filteredPreadmissions.map(pa => {
                  const isFinal = pa.status === 'Arrived' || pa.status === 'Rejected';
                  const statusConfig = STATUS_CONFIG[pa.status] || STATUS_CONFIG['Pending'];
                  
                  return (
                    <tr key={pa.id || pa.admission_id} className={isFinal ? 'bg-gray-50' : 'hover:bg-gray-50'}>
                      <td className="py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                        {pa.admission_id || pa.id}
                      </td>
                      <td className="px-3 py-4 text-sm text-gray-900">
                        <div>
                          {pa.container_number && (
                            <div className="font-medium">{pa.container_number}</div>
                          )}
                          {pa.reference_number && (
                            <div className="text-gray-500 text-xs">Ref: {pa.reference_number}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-4 text-sm text-gray-900">
                        {pa.customer_name || pa.customer?.name || 'N/A'}
                      </td>
                      <td className="px-3 py-4 text-sm text-gray-900">
                        {pa.expected_arrival ? new Date(pa.expected_arrival).toLocaleDateString() : 'Not set'}
                      </td>
                      <td className="px-3 py-4 text-sm">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          statusConfig.color === 'green' ? 'bg-green-100 text-green-800' :
                          statusConfig.color === 'yellow' ? 'bg-yellow-100 text-yellow-800' :
                          statusConfig.color === 'blue' ? 'bg-blue-100 text-blue-800' :
                          statusConfig.color === 'purple' ? 'bg-purple-100 text-purple-800' :
                          statusConfig.color === 'red' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          <i className={`${statusConfig.icon} mr-1`}></i>
                          {statusConfig.label}
                        </span>
                      </td>
                      <td className="px-3 py-4 text-right text-sm font-medium">
                        <div className="flex space-x-2 justify-end">
                          <button
                            className="text-green-600 hover:text-green-900"
                            onClick={() => showModal('edit-preadmission-modal', pa)}
                            title="Edit pre-admission"
                          >
                            <i className="fas fa-edit mr-1"></i>
                            Edit
                          </button>
                          <button
                            className="text-blue-600 hover:text-blue-900"
                            onClick={() => showModal('dock-audit-modal', pa)}
                            title={isFinal ? 'View dock audit' : 'Go to audit'}
                          >
                            <i className="fas fa-clipboard-check mr-1"></i>
                            {isFinal ? 'View Audit' : 'Audit'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default PreAdmissions;