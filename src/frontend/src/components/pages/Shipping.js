import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApp } from '../../contexts/AppContext';
import { shippingService } from '../../services/shippingService';

// 5-stage shipping workflow status configuration
const SHIPPING_STATUS_CONFIG = {
  'Draft': { 
    color: 'gray', 
    label: 'Draft', 
    icon: 'fas fa-edit',
    stage: 1,
    description: 'Initial draft - editable'
  },
  'Pending Pick': { 
    color: 'yellow', 
    label: 'Pending Pick', 
    icon: 'fas fa-clock',
    stage: 2,
    description: 'Awaiting inventory allocation'
  },
  'Pulled': { 
    color: 'blue', 
    label: 'Pulled', 
    icon: 'fas fa-boxes',
    stage: 3,
    description: 'Items pulled from inventory'
  },
  'Generate Labels': { 
    color: 'purple', 
    label: 'Generate Labels', 
    icon: 'fas fa-print',
    stage: 4,
    description: 'Ready for label generation'
  },
  'Ready for Pickup': { 
    color: 'orange', 
    label: 'Ready for Pickup', 
    icon: 'fas fa-truck-loading',
    stage: 5,
    description: 'Labels printed, ready for pickup'
  },
  'Shipped': { 
    color: 'green', 
    label: 'Shipped', 
    icon: 'fas fa-check-circle',
    stage: 6,
    description: 'Completed and shipped'
  },
  'On Hold': { 
    color: 'red', 
    label: 'On Hold', 
    icon: 'fas fa-pause-circle',
    stage: 0,
    description: 'Temporarily paused'
  }
};

// Filter views for shipping workflow
const SHIPPING_VIEWS = {
  'active': { label: 'Active', statuses: ['Draft', 'Pending Pick', 'Pulled', 'Generate Labels', 'Ready for Pickup'] },
  'pending-compliance': { label: 'Pending Compliance', statuses: ['Pending Pick', 'Pulled'] },
  'ready-dock': { label: 'Ready for Dock', statuses: ['Generate Labels', 'Ready for Pickup'] },
  'shipped': { label: 'Shipped', statuses: ['Shipped'] },
  'on-hold': { label: 'On Hold', statuses: ['On Hold'] }
};

