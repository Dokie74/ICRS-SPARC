// src/frontend/components/modals/CreatePreshipmentModal.js
// Create Preshipment Modal - Fixed version based on original icrs-app pattern
import React, { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { useCreatePreshipment } from '../../services/preshipmentService';

const CreatePreshipmentModal = ({ isOpen, onClose }) => {
  const { customers, showSuccess, showError } = useApp();
  const createMutation = useCreatePreshipment();

  // Simple form state - matching original icrs-app structure
  const [formData, setFormData] = useState({
    shipment_id: '',
    type: '7501 Consumption Entry',
    customer_id: '',
    entry_number: '',
    items: [{ lot: '', qty: '' }],
    
    // ACE Entry Summary Fields
    filingDistrictPort: '',
    entryFilerCode: '',
    importerOfRecordNumber: '',
    dateOfImportation: '',
    foreignTradeZoneId: 'FTZ215GSM',
    billOfLadingNumber: '',
    voyageFlightTripNumber: '',
    carrierCode: '',
    importingConveyanceName: '',
    manufacturerName: '',
    manufacturerAddress: '',
    sellerName: '',
    sellerAddress: '',
    bondTypeCode: 'C9',
    suretyCompanyCode: '',
    consolidatedEntry: false,
    weeklyEntry: false,
    zoneWeekEndingDate: '',
    requiresPGAReview: false,
    complianceNotes: ''
  });

  const [currentTab, setCurrentTab] = useState('shipment');
  const [aceValidationErrors, setAceValidationErrors] = useState([]);

  // Simple field change handler
  const handleFieldChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Item management
  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setFormData(prev => ({ ...prev, items: newItems }));
  };

  const addItem = () => {
    setFormData(prev => ({ 
      ...prev, 
      items: [...prev.items, { lot: '', qty: '' }] 
    }));
  };

  // Simple validation
  const validateRequiredFields = () => {
    return formData.shipmentId && formData.customerId && 
           formData.filingDistrictPort && formData.entryFilerCode && 
           formData.importerOfRecordNumber;
  };

  const validateACEFields = () => {
    const errors = [];
    
    if (!formData.filingDistrictPort || !/^[A-Z0-9]{4}$/.test(formData.filingDistrictPort)) {
      errors.push('Filing District/Port must be 4 alphanumeric characters');
    }
    
    if (!formData.entryFilerCode || !/^[A-Z0-9]{3}$/.test(formData.entryFilerCode)) {
      errors.push('Entry Filer Code must be 3 alphanumeric characters');
    }
    
    if (!formData.importerOfRecordNumber) {
      errors.push('Importer of Record Number is required');
    }
    
    if (formData.carrierCode && !/^[A-Z]{4}$/.test(formData.carrierCode)) {
      errors.push('Carrier Code must be 4 letters (SCAC format)');
    }
    
    if (formData.weeklyEntry && !formData.zoneWeekEndingDate) {
      errors.push('Zone Week Ending Date is required for weekly entries');
    }

    setAceValidationErrors(errors);
    return errors;
  };

  const canSubmit = () => {
    const validItems = formData.items.filter(item => item.lot && item.qty);
    return validateRequiredFields() && validItems.length > 0;
  };

  // Submit handler
  const handleSubmit = async () => {
    const items = formData.items.filter(item => item.lot && item.qty);
    
    if (!formData.shipmentId || !formData.customerId || items.length === 0) {
      showError('Shipment ID, Customer, and at least one item are required.');
      return;
    }

    // Validate ACE fields
    const aceErrors = validateACEFields();
    if (aceErrors.length > 0) {
      setCurrentTab('ace');
      showError('Please correct ACE validation errors before proceeding.');
      return;
    }

    try {
      // Prepare submission data
      const preshipmentData = {
        ...formData,
        items: items.map(item => ({ 
          lot: item.lot, 
          qty: parseInt(item.qty, 10)
        })),
        
        // Map ACE fields to database format
        filing_district_port: formData.filingDistrictPort,
        entry_filer_code: formData.entryFilerCode,
        importer_of_record_number: formData.importerOfRecordNumber,
        date_of_importation: formData.dateOfImportation,
        foreign_trade_zone_id: formData.foreignTradeZoneId,
        bill_of_lading_number: formData.billOfLadingNumber,
        voyage_flight_trip_number: formData.voyageFlightTripNumber,
        carrier_code: formData.carrierCode,
        importing_conveyance_name: formData.importingConveyanceName,
        manufacturer_name: formData.manufacturerName,
        manufacturer_address: formData.manufacturerAddress,
        seller_name: formData.sellerName,
        seller_address: formData.sellerAddress,
        bond_type_code: formData.bondTypeCode,
        surety_company_code: formData.suretyCompanyCode,
        consolidated_entry: formData.consolidatedEntry,
        weekly_entry: formData.weeklyEntry,
        zone_week_ending_date: formData.zoneWeekEndingDate,
        requires_pga_review: formData.requiresPGAReview,
        compliance_notes: formData.complianceNotes,
        entry_summary_status: 'DRAFT'
      };

      await createMutation.mutateAsync(preshipmentData);
      showSuccess('Pre-Shipment with ACE entry data created successfully!');
      onClose();
    } catch (error) {
      console.error('Error creating pre-shipment:', error);
      showError(error.message || 'Failed to create preshipment');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 z-50">
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="bg-white rounded-xl shadow-2xl p-0 w-full max-w-6xl max-h-[90vh] overflow-y-auto border-2 border-gray-100">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 rounded-t-xl">
            <h3 className="text-2xl font-bold text-white flex items-center">
              <i className="fas fa-shipping-fast mr-3 text-blue-200"></i>
              Create New Pre-Shipment & ACE Entry Summary
            </h3>
            <p className="text-blue-100 text-sm mt-1">Complete all required fields to create your pre-shipment with ACE entry data</p>
          </div>
          <div className="p-6">
          
            {/* Tab Navigation */}
            <div className="flex border-b-2 border-gray-200 mb-6">
              <button
                className={`px-6 py-3 text-sm font-semibold flex items-center ${
                  currentTab === 'shipment' 
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50' 
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                } rounded-t-lg transition-all duration-200`}
                onClick={() => setCurrentTab('shipment')}
              >
                <i className="fas fa-box mr-2"></i>
                Shipment Details
              </button>
              <button
                className={`px-6 py-3 text-sm font-semibold flex items-center ${
                  currentTab === 'ace' 
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50' 
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                } rounded-t-lg transition-all duration-200`}
                onClick={() => setCurrentTab('ace')}
              >
                <i className="fas fa-file-contract mr-2"></i>
                ACE Entry Summary
              </button>
              <button
                className={`px-6 py-3 text-sm font-semibold flex items-center ${
                  currentTab === 'review' 
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50' 
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                } rounded-t-lg transition-all duration-200`}
                onClick={() => setCurrentTab('review')}
              >
                <i className="fas fa-check-circle mr-2"></i>
                Review & Validation
              </button>
            </div>

            {/* Validation Errors */}
            {aceValidationErrors.length > 0 && (
              <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-lg">
                <h4 className="text-sm font-semibold text-red-800 mb-2 flex items-center">
                  <i className="fas fa-exclamation-triangle mr-2"></i>
                  Validation Errors:
                </h4>
                <ul className="text-sm text-red-700 list-disc list-inside space-y-1">
                  {aceValidationErrors.map((error, idx) => (
                    <li key={idx}>{error}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Tab Content */}
            {currentTab === 'shipment' && (
              <div>
                {/* Section 1: Shipment Information */}
                <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg shadow-sm mb-6">
                  <h4 className="text-lg font-semibold text-blue-900 mb-4 flex items-center">
                    <i className="fas fa-clipboard-list mr-2 text-blue-600"></i>
                    1. Shipment Information
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-gray-800 uppercase tracking-wide">
                        <i className="fas fa-barcode mr-1 text-blue-600"></i>
                        Shipment ID*
                        <span className="text-red-500 ml-1">REQUIRED</span>
                      </label>
                      <input
                        value={formData.shipmentId}
                        onChange={(e) => handleFieldChange('shipmentId', e.target.value)}
                        placeholder="Enter shipment ID..."
                        className="w-full px-4 py-3 text-sm border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 bg-white shadow-sm hover:border-gray-400"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-gray-800 uppercase tracking-wide">
                        <i className="fas fa-file-alt mr-1 text-blue-600"></i>
                        Shipment Type*
                        <span className="text-red-500 ml-1">REQUIRED</span>
                      </label>
                      <select
                        value={formData.type}
                        onChange={(e) => handleFieldChange('type', e.target.value)}
                        className="w-full px-4 py-3 text-sm border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 bg-white shadow-sm hover:border-gray-400"
                      >
                        <option value="7501 Consumption Entry">7501 Consumption Entry</option>
                        <option value="7512 T&E Export">7512 T&E Export</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-gray-800 uppercase tracking-wide">
                        <i className="fas fa-building mr-1 text-blue-600"></i>
                        Customer*
                        <span className="text-red-500 ml-1">REQUIRED</span>
                      </label>
                      <select
                        value={formData.customerId}
                        onChange={(e) => handleFieldChange('customerId', e.target.value)}
                        className="w-full px-4 py-3 text-sm border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 bg-white shadow-sm hover:border-gray-400"
                        required
                      >
                        <option value="">Select a customer...</option>
                        {customers.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-gray-800 uppercase tracking-wide">
                        <i className="fas fa-hashtag mr-1 text-blue-600"></i>
                        Entry Number
                      </label>
                      <input
                        value={formData.entryNumber}
                        onChange={(e) => handleFieldChange('entryNumber', e.target.value)}
                        placeholder="Enter entry number..."
                        className="w-full px-4 py-3 text-sm border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 bg-white shadow-sm hover:border-gray-400"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 2: Line Items */}
                <div className="p-6 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-lg shadow-sm">
                  <h4 className="text-lg font-semibold text-green-900 mb-4 flex items-center">
                    <i className="fas fa-boxes mr-2 text-green-600"></i>
                    2. Line Items
                  </h4>
                  <div className="grid grid-cols-12 gap-2 text-sm font-semibold mb-2 p-2 bg-gray-50 rounded-t-md">
                    <div className="col-span-8">Lot Number</div>
                    <div className="col-span-4">Quantity to Ship</div>
                  </div>
                  {formData.items.map((item, index) => (
                    <div key={index} className="grid grid-cols-12 gap-2 items-center mb-2">
                      <div className="col-span-8">
                        <input
                          value={item.lot}
                          onChange={(e) => handleItemChange(index, 'lot', e.target.value)}
                          placeholder="Enter lot number..."
                          className="w-full px-4 py-3 text-sm border-2 border-gray-300 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all duration-200 bg-white shadow-sm hover:border-gray-400"
                        />
                      </div>
                      <div className="col-span-4">
                        <input
                          type="number"
                          value={item.qty}
                          onChange={(e) => handleItemChange(index, 'qty', e.target.value)}
                          placeholder="Quantity"
                          className="w-full px-4 py-3 text-sm border-2 border-gray-300 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all duration-200 bg-white shadow-sm hover:border-gray-400"
                        />
                      </div>
                    </div>
                  ))}
                  <button
                    className="mt-4 px-4 py-2 bg-green-100 text-green-800 font-semibold rounded-lg border-2 border-green-300 hover:bg-green-200 hover:border-green-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green-300"
                    onClick={addItem}
                    type="button"
                  >
                    <i className="fas fa-plus mr-2"></i>
                    Add Another Item
                  </button>
                </div>
              </div>
            )}

            {currentTab === 'ace' && (
              <div>
                {/* Section 1: Core Entry Information */}
                <div className="p-6 bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 rounded-lg shadow-sm mb-6">
                  <h4 className="text-lg font-semibold text-purple-900 mb-4 flex items-center">
                    <i className="fas fa-file-contract mr-2 text-purple-600"></i>
                    1. Core Entry Information
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-gray-800 uppercase tracking-wide">
                        <i className="fas fa-building mr-1 text-purple-600"></i>
                        Filing District/Port*
                        <span className="text-red-500 ml-1">REQUIRED</span>
                      </label>
                      <input
                        value={formData.filingDistrictPort}
                        onChange={(e) => handleFieldChange('filingDistrictPort', e.target.value.toUpperCase())}
                        placeholder="e.g., 2704"
                        maxLength="4"
                        className="w-full px-4 py-3 text-sm border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-200 bg-white shadow-sm hover:border-gray-400"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-gray-800 uppercase tracking-wide">
                        <i className="fas fa-id-badge mr-1 text-purple-600"></i>
                        Entry Filer Code*
                        <span className="text-red-500 ml-1">REQUIRED</span>
                      </label>
                      <input
                        value={formData.entryFilerCode}
                        onChange={(e) => handleFieldChange('entryFilerCode', e.target.value.toUpperCase())}
                        placeholder="e.g., ABC"
                        maxLength="3"
                        className="w-full px-4 py-3 text-sm border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-200 bg-white shadow-sm hover:border-gray-400"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-gray-800 uppercase tracking-wide">
                        <i className="fas fa-user-tie mr-1 text-purple-600"></i>
                        Importer of Record Number*
                        <span className="text-red-500 ml-1">REQUIRED</span>
                      </label>
                      <input
                        value={formData.importerOfRecordNumber}
                        onChange={(e) => handleFieldChange('importerOfRecordNumber', e.target.value)}
                        placeholder="e.g., 12-3456789"
                        className="w-full px-4 py-3 text-sm border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-200 bg-white shadow-sm hover:border-gray-400"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 2: FTZ Information */}
                <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg shadow-sm">
                  <h4 className="text-lg font-semibold text-blue-900 mb-4 flex items-center">
                    <i className="fas fa-globe-americas mr-2 text-blue-600"></i>
                    2. Foreign Trade Zone Information
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-gray-800 uppercase tracking-wide">
                        <i className="fas fa-map-marker-alt mr-1 text-blue-600"></i>
                        FTZ Identifier*
                        <span className="text-red-500 ml-1">REQUIRED</span>
                      </label>
                      <input
                        value={formData.foreignTradeZoneId}
                        onChange={(e) => handleFieldChange('foreignTradeZoneId', e.target.value.toUpperCase())}
                        placeholder="e.g., FTZ215GSM"
                        className="w-full px-4 py-3 text-sm border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 bg-white shadow-sm hover:border-gray-400"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-gray-800 uppercase tracking-wide">
                        <i className="fas fa-calendar-week mr-1 text-blue-600"></i>
                        Entry Options
                      </label>
                      <div className="flex items-center space-x-4 pt-2">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={formData.weeklyEntry}
                            onChange={(e) => handleFieldChange('weeklyEntry', e.target.checked)}
                            className="rounded border-gray-300"
                          />
                          <span className="ml-2 text-sm text-gray-700">Weekly Entry</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={formData.consolidatedEntry}
                            onChange={(e) => handleFieldChange('consolidatedEntry', e.target.checked)}
                            className="rounded border-gray-300"
                          />
                          <span className="ml-2 text-sm text-gray-700">Consolidated Entry</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {currentTab === 'review' && (
              <div>
                {/* Shipment Summary */}
                <div className="p-6 bg-gradient-to-r from-gray-50 to-blue-50 border-2 border-gray-200 rounded-lg shadow-sm mb-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <i className="fas fa-clipboard-check mr-2 text-gray-600"></i>
                    Shipment Summary
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="font-semibold text-gray-500">Shipment ID:</span>
                      <div className="font-medium text-gray-900">{formData.shipmentId}</div>
                    </div>
                    <div>
                      <span className="font-semibold text-gray-500">Type:</span>
                      <div className="font-medium text-gray-900">{formData.type}</div>
                    </div>
                    <div>
                      <span className="font-semibold text-gray-500">Customer:</span>
                      <div className="font-medium text-gray-900">{customers.find(c => c.id === formData.customerId)?.name || 'Not selected'}</div>
                    </div>
                    <div>
                      <span className="font-semibold text-gray-500">Line Items:</span>
                      <div className="font-medium text-gray-900">{formData.items.filter(item => item.lot && item.qty).length}</div>
                    </div>
                  </div>
                </div>

                {/* Validation Status */}
                <div className="p-6 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-lg shadow-sm">
                  <h4 className="text-lg font-semibold text-green-900 mb-4 flex items-center">
                    <i className="fas fa-check-circle mr-2 text-green-600"></i>
                    Validation Status
                  </h4>
                  <div className="space-y-3">
                    <div className={`flex items-center text-sm ${validateRequiredFields() ? 'text-green-600' : 'text-red-600'}`}>
                      <i className={`fas ${validateRequiredFields() ? 'fa-check-circle' : 'fa-exclamation-triangle'} mr-3`}></i>
                      <span className="font-medium">Required Fields:</span>
                      <span className="ml-2">{validateRequiredFields() ? 'Complete' : 'Missing required fields'}</span>
                    </div>
                    <div className={`flex items-center text-sm ${formData.items.filter(i => i.lot && i.qty).length > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      <i className={`fas ${formData.items.filter(i => i.lot && i.qty).length > 0 ? 'fa-check-circle' : 'fa-exclamation-triangle'} mr-3`}></i>
                      <span className="font-medium">Line Items:</span>
                      <span className="ml-2">{formData.items.filter(i => i.lot && i.qty).length > 0 ? 'Valid' : 'No valid line items'}</span>
                    </div>
                    <div className="flex items-center text-sm text-blue-600">
                      <i className="fas fa-info-circle mr-3"></i>
                      <span className="font-medium">Ready for ACE Filing:</span>
                      <span className="ml-2">{canSubmit() ? 'Yes' : 'Complete required fields first'}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Submit/Cancel Buttons */}
            <div className="mt-8 pt-6 border-t-2 border-gray-200 flex justify-between items-center bg-gray-50 -mx-6 -mb-6 px-6 py-4 rounded-b-lg">
              <div className="flex space-x-3">
                {currentTab !== 'shipment' && (
                  <button
                    className="px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-300"
                    onClick={() => {
                      if (currentTab === 'ace') setCurrentTab('shipment');
                      if (currentTab === 'review') setCurrentTab('ace');
                    }}
                    type="button"
                  >
                    <i className="fas fa-arrow-left mr-2"></i>Previous
                  </button>
                )}
              </div>
              
              <div className="flex items-center">
                <div className="text-sm text-gray-600 mr-6">
                  <i className="fas fa-info-circle mr-1 text-blue-500"></i>
                  Please review all information before submitting
                </div>
                <div className="flex space-x-3">
                  <button
                    className="px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-300"
                    onClick={onClose}
                    type="button"
                  >
                    <i className="fas fa-times mr-2"></i>
                    Cancel
                  </button>
                  
                  {currentTab !== 'review' ? (
                    <button
                      className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-blue-300 transform hover:scale-105"
                      onClick={() => {
                        if (currentTab === 'shipment') {
                          if (!formData.shipmentId || !formData.customerId) {
                            showError('Please complete shipment details first.');
                            return;
                          }
                          setCurrentTab('ace');
                        }
                        if (currentTab === 'ace') {
                          validateACEFields();
                          setCurrentTab('review');
                        }
                      }}
                      type="button"
                    >
                      Next <i className="fas fa-arrow-right ml-2"></i>
                    </button>
                  ) : (
                    <button
                      className={`px-6 py-3 text-white font-semibold rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 transform hover:scale-105 ${
                        canSubmit() 
                          ? 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 focus:ring-green-300' 
                          : 'bg-gray-400 cursor-not-allowed'
                      }`}
                      onClick={handleSubmit}
                      disabled={!canSubmit() || createMutation.isLoading}
                      type="button"
                    >
                      <i className="fas fa-shipping-fast mr-2"></i>
                      {createMutation.isLoading ? 'Creating...' : 'Create Pre-Shipment & Entry Summary'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreatePreshipmentModal;