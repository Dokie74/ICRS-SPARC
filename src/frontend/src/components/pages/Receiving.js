import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApp } from '../../contexts/AppContext';
import { receivingService } from '../../services/receivingService';

// Receiving status configuration for FTZ workflow
const RECEIVING_STATUS_CONFIG = {
  'Pending': { 
    color: 'yellow', 
    label: 'Pending Arrival', 
    icon: 'fas fa-clock',
    description: 'Awaiting dock arrival'
  },
  'Arrived': { 
    color: 'blue', 
    label: 'Arrived at Dock', 
    icon: 'fas fa-truck',
    description: 'Container/shipment at dock'
  },
  'Inspecting': { 
    color: 'purple', 
    label: 'Under Inspection', 
    icon: 'fas fa-search',
    description: 'FTZ compliance inspection in progress'
  },
  'Accepted': { 
    color: 'green', 
    label: 'Accepted', 
    icon: 'fas fa-check-circle',
    description: 'Inspection passed, goods accepted'
  },
  'Rejected': { 
    color: 'red', 
    label: 'Rejected', 
    icon: 'fas fa-times-circle',
    description: 'Failed inspection, goods rejected'
  },
  'On Hold': { 
    color: 'orange', 
    label: 'On Hold', 
    icon: 'fas fa-pause-circle',
    description: 'Additional documentation required'
  }
};

// Filter views for receiving workflow
const RECEIVING_VIEWS = {
  'dock-audit': { label: 'Awaiting Dock Audit', statuses: ['Arrived', 'Inspecting'] },
  'pending': { label: 'Pending Arrival', statuses: ['Pending'] },
  'completed': { label: 'Completed', statuses: ['Accepted', 'Rejected'] },
  'on-hold': { label: 'On Hold', statuses: ['On Hold'] },
  'all': { label: 'All', statuses: Object.keys(RECEIVING_STATUS_CONFIG) }
};