const Shipping = () => {
  const { showSuccess, showError, showModal } = useApp();
  const queryClient = useQueryClient();
  const [currentView, setCurrentView] = useState('active');
  const [filters, setFilters] = useState({
    search: '',
    customer: '',
    priority: ''
  });

  // Fetch shipping data with React Query
  const {
    data: shippingData,
    isLoading: shippingLoading,
    error: shippingError,
    refetch: refetchShipping
  } = useQuery(
    ['shipping', currentView],
    () => shippingService.getAll({ view: currentView }),
    {
      staleTime: 2 * 60 * 1000, // 2 minutes
      cacheTime: 5 * 60 * 1000, // 5 minutes
    }
  );

  const preshipments = shippingData?.preshipments || [];

  // Update shipping status mutation
  const updateStatusMutation = useMutation(
    ({ id, status, notes }) => shippingService.updateStatus(id, status, notes),
    {
      onSuccess: (data, variables) => {
        showSuccess(`Shipment ${variables.status.toLowerCase()} successfully`);
        queryClient.invalidateQueries(['shipping']);
      },
      onError: (error) => {
        showError(`Failed to update shipment: ${error.message}`);
      }
    }
  );

  // Generate labels mutation
  const generateLabelsMutation = useMutation(
    (shipmentId) => shippingService.generateLabels(shipmentId),
    {
      onSuccess: () => {
        showSuccess('Labels generated successfully');
        queryClient.invalidateQueries(['shipping']);
      },
      onError: (error) => {
        showError(`Failed to generate labels: ${error.message}`);
      }
    }
  );

  // CBP filing mutation
  const cbpFilingMutation = useMutation(
    (shipmentId) => shippingService.fileWithCBP(shipmentId),
    {
      onSuccess: () => {
        showSuccess('CBP filing initiated successfully');
        queryClient.invalidateQueries(['shipping']);
      },
      onError: (error) => {
        showError(`CBP filing failed: ${error.message}`);
      }
    }
  );

  // Filtered data based on current view and search
  const filteredPreshipments = useMemo(() => {
    let filtered = [...preshipments];

    // Apply view filter (status-based)
    const viewConfig = SHIPPING_VIEWS[currentView];
    if (viewConfig) {
      filtered = filtered.filter(ps => viewConfig.statuses.includes(ps.status));
    }

    // Apply search filter
    if (filters.search) {
      const term = filters.search.toLowerCase();
      filtered = filtered.filter(ps => 
        (ps.shipment_id && ps.shipment_id.toLowerCase().includes(term)) ||
        (ps.customer_name && ps.customer_name.toLowerCase().includes(term)) ||
        (ps.reference_number && ps.reference_number.toLowerCase().includes(term)) ||
        (ps.tracking_number && ps.tracking_number.toLowerCase().includes(term))
      );
    }

    // Apply customer filter
    if (filters.customer) {
      filtered = filtered.filter(ps => 
        ps.customer_name && ps.customer_name.toLowerCase().includes(filters.customer.toLowerCase())
      );
    }

    // Apply priority filter
    if (filters.priority) {
      filtered = filtered.filter(ps => ps.priority === filters.priority);
    }

    // Sort by status stage (workflow order) then by priority
    filtered.sort((a, b) => {
      const aStage = SHIPPING_STATUS_CONFIG[a.status]?.stage || 0;
      const bStage = SHIPPING_STATUS_CONFIG[b.status]?.stage || 0;
      
      if (aStage !== bStage) {
        return aStage - bStage;
      }
      
      // Within same stage, sort by priority (High > Medium > Low)
      const priorityOrder = { 'High': 3, 'Medium': 2, 'Low': 1 };
      const aPriority = priorityOrder[a.priority] || 0;
      const bPriority = priorityOrder[b.priority] || 0;
      
      return bPriority - aPriority;
    });

    return filtered;
  }, [preshipments, currentView, filters]);

  const updateFilter = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({ search: '', customer: '', priority: '' });
  };

  // Statistics for current view
  const viewStats = useMemo(() => {
    const viewConfig = SHIPPING_VIEWS[currentView];
    if (!viewConfig) return { total: 0 };
    
    const viewItems = preshipments.filter(ps => viewConfig.statuses.includes(ps.status));
    
    const stats = {
      total: viewItems.length,
      high_priority: viewItems.filter(ps => ps.priority === 'High').length,
      compliance_pending: viewItems.filter(ps => 
        ps.status === 'Pending Pick' && !ps.cbp_filed
      ).length,
      ready_today: viewItems.filter(ps => 
        ps.status === 'Ready for Pickup' && 
        new Date(ps.pickup_date).toDateString() === new Date().toDateString()
      ).length
    };
    
    return stats;
  }, [preshipments, currentView]);

  const handleStatusUpdate = (shipment, newStatus) => {
    updateStatusMutation.mutate({
      id: shipment.id,
      status: newStatus,
      notes: `Status updated to ${newStatus} via workflow`
    });
  };

  const handleGenerateLabels = (shipment) => {
    showModal('print-labels-modal', shipment);
  };

  const handleDriverSignoff = (shipment) => {
    showModal('driver-signoff-modal', shipment);
  };

  const handleCBPFiling = (shipment) => {
    cbpFilingMutation.mutate(shipment.id);
  };

  if (shippingLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (shippingError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <i className="fas fa-exclamation-circle text-red-400"></i>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error loading shipping data</h3>
            <div className="mt-2 text-sm text-red-700">
              <p>{shippingError.message}</p>
            </div>
            <div className="mt-4">
              <button
                onClick={() => refetchShipping()}
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
            <h1 className="text-2xl font-semibold text-gray-900">Shipping Management</h1>
            <p className="mt-1 text-sm text-gray-700">
              5-stage shipping workflow: Draft → Pending Pick → Pulled → Generate Labels → Ready for Pickup → Shipped
            </p>
          </div>
          <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              onClick={() => showModal('create-preshipment-modal')}
            >
              <i className="fas fa-plus mr-2"></i>
              Create New Shipment
            </button>
          </div>
        </div>
      </div>

      {/* View Tabs and Statistics */}
      <div className="bg-white shadow-sm border border-gray-200 rounded-lg p-4">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {Object.entries(SHIPPING_VIEWS).map(([key, config]) => (
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
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 p-3 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{viewStats.total}</div>
            <div className="text-sm text-blue-800">Total Items</div>
          </div>
          <div className="bg-red-50 p-3 rounded-lg">
            <div className="text-2xl font-bold text-red-600">{viewStats.high_priority}</div>
            <div className="text-sm text-red-800">High Priority</div>
          </div>
          <div className="bg-yellow-50 p-3 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600">{viewStats.compliance_pending}</div>
            <div className="text-sm text-yellow-800">Pending Compliance</div>
          </div>
          <div className="bg-green-50 p-3 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{viewStats.ready_today}</div>
            <div className="text-sm text-green-800">Ready Today</div>
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
              placeholder="Search shipments..."
              value={filters.search}
              onChange={(e) => updateFilter('search', e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div>
            <input
              type="text"
              placeholder="Filter by customer..."
              value={filters.customer}
              onChange={(e) => updateFilter('customer', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div>
            <select
              value={filters.priority}
              onChange={(e) => updateFilter('priority', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Priorities</option>
              <option value="High">High Priority</option>
              <option value="Medium">Medium Priority</option>
              <option value="Low">Low Priority</option>
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
          Showing {filteredPreshipments.length} of {preshipments.length} shipments in {SHIPPING_VIEWS[currentView].label.toLowerCase()} view
          {(filters.search || filters.customer || filters.priority) && (
            <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full">(filtered)</span>
          )}
        </div>
      </div>

      {/* Shipments Table */}
      <div className="bg-white shadow-sm border border-gray-200 rounded-lg overflow-hidden">
        {filteredPreshipments.length === 0 ? (
          <div className="p-12 text-center">
            <i className="fas fa-shipping-fast text-4xl text-gray-400 mb-4"></i>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {preshipments.length === 0 ? 'No shipments yet' : 'No matching shipments'}
            </h3>
            <p className="text-gray-600 mb-4">
              {preshipments.length === 0 
                ? 'Create your first shipment to get started.' 
                : 'Try adjusting your view or filter criteria.'}
            </p>
            {preshipments.length === 0 ? (
              <button
                onClick={() => showModal('create-preshipment-modal')}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                <i className="fas fa-plus mr-2"></i>
                Create First Shipment
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
                    Shipment ID
                  </th>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Customer / Reference
                  </th>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Status / Stage
                  </th>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Priority
                  </th>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Pickup Date
                  </th>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    CBP Status
                  </th>
                  <th className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {filteredPreshipments.map(shipment => {
                  const statusConfig = SHIPPING_STATUS_CONFIG[shipment.status] || SHIPPING_STATUS_CONFIG['Draft'];
                  const isCompleted = shipment.status === 'Shipped';
                  const isOnHold = shipment.status === 'On Hold';
                  
                  return (
                    <tr key={shipment.id} className={`${isCompleted ? 'bg-gray-50' : isOnHold ? 'bg-red-50' : 'hover:bg-gray-50'}`}>
                      <td className="py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                        <div>
                          <div className="font-medium">{shipment.shipment_id || shipment.id}</div>
                          {shipment.tracking_number && (
                            <div className="text-xs text-gray-500">Track: {shipment.tracking_number}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-4 text-sm text-gray-900">
                        <div>
                          <div className="font-medium">{shipment.customer_name || 'N/A'}</div>
                          {shipment.reference_number && (
                            <div className="text-xs text-gray-500">Ref: {shipment.reference_number}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-4 text-sm">
                        <div className="flex items-center">
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
                          <div className="ml-2 text-xs text-gray-500">
                            Stage {statusConfig.stage}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-4 text-sm">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          shipment.priority === 'High' ? 'bg-red-100 text-red-800' :
                          shipment.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {shipment.priority || 'Medium'}
                        </span>
                      </td>
                      <td className="px-3 py-4 text-sm text-gray-900">
                        {shipment.pickup_date ? new Date(shipment.pickup_date).toLocaleDateString() : 'Not scheduled'}
                      </td>
                      <td className="px-3 py-4 text-sm">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          shipment.cbp_filed ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          <i className={`${shipment.cbp_filed ? 'fas fa-check' : 'fas fa-clock'} mr-1`}></i>
                          {shipment.cbp_filed ? 'Filed' : 'Pending'}
                        </span>
                      </td>
                      <td className="px-3 py-4 text-right text-sm font-medium">
                        <div className="flex space-x-2 justify-end">
                          {/* Status-specific actions */}
                          {shipment.status === 'Draft' && (
                            <>
                              <button
                                className="text-green-600 hover:text-green-900"
                                onClick={() => showModal('edit-preshipment-modal', shipment)}
                                title="Edit shipment"
                              >
                                <i className="fas fa-edit"></i>
                              </button>
                              <button
                                className="text-blue-600 hover:text-blue-900"
                                onClick={() => handleStatusUpdate(shipment, 'Pending Pick')}
                                title="Submit for picking"
                              >
                                <i className="fas fa-arrow-right"></i>
                              </button>
                            </>
                          )}
                          
                          {shipment.status === 'Pending Pick' && (
                            <>
                              <button
                                className="text-purple-600 hover:text-purple-900"
                                onClick={() => handleCBPFiling(shipment)}
                                title="File with CBP"
                                disabled={shipment.cbp_filed}
                              >
                                <i className="fas fa-file-export"></i>
                              </button>
                              <button
                                className="text-blue-600 hover:text-blue-900"
                                onClick={() => handleStatusUpdate(shipment, 'Pulled')}
                                title="Mark as pulled"
                              >
                                <i className="fas fa-boxes"></i>
                              </button>
                            </>
                          )}
                          
                          {shipment.status === 'Pulled' && (
                            <button
                              className="text-blue-600 hover:text-blue-900"
                              onClick={() => handleStatusUpdate(shipment, 'Generate Labels')}
                              title="Ready for labels"
                            >
                              <i className="fas fa-print"></i>
                            </button>
                          )}
                          
                          {shipment.status === 'Generate Labels' && (
                            <button
                              className="text-purple-600 hover:text-purple-900"
                              onClick={() => handleGenerateLabels(shipment)}
                              title="Generate shipping labels"
                            >
                              <i className="fas fa-print mr-1"></i>
                              Labels
                            </button>
                          )}
                          
                          {shipment.status === 'Ready for Pickup' && (
                            <button
                              className="text-green-600 hover:text-green-900"
                              onClick={() => handleDriverSignoff(shipment)}
                              title="Driver signoff"
                            >
                              <i className="fas fa-signature mr-1"></i>
                              Signoff
                            </button>
                          )}

                          {/* Always available actions */}
                          <button
                            className="text-gray-600 hover:text-gray-900"
                            onClick={() => showModal('view-preshipment-modal', shipment)}
                            title="View details"
                          >
                            <i className="fas fa-eye"></i>
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

export default Shipping;