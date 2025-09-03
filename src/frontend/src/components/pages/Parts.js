import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useApp } from '../../contexts/AppContext';
import apiClient from '../../services/api-client';
import HTSLookupModal from '../modals/HTSLookupModal';

// Material types and categories
const MATERIAL_CATEGORIES = {
  aluminum: { label: 'Aluminum', color: 'blue', icon: 'fas fa-cube' },
  steel: { label: 'Steel', color: 'gray', icon: 'fas fa-industry' },
  stainless_steel: { label: 'Stainless Steel', color: 'slate', icon: 'fas fa-shield-alt' },
  copper: { label: 'Copper', color: 'orange', icon: 'fas fa-bolt' },
  brass: { label: 'Brass', color: 'yellow', icon: 'fas fa-coins' },
  plastic: { label: 'Plastic', color: 'green', icon: 'fas fa-leaf' },
  rubber: { label: 'Rubber', color: 'purple', icon: 'fas fa-circle' },
  composite: { label: 'Composite', color: 'indigo', icon: 'fas fa-layer-group' },
  other: { label: 'Other', color: 'gray', icon: 'fas fa-question-circle' },
};

// Part status options
const PART_STATUS = {
  active: { label: 'Active', color: 'green', icon: 'fas fa-check-circle' },
  inactive: { label: 'Inactive', color: 'gray', icon: 'fas fa-pause-circle' },
  discontinued: { label: 'Discontinued', color: 'red', icon: 'fas fa-times-circle' },
  pending: { label: 'Pending Approval', color: 'yellow', icon: 'fas fa-clock' },
};