const Receiving = () => {
  const { showSuccess, showError, showModal } = useApp();
  const queryClient = useQueryClient();
  const [currentView, setCurrentView] = useState('dock-audit');
  const [filters, setFilters] = useState({
    search: '',
    container: '',
    ftz_status: ''
  });

  // Fetch receiving data with React Query
  const {
    data: receivingData,
    isLoading: receivingLoading,
    error: receivingError,
    refetch: refetchReceiving
  } = useQuery(
    ['receiving', currentView],
    () => receivingService.getAll({ view: currentView }),
    {
      staleTime: 1 * 60 * 1000, // 1 minute (dock operations need fresher data)
      cacheTime: 3 * 60 * 1000, // 3 minutes
    }
  );

  const preadmissions = receivingData?.preadmissions || [];

  // Update receiving status mutation
  const updateStatusMutation = useMutation(
    ({ id, status, notes }) => receivingService.updateStatus(id, status, notes),
    {
      onSuccess: (data, variables) => {
        showSuccess(`Shipment ${variables.status.toLowerCase()} successfully`);
        queryClient.invalidateQueries(['receiving']);
      },
      onError: (error) => {
        showError(`Failed to update shipment: ${error.message}`);
      }
    }
  );

  // Complete dock audit mutation
  const completeDockAuditMutation = useMutation(
    ({ id, auditData }) => receivingService.completeDockAudit(id, auditData),
    {
      onSuccess: () => {
        showSuccess('Dock audit completed successfully');
        queryClient.invalidateQueries(['receiving']);
      },
      onError: (error) => {
        showError(`Failed to complete dock audit: ${error.message}`);
      }
    }
  );

  // Filtered data based on current view and search
  const filteredPreadmissions = useMemo(() => {
    let filtered = [...preadmissions];

    // Apply view filter (status-based)
    const viewConfig = RECEIVING_VIEWS[currentView];
    if (viewConfig) {
      filtered = filtered.filter(pa => viewConfig.statuses.includes(pa.status));
    }

    // Apply search filter
    if (filters.search) {
      const term = filters.search.toLowerCase();
      filtered = filtered.filter(pa => 
        (pa.admission_id && pa.admission_id.toLowerCase().includes(term)) ||
        (pa.container_number && pa.container_number.toLowerCase().includes(term)) ||
        (pa.customer_name && pa.customer_name.toLowerCase().includes(term)) ||
        (pa.bol_number && pa.bol_number.toLowerCase().includes(term)) ||
        (pa.reference_number && pa.reference_number.toLowerCase().includes(term))
      );
    }

    // Apply container filter
    if (filters.container) {
      filtered = filtered.filter(pa => 
        pa.container_number && pa.container_number.toLowerCase().includes(filters.container.toLowerCase())
      );
    }

    // Apply FTZ status filter
    if (filters.ftz_status) {
      filtered = filtered.filter(pa => pa.ftz_status === filters.ftz_status);
    }

    // Sort by priority: Arrived first, then by arrival time, then by FTZ urgency
    filtered.sort((a, b) => {
      // Priority 1: Status urgency (Arrived > Inspecting > others)
      const statusPriority = { 'Arrived': 3, 'Inspecting': 2 };
      const aPriority = statusPriority[a.status] || 1;
      const bPriority = statusPriority[b.status] || 1;
      
      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }
      
      // Priority 2: Arrival time (most recent first for active items)
      if (a.status === 'Arrived' && b.status === 'Arrived') {
        const aTime = new Date(a.arrived_at || a.expected_arrival);
        const bTime = new Date(b.arrived_at || b.expected_arrival);
        return bTime - aTime;
      }
      
      // Priority 3: FTZ urgency
      const ftzPriority = { 'Urgent': 3, 'Normal': 2, 'Low': 1 };
      const aFtzPriority = ftzPriority[a.ftz_urgency] || 2;
      const bFtzPriority = ftzPriority[b.ftz_urgency] || 2;
      
      return bFtzPriority - aFtzPriority;
    });

    return filtered;
  }, [preadmissions, currentView, filters]);

  const updateFilter = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({ search: '', container: '', ftz_status: '' });
  };

  // Statistics for current view
  const viewStats = useMemo(() => {
    const viewConfig = RECEIVING_VIEWS[currentView];
    if (!viewConfig) return { total: 0 };
    
    const viewItems = preadmissions.filter(pa => viewConfig.statuses.includes(pa.status));
    
    const stats = {
      total: viewItems.length,
      arrived_today: viewItems.filter(pa => 
        pa.status === 'Arrived' && 
        pa.arrived_at &&
        new Date(pa.arrived_at).toDateString() === new Date().toDateString()
      ).length,
      ftz_urgent: viewItems.filter(pa => pa.ftz_urgency === 'Urgent').length,
      awaiting_audit: viewItems.filter(pa => pa.status === 'Arrived').length,
      in_progress: viewItems.filter(pa => pa.status === 'Inspecting').length
    };
    
    return stats;
  }, [preadmissions, currentView]);

  const handleStatusUpdate = (shipment, newStatus) => {
    updateStatusMutation.mutate({
      id: shipment.id,
      status: newStatus,
      notes: `Status updated to ${newStatus} via dock operations`
    });
  };

  const handleDockAudit = (shipment) => {
    showModal('dock-audit-modal', shipment);
  };

  const handleContainerInspection = (shipment) => {
    // Mark as inspecting and open inspection modal
    handleStatusUpdate(shipment, 'Inspecting');
    setTimeout(() => {
      showModal('dock-audit-modal', { ...shipment, status: 'Inspecting' });
    }, 500);
  };

  if (receivingLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (receivingError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <i className="fas fa-exclamation-circle text-red-400"></i>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error loading receiving data</h3>
            <div className="mt-2 text-sm text-red-700">
              <p>{receivingError.message}</p>
            </div>
            <div className="mt-4">
              <button
                onClick={() => refetchReceiving()}
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
            <h1 className="text-2xl font-semibold text-gray-900">Receiving Management</h1>
            <p className="mt-1 text-sm text-gray-700">
              FTZ-compliant receiving workflow: Pending → Arrived → Inspecting → Accepted/Rejected
            </p>
          </div>
          <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none space-x-2">
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              onClick={() => refetchReceiving()}
            >
              <i className="fas fa-sync-alt mr-2"></i>
              Refresh Dock Status
            </button>
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              onClick={() => showModal('create-receiving-entry-modal')}
            >
              <i className="fas fa-plus mr-2"></i>
              Add Dock Arrival
            </button>
          </div>
        </div>
      </div>

      {/* View Tabs and Statistics */}
      <div className="bg-white shadow-sm border border-gray-200 rounded-lg p-4">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {Object.entries(RECEIVING_VIEWS).map(([key, config]) => (
              <button
                key={key}
                onClick={() => setCurrentView(key)}
                className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                  currentView === key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {config.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Quick Stats for Current View */}
        <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-blue-50 p-3 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{viewStats.total}</div>
            <div className="text-sm text-blue-800">Total Items</div>
          </div>
          <div className="bg-green-50 p-3 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{viewStats.arrived_today}</div>
            <div className="text-sm text-green-800">Arrived Today</div>
          </div>
          <div className="bg-red-50 p-3 rounded-lg">
            <div className="text-2xl font-bold text-red-600">{viewStats.ftz_urgent}</div>
            <div className="text-sm text-red-800">FTZ Urgent</div>
          </div>
          <div className="bg-yellow-50 p-3 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600">{viewStats.awaiting_audit}</div>
            <div className="text-sm text-yellow-800">Awaiting Audit</div>
          </div>
          <div className="bg-purple-50 p-3 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">{viewStats.in_progress}</div>
            <div className="text-sm text-purple-800">In Progress</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white shadow-sm border border-gray-200 rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <i className="fas fa-search text-gray-400"></i>
            </div>
            <input
              type="text"
              placeholder="Search containers, BOL, customer..."
              value={filters.search}
              onChange={(e) => updateFilter('search', e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div>
            <input
              type="text"
              placeholder="Filter by container..."
              value={filters.container}
              onChange={(e) => updateFilter('container', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div>
            <select
              value={filters.ftz_status}
              onChange={(e) => updateFilter('ftz_status', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All FTZ Status</option>
              <option value="Compliant">FTZ Compliant</option>
              <option value="Pending">FTZ Pending</option>
              <option value="Non-Compliant">Non-Compliant</option>
              <option value="Exempt">Exempt</option>
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
          Showing {filteredPreadmissions.length} of {preadmissions.length} items in {RECEIVING_VIEWS[currentView].label.toLowerCase()}
          {(filters.search || filters.container || filters.ftz_status) && (
            <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full">(filtered)</span>
          )}
        </div>
      </div>

      {/* Receiving Table */}
      <div className="bg-white shadow-sm border border-gray-200 rounded-lg overflow-hidden">
        {filteredPreadmissions.length === 0 ? (
          <div className="p-12 text-center">
            <i className="fas fa-truck-loading text-4xl text-gray-400 mb-4"></i>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {preadmissions.length === 0 ? 'No items in receiving' : 'No matching items'}
            </h3>
            <p className="text-gray-600 mb-4">
              {preadmissions.length === 0 
                ? 'Items will appear here when they arrive at the dock.' 
                : 'Try adjusting your view or filter criteria.'}
            </p>
            {filteredPreadmissions.length === 0 && preadmissions.length > 0 && (
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
                    Container / BOL
                  </th>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Customer / Reference
                  </th>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Status
                  </th>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    FTZ Status
                  </th>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Arrival Time
                  </th>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Urgency
                  </th>
                  <th className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {filteredPreadmissions.map(admission => {
                  const statusConfig = RECEIVING_STATUS_CONFIG[admission.status] || RECEIVING_STATUS_CONFIG['Pending'];
                  const isCompleted = ['Accepted', 'Rejected'].includes(admission.status);
                  const isUrgent = admission.ftz_urgency === 'Urgent';
                  const needsAudit = admission.status === 'Arrived';
                  
                  return (
                    <tr key={admission.id} className={`${
                      isCompleted ? 'bg-gray-50' : 
                      needsAudit ? 'bg-yellow-50' : 
                      isUrgent ? 'bg-red-50' : 
                      'hover:bg-gray-50'
                    }`}>
                      <td className="py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                        <div>
                          {admission.container_number && (
                            <div className="font-medium">{admission.container_number}</div>
                          )}
                          {admission.bol_number && (
                            <div className="text-xs text-gray-500">BOL: {admission.bol_number}</div>
                          )}
                          {admission.admission_id && (
                            <div className="text-xs text-gray-500">ID: {admission.admission_id}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-4 text-sm text-gray-900">
                        <div>
                          <div className="font-medium">{admission.customer_name || 'N/A'}</div>
                          {admission.reference_number && (
                            <div className="text-xs text-gray-500">Ref: {admission.reference_number}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-4 text-sm">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          statusConfig.color === 'green' ? 'bg-green-100 text-green-800' :
                          statusConfig.color === 'yellow' ? 'bg-yellow-100 text-yellow-800' :
                          statusConfig.color === 'blue' ? 'bg-blue-100 text-blue-800' :
                          statusConfig.color === 'purple' ? 'bg-purple-100 text-purple-800' :
                          statusConfig.color === 'orange' ? 'bg-orange-100 text-orange-800' :
                          statusConfig.color === 'red' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          <i className={`${statusConfig.icon} mr-1`}></i>
                          {statusConfig.label}
                        </span>
                      </td>
                      <td className="px-3 py-4 text-sm">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          admission.ftz_status === 'Compliant' ? 'bg-green-100 text-green-800' :
                          admission.ftz_status === 'Non-Compliant' ? 'bg-red-100 text-red-800' :
                          admission.ftz_status === 'Exempt' ? 'bg-blue-100 text-blue-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          <i className={`${
                            admission.ftz_status === 'Compliant' ? 'fas fa-check' :
                            admission.ftz_status === 'Non-Compliant' ? 'fas fa-times' :
                            admission.ftz_status === 'Exempt' ? 'fas fa-shield-alt' :
                            'fas fa-clock'
                          } mr-1`}></i>
                          {admission.ftz_status || 'Pending'}
                        </span>
                      </td>
                      <td className="px-3 py-4 text-sm text-gray-900">
                        {admission.arrived_at ? (
                          <div>
                            <div>{new Date(admission.arrived_at).toLocaleDateString()}</div>
                            <div className="text-xs text-gray-500">
                              {new Date(admission.arrived_at).toLocaleTimeString()}
                            </div>
                          </div>
                        ) : admission.expected_arrival ? (
                          <div>
                            <div className="text-gray-500">Expected:</div>
                            <div className="text-xs">{new Date(admission.expected_arrival).toLocaleDateString()}</div>
                          </div>
                        ) : (
                          'Not set'
                        )}
                      </td>
                      <td className="px-3 py-4 text-sm">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          admission.ftz_urgency === 'Urgent' ? 'bg-red-100 text-red-800' :
                          admission.ftz_urgency === 'Normal' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {admission.ftz_urgency === 'Urgent' && <i className="fas fa-exclamation-triangle mr-1"></i>}
                          {admission.ftz_urgency || 'Normal'}
                        </span>
                      </td>
                      <td className="px-3 py-4 text-right text-sm font-medium">
                        <div className="flex space-x-2 justify-end">
                          {/* Status-specific actions */}
                          {admission.status === 'Pending' && (
                            <button
                              className="text-blue-600 hover:text-blue-900"
                              onClick={() => handleStatusUpdate(admission, 'Arrived')}
                              title="Mark as arrived at dock"
                            >
                              <i className="fas fa-truck mr-1"></i>
                              Arrived
                            </button>
                          )}
                          
                          {admission.status === 'Arrived' && (
                            <button
                              className="text-purple-600 hover:text-purple-900"
                              onClick={() => handleDockAudit(admission)}
                              title="Start dock audit inspection"
                            >
                              <i className="fas fa-clipboard-check mr-1"></i>
                              Start Audit
                            </button>
                          )}
                          
                          {admission.status === 'Inspecting' && (
                            <button
                              className="text-green-600 hover:text-green-900"
                              onClick={() => handleDockAudit(admission)}
                              title="Complete dock audit"
                            >
                              <i className="fas fa-check mr-1"></i>
                              Complete
                            </button>
                          )}

                          {/* Always available actions */}
                          <button
                            className="text-gray-600 hover:text-gray-900"
                            onClick={() => showModal('view-preadmission-modal', admission)}
                            title="View details"
                          >
                            <i className="fas fa-eye"></i>
                          </button>

                          {/* Additional actions for completed items */}
                          {isCompleted && (
                            <button
                              className="text-blue-600 hover:text-blue-900"
                              onClick={() => showModal('view-dock-audit-report', admission)}
                              title="View audit report"
                            >
                              <i className="fas fa-file-alt"></i>
                            </button>
                          )}
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

export default Receiving;