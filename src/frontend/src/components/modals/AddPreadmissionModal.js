// src/frontend/components/modals/AddPreadmissionModal.js
// Pre-admission creation/editing modal for ICRS SPARC (CBP Form 214)

import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import BaseModal from '../shared/BaseModal';
import apiClient from '../../services/api-client';

const AddPreadmissionModal = ({ 
  isOpen, 
  onClose, 
  onSuccess, 
  onError,
  preadmission = null, 
  isEdit = false 
}) => {
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    // Basic identification (aligned with spreadsheet UID)
    admission_id: preadmission?.admission_id || '',
    customer_id: preadmission?.customer_id || '',
    zone_status: preadmission?.zone_status || '',
    status: preadmission?.status || 'Pending',
    e214: preadmission?.e214 || '',
    
    // Supplier and shipment identification (from spreadsheet Supplier2, Year, Shipment/Lot ID)
    primary_supplier_name: preadmission?.primary_supplier_name || '',
    year: preadmission?.year || new Date().getFullYear(),
    shipment_lot_id: preadmission?.shipment_lot_id || '',
    
    // Transport & BOL Information (aligned with spreadsheet BOL fields)
    bol: preadmission?.bol || '',
    bol_date: preadmission?.bol_date || '',
    container_number: preadmission?.container_number || '',
    seal_number: preadmission?.seal_number || '',
    conveyance_name: preadmission?.conveyance_name || '',
    
    // Date Information (aligned with spreadsheet date columns)
    import_date: preadmission?.import_date || '', // FTZ Admission Date
    export_date: preadmission?.export_date || '',
    luc_ship_date: preadmission?.luc_ship_date || '', // LUC Ship Date
    expected_arrival: preadmission?.expected_arrival || '',
    freight_invoice_date: preadmission?.freight_invoice_date || '',
    
    // Financial Information (aligned with spreadsheet Value/Bond/Tariff columns)
    total_value: preadmission?.total_value || '',
    bond_amount: preadmission?.bond_amount || '',
    total_charges: preadmission?.total_charges || '',
    ship_invoice_number: preadmission?.ship_invoice_number || '',
    
    // Customs and compliance
    uscbp_master_billing: preadmission?.uscbp_master_billing || '',
    
    // Port & In-Bond Information (keep for compatibility)
    foreign_port_of_lading: preadmission?.foreign_port_of_lading || '',
    foreign_port_of_unlading: preadmission?.foreign_port_of_unlading || '',
    port_of_unlading: preadmission?.port_of_unlading || '',
    it_carrier: preadmission?.it_carrier || '',
    it_date: preadmission?.it_date || '',
    it_port: preadmission?.it_port || '',
    
    // Notes (aligned with spreadsheet Note column)
    notes: preadmission?.notes || ''
  });

  const [items, setItems] = useState(
    preadmission?.items?.length ? preadmission.items : [{
      part_id: '',
      variant_id: null,
      quantity: '',
      package_quantity: '',
      package_type: '',
      gross_weight: '',
      supplier_id: '',
      country_of_origin: '',
      hts_code: ''
    }]
  );

  const [availableData, setAvailableData] = useState({
    customers: [],
    parts: [],
    suppliers: [],
    locations: [],
    partVariants: {}
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  // Load required data when modal opens
  useEffect(() => {
    if (isOpen) {
      loadRequiredData();
    }
  }, [isOpen]);

  const loadRequiredData = async () => {
    setLoading(true);
    try {
      const [customersRes, partsRes] = await Promise.all([
        apiClient.customers.getAll({ limit: 1000, active: true }),
        apiClient.parts.getAll({ limit: 1000, active: true })
      ]);

      // For now, we'll use empty arrays for suppliers and locations
      // These can be added once the API endpoints are available

      setAvailableData({
        customers: customersRes.success ? customersRes.data : [],
        parts: partsRes.success ? partsRes.data : [],
        suppliers: [], // Will be populated when API is available
        locations: [], // Will be populated when API is available
        partVariants: {}
      });
    } catch (error) {
      console.error('Error loading required data:', error);
      onError('Failed to load form data');
    } finally {
      setLoading(false);
    }
  };

  // Create/Update mutation
  const preadmissionMutation = useMutation({
    mutationFn: async (data) => {
      if (isEdit) {
        return apiClient.preadmission.update(preadmission.id, data);
      } else {
        return apiClient.preadmission.create(data);
      }
    },
    onSuccess: (response) => {
      if (response.success) {
        // Invalidate and refetch preadmissions queries
        queryClient.invalidateQueries(['preadmissions']);
        queryClient.invalidateQueries(['preadmission']);
        
        onSuccess(
          isEdit 
            ? 'Pre-admission updated successfully' 
            : 'Pre-admission created successfully'
        );
      } else {
        onError(response.error || 'Operation failed');
      }
    },
    onError: (error) => {
      onError(error.message || 'Operation failed');
    }
  });

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear field error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const handleItemChange = (index, field, value) => {
    const updatedItems = [...items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    
    // Auto-populate fields from part selection
    if (field === 'part_id') {
      const selectedPart = availableData.parts.find(p => p.id === value);
      if (selectedPart) {
        updatedItems[index] = {
          ...updatedItems[index],
          hts_code: selectedPart.hts_code || '',
          country_of_origin: selectedPart.country_of_origin || ''
        };
      }
    }
    
    setItems(updatedItems);
  };

  const addItem = () => {
    setItems(prev => [...prev, {
      part_id: '',
      variant_id: null,
      quantity: '',
      package_quantity: '',
      package_type: '',
      gross_weight: '',
      supplier_id: '',
      country_of_origin: '',
      hts_code: ''
    }]);
  };

  const removeItem = (index) => {
    if (items.length > 1) {
      setItems(prev => prev.filter((_, i) => i !== index));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    // Required field validation
    if (!formData.admission_id.trim()) {
      newErrors.admission_id = 'Admission ID is required';
    }
    
    if (!formData.customer_id) {
      newErrors.customer_id = 'Customer selection is required';
    }
    
    if (!formData.zone_status) {
      newErrors.zone_status = 'Zone status is required';
    }
    
    // Year validation
    if (formData.year && (!Number.isInteger(parseInt(formData.year)) || parseInt(formData.year) < 2020 || parseInt(formData.year) > 2030)) {
      newErrors.year = 'Year must be between 2020 and 2030';
    }
    
    // Date validation
    if (formData.export_date && formData.import_date) {
      if (new Date(formData.export_date) > new Date(formData.import_date)) {
        newErrors.import_date = 'Import date must be after export date';
      }
    }
    
    // BOL date vs FTZ admission date validation
    if (formData.bol_date && formData.import_date) {
      if (new Date(formData.bol_date) > new Date(formData.import_date)) {
        newErrors.import_date = 'BOL Date cannot be after FTZ Admission Date';
      }
    }
    
    // Items validation
    if (items.length === 0) {
      newErrors.items = 'At least one item is required';
    } else {
      items.forEach((item, index) => {
        if (!item.part_id) {
          newErrors[`item_${index}_part`] = `Item ${index + 1}: Part selection is required`;
        }
        if (!item.quantity || item.quantity <= 0) {
          newErrors[`item_${index}_qty`] = `Item ${index + 1}: Valid quantity is required`;
        }
      });
    }
    
    // Numeric validation
    const numericFields = ['total_value', 'bond_amount', 'total_charges'];
    numericFields.forEach(field => {
      if (formData[field] && isNaN(parseFloat(formData[field]))) {
        newErrors[field] = `${field.replace('_', ' ')} must be a valid number`;
      }
    });
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    // Prepare submission data (aligned with new spreadsheet fields)
    const submissionData = {
      ...formData,
      customer_id: parseInt(formData.customer_id),
      year: parseInt(formData.year) || null,
      total_value: parseFloat(formData.total_value) || 0,
      bond_amount: parseFloat(formData.bond_amount) || 0,
      total_charges: parseFloat(formData.total_charges) || 0,
      items: items.map(item => ({
        ...item,
        part_id: item.part_id,
        variant_id: item.variant_id || null,
        quantity: parseInt(item.quantity),
        package_quantity: parseInt(item.package_quantity) || null,
        gross_weight: parseFloat(item.gross_weight) || null,
        supplier_id: item.supplier_id || null
      }))
    };
    
    preadmissionMutation.mutate(submissionData);
  };

  const handleClose = () => {
    if (!preadmissionMutation.isPending) {
      // Reset form (aligned with new spreadsheet fields)
      setFormData({
        admission_id: '',
        customer_id: '',
        zone_status: '',
        status: 'Pending',
        e214: '',
        primary_supplier_name: '',
        year: new Date().getFullYear(),
        shipment_lot_id: '',
        bol: '',
        bol_date: '',
        container_number: '',
        seal_number: '',
        conveyance_name: '',
        import_date: '',
        export_date: '',
        luc_ship_date: '',
        expected_arrival: '',
        freight_invoice_date: '',
        total_value: '',
        bond_amount: '',
        total_charges: '',
        ship_invoice_number: '',
        uscbp_master_billing: '',
        foreign_port_of_lading: '',
        foreign_port_of_unlading: '',
        port_of_unlading: '',
        it_carrier: '',
        it_date: '',
        it_port: '',
        notes: ''
      });
      setItems([{
        part_id: '',
        variant_id: null,
        quantity: '',
        package_quantity: '',
        package_type: '',
        gross_weight: '',
        supplier_id: '',
        country_of_origin: '',
        hts_code: ''
      }]);
      setErrors({});
      onClose();
    }
  };

  const getCustomerName = (customerId) => {
    const customer = availableData.customers.find(c => c.id.toString() === customerId.toString());
    return customer ? customer.name : '';
  };

  const getPartName = (partId) => {
    const part = availableData.parts.find(p => p.id === partId);
    return part ? `${part.id} - ${part.description}` : '';
  };

  const getSupplierName = (supplierId) => {
    const supplier = availableData.suppliers.find(s => s.id.toString() === supplierId.toString());
    return supplier ? supplier.name : '';
  };

  if (loading) {
    return (
      <BaseModal isOpen={isOpen} onClose={handleClose} title="Loading..." size="sm">
        <div className="flex items-center justify-center py-8">
          <i className="fas fa-spinner fa-spin text-2xl text-blue-600 mr-3"></i>
          <span>Loading form data...</span>
        </div>
      </BaseModal>
    );
  }

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={handleClose}
      title={isEdit ? 'Edit Pre-Admission' : 'Create New Pre-Admission (CBP Form 214)'}
      size="xl"
      preventCloseOnOverlay={preadmissionMutation.isPending}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Basic Information (aligned with spreadsheet UID, Status, Customer) */}
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-lg">
          <h4 className="text-lg font-semibold text-blue-900 mb-4 flex items-center">
            <i className="fas fa-id-card mr-2"></i>
            Basic Information
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Admission ID (UID) *
              </label>
              <input
                type="text"
                value={formData.admission_id}
                onChange={(e) => handleInputChange('admission_id', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.admission_id ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Enter unique admission ID"
                disabled={preadmissionMutation.isPending}
              />
              {errors.admission_id && (
                <p className="mt-1 text-sm text-red-600">{errors.admission_id}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Zone Status *
              </label>
              <select
                value={formData.zone_status}
                onChange={(e) => handleInputChange('zone_status', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.zone_status ? 'border-red-300' : 'border-gray-300'
                }`}
                disabled={preadmissionMutation.isPending}
              >
                <option value="">Select status...</option>
                <option value="NPF">Non-Privileged Foreign (NPF)</option>
                <option value="PF">Privileged Foreign (PF)</option>
                <option value="D">Domestic (D)</option>
                <option value="ZR">Zone-Restricted (ZR)</option>
              </select>
              {errors.zone_status && (
                <p className="mt-1 text-sm text-red-600">{errors.zone_status}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Customer *
              </label>
              <select
                value={formData.customer_id}
                onChange={(e) => handleInputChange('customer_id', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.customer_id ? 'border-red-300' : 'border-gray-300'
                }`}
                disabled={preadmissionMutation.isPending}
              >
                <option value="">Select customer...</option>
                {availableData.customers.map(customer => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </select>
              {errors.customer_id && (
                <p className="mt-1 text-sm text-red-600">{errors.customer_id}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Year
              </label>
              <input
                type="number"
                min="2020"
                max="2030"
                value={formData.year}
                onChange={(e) => handleInputChange('year', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.year ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Enter year"
                disabled={preadmissionMutation.isPending}
              />
              {errors.year && (
                <p className="mt-1 text-sm text-red-600">{errors.year}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Shipment/Lot ID
              </label>
              <input
                type="text"
                value={formData.shipment_lot_id}
                onChange={(e) => handleInputChange('shipment_lot_id', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter shipment or lot ID"
                disabled={preadmissionMutation.isPending}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Primary Supplier
              </label>
              <input
                type="text"
                value={formData.primary_supplier_name}
                onChange={(e) => handleInputChange('primary_supplier_name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter primary supplier name"
                disabled={preadmissionMutation.isPending}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                E214 Number
              </label>
              <input
                type="text"
                value={formData.e214}
                onChange={(e) => handleInputChange('e214', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter E214 number"
                disabled={preadmissionMutation.isPending}
              />
            </div>
          </div>
        </div>

        {/* Section 2: Transport & Shipping Information (aligned with spreadsheet BOL, Container, Seal, Carrier) */}
        <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded-r-lg">
          <h4 className="text-lg font-semibold text-green-900 mb-4 flex items-center">
            <i className="fas fa-ship mr-2"></i>
            Transport & Shipping Information
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                BOL Number
              </label>
              <input
                type="text"
                value={formData.bol}
                onChange={(e) => handleInputChange('bol', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Enter BOL number"
                disabled={preadmissionMutation.isPending}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                BOL Date
              </label>
              <input
                type="date"
                value={formData.bol_date}
                onChange={(e) => handleInputChange('bol_date', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                disabled={preadmissionMutation.isPending}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Container ID
              </label>
              <input
                type="text"
                value={formData.container_number}
                onChange={(e) => handleInputChange('container_number', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Enter container ID"
                disabled={preadmissionMutation.isPending}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Seal Number
              </label>
              <input
                type="text"
                value={formData.seal_number}
                onChange={(e) => handleInputChange('seal_number', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Enter seal number"
                disabled={preadmissionMutation.isPending}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Carrier
              </label>
              <input
                type="text"
                value={formData.conveyance_name}
                onChange={(e) => handleInputChange('conveyance_name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Enter carrier name"
                disabled={preadmissionMutation.isPending}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                USCBP Master Bill #
              </label>
              <input
                type="text"
                value={formData.uscbp_master_billing}
                onChange={(e) => handleInputChange('uscbp_master_billing', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Enter master bill number"
                disabled={preadmissionMutation.isPending}
              />
            </div>
          </div>
        </div>

        {/* Section 3: Date Information (aligned with spreadsheet date columns) */}
        <div className="bg-purple-50 border-l-4 border-purple-400 p-4 rounded-r-lg">
          <h4 className="text-lg font-semibold text-purple-900 mb-4 flex items-center">
            <i className="fas fa-calendar mr-2"></i>
            Date Information
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                FTZ Admission Date
              </label>
              <input
                type="date"
                value={formData.import_date}
                onChange={(e) => handleInputChange('import_date', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                  errors.import_date ? 'border-red-300' : 'border-gray-300'
                }`}
                disabled={preadmissionMutation.isPending}
              />
              {errors.import_date && (
                <p className="mt-1 text-sm text-red-600">{errors.import_date}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                LUC Ship Date
              </label>
              <input
                type="date"
                value={formData.luc_ship_date}
                onChange={(e) => handleInputChange('luc_ship_date', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                disabled={preadmissionMutation.isPending}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Freight Invoice Date
              </label>
              <input
                type="date"
                value={formData.freight_invoice_date}
                onChange={(e) => handleInputChange('freight_invoice_date', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                disabled={preadmissionMutation.isPending}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Export Date
              </label>
              <input
                type="date"
                value={formData.export_date}
                onChange={(e) => handleInputChange('export_date', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                disabled={preadmissionMutation.isPending}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Expected Arrival Date
              </label>
              <input
                type="date"
                value={formData.expected_arrival}
                onChange={(e) => handleInputChange('expected_arrival', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                disabled={preadmissionMutation.isPending}
              />
            </div>
          </div>
        </div>

        {/* Section 3: Port Information */}
        <div className="bg-purple-50 border-l-4 border-purple-400 p-4 rounded-r-lg">
          <h4 className="text-lg font-semibold text-purple-900 mb-4 flex items-center">
            <i className="fas fa-anchor mr-2"></i>
            Port & In-Bond Information
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Foreign Port of Lading
              </label>
              <input
                type="text"
                value={formData.foreign_port_of_lading}
                onChange={(e) => handleInputChange('foreign_port_of_lading', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Enter foreign port"
                disabled={preadmissionMutation.isPending}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Foreign Port of Unlading
              </label>
              <input
                type="text"
                value={formData.foreign_port_of_unlading}
                onChange={(e) => handleInputChange('foreign_port_of_unlading', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Enter foreign port"
                disabled={preadmissionMutation.isPending}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                U.S. Port of Unlading
              </label>
              <input
                type="text"
                value={formData.port_of_unlading}
                onChange={(e) => handleInputChange('port_of_unlading', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Enter U.S. port"
                disabled={preadmissionMutation.isPending}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                In-Bond Carrier
              </label>
              <input
                type="text"
                value={formData.it_carrier}
                onChange={(e) => handleInputChange('it_carrier', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Enter carrier name"
                disabled={preadmissionMutation.isPending}
              />
            </div>
          </div>
        </div>

        {/* Section 4: Items */}
        <div className="bg-orange-50 border-l-4 border-orange-400 p-4 rounded-r-lg">
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-lg font-semibold text-orange-900 flex items-center">
              <i className="fas fa-boxes mr-2"></i>
              Items & Merchandise
            </h4>
            <button
              type="button"
              onClick={addItem}
              className="px-3 py-1 text-sm bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50"
              disabled={preadmissionMutation.isPending}
            >
              <i className="fas fa-plus mr-1"></i>
              Add Item
            </button>
          </div>

          {errors.items && (
            <p className="mb-4 text-sm text-red-600">{errors.items}</p>
          )}

          <div className="space-y-4">
            {items.map((item, index) => (
              <div key={index} className="border border-orange-200 rounded-lg p-4 bg-white">
                <div className="flex justify-between items-center mb-3">
                  <h5 className="text-sm font-medium text-gray-800">
                    Item {index + 1}
                  </h5>
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="text-red-600 hover:text-red-800 disabled:opacity-50"
                      disabled={preadmissionMutation.isPending}
                    >
                      <i className="fas fa-trash text-sm"></i>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Part *
                    </label>
                    <select
                      value={item.part_id}
                      onChange={(e) => handleItemChange(index, 'part_id', e.target.value)}
                      className={`w-full px-2 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                        errors[`item_${index}_part`] ? 'border-red-300' : 'border-gray-300'
                      }`}
                      disabled={preadmissionMutation.isPending}
                    >
                      <option value="">Select part...</option>
                      {availableData.parts.map(part => (
                        <option key={part.id} value={part.id}>
                          {part.id} - {part.description}
                        </option>
                      ))}
                    </select>
                    {errors[`item_${index}_part`] && (
                      <p className="mt-1 text-xs text-red-600">{errors[`item_${index}_part`]}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Supplier
                    </label>
                    <select
                      value={item.supplier_id}
                      onChange={(e) => handleItemChange(index, 'supplier_id', e.target.value)}
                      className="w-full px-2 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                      disabled={preadmissionMutation.isPending}
                    >
                      <option value="">Select supplier...</option>
                      {availableData.suppliers.map(supplier => (
                        <option key={supplier.id} value={supplier.id}>
                          {supplier.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Quantity *
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                      className={`w-full px-2 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                        errors[`item_${index}_qty`] ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="Enter quantity"
                      disabled={preadmissionMutation.isPending}
                    />
                    {errors[`item_${index}_qty`] && (
                      <p className="mt-1 text-xs text-red-600">{errors[`item_${index}_qty`]}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Gross Weight (kg)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.gross_weight}
                      onChange={(e) => handleItemChange(index, 'gross_weight', e.target.value)}
                      className="w-full px-2 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder="0.00"
                      disabled={preadmissionMutation.isPending}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Package Quantity
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={item.package_quantity}
                      onChange={(e) => handleItemChange(index, 'package_quantity', e.target.value)}
                      className="w-full px-2 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder="Enter package qty"
                      disabled={preadmissionMutation.isPending}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Package Type
                    </label>
                    <input
                      type="text"
                      value={item.package_type}
                      onChange={(e) => handleItemChange(index, 'package_type', e.target.value)}
                      className="w-full px-2 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder="e.g., Box, Pallet"
                      disabled={preadmissionMutation.isPending}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Country of Origin
                    </label>
                    <input
                      type="text"
                      value={item.country_of_origin}
                      onChange={(e) => handleItemChange(index, 'country_of_origin', e.target.value)}
                      className="w-full px-2 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder="e.g., USA, CHN"
                      disabled={preadmissionMutation.isPending}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      HTS Code
                    </label>
                    <input
                      type="text"
                      value={item.hts_code}
                      onChange={(e) => handleItemChange(index, 'hts_code', e.target.value)}
                      className="w-full px-2 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder="XXXX.XX.XXXX"
                      disabled={preadmissionMutation.isPending}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 5: Financial Information (aligned with spreadsheet Value, Bond, Tariff, Ship Inv.) */}
        <div className="bg-gray-50 border-l-4 border-gray-400 p-4 rounded-r-lg">
          <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <i className="fas fa-dollar-sign mr-2"></i>
            Financial Information
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Value of Goods ($)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.total_value}
                onChange={(e) => handleInputChange('total_value', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 ${
                  errors.total_value ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="0.00"
                disabled={preadmissionMutation.isPending}
              />
              {errors.total_value && (
                <p className="mt-1 text-sm text-red-600">{errors.total_value}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bond Amount ($)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.bond_amount}
                onChange={(e) => handleInputChange('bond_amount', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 ${
                  errors.bond_amount ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="0.00"
                disabled={preadmissionMutation.isPending}
              />
              {errors.bond_amount && (
                <p className="mt-1 text-sm text-red-600">{errors.bond_amount}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tariff Amount ($)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.total_charges}
                onChange={(e) => handleInputChange('total_charges', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 ${
                  errors.total_charges ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="0.00"
                disabled={preadmissionMutation.isPending}
              />
              {errors.total_charges && (
                <p className="mt-1 text-sm text-red-600">{errors.total_charges}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ship Invoice Number
              </label>
              <input
                type="text"
                value={formData.ship_invoice_number}
                onChange={(e) => handleInputChange('ship_invoice_number', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500"
                placeholder="Enter ship invoice number"
                disabled={preadmissionMutation.isPending}
              />
            </div>
          </div>
        </div>

        {/* Section 6: Notes (aligned with spreadsheet Note column) */}
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-lg">
          <h4 className="text-lg font-semibold text-yellow-900 mb-4 flex items-center">
            <i className="fas fa-sticky-note mr-2"></i>
            Additional Information
          </h4>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
              placeholder="Enter any additional notes or comments"
              rows="3"
              disabled={preadmissionMutation.isPending}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 pt-6 border-t">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            disabled={preadmissionMutation.isPending}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={preadmissionMutation.isPending}
          >
            {preadmissionMutation.isPending ? (
              <span className="flex items-center">
                <i className="fas fa-spinner fa-spin mr-2"></i>
                {isEdit ? 'Updating...' : 'Creating...'}
              </span>
            ) : (
              isEdit ? 'Update Pre-Admission' : 'Create Pre-Admission'
            )}
          </button>
        </div>
      </form>
    </BaseModal>
  );
};

export default AddPreadmissionModal;