// Part card component
const PartCard = ({ part, onEdit, onView, onHTSLookup, onHTSUpdate }) => {
  const material = MATERIAL_CATEGORIES[part.material] || MATERIAL_CATEGORIES.other;
  const status = PART_STATUS[part.status || 'active'] || PART_STATUS.active;
  
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200">
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-1">
            <h3 className="text-lg font-semibold text-gray-900">
              {part.part_number || part.id}
            </h3>
          </div>
          <p className="text-gray-600 line-clamp-2">{part.description || 'No description'}</p>
        </div>
        
        <div className="flex flex-col items-end space-y-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            status.color === 'green' ? 'bg-green-100 text-green-800' :
            status.color === 'gray' ? 'bg-gray-100 text-gray-800' :
            status.color === 'red' ? 'bg-red-100 text-red-800' :
            'bg-yellow-100 text-yellow-800'
          }`}>
            <i className={`${status.icon} mr-1`}></i>
            {status.label}
          </span>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            material.color === 'blue' ? 'bg-blue-100 text-blue-800' :
            material.color === 'gray' ? 'bg-gray-100 text-gray-800' :
            material.color === 'slate' ? 'bg-slate-100 text-slate-800' :
            material.color === 'orange' ? 'bg-orange-100 text-orange-800' :
            material.color === 'yellow' ? 'bg-yellow-100 text-yellow-800' :
            material.color === 'green' ? 'bg-green-100 text-green-800' :
            material.color === 'purple' ? 'bg-purple-100 text-purple-800' :
            material.color === 'indigo' ? 'bg-indigo-100 text-indigo-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            <i className={`${material.icon} mr-1`}></i>
            {material.label}
          </span>
        </div>
      </div>

      {/* Key Information Grid */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-sm text-gray-500 mb-1">Standard Value</p>
          <p className="text-lg font-bold text-green-600">
            ${(part.standard_value || 0).toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-500 mb-1">Gross Weight</p>
          <p className="font-medium text-gray-900">
            {part.gross_weight ? `${part.gross_weight} kg` : 'Not specified'}
          </p>
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm text-gray-500">HTS Code</p>
            {part.hts_code ? (
              <button
                onClick={() => onHTSUpdate(part)}
                className="text-xs text-blue-600 hover:text-blue-800 focus:outline-none"
                title="Update HTS Code"
              >
                <i className="fas fa-edit"></i>
              </button>
            ) : null}
          </div>
          {part.hts_code ? (
            <div className="space-y-1">
              <p className="font-mono text-sm text-blue-600">{part.hts_code}</p>
              {part.hts_description && (
                <p className="text-xs text-gray-600 line-clamp-2" title={part.hts_description}>
                  {part.hts_description}
                </p>
              )}
            </div>
          ) : (
            <button
              onClick={() => onHTSLookup(part)}
              className="inline-flex items-center px-2 py-1 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <i className="fas fa-search mr-1"></i>
              Lookup HTS
            </button>
          )}
        </div>
        <div>
          <p className="text-sm text-gray-500 mb-1">Country of Origin</p>
          <div className="flex items-center justify-between">
            <p className="font-medium text-gray-900">
              {part.country_of_origin || 'Not specified'}
            </p>
            {part.hts_code && part.country_of_origin && (
              <span className="text-xs text-green-600 font-medium">
                <i className="fas fa-calculator mr-1"></i>
                Duty Ready
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Manufacturer Information */}
      {part.manufacturer_id && (
        <div className="mb-4">
          <div className="flex items-center space-x-2">
            <i className="fas fa-industry text-gray-400"></i>
            <span className="text-sm text-gray-600">
              Manufacturer: <span className="font-medium">{part.manufacturer_id}</span>
            </span>
          </div>
        </div>
      )}

      {/* Timestamps */}
      <div className="flex justify-between text-xs text-gray-500 mb-4">
        <span>Created: {new Date(part.created_at).toLocaleDateString()}</span>
        <span>Updated: {new Date(part.updated_at || part.created_at).toLocaleDateString()}</span>
      </div>

      {/* Action Buttons */}
      <div className="flex space-x-2">
        <button
          onClick={() => onView(part)}
          className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <i className="fas fa-eye mr-2"></i>
          View Details
        </button>
        
        <button
          onClick={() => onEdit(part)}
          className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <i className="fas fa-edit mr-2"></i>
          Edit
        </button>
      </div>
    </div>
  );
};

// Search and filter component
const PartsFilters = ({ 
  searchTerm, 
  onSearchChange, 
  filters, 
  onFilterChange, 
  onClearFilters
}) => {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Search */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Search Parts
          </label>
          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Part number, description, HTS..."
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <i className="fas fa-search text-gray-400"></i>
            </div>
          </div>
        </div>

        {/* Material Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Material
          </label>
          <select
            value={filters.material || ''}
            onChange={(e) => onFilterChange('material', e.target.value)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Materials</option>
            {Object.entries(MATERIAL_CATEGORIES).map(([key, material]) => (
              <option key={key} value={key}>{material.label}</option>
            ))}
          </select>
        </div>

        {/* Country Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Country of Origin
          </label>
          <select
            value={filters.country || ''}
            onChange={(e) => onFilterChange('country', e.target.value)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Countries</option>
            <option value="US">United States</option>
            <option value="CN">China</option>
            <option value="DE">Germany</option>
            <option value="JP">Japan</option>
            <option value="MX">Mexico</option>
            <option value="CA">Canada</option>
          </select>
        </div>

        {/* Clear Filters */}
        <div className="flex items-end">
          <button
            onClick={onClearFilters}
            className="w-full px-3 py-2 text-sm font-medium text-gray-600 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-all duration-200"
          >
            <i className="fas fa-undo mr-2"></i>
            Clear Filters
          </button>
        </div>
      </div>

      {/* Value Range Filters */}
      <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Min Value ($)
          </label>
          <input
            type="number"
            value={filters.min_value || ''}
            onChange={(e) => onFilterChange('min_value', e.target.value)}
            placeholder="0"
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Max Value ($)
          </label>
          <input
            type="number"
            value={filters.max_value || ''}
            onChange={(e) => onFilterChange('max_value', e.target.value)}
            placeholder="No limit"
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            HTS Chapter
          </label>
          <input
            type="text"
            value={filters.hts_chapter || ''}
            onChange={(e) => onFilterChange('hts_chapter', e.target.value)}
            placeholder="e.g., 8708"
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Quick filters */}
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          onClick={() => onFilterChange('has_hts', true)}
          className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 hover:bg-blue-200"
        >
          <i className="fas fa-barcode mr-1"></i>
          Has HTS Code
        </button>
        <button
          onClick={() => onFilterChange('has_value', true)}
          className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 hover:bg-green-200"
        >
          <i className="fas fa-dollar-sign mr-1"></i>
          Has Standard Value
        </button>
      </div>
    </div>
  );
};

// Statistics summary component
const PartsStats = ({ filteredParts, loading }) => {
  const stats = useMemo(() => {
    if (loading || !filteredParts.length) {
      return { 
        total: 0, 
        totalValue: 0, 
        avgValue: 0,
        withHTS: 0,
        materialCounts: {} 
      };
    }

    const total = filteredParts.length;
    const totalValue = filteredParts.reduce((sum, part) => sum + (part.standard_value || 0), 0);
    const avgValue = total > 0 ? totalValue / total : 0;
    const withHTS = filteredParts.filter(part => part.hts_code).length;
    
    const materialCounts = filteredParts.reduce((acc, part) => {
      const material = part.material || 'other';
      acc[material] = (acc[material] || 0) + 1;
      return acc;
    }, {});

    return { total, totalValue, avgValue, withHTS, materialCounts };
  }, [filteredParts, loading]);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="animate-pulse">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const topMaterials = Object.entries(stats.materialCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Parts Summary</h3>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="text-center">
          <p className="text-2xl font-bold text-blue-600">{stats.total}</p>
          <p className="text-sm text-gray-600">Total Parts</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-green-600">
            ${(stats.totalValue).toLocaleString()}
          </p>
          <p className="text-sm text-gray-600">Total Value</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-purple-600">
            ${(stats.avgValue).toLocaleString()}
          </p>
          <p className="text-sm text-gray-600">Avg Value</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-orange-600">{stats.withHTS}</p>
          <p className="text-sm text-gray-600">With HTS Codes</p>
        </div>
      </div>
      
      {/* Top Materials */}
      {topMaterials.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Top Materials</h4>
          <div className="flex flex-wrap gap-2">
            {topMaterials.map(([material, count]) => {
              const materialInfo = MATERIAL_CATEGORIES[material] || MATERIAL_CATEGORIES.other;
              return (
                <span key={material} className={`px-2 py-1 rounded-full text-xs font-medium ${
                  materialInfo.color === 'blue' ? 'bg-blue-100 text-blue-800' :
                  materialInfo.color === 'gray' ? 'bg-gray-100 text-gray-800' :
                  materialInfo.color === 'green' ? 'bg-green-100 text-green-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {materialInfo.label}: {count}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

const Parts = () => {
  const { showSuccess, showError } = useApp();
  
  // Local state
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({});
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  
  // HTS modal state
  const [showHTSModal, setShowHTSModal] = useState(false);
  const [selectedPartForHTS, setSelectedPartForHTS] = useState(null);
  
  // Temporary modal function for other modals until modal system is implemented
  const showModal = (modalType, data) => {
    console.log('Modal requested:', modalType, data);
    // TODO: Implement proper modal system for non-HTS modals
  };

  // Fetch parts data with React Query
  const {
    data: partsData,
    isLoading: partsLoading,
    error: partsError,
    refetch: refetchParts
  } = useQuery(
    ['parts'],
    () => apiClient.parts.getAll(),
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
    }
  );

  const parts = partsData?.parts || [];

  // Filter and search logic
  const filteredParts = useMemo(() => {
    let filtered = [...parts];

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(part => 
        (part.part_number && part.part_number.toLowerCase().includes(term)) ||
        (part.id && part.id.toLowerCase().includes(term)) ||
        (part.description && part.description.toLowerCase().includes(term)) ||
        (part.hts_code && part.hts_code.toLowerCase().includes(term)) ||
        (part.manufacturer_id && part.manufacturer_id.toLowerCase().includes(term))
      );
    }

    // Apply filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        if (key === 'min_value') {
          filtered = filtered.filter(part => (part.standard_value || 0) >= parseFloat(value));
        } else if (key === 'max_value') {
          filtered = filtered.filter(part => (part.standard_value || 0) <= parseFloat(value));
        } else if (key === 'hts_chapter') {
          filtered = filtered.filter(part => part.hts_code && part.hts_code.startsWith(value));
        } else if (key === 'has_hts') {
          filtered = filtered.filter(part => part.hts_code);
        } else if (key === 'has_value') {
          filtered = filtered.filter(part => part.standard_value && part.standard_value > 0);
        } else if (key === 'country') {
          filtered = filtered.filter(part => part.country_of_origin === value);
        } else {
          filtered = filtered.filter(part => part[key] === value);
        }
      }
    });

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue = a[sortBy] || '';
      let bValue = b[sortBy] || '';

      // Convert to numbers if possible
      const aNum = parseFloat(aValue);
      const bNum = parseFloat(bValue);
      if (!isNaN(aNum) && !isNaN(bNum)) {
        aValue = aNum;
        bValue = bNum;
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [parts, searchTerm, filters, sortBy, sortOrder]);

  // Event handlers
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({});
    setSearchTerm('');
  };

  const handleViewPart = (part) => {
    showModal('part-detail-modal', part);
  };

  const handleEditPart = (part) => {
    showModal('edit-part-modal', part);
  };

  const handleCreatePart = () => {
    showModal('add-part-modal');
  };

  // HTS event handlers
  const handleHTSLookup = (part) => {
    setSelectedPartForHTS(part);
    setShowHTSModal(true);
  };

  const handleHTSUpdate = (part) => {
    setSelectedPartForHTS(part);
    setShowHTSModal(true);
  };

  const handleHTSSelect = async (htsSelection) => {
    try {
      if (!selectedPartForHTS) return;

      // Update part with selected HTS information
      const updateData = {
        hts_code: htsSelection.htsno,
        hts_description: htsSelection.description,
        country_of_origin: htsSelection.countryOfOrigin,
        // Store duty information for reference
        duty_info: htsSelection.dutyInfo
      };

      // Make API call to update part (assuming we have this endpoint)
      await apiClient.put(`/api/parts/${selectedPartForHTS.id}`, updateData);
      
      toast.success(`HTS code ${htsSelection.htsno} assigned to ${selectedPartForHTS.part_number || selectedPartForHTS.id}`);
      
      // Refresh parts data
      refetchParts();
      
      // Close modal
      setShowHTSModal(false);
      setSelectedPartForHTS(null);
      
    } catch (error) {
      console.error('Failed to update part with HTS code:', error);
      toast.error(`Failed to assign HTS code: ${error.message}`);
    }
  };

  const handleHTSModalClose = () => {
    setShowHTSModal(false);
    setSelectedPartForHTS(null);
  };

  if (partsLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (partsError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <i className="fas fa-exclamation-circle text-red-400"></i>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error loading parts</h3>
            <div className="mt-2 text-sm text-red-700">
              <p>{partsError.message}</p>
            </div>
            <div className="mt-4">
              <button
                onClick={() => refetchParts()}
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
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Parts Management</h1>
            <p className="text-gray-600 mt-1">
              Material Master Data - HTS Codes, Pricing & Specifications
            </p>
          </div>
          <button
            onClick={handleCreatePart}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <i className="fas fa-plus mr-2"></i>
            New Part
          </button>
        </div>
      </div>

      {/* Filters */}
      <PartsFilters
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        filters={filters}
        onFilterChange={handleFilterChange}
        onClearFilters={clearFilters}
      />

      {/* Statistics */}
      <PartsStats 
        filteredParts={filteredParts} 
        loading={partsLoading} 
      />

      {/* Parts Grid */}
      {filteredParts.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12">
          <div className="text-center">
            <i className="fas fa-cubes text-4xl text-gray-400 mb-4"></i>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No parts found</h3>
            <p className="text-gray-600 mb-6">
              {searchTerm || Object.keys(filters).length > 0
                ? 'Try adjusting your search criteria or filters.'
                : 'Get started by creating your first part.'}
            </p>
            {!searchTerm && Object.keys(filters).length === 0 && (
              <button
                onClick={handleCreatePart}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <i className="fas fa-plus mr-2"></i>
                Create First Part
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredParts.map(part => (
            <PartCard
              key={part.id}
              part={part}
              onView={handleViewPart}
              onEdit={handleEditPart}
              onHTSLookup={handleHTSLookup}
              onHTSUpdate={handleHTSUpdate}
            />
          ))}
        </div>
      )}
      
      {/* HTS Lookup Modal */}
      {showHTSModal && selectedPartForHTS && (
        <HTSLookupModal
          onClose={handleHTSModalClose}
          onSelect={handleHTSSelect}
          currentHtsCode={selectedPartForHTS.hts_code || ''}
          currentCountryOfOrigin={selectedPartForHTS.country_of_origin || ''}
        />
      )}
    </div>
  );
};

export default Parts;