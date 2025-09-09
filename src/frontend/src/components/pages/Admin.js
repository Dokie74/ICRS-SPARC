// src/frontend/components/pages/Admin.js
// Admin data management page for ICRS SPARC
// Enhanced with complete functionality from original ICRS app
// Maintains SPARC architecture compliance with React Query and contexts

import React, { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { useApp } from '../../contexts/AppContext';
import apiClient from '../../services/api-client';
import CollapsibleSection from '../shared/CollapsibleSection';
import StatCard from '../shared/StatCard';
import BatchUploader from '../shared/BatchUploader';
import TariffDisplay from '../shared/TariffDisplay';
import LoadingSpinner, { CardSkeleton, InlineLoader } from '../shared/LoadingSpinner';
import { getMaterialLabel, getMaterialConfig } from '../../utils/materialTypes';
import { downloadTemplate, parseCSV, validateCSVData } from '../../utils/csvHelpers';

const Admin = () => {
  const { hasPermission, getUserDisplayName } = useAuth();
  const { showSuccess, showError, showModal } = useApp();
  const queryClient = useQueryClient();
  
  // Local state for UI and navigation
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSection, setSelectedSection] = useState(null);
  
  // Enhanced filtering state
  const [filters, setFilters] = useState({
    employees: { department: '', role: '', status: 'active' },
    parts: { 
      country: '', 
      manufacturer: '', 
      priceRange: '', 
      hasVariants: '', 
      material: '',
      sortBy: 'id' 
    },
    customers: { hasEin: 'all', region: '', status: 'active' },
    suppliers: { country: 'all', type: 'all', status: 'active' },
    locations: { zone: 'all', type: 'all', isActive: 'active' }
  });
  
  // Bulk operation state
  const [selectedParts, setSelectedParts] = useState([]);
  const [selectedCustomers, setSelectedCustomers] = useState([]);
  const [selectedSuppliers, setSelectedSuppliers] = useState([]);

  // Fetch customers data (primary data source for dashboard)
  const {
    data: customers,
    isLoading: customersLoading
  } = useQuery({
    queryKey: ['admin', 'customers', filters.customers, searchTerm],
    queryFn: () => apiClient.customers.getAll({
      ...filters.customers,
      search: searchTerm,
      limit: 100
    }),
    enabled: selectedSection === 'customers' || selectedSection === null
  });

  // Fetch parts data with enhanced filtering
  const {
    data: parts,
    isLoading: partsLoading,
    error: partsError
  } = useQuery({
    queryKey: ['admin', 'parts', filters.parts, searchTerm],
    queryFn: () => apiClient.parts.getAll({
      ...filters.parts,
      search: searchTerm,
      limit: 100
    }),
    enabled: selectedSection === 'parts' || selectedSection === null
  });

  // Fetch employees data
  const {
    data: employees,
    isLoading: employeesLoading,
    error: employeesError
  } = useQuery({
    queryKey: ['admin', 'employees', filters.employees, searchTerm],
    queryFn: () => apiClient.get('/admin/employees', {
      ...filters.employees,
      search: searchTerm,
      limit: 100
    }),
    enabled: selectedSection === 'employees' || selectedSection === null
  });

  // Mock data for other sections (these endpoints don't exist yet)
  const suppliers = { success: true, data: [] };
  const locations = { success: true, data: [] };
  const suppliersLoading = false;
  const locationsLoading = false;

  // Enhanced mutations for all entity types
  const deleteEmployeeMutation = useMutation({
    mutationFn: (id) => apiClient.delete(`/admin/employees/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin', 'employees']);
      showSuccess('Employee deleted successfully');
    },
    onError: (error) => showError(error.message || 'Failed to delete employee')
  });

  const deletePartMutation = useMutation({
    mutationFn: (id) => apiClient.parts.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin', 'parts']);
      showSuccess('Part deleted successfully');
    },
    onError: (error) => showError(error.message || 'Failed to delete part')
  });

  const deleteCustomerMutation = useMutation({
    mutationFn: (id) => apiClient.customers.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin', 'customers']);
      showSuccess('Customer deleted successfully');
    },
    onError: (error) => showError(error.message || 'Failed to delete customer')
  });

  const deleteSupplierMutation = useMutation({
    mutationFn: (id) => apiClient.delete(`/admin/suppliers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin', 'suppliers']);
      showSuccess('Supplier deleted successfully');
    },
    onError: (error) => showError(error.message || 'Failed to delete supplier')
  });

  const toggleLocationMutation = useMutation({
    mutationFn: ({ id, isActive }) => apiClient.patch(`/admin/locations/${id}`, { is_active: !isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin', 'locations']);
      showSuccess('Location status updated successfully');
    },
    onError: (error) => showError(error.message || 'Failed to update location status')
  });

  // Enhanced statistics dashboard
  const dashboardStats = useMemo(() => ({
    totalParts: parts?.success ? parts.data?.length || 0 : 0,
    totalCustomers: customers?.success ? customers.data?.length || 0 : 0,
    totalSuppliers: suppliers?.success ? suppliers.data?.length || 0 : 0,
    totalEmployees: employees?.success ? employees.data?.length || 0 : 0,
    totalLocations: locations?.success ? locations.data?.length || 0 : 0,
    activeLocations: locations?.success ? locations.data?.filter(l => l.is_active).length || 0 : 0,
    activeParts: parts?.success ? parts.data?.filter(p => p.standard_value > 0).length || 0 : 0
  }), [parts, customers, suppliers, employees, locations]);

  const statCards = useMemo(() => [
    {
      title: 'Total Parts',
      value: dashboardStats.totalParts,
      icon: 'fas fa-cog',
      variant: 'primary',
      onClick: () => setSelectedSection('parts')
    },
    {
      title: 'Active Customers',
      value: dashboardStats.totalCustomers,
      icon: 'fas fa-building',
      variant: 'success',
      onClick: () => setSelectedSection('customers')
    },
    {
      title: 'Total Suppliers',
      value: dashboardStats.totalSuppliers,
      icon: 'fas fa-truck',
      variant: 'warning',
      onClick: () => setSelectedSection('suppliers')
    },
    {
      title: 'Total Employees',
      value: dashboardStats.totalEmployees,
      icon: 'fas fa-users',
      variant: 'danger',
      onClick: () => setSelectedSection('employees')
    },
    {
      title: 'Priced Parts',
      value: dashboardStats.activeParts,
      icon: 'fas fa-dollar-sign',
      variant: 'success'
    },
    {
      title: 'Storage Locations',
      value: dashboardStats.activeLocations,
      icon: 'fas fa-warehouse',
      variant: 'warning',
      onClick: () => setSelectedSection('locations')
    }
  ], [dashboardStats]);

  // Filtered data with enhanced search and filtering capabilities
  const filteredParts = useMemo(() => {
    if (!parts?.success || !parts.data) return [];
    
    let filtered = parts.data.filter(part => {
      // Search filter
      const matchesSearch = !searchTerm || 
        part.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        part.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        part.hts_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        part.manufacturer_id?.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Dropdown filters
      const matchesCountry = !filters.parts.country || part.country_of_origin === filters.parts.country;
      const matchesManufacturer = !filters.parts.manufacturer || part.manufacturer_id === filters.parts.manufacturer;
      const matchesMaterial = !filters.parts.material || part.material === filters.parts.material;
      
      // Price range filter
      const matchesPriceRange = (() => {
        if (!filters.parts.priceRange) return true;
        const price = parseFloat(part.standard_value) || 0;
        switch (filters.parts.priceRange) {
          case '0-10': return price >= 0 && price <= 10;
          case '10-50': return price > 10 && price <= 50;
          case '50-100': return price > 50 && price <= 100;
          case '100+': return price > 100;
          default: return true;
        }
      })();
      
      return matchesSearch && matchesCountry && matchesManufacturer && matchesMaterial && matchesPriceRange;
    });
    
    // Sort the filtered results
    if (filters.parts.sortBy) {
      filtered.sort((a, b) => {
        const aVal = a[filters.parts.sortBy] || '';
        const bVal = b[filters.parts.sortBy] || '';
        
        if (filters.parts.sortBy === 'standard_value') {
          return parseFloat(aVal) - parseFloat(bVal);
        }
        
        return aVal.toString().localeCompare(bVal.toString());
      });
    }
    
    return filtered.slice(0, 50); // Limit for performance
  }, [parts, searchTerm, filters.parts]);

  const filteredCustomers = useMemo(() => {
    if (!customers?.success || !customers.data) return [];
    
    return customers.data.filter(customer => {
      const matchesSearch = !searchTerm || 
        customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.ein?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.contact_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.broker_name?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesEinFilter = filters.customers.hasEin === 'all' || 
        (filters.customers.hasEin === 'yes' && customer.ein) ||
        (filters.customers.hasEin === 'no' && !customer.ein);
      
      return matchesSearch && matchesEinFilter;
    }).slice(0, 20);
  }, [customers, searchTerm, filters.customers]);

  const filteredSuppliers = useMemo(() => {
    if (!suppliers?.success || !suppliers.data) return [];
    
    return suppliers.data.filter(supplier => {
      const matchesSearch = !searchTerm || 
        supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        supplier.ein?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        supplier.contact_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        supplier.broker_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        supplier.contact_person?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCountry = filters.suppliers.country === 'all' || supplier.country === filters.suppliers.country;
      const matchesType = filters.suppliers.type === 'all' || supplier.supplier_type === filters.suppliers.type;
      
      return matchesSearch && matchesCountry && matchesType;
    }).slice(0, 20);
  }, [suppliers, searchTerm, filters.suppliers]);

  const filteredLocations = useMemo(() => {
    if (!locations?.success || !locations.data) return [];
    
    return locations.data.filter(location => {
      const matchesSearch = !searchTerm || 
        location.location_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        location.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        location.zone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        location.location_type?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesType = filters.locations.type === 'all' || location.location_type === filters.locations.type;
      const matchesZone = filters.locations.zone === 'all' || location.zone === filters.locations.zone;
      const matchesActive = filters.locations.isActive === 'all' || 
        (filters.locations.isActive === 'active' && location.is_active) ||
        (filters.locations.isActive === 'inactive' && !location.is_active);
      
      return matchesSearch && matchesType && matchesZone && matchesActive;
    }).slice(0, 50);
  }, [locations, searchTerm, filters.locations]);

  // Get unique values for filter dropdowns
  const uniqueCountries = useMemo(() => {
    if (!parts?.success || !parts.data) return [];
    return [...new Set(parts.data.map(p => p.country_of_origin).filter(Boolean))].sort();
  }, [parts]);

  const uniqueManufacturers = useMemo(() => {
    if (!parts?.success || !parts.data) return [];
    return [...new Set(parts.data.map(p => p.manufacturer_id).filter(Boolean))].sort();
  }, [parts]);

  const uniqueMaterials = useMemo(() => {
    if (!parts?.success || !parts.data) return [];
    return [...new Set(parts.data.map(p => p.material).filter(Boolean))].sort();
  }, [parts]);

  const uniqueSupplierCountries = useMemo(() => {
    if (!suppliers?.success || !suppliers.data) return [];
    return [...new Set(suppliers.data.map(s => s.country).filter(Boolean))].sort();
  }, [suppliers]);

  const uniqueSupplierTypes = useMemo(() => {
    if (!suppliers?.success || !suppliers.data) return [];
    return [...new Set(suppliers.data.map(s => s.supplier_type).filter(Boolean))].sort();
  }, [suppliers]);

  const uniqueLocationTypes = useMemo(() => {
    if (!locations?.success || !locations.data) return [];
    return [...new Set(locations.data.map(l => l.location_type).filter(Boolean))].sort();
  }, [locations]);

  const uniqueLocationZones = useMemo(() => {
    if (!locations?.success || !locations.data) return [];
    return [...new Set(locations.data.map(l => l.zone).filter(Boolean))].sort();
  }, [locations]);

  // Enhanced handlers
  const handleEdit = useCallback((type, item) => {
    showModal(`${type}EditModal`, { item });
  }, [showModal]);

  const handleDelete = useCallback((type, item) => {
    const entityName = type === 'employee' ? item.first_name + ' ' + item.last_name : 
                      type === 'part' ? item.id :
                      type === 'customer' ? item.name :
                      type === 'supplier' ? item.name : item.id;
    
    const confirmMessage = `Are you sure you want to delete ${type} "${entityName}"?`;
    if (window.confirm(confirmMessage)) {
      switch (type) {
        case 'employee':
          deleteEmployeeMutation.mutate(item.id);
          break;
        case 'part':
          deletePartMutation.mutate(item.id);
          break;
        case 'customer':
          deleteCustomerMutation.mutate(item.id);
          break;
        case 'supplier':
          deleteSupplierMutation.mutate(item.id);
          break;
        default:
          showError(`Delete functionality not implemented for ${type}`);
      }
    }
  }, [deleteEmployeeMutation, deletePartMutation, deleteCustomerMutation, deleteSupplierMutation, showError]);

  // Bulk operation handlers for parts
  const handlePartSelection = useCallback((partId, isSelected) => {
    if (isSelected) {
      setSelectedParts(prev => [...prev, partId]);
    } else {
      setSelectedParts(prev => prev.filter(id => id !== partId));
    }
  }, []);

  const handleSelectAllParts = useCallback(() => {
    if (selectedParts.length === filteredParts.length) {
      setSelectedParts([]);
    } else {
      setSelectedParts(filteredParts.map(p => p.id));
    }
  }, [selectedParts.length, filteredParts]);

  const handleBulkOperation = useCallback(() => {
    if (selectedParts.length === 0) {
      showError('Please select at least one part for bulk operations');
      return;
    }
    
    showModal('bulk-part-operations-modal', { selectedParts });
  }, [selectedParts, showModal, showError]);

  const handleLocationToggle = useCallback((location) => {
    const action = location.is_active ? 'deactivate' : 'activate';
    const confirmMessage = `Are you sure you want to ${action} location "${location.location_code}"?`;
    
    if (window.confirm(confirmMessage)) {
      toggleLocationMutation.mutate({ id: location.id, isActive: location.is_active });
    }
  }, [toggleLocationMutation]);

  // Enhanced batch upload handler with comprehensive CSV processing
  const handleUploadSuccess = useCallback((uploadType, data) => {
    queryClient.invalidateQueries(['admin', uploadType]);
    queryClient.invalidateQueries(['admin', 'stats']);
    showSuccess(`Successfully imported ${data.processed} ${uploadType} records`);
  }, [queryClient, showSuccess]);

  // CSV template download handler
  const handleDownloadTemplate = useCallback((templateType, fileName) => {
    downloadTemplate(templateType, fileName);
  }, []);

  // Check admin permissions first - before any hooks
  if (!hasPermission('admin')) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }


  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          System Administration
        </h1>
        <p className="text-gray-600 mt-1">
          Manage employees, parts master data, customers, suppliers, and system configuration.
        </p>
      </div>

      {/* Enhanced Statistics Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 mb-8">
        {statCards.map((stat, index) => (
          <StatCard
            key={stat.title}
            title={stat.title}
            value={customersLoading || partsLoading ? '...' : stat.value.toLocaleString()}
            icon={stat.icon}
            variant={stat.variant}
            loading={customersLoading || partsLoading}
            onClick={stat.onClick}
            className="cursor-pointer hover:shadow-lg transition-all duration-200"
          />
        ))}
      </div>

      {/* Global Search */}
      <div className="mb-8">
        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <i className="fas fa-search text-gray-400"></i>
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Search across all data..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <button
            onClick={() => {
              setSearchTerm('');
              setSelectedSection(null);
            }}
            className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Employee Management */}
      <div className="mb-8">
        <CollapsibleSection
          title="Employee Management"
          icon="fas fa-users"
          variant="primary"
          defaultOpen={selectedSection === 'employees'}
          badge={employees?.success ? employees.data?.length : null}
          description="Manage employee records, roles, and permissions"
          headerActions={
            <button
              onClick={() => showModal('EmployeeCreateModal')}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              <i className="fas fa-plus mr-1"></i> Add Employee
            </button>
          }
        >
          {employeesLoading ? (
            <InlineLoader text="Loading employees..." />
          ) : employees?.success ? (
            <div className="space-y-4">
              {employees.data?.length > 0 ? (
                <div className="bg-white rounded-lg border">
                  <div className="px-4 py-3 border-b border-gray-200">
                    <h4 className="text-lg font-medium text-gray-900">Employee Records</h4>
                  </div>
                  <div className="divide-y divide-gray-200">
                    {employees.data.map((employee) => (
                      <div key={employee.id} className="px-4 py-4 hover:bg-gray-50">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="flex-shrink-0">
                              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                <i className="fas fa-user text-blue-600"></i>
                              </div>
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {employee.name}
                              </div>
                              <div className="text-sm text-gray-500">{employee.email}</div>
                              <div className="text-xs text-gray-400">
                                {employee.role} • {employee.department}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                              employee.status === 'active' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {employee.status}
                            </span>
                            <button
                              onClick={() => handleEdit('employee', employee)}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              <i className="fas fa-edit"></i>
                            </button>
                            <button
                              onClick={() => handleDelete('employee', employee)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <i className="fas fa-trash"></i>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <i className="fas fa-users text-4xl text-gray-300 mb-4"></i>
                  <p className="text-gray-500">No employees found. Click "Add Employee" to get started.</p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No employee data available</p>
          )}
        </CollapsibleSection>
      </div>

      {/* Enhanced Part Number Master */}
      <div className="mb-8">
        <CollapsibleSection
          title="Part Number Master"
          icon="fas fa-cog"
          variant="warning"
          defaultOpen={selectedSection === 'parts'}
          badge={`${dashboardStats.totalParts} parts`}
          description="Manage parts, variants, pricing, and bulk operations"
          headerActions={[
            selectedParts.length > 0 && (
              <button
                key="bulk-ops"
                onClick={handleBulkOperation}
                className="inline-flex items-center px-3 py-1.5 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition-colors duration-200 shadow-sm mr-2"
              >
                <i className="fas fa-layer-group mr-1.5"></i>
                Bulk Ops ({selectedParts.length})
              </button>
            ),
            <button
              key="add-part"
              className="inline-flex items-center justify-center w-36 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors duration-200 shadow-sm font-medium"
              onClick={() => showModal('add-part-modal')}
            >
              <i className="fas fa-plus mr-2"></i>
              Add Part
            </button>
          ].filter(Boolean)}
        >
          {partsLoading ? (
            <InlineLoader text="Loading parts..." />
          ) : (
            <div className="space-y-4">
              {/* Enhanced Search and Filter Controls */}
              <div className="relative mb-4">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <i className="fas fa-search text-gray-400"></i>
                </div>
                <input
                  type="text"
                  placeholder="Search parts by number, description, HTS code, or manufacturer..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm shadow-sm transition-all duration-200"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center"
                  >
                    <i className="fas fa-times text-gray-400 hover:text-gray-600 transition-colors"></i>
                  </button>
                )}
              </div>

              {/* Advanced Filters */}
              <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">Country</label>
                  <select
                    value={filters.parts.country}
                    onChange={(e) => setFilters(prev => ({ ...prev, parts: { ...prev.parts, country: e.target.value } }))}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm shadow-sm transition-all duration-200"
                  >
                    <option value="">All Countries</option>
                    {uniqueCountries.map(country => (
                      <option key={country} value={country}>{country}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">Manufacturer</label>
                  <select
                    value={filters.parts.manufacturer}
                    onChange={(e) => setFilters(prev => ({ ...prev, parts: { ...prev.parts, manufacturer: e.target.value } }))}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm shadow-sm transition-all duration-200"
                  >
                    <option value="">All Manufacturers</option>
                    {uniqueManufacturers.map(manufacturer => (
                      <option key={manufacturer} value={manufacturer}>{manufacturer}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">Material</label>
                  <select
                    value={filters.parts.material}
                    onChange={(e) => setFilters(prev => ({ ...prev, parts: { ...prev.parts, material: e.target.value } }))}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm shadow-sm transition-all duration-200"
                  >
                    <option value="">All Materials</option>
                    {uniqueMaterials.map(material => (
                      <option key={material} value={material}>{getMaterialLabel(material)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">Price Range</label>
                  <select
                    value={filters.parts.priceRange}
                    onChange={(e) => setFilters(prev => ({ ...prev, parts: { ...prev.parts, priceRange: e.target.value } }))}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm shadow-sm transition-all duration-200"
                  >
                    <option value="">All Prices</option>
                    <option value="0-10">$0 - $10</option>
                    <option value="10-50">$10 - $50</option>
                    <option value="50-100">$50 - $100</option>
                    <option value="100+">$100+</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">Sort by</label>
                  <select
                    value={filters.parts.sortBy || 'id'}
                    onChange={(e) => setFilters(prev => ({ ...prev, parts: { ...prev.parts, sortBy: e.target.value } }))}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm shadow-sm transition-all duration-200"
                  >
                    <option value="id">Part Number</option>
                    <option value="description">Description</option>
                    <option value="standard_value">Price</option>
                    <option value="country_of_origin">Country</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setFilters(prev => ({ ...prev, parts: { country: '', manufacturer: '', material: '', priceRange: '', hasVariants: '', sortBy: 'id' } }));
                    }}
                    className="w-full px-3 py-2 text-sm font-medium text-gray-600 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-all duration-200"
                  >
                    <i className="fas fa-undo mr-2"></i>
                    Clear All
                  </button>
                </div>
              </div>

              {/* Results Summary */}
              <div className="flex justify-between items-center text-sm bg-gradient-to-r from-gray-50 to-blue-50 px-4 py-3 rounded-lg border border-gray-200 mb-4">
                <div className="flex items-center space-x-2">
                  <i className="fas fa-info-circle text-blue-500"></i>
                  <span className="font-medium text-gray-700">
                    Showing {filteredParts.length} of {parts?.success ? parts.data?.length || 0 : 0} parts
                    {(searchTerm || filters.parts.country || filters.parts.manufacturer || filters.parts.material || filters.parts.priceRange) && (
                      <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full">(filtered)</span>
                    )}
                  </span>
                </div>
              </div>

              {/* Enhanced Parts Table */}
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto max-h-96">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-4 py-3 text-left">
                          <input
                            type="checkbox"
                            checked={selectedParts.length === filteredParts.length && filteredParts.length > 0}
                            onChange={handleSelectAllParts}
                            className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                          />
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Part Number</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">HTS Code</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Country</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Material</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Value</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tariffs</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Weight</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredParts.map(part => (
                        <tr key={part.id} className={`hover:bg-gray-50 ${selectedParts.includes(part.id) ? 'bg-purple-50' : ''}`}>
                          <td className="px-3 py-4">
                            <input
                              type="checkbox"
                              checked={selectedParts.includes(part.id)}
                              onChange={(e) => handlePartSelection(part.id, e.target.checked)}
                              className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{part.id}</td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            <div className="max-w-xs truncate" title={part.description}>{part.description}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{part.hts_code || '-'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{part.country_of_origin || '-'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {part.material ? (
                              <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getMaterialConfig(part.material).color}`}>
                                {getMaterialLabel(part.material)}
                              </span>
                            ) : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {part.standard_value ? `$${parseFloat(part.standard_value).toFixed(2)}` : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <TariffDisplay 
                              partData={{
                                hts_code: part.hts_code,
                                country_of_origin: part.country_of_origin,
                                standard_value: part.standard_value
                              }}
                              compact={true}
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {part.gross_weight ? `${part.gross_weight} kg` : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button
                              onClick={() => showModal('part-detail-modal', part)}
                              className="text-green-600 hover:text-green-900 mr-3"
                              title="View detailed information, variants, and pricing history"
                            >
                              <i className="fas fa-eye mr-1"></i>
                              Details
                            </button>
                            <button
                              onClick={() => handleEdit('part', part)}
                              className="text-blue-600 hover:text-blue-900 mr-3"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete('part', part)}
                              className="text-red-600 hover:text-red-900"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                      {filteredParts.length === 0 && (
                        <tr>
                          <td colSpan="10" className="px-6 py-4 text-sm text-gray-500 text-center">
                            {parts?.success && parts.data?.length > 0 ? 'No parts match your search criteria.' : 'No parts found. Upload parts using the batch upload below.'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Batch Upload */}
              <div className="mt-6">
                <BatchUploader
                  uploadType="parts"
                  templateUrl="/templates/parts-template.csv"
                  onUploadSuccess={(data) => handleUploadSuccess('parts', data)}
                />
              </div>
            </div>
          )}
        </CollapsibleSection>
      </div>

      {/* Enhanced Customer Master */}
      <div className="mb-8">
        <CollapsibleSection
          title="Customer Master"
          icon="fas fa-building"
          variant="success"
          defaultOpen={selectedSection === 'customers'}
          badge={`${dashboardStats.totalCustomers} customers`}
          description="Manage customer accounts, contacts, and business information"
          headerActions={
            <button
              onClick={() => showModal('add-customer-modal')}
              className="inline-flex items-center justify-center w-36 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors duration-200 shadow-sm font-medium"
            >
              <i className="fas fa-plus mr-2"></i>
              Add Customer
            </button>
          }
        >
          {customersLoading ? (
            <InlineLoader text="Loading customers..." />
          ) : (
            <div className="space-y-4">
              {/* Customer Search and Filters */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <i className="fas fa-search text-gray-400"></i>
                  </div>
                  <input
                    type="text"
                    placeholder="Search customers..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm shadow-sm transition-all duration-200"
                  />
                </div>
                <div>
                  <select
                    value={filters.customers.hasEin}
                    onChange={(e) => setFilters(prev => ({ ...prev, customers: { ...prev.customers, hasEin: e.target.value } }))}
                    className="w-full px-3 py-3 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm shadow-sm"
                  >
                    <option value="all">All Customers</option>
                    <option value="yes">With EIN</option>
                    <option value="no">Without EIN</option>
                  </select>
                </div>
                <div className="flex items-center bg-gradient-to-r from-gray-50 to-green-50 px-4 py-3 rounded-xl border border-gray-200">
                  <i className="fas fa-info-circle text-green-500 mr-2"></i>
                  <span className="text-sm font-medium text-gray-700">
                    Showing {filteredCustomers.length} of {customers?.success ? customers.data?.length || 0 : 0} customers
                  </span>
                </div>
              </div>
              
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto max-h-96">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">EIN</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Address</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Broker</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact Email</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredCustomers.map(customer => (
                        <tr key={customer.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{customer.name}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{customer.ein || '-'}</td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            <div className="max-w-xs truncate" title={customer.address}>{customer.address || '-'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{customer.broker_name || '-'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{customer.contact_email || '-'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button
                              onClick={() => handleEdit('customer', customer)}
                              className="text-blue-600 hover:text-blue-900 mr-3"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete('customer', customer)}
                              className="text-red-600 hover:text-red-900"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                      {filteredCustomers.length === 0 && (
                        <tr>
                          <td colSpan="6" className="px-6 py-4 text-sm text-gray-500 text-center">
                            {customers?.success && customers.data?.length > 0 ? 'No customers match your search criteria.' : 'No customers found. Upload customers using the batch upload below.'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <BatchUploader
                uploadType="customers"
                templateUrl="/templates/customers-template.csv"
                onUploadSuccess={(data) => handleUploadSuccess('customers', data)}
              />
            </div>
          )}
        </CollapsibleSection>
      </div>

      {/* Enhanced Supplier Master */}
      <div className="mb-8">
        <CollapsibleSection
          title="Supplier Master"
          icon="fas fa-truck"
          variant="danger"
          defaultOpen={selectedSection === 'suppliers'}
          badge={`${dashboardStats.totalSuppliers} suppliers`}
          description="Manage supplier information, contacts, and logistics details"
          headerActions={
            <button
              onClick={() => showModal('add-supplier-modal')}
              className="inline-flex items-center justify-center w-36 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors duration-200 shadow-sm font-medium"
            >
              <i className="fas fa-plus mr-2"></i>
              Add Supplier
            </button>
          }
        >
          {suppliersLoading ? (
            <InlineLoader text="Loading suppliers..." />
          ) : (
            <div className="space-y-4">
              {/* Supplier Search and Filters */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <i className="fas fa-search text-gray-400"></i>
                  </div>
                  <input
                    type="text"
                    placeholder="Search suppliers..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm shadow-sm transition-all duration-200"
                  />
                </div>
                <div>
                  <select
                    value={filters.suppliers.country}
                    onChange={(e) => setFilters(prev => ({ ...prev, suppliers: { ...prev.suppliers, country: e.target.value } }))}
                    className="w-full px-3 py-3 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm shadow-sm"
                  >
                    <option value="all">All Countries</option>
                    {uniqueSupplierCountries.map(country => (
                      <option key={country} value={country}>{country}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <select
                    value={filters.suppliers.type}
                    onChange={(e) => setFilters(prev => ({ ...prev, suppliers: { ...prev.suppliers, type: e.target.value } }))}
                    className="w-full px-3 py-3 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm shadow-sm"
                  >
                    <option value="all">All Types</option>
                    {uniqueSupplierTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center bg-gradient-to-r from-gray-50 to-red-50 px-4 py-3 rounded-xl border border-gray-200">
                  <i className="fas fa-info-circle text-red-500 mr-2"></i>
                  <span className="text-sm font-medium text-gray-700">
                    Showing {filteredSuppliers.length} of {suppliers?.success ? suppliers.data?.length || 0 : 0} suppliers
                  </span>
                </div>
              </div>
              
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto max-h-96">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supplier Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">EIN</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Country</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredSuppliers.map(supplier => (
                        <tr key={supplier.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{supplier.name}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {supplier.supplier_type && (
                              <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${ 
                                supplier.supplier_type === 'Manufacturer' ? 'bg-blue-100 text-blue-800' : 
                                supplier.supplier_type === 'Distributor' ? 'bg-green-100 text-green-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {supplier.supplier_type}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{supplier.ein || '-'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{supplier.country || '-'}</td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            <div>
                              {supplier.contact_person && <div className="font-medium">{supplier.contact_person}</div>}
                              {supplier.contact_email && <div className="text-xs">{supplier.contact_email}</div>}
                              {supplier.phone && <div className="text-xs">{supplier.phone}</div>}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button
                              onClick={() => handleEdit('supplier', supplier)}
                              className="text-blue-600 hover:text-blue-900 mr-3"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete('supplier', supplier)}
                              className="text-red-600 hover:text-red-900"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                      {filteredSuppliers.length === 0 && (
                        <tr>
                          <td colSpan="6" className="px-6 py-4 text-sm text-gray-500 text-center">
                            {suppliers?.success && suppliers.data?.length > 0 ? 'No suppliers match your search criteria.' : 'No suppliers found. Upload suppliers using the batch upload below.'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <BatchUploader
                uploadType="suppliers"
                templateUrl="/templates/suppliers-template.csv"
                onUploadSuccess={(data) => handleUploadSuccess('suppliers', data)}
              />
            </div>
          )}
        </CollapsibleSection>
      </div>

      {/* Enhanced Storage Location Management */}
      <div className="mb-8">
        <CollapsibleSection
          title="Storage Location Master"
          icon="fas fa-warehouse"
          variant="default"
          defaultOpen={selectedSection === 'locations'}
          badge={`${dashboardStats.activeLocations} active locations`}
          description="Manage facility storage locations including racks, shelves, bins, and other storage areas"
          headerActions={
            <button
              onClick={() => showModal('add-location-modal')}
              className="inline-flex items-center justify-center w-36 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors duration-200 shadow-sm font-medium"
            >
              <i className="fas fa-plus mr-2"></i>
              Add Location
            </button>
          }
        >
          {locationsLoading ? (
            <InlineLoader text="Loading locations..." />
          ) : (
            <div className="space-y-4">
              {/* Location Search and Filters */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <i className="fas fa-search text-gray-400"></i>
                  </div>
                  <input
                    type="text"
                    placeholder="Search locations..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm shadow-sm transition-all duration-200"
                  />
                </div>
                <div>
                  <select
                    value={filters.locations.type}
                    onChange={(e) => setFilters(prev => ({ ...prev, locations: { ...prev.locations, type: e.target.value } }))}
                    className="w-full px-3 py-3 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm shadow-sm"
                  >
                    <option value="all">All Types</option>
                    {uniqueLocationTypes.map(type => (
                      <option key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <select
                    value={filters.locations.zone}
                    onChange={(e) => setFilters(prev => ({ ...prev, locations: { ...prev.locations, zone: e.target.value } }))}
                    className="w-full px-3 py-3 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm shadow-sm"
                  >
                    <option value="all">All Zones</option>
                    {uniqueLocationZones.map(zone => (
                      <option key={zone} value={zone}>{zone}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center bg-gradient-to-r from-gray-50 to-purple-50 px-4 py-3 rounded-xl border border-gray-200">
                  <i className="fas fa-info-circle text-purple-500 mr-2"></i>
                  <span className="text-sm font-medium text-gray-700">
                    Showing {filteredLocations.length} of {locations?.success ? locations.data?.length || 0 : 0} locations
                  </span>
                </div>
              </div>
              
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto max-h-96">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location Code</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Zone</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Capacity</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredLocations.map(location => (
                        <tr key={location.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {location.location_code}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${ 
                              location.location_type === 'rack' ? 'bg-blue-100 text-blue-800' :
                              location.location_type === 'shelf' ? 'bg-green-100 text-green-800' :
                              location.location_type === 'bin' ? 'bg-yellow-100 text-yellow-800' :
                              location.location_type === 'dock' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {location.location_type.charAt(0).toUpperCase() + location.location_type.slice(1)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {location.zone || '-'}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            <div>
                              {location.description && <div className="font-medium text-gray-900">{location.description}</div>}
                              <div className="text-xs text-gray-500 mt-1 space-x-2">
                                {location.aisle && <span>Aisle: {location.aisle}</span>}
                                {location.level && <span>Level: {location.level}</span>}
                                {location.position && <span>Pos: {location.position}</span>}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            <div>
                              {location.capacity_weight_kg && (
                                <div className="text-xs">Weight: {location.capacity_weight_kg} kg</div>
                              )}
                              {location.capacity_volume_m3 && (
                                <div className="text-xs">Volume: {location.capacity_volume_m3} m³</div>
                              )}
                              {!location.capacity_weight_kg && !location.capacity_volume_m3 && (
                                <span className="text-gray-400">No limits</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${ 
                              location.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {location.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button
                              onClick={() => handleEdit('location', location)}
                              className="text-blue-600 hover:text-blue-900 mr-3"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleLocationToggle(location)}
                              className={location.is_active ? "text-red-600 hover:text-red-900" : "text-green-600 hover:text-green-900"}
                            >
                              {location.is_active ? 'Deactivate' : 'Activate'}
                            </button>
                          </td>
                        </tr>
                      ))}
                      {filteredLocations.length === 0 && (
                        <tr>
                          <td colSpan="7" className="px-6 py-4 text-sm text-gray-500 text-center">
                            {locations?.success && locations.data?.length > 0 ? 'No locations match your search criteria.' : 'No storage locations found. Add your first location to get started.'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <BatchUploader
                uploadType="locations"
                templateUrl="/templates/locations-template.csv"
                onUploadSuccess={(data) => handleUploadSuccess('locations', data)}
              />
            </div>
          )}
        </CollapsibleSection>
      </div>

      {/* Material Index Management Section */}
      <div className="mb-8">
        <CollapsibleSection
          title="Material Index Management"
          icon="fas fa-chart-line"
          description="Manage Shanghai Steel Price Index data and quarterly pricing adjustments"
          variant="warning"
          defaultOpen={false}
          headerActions={
            <button
              onClick={() => showModal('enhanced-quarterly-update-modal')}
              className="inline-flex items-center justify-center w-36 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors duration-200 shadow-sm font-medium"
            >
              <i className="fas fa-chart-line mr-2"></i>
              Quarterly Update
            </button>
          }
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Latest Material Prices */}
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="px-4 py-3 border-b border-gray-200">
                <h4 className="font-semibold text-gray-900">Latest Material Prices</h4>
                <p className="text-sm text-gray-600">Current SHSPI pricing data</p>
              </div>
              <div className="p-4">
                <div className="space-y-3">
                  <div className="text-center py-6 text-gray-500">
                    <i className="fas fa-chart-line text-gray-300 text-2xl mb-2"></i>
                    <p>No recent pricing data found.</p>
                    <p className="text-xs">Material indices will appear here after price updates.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Pricing Timeline */}
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="px-4 py-3 border-b border-gray-200">
                <h4 className="font-semibold text-gray-900">Current Pricing Cycle</h4>
                <p className="text-sm text-gray-600">3-Month Rolling Average Timeline</p>
              </div>
              <div className="p-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border-l-4 border-blue-400">
                    <div>
                      <div className="font-medium text-blue-900">Data Collection</div>
                      <div className="text-sm text-blue-700">Q4 2024</div>
                    </div>
                    <div className="text-blue-600">
                      <i className="fas fa-check-circle text-lg"></i>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border-l-4 border-yellow-400">
                    <div>
                      <div className="font-medium text-yellow-900">Communication</div>
                      <div className="text-sm text-yellow-700">January 2025</div>
                    </div>
                    <div className="text-yellow-600">
                      <i className="fas fa-clock text-lg"></i>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border-l-4 border-gray-300">
                    <div>
                      <div className="font-medium text-gray-700">Effective</div>
                      <div className="text-sm text-gray-600">February 2025</div>
                    </div>
                    <div className="text-gray-400">
                      <i className="fas fa-calendar text-lg"></i>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CollapsibleSection>
      </div>

      {/* Comprehensive Batch Data Management Section */}
      <div className="mb-8">
        <CollapsibleSection
          title="Batch Data Management"
          icon="fas fa-upload"
          description="Download templates, fill them out, and upload to add multiple records at once"
          variant="primary"
          defaultOpen={false}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-gray-900">Part Master</h4>
                <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center">
                  <i className="fas fa-cog text-white text-sm"></i>
                </div>
              </div>
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => handleDownloadTemplate('parts', 'part_template.csv')}
                  className="w-full flex items-center justify-center px-4 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors duration-200 text-sm font-medium"
                >
                  <i className="fas fa-download mr-2"></i>
                  Download Template
                </button>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-gray-900">Customer Master</h4>
                <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center">
                  <i className="fas fa-building text-white text-sm"></i>
                </div>
              </div>
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => handleDownloadTemplate('customers', 'customer_template.csv')}
                  className="w-full flex items-center justify-center px-4 py-2 bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100 transition-colors duration-200 text-sm font-medium"
                >
                  <i className="fas fa-download mr-2"></i>
                  Download Template
                </button>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-gray-900">Supplier Master</h4>
                <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-red-500 to-pink-500 flex items-center justify-center">
                  <i className="fas fa-truck text-white text-sm"></i>
                </div>
              </div>
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => handleDownloadTemplate('suppliers', 'supplier_template.csv')}
                  className="w-full flex items-center justify-center px-4 py-2 bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100 transition-colors duration-200 text-sm font-medium"
                >
                  <i className="fas fa-download mr-2"></i>
                  Download Template
                </button>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-gray-900">Storage Locations</h4>
                <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-purple-500 to-indigo-500 flex items-center justify-center">
                  <i className="fas fa-warehouse text-white text-sm"></i>
                </div>
              </div>
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => handleDownloadTemplate('storageLocations', 'storage_locations_template.csv')}
                  className="w-full flex items-center justify-center px-4 py-2 bg-purple-50 text-purple-700 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors duration-200 text-sm font-medium"
                >
                  <i className="fas fa-download mr-2"></i>
                  Download Template
                </button>
              </div>
            </div>
          </div>
        </CollapsibleSection>
      </div>
    </div>
  );
};

export default Admin;