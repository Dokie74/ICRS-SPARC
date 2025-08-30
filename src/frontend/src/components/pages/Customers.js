import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useApp } from '../../contexts/AppContext';
import apiClient from '../../services/api-client';

const Customers = () => {
  const { showSuccess, showError } = useApp();
  
  // Temporary modal function until modal system is implemented
  const showModal = (modalType, data) => {
    console.log('Modal requested:', modalType, data);
    // TODO: Implement proper modal system
  };
  
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerFilter, setCustomerFilter] = useState({ hasEin: 'all' });

  // Fetch customers data with React Query
  const {
    data: customersData,
    isLoading: customersLoading,
    error: customersError,
    refetch: refetchCustomers
  } = useQuery(
    ['customers'],
    () => apiClient.customers.getAll(),
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
    }
  );

  const customers = customersData?.customers || [];

  const filteredCustomers = useMemo(() => {
    if (!customers) return [];
    
    let filtered = customers.filter(customer => {
      const matchesSearch = !customerSearch || 
        customer.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
        customer.code?.toLowerCase().includes(customerSearch.toLowerCase()) ||
        customer.ein?.toLowerCase().includes(customerSearch.toLowerCase()) ||
        customer.contact_email?.toLowerCase().includes(customerSearch.toLowerCase()) ||
        customer.broker_name?.toLowerCase().includes(customerSearch.toLowerCase());
      
      const matchesEinFilter = customerFilter.hasEin === 'all' || 
        (customerFilter.hasEin === 'yes' && customer.ein) ||
        (customerFilter.hasEin === 'no' && !customer.ein);
      
      return matchesSearch && matchesEinFilter;
    });
    
    return filtered;
  }, [customers, customerSearch, customerFilter]);

  const updateFilters = (key, value) => {
    if (key === 'search') {
      setCustomerSearch(value);
    } else {
      setCustomerFilter(prev => ({ ...prev, [key]: value }));
    }
  };

  const resetFilters = () => {
    setCustomerSearch('');
    setCustomerFilter({ hasEin: 'all' });
  };

  if (customersLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (customersError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <i className="fas fa-exclamation-circle text-red-400"></i>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error loading customers</h3>
            <div className="mt-2 text-sm text-red-700">
              <p>{customersError.message}</p>
            </div>
            <div className="mt-4">
              <button
                onClick={() => refetchCustomers()}
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
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Customer Management</h1>
          <p className="text-gray-600 mt-1">Manage customer accounts, contacts, and business information</p>
        </div>
        <button
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors duration-200 shadow-sm"
          onClick={() => showModal('add-customer-modal')}
        >
          <i className="fas fa-plus mr-2"></i>
          Add Customer
        </button>
      </div>

      {/* Search and Filter Controls */}
      <div className="bg-white shadow rounded-lg p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative md:col-span-2">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <i className="fas fa-search text-gray-400"></i>
            </div>
            <input
              type="text"
              placeholder="Search customers by name, code, EIN, email, or broker..."
              value={customerSearch}
              onChange={(e) => updateFilters('search', e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm shadow-sm transition-all duration-200"
            />
            {customerSearch && (
              <button
                onClick={() => updateFilters('search', '')}
                className="absolute inset-y-0 right-0 pr-4 flex items-center"
              >
                <i className="fas fa-times text-gray-400 hover:text-gray-600 transition-colors"></i>
              </button>
            )}
          </div>
          <div>
            <select
              value={customerFilter.hasEin}
              onChange={(e) => updateFilters('hasEin', e.target.value)}
              className="w-full px-3 py-3 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm shadow-sm"
            >
              <option value="all">All Customers</option>
              <option value="yes">With EIN</option>
              <option value="no">Without EIN</option>
            </select>
          </div>
          <div className="flex items-center">
            <button
              onClick={resetFilters}
              className="w-full px-3 py-3 text-sm font-medium text-gray-600 bg-gray-100 border border-gray-300 rounded-xl hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-all duration-200"
            >
              <i className="fas fa-undo mr-2"></i>
              Clear Filters
            </button>
          </div>
        </div>
        
        <div className="mt-4 flex justify-between items-center text-sm bg-gradient-to-r from-gray-50 to-green-50 px-4 py-3 rounded-lg border border-gray-200">
          <div className="flex items-center space-x-2">
            <i className="fas fa-info-circle text-green-500"></i>
            <span className="font-medium text-gray-700">
              Showing {filteredCustomers.length} of {customers.length} customers
              {(customerSearch || customerFilter.hasEin !== 'all') && (
                <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded-full">(filtered)</span>
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer Info
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Code & EIN
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Address
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customs Broker
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredCustomers.map(customer => (
                <tr key={customer.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{customer.name}</div>
                      {customer.contact_email && (
                        <div className="text-sm text-gray-500">
                          <i className="fas fa-envelope mr-1"></i>
                          {customer.contact_email}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      {customer.code && (
                        <div className="text-sm font-medium text-gray-900">
                          Code: {customer.code}
                        </div>
                      )}
                      <div className="text-sm text-gray-500">
                        EIN: {customer.ein || 'Not provided'}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    <div className="max-w-xs truncate" title={customer.address}>
                      {customer.address || 'No address'}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {customer.broker_name || 'No broker assigned'}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      customer.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {customer.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium space-x-2">
                    <button
                      onClick={() => showModal('customer-detail-modal', customer)}
                      className="text-green-600 hover:text-green-900"
                      title="View customer details"
                    >
                      <i className="fas fa-eye mr-1"></i>
                      View
                    </button>
                    <button
                      onClick={() => showModal('edit-customer-modal', customer)}
                      className="text-blue-600 hover:text-blue-900"
                      title="Edit customer"
                    >
                      <i className="fas fa-edit mr-1"></i>
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
              {filteredCustomers.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center">
                      <i className="fas fa-building text-gray-300 text-4xl mb-4"></i>
                      {customers.length === 0 ? (
                        <>
                          <h3 className="text-lg font-medium text-gray-900 mb-2">No customers yet</h3>
                          <p className="text-gray-600 mb-4">Get started by adding your first customer.</p>
                          <button
                            onClick={() => showModal('add-customer-modal')}
                            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
                          >
                            <i className="fas fa-plus mr-2"></i>
                            Add Customer
                          </button>
                        </>
                      ) : (
                        <>
                          <h3 className="text-lg font-medium text-gray-900 mb-2">No matching customers</h3>
                          <p className="text-gray-600 mb-4">Try adjusting your search or filter criteria.</p>
                          <button
                            onClick={resetFilters}
                            className="inline-flex items-center px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded-lg hover:bg-gray-700"
                          >
                            <i className="fas fa-undo mr-2"></i>
                            Clear Filters
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary Card */}
      {customers.length > 0 && (
        <div className="mt-6 bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Customer Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{customers.length}</div>
              <div className="text-sm text-gray-600">Total Customers</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {customers.filter(c => c.active).length}
              </div>
              <div className="text-sm text-gray-600">Active Customers</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {customers.filter(c => c.ein).length}
              </div>
              <div className="text-sm text-gray-600">With EIN</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Customers;