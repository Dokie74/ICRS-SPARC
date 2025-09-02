// src/frontend/components/pages/PreShipments.js
// Complete PreShipments page implementation with tabbed filtering and expandable cards
// Matches original ICRS functionality with modern React patterns

import React, { useState, useMemo } from 'react';
import { useApp } from '../../contexts/AppContext';
import { usePreshipments, usePreshipmentStats, useUpdatePreshipmentStatus, useGenerateEntryS, useFileWithCBP } from '../../services/preshipmentService';

// Status configuration for preshipments
const STATUS_CONFIG = {
  'NOT_PREPARED': { 
    color: 'gray', 
    label: 'Not Prepared', 
    icon: 'fas fa-circle',
    bgClass: 'bg-gray-100 text-gray-800',
    description: 'Initial state, no work done yet'
  },
  'DRAFT': { 
    color: 'yellow', 
    label: 'Draft Entry', 
    icon: 'fas fa-edit',
    bgClass: 'bg-yellow-100 text-yellow-800',
    description: 'Entry being prepared'
  },
  'READY_TO_FILE': { 
    color: 'blue', 
    label: 'Ready to File', 
    icon: 'fas fa-check-circle',
    bgClass: 'bg-blue-100 text-blue-800',
    description: 'Ready for CBP filing'
  },
  'FILED': { 
    color: 'purple', 
    label: 'Filed', 
    icon: 'fas fa-paper-plane',
    bgClass: 'bg-purple-100 text-purple-800',
    description: 'Filed with CBP, awaiting response'
  },
  'ACCEPTED': { 
    color: 'green', 
    label: 'Filed/Accepted', 
    icon: 'fas fa-check-double',
    bgClass: 'bg-green-100 text-green-800',
    description: 'Accepted by CBP'
  },
  'REJECTED': { 
    color: 'red', 
    label: 'Rejected', 
    icon: 'fas fa-times-circle',
    bgClass: 'bg-red-100 text-red-800',
    description: 'Rejected by CBP, needs correction'
  }
};

// Tab configuration
const TABS = [
  { key: 'all', label: 'All', icon: 'fas fa-list', filter: null },
  { key: 'draft', label: 'Draft Entries', icon: 'fas fa-edit', filter: ['DRAFT'] },
  { key: 'ready', label: 'Ready to File', icon: 'fas fa-check-circle', filter: ['READY_TO_FILE'] },
  { key: 'filed', label: 'Filed/Accepted', icon: 'fas fa-paper-plane', filter: ['FILED', 'ACCEPTED'] },
  { key: 'weekly', label: 'Weekly Entries', icon: 'fas fa-calendar-week', filter: null, special: 'weekly' },
  { key: 'consolidated', label: 'Consolidated', icon: 'fas fa-layer-group', filter: null, special: 'consolidated' }
];

const PreShipments = () => {
  const { showSuccess, showError, showModal } = useApp();
  const [activeTab, setActiveTab] = useState('all');
  const [expandedCards, setExpandedCards] = useState(new Set());
  const [filters, setFilters] = useState({
    search: '',
    customer: '',
    dateRange: ''
  });

  // Fetch preshipments data
  const {
    data: preshipmentsData,
    isLoading: preshipmentsLoading,
    error: preshipmentsError,
    refetch: refetchPreshipments
  } = usePreshipments();

  // Fetch statistics
  const {
    data: statsData,
    isLoading: statsLoading
  } = usePreshipmentStats();

  const preshipments = preshipmentsData?.data || [];
  const stats = statsData?.data || {};

  // Mutations
  const updateStatusMutation = useUpdatePreshipmentStatus();
  const generateEntryMutation = useGenerateEntryS();
  const fileWithCBPMutation = useFileWithCBP();

  // Filtered and sorted data based on active tab and filters
  const filteredPreshipments = useMemo(() => {
    let filtered = [...preshipments];

    // Apply tab filter
    const currentTab = TABS.find(tab => tab.key === activeTab);
    if (currentTab) {
      if (currentTab.filter) {
        filtered = filtered.filter(ps => currentTab.filter.includes(ps.status));
      } else if (currentTab.special === 'weekly') {
        filtered = filtered.filter(ps => ps.entry_type === 'weekly');
      } else if (currentTab.special === 'consolidated') {
        filtered = filtered.filter(ps => ps.entry_type === 'consolidated');
      }
    }

    // Apply search filter
    if (filters.search) {
      const term = filters.search.toLowerCase();
      filtered = filtered.filter(ps => 
        (ps.shipment_id && ps.shipment_id.toLowerCase().includes(term)) ||
        (ps.entry_number && ps.entry_number.toLowerCase().includes(term)) ||
        (ps.customer_name && ps.customer_name.toLowerCase().includes(term)) ||
        (ps.bol_number && ps.bol_number.toLowerCase().includes(term))
      );
    }

    // Apply customer filter
    if (filters.customer) {
      filtered = filtered.filter(ps => ps.customer_id === filters.customer);
    }

    // Sort by status priority (active items first) then by created date
    filtered.sort((a, b) => {
      const aIsFinal = ['ACCEPTED', 'REJECTED'].includes(a.status);
      const bIsFinal = ['ACCEPTED', 'REJECTED'].includes(b.status);
      
      if (aIsFinal === bIsFinal) {
        // Both are same finality, sort by created date (newest first)
        return new Date(b.created_at) - new Date(a.created_at);
      }
      
      // Active items first
      return aIsFinal ? 1 : -1;
    });

    return filtered;
  }, [preshipments, activeTab, filters]);

  // Toggle card expansion
  const toggleCardExpansion = (shipmentId) => {
    const newExpanded = new Set(expandedCards);
    if (newExpanded.has(shipmentId)) {
      newExpanded.delete(shipmentId);
    } else {
      newExpanded.add(shipmentId);
    }
    setExpandedCards(newExpanded);
  };

  // Handle action buttons
  const handleGenerateEntry = async (preshipment) => {
    try {
      await generateEntryMutation.mutateAsync(preshipment.id);
      showSuccess('Entry summary generated successfully');
    } catch (error) {
      showError(error.message || 'Error generating entry summary');
    }
  };

  const handleFileWithCBP = async (preshipment) => {
    try {
      await fileWithCBPMutation.mutateAsync(preshipment.id);
      showSuccess('Successfully filed with CBP');
    } catch (error) {
      showError(error.message || 'Error filing with CBP');
    }
  };

  const updateFilter = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({ search: '', customer: '', dateRange: '' });
  };

  // Get tab count
  const getTabCount = (tabKey) => {
    const tab = TABS.find(t => t.key === tabKey);
    if (!tab) return 0;
    
    if (tab.filter) {
      return preshipments.filter(ps => tab.filter.includes(ps.status)).length;
    } else if (tab.special === 'weekly') {
      return preshipments.filter(ps => ps.entry_type === 'weekly').length;
    } else if (tab.special === 'consolidated') {
      return preshipments.filter(ps => ps.entry_type === 'consolidated').length;
    } else {
      return preshipments.length;
    }
  };

  if (preshipmentsLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading preshipments...</span>
      </div>
    );
  }

  if (preshipmentsError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <i className="fas fa-exclamation-circle text-red-400"></i>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error loading preshipments</h3>
            <div className="mt-2 text-sm text-red-700">
              <p>{preshipmentsError.message}</p>
            </div>
            <div className="mt-4">
              <button
                onClick={() => refetchPreshipments()}
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
            <h1 className="text-2xl font-semibold text-gray-900">Pre-Shipments</h1>
            <p className="mt-1 text-sm text-gray-700">
              Create and manage preshipment entries for CBP filing. Track entry status from draft to acceptance.
            </p>
          </div>
          <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              onClick={() => showModal('create-preshipment-modal')}
            >
              <i className="fas fa-plus mr-2"></i>
              Create New Preshipment
            </button>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      {!statsLoading && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <i className="fas fa-list text-blue-600"></i>
                </div>
              </div>
              <div className="ml-3">
                <p className="text-2xl font-bold text-gray-900">{stats.total || 0}</p>
                <p className="text-sm text-gray-600">Total</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <i className="fas fa-edit text-yellow-600"></i>
                </div>
              </div>
              <div className="ml-3">
                <p className="text-2xl font-bold text-gray-900">{stats.draft || 0}</p>
                <p className="text-sm text-gray-600">Draft</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <i className="fas fa-check-circle text-blue-600"></i>
                </div>
              </div>
              <div className="ml-3">
                <p className="text-2xl font-bold text-gray-900">{stats.ready_to_file || 0}</p>
                <p className="text-sm text-gray-600">Ready</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <i className="fas fa-paper-plane text-purple-600"></i>
                </div>
              </div>
              <div className="ml-3">
                <p className="text-2xl font-bold text-gray-900">{stats.filed || 0}</p>
                <p className="text-sm text-gray-600">Filed</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <i className="fas fa-check-double text-green-600"></i>
                </div>
              </div>
              <div className="ml-3">
                <p className="text-2xl font-bold text-gray-900">{stats.accepted || 0}</p>
                <p className="text-sm text-gray-600">Accepted</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                  <i className="fas fa-times-circle text-red-600"></i>
                </div>
              </div>
              <div className="ml-3">
                <p className="text-2xl font-bold text-gray-900">{stats.rejected || 0}</p>
                <p className="text-sm text-gray-600">Rejected</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="bg-white shadow-sm border border-gray-200 rounded-lg">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
            {TABS.map((tab) => {
              const count = getTabCount(tab.key);
              const isActive = activeTab === tab.key;
              
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
                    isActive
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <i className={`${tab.icon} mr-2`}></i>
                  {tab.label}
                  {count > 0 && (
                    <span className={`ml-2 py-0.5 px-2 rounded-full text-xs ${
                      isActive 
                        ? 'bg-blue-100 text-blue-600' 
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Filters */}
        <div className="p-4 border-b border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <i className="fas fa-search text-gray-400"></i>
              </div>
              <input
                type="text"
                placeholder="Search by shipment ID, entry, customer..."
                value={filters.search}
                onChange={(e) => updateFilter('search', e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div>
              <select
                value={filters.customer}
                onChange={(e) => updateFilter('customer', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Customers</option>
                {/* Customer options would be populated from context */}
              </select>
            </div>
            
            <div>
              <select
                value={filters.dateRange}
                onChange={(e) => updateFilter('dateRange', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Dates</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="quarter">This Quarter</option>
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
            Showing {filteredPreshipments.length} of {preshipments.length} preshipments
            {(filters.search || filters.customer || filters.dateRange) && (
              <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full">(filtered)</span>
            )}
          </div>
        </div>
      </div>

      {/* Preshipments List */}
      <div className="space-y-4">
        {filteredPreshipments.length === 0 ? (
          <div className="bg-white shadow-sm border border-gray-200 rounded-lg p-12 text-center">
            <i className="fas fa-ship text-4xl text-gray-400 mb-4"></i>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {preshipments.length === 0 ? 'No preshipments yet' : 'No matching preshipments'}
            </h3>
            <p className="text-gray-600 mb-4">
              {preshipments.length === 0 
                ? 'Get started by creating your first preshipment entry.' 
                : 'Try adjusting your search or filter criteria.'}
            </p>
            {preshipments.length === 0 ? (
              <button
                onClick={() => showModal('create-preshipment-modal')}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                <i className="fas fa-plus mr-2"></i>
                Create First Preshipment
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
          filteredPreshipments.map((preshipment) => {
            const isExpanded = expandedCards.has(preshipment.shipment_id);
            const statusConfig = STATUS_CONFIG[preshipment.status] || STATUS_CONFIG['NOT_PREPARED'];
            const isFinal = ['ACCEPTED', 'REJECTED'].includes(preshipment.status);
            
            return (
              <div key={preshipment.id || preshipment.shipment_id} className={`bg-white shadow-sm border border-gray-200 rounded-lg overflow-hidden ${isFinal ? 'bg-gray-50' : ''}`}>
                {/* Card Header */}
                <div className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">
                          {preshipment.shipment_id}
                        </h3>
                        <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500">
                          <span>{preshipment.customer_name}</span>
                          {preshipment.entry_number && (
                            <span>Entry: {preshipment.entry_number}</span>
                          )}
                          <span>
                            Created: {new Date(preshipment.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      {/* Status Badge */}
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusConfig.bgClass}`}>
                        <i className={`${statusConfig.icon} mr-1`}></i>
                        {statusConfig.label}
                      </span>
                      
                      {/* Action Buttons */}
                      <div className="flex space-x-2">
                        {preshipment.status === 'DRAFT' && (
                          <button
                            onClick={() => handleGenerateEntry(preshipment)}
                            disabled={generateEntryMutation.isLoading}
                            className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                          >
                            <i className="fas fa-file-alt mr-1"></i>
                            Generate Entry Summary
                          </button>
                        )}
                        
                        {preshipment.status === 'READY_TO_FILE' && (
                          <button
                            onClick={() => handleFileWithCBP(preshipment)}
                            disabled={fileWithCBPMutation.isLoading}
                            className="text-green-600 hover:text-green-900 text-sm font-medium"
                          >
                            <i className="fas fa-paper-plane mr-1"></i>
                            File with CBP
                          </button>
                        )}
                        
                        {['FILED', 'ACCEPTED'].includes(preshipment.status) && (
                          <button
                            onClick={() => showModal('review-entry-summary', preshipment)}
                            className="text-purple-600 hover:text-purple-900 text-sm font-medium"
                          >
                            <i className="fas fa-eye mr-1"></i>
                            Review Entry Summary
                          </button>
                        )}
                        
                        <button
                          onClick={() => showModal('edit-preshipment-modal', preshipment)}
                          className="text-gray-600 hover:text-gray-900 text-sm font-medium"
                        >
                          <i className="fas fa-edit mr-1"></i>
                          Edit
                        </button>
                        
                        <button
                          onClick={() => toggleCardExpansion(preshipment.shipment_id)}
                          className="text-gray-600 hover:text-gray-900 text-sm font-medium"
                        >
                          <i className={`fas fa-chevron-${isExpanded ? 'up' : 'down'} mr-1`}></i>
                          {isExpanded ? 'Collapse' : 'Expand'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Expanded Content */}
                {isExpanded && (
                  <div className="border-t border-gray-200 bg-gray-50">
                    <div className="p-6">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Shipment Details */}
                        <div>
                          <h4 className="text-sm font-medium text-gray-900 mb-3">Shipment Details</h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-500">Type:</span>
                              <span className="text-gray-900">{preshipment.shipment_type || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">BOL Number:</span>
                              <span className="text-gray-900">{preshipment.bol_number || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">Voyage:</span>
                              <span className="text-gray-900">{preshipment.voyage || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">Carrier:</span>
                              <span className="text-gray-900">{preshipment.carrier_code || 'N/A'}</span>
                            </div>
                          </div>
                        </div>
                        
                        {/* ACE Entry Summary */}
                        <div>
                          <h4 className="text-sm font-medium text-gray-900 mb-3">ACE Entry Summary</h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-500">Filing District:</span>
                              <span className="text-gray-900">{preshipment.filing_district_port || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">Entry Filer:</span>
                              <span className="text-gray-900">{preshipment.entry_filer_code || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">IOR Number:</span>
                              <span className="text-gray-900">{preshipment.ior_number || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">Bond Type:</span>
                              <span className="text-gray-900">{preshipment.bond_type || 'N/A'}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Line Items */}
                      {preshipment.line_items && preshipment.line_items.length > 0 && (
                        <div className="mt-6">
                          <h4 className="text-sm font-medium text-gray-900 mb-3">Line Items ({preshipment.line_items.length})</h4>
                          <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                              <thead className="bg-gray-100">
                                <tr>
                                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Part</th>
                                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lot</th>
                                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">HTS Code</th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-200">
                                {preshipment.line_items.map((item, index) => (
                                  <tr key={index}>
                                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                                      {item.part_number}
                                    </td>
                                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                                      {item.lot_number}
                                    </td>
                                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                                      {item.quantity}
                                    </td>
                                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                                      {item.hts_code}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default PreShipments;