// src/frontend/components/modals/AddPartModal.js
// Part creation/editing modal for ICRS SPARC

import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import BaseModal from '../shared/BaseModal';
import apiClient from '../../services/api-client';
import { getMaterialOptions, getMaterialLabel } from '../../utils/materialTypes';

const AddPartModal = ({ 
  isOpen, 
  onClose, 
  onSuccess, 
  onError, 
  part = null, 
  isEdit = false 
}) => {
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    id: part?.id || '',
    description: part?.description || '',
    hts_code: part?.hts_code || '',
    country_of_origin: part?.country_of_origin || '',
    standard_value: part?.standard_value || '',
    material_price: part?.material_price || '',
    labor_price: part?.labor_price || '',
    material_weight: part?.material_weight || '',
    unit_of_measure: part?.unit_of_measure || 'EA',
    gross_weight: part?.gross_weight || '',
    material: part?.material || '',
    manufacturer: part?.manufacturer || '',
    status: part?.status || 'active'
  });

  const [errors, setErrors] = useState({});

  // Create/Update mutation
  const partMutation = useMutation({
    mutationFn: async (data) => {
      if (isEdit) {
        return apiClient.parts.update(part.id, data);
      } else {
        return apiClient.parts.create(data);
      }
    },
    onSuccess: (response) => {
      if (response.success) {
        // Invalidate and refetch parts queries
        queryClient.invalidateQueries(['parts']);
        queryClient.invalidateQueries(['admin', 'parts']);
        queryClient.invalidateQueries(['admin', 'parts-master']);
        queryClient.invalidateQueries(['admin', 'stats']);
        
        onSuccess(
          isEdit 
            ? 'Part updated successfully' 
            : 'Part added successfully'
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
    
    // Auto-calculate pricing relationships
    if (field === 'material_weight' || field === 'material_price') {
      const weight = parseFloat(field === 'material_weight' ? value : formData.material_weight) || 0;
      const materialPrice = parseFloat(field === 'material_price' ? value : formData.material_price) || 0;
      const laborPrice = parseFloat(formData.labor_price) || 0;
      
      // Calculate standard value as material + labor
      const standardValue = (materialPrice + laborPrice).toFixed(2);
      setFormData(prev => ({ ...prev, standard_value: standardValue }));
    } else if (field === 'labor_price') {
      const materialPrice = parseFloat(formData.material_price) || 0;
      const laborPrice = parseFloat(value) || 0;
      const standardValue = (materialPrice + laborPrice).toFixed(2);
      setFormData(prev => ({ ...prev, standard_value: standardValue }));
    }
    
    // Clear field error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.id.trim()) {
      newErrors.id = 'Part number is required';
    }
    
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }
    
    if (formData.hts_code && !/^\d{4}\.\d{2}\.\d{4}$/.test(formData.hts_code)) {
      newErrors.hts_code = 'HTS code must be in format XXXX.XX.XXXX';
    }
    
    if (formData.standard_value && isNaN(parseFloat(formData.standard_value))) {
      newErrors.standard_value = 'Standard value must be a valid number';
    }
    
    if (formData.material_weight && isNaN(parseFloat(formData.material_weight))) {
      newErrors.material_weight = 'Material weight must be a valid number';
    }
    
    if (formData.gross_weight && isNaN(parseFloat(formData.gross_weight))) {
      newErrors.gross_weight = 'Gross weight must be a valid number';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    // Convert numeric fields
    const submitData = {
      ...formData,
      standard_value: parseFloat(formData.standard_value) || 0,
      material_price: parseFloat(formData.material_price) || 0,
      labor_price: parseFloat(formData.labor_price) || 0,
      material_weight: parseFloat(formData.material_weight) || 0,
      gross_weight: parseFloat(formData.gross_weight) || 0
    };
    
    partMutation.mutate(submitData);
  };

  const handleClose = () => {
    if (!partMutation.isPending) {
      setFormData({
        id: '',
        description: '',
        hts_code: '',
        country_of_origin: '',
        standard_value: '',
        material_price: '',
        labor_price: '',
        material_weight: '',
        unit_of_measure: 'EA',
        gross_weight: '',
        material: '',
        manufacturer: '',
        status: 'active'
      });
      setErrors({});
      onClose();
    }
  };

  const materialOptions = getMaterialOptions();

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={handleClose}
      title={isEdit ? 'Edit Part' : 'Add New Part'}
      size="xl"
      preventCloseOnOverlay={partMutation.isPending}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div>
          <h4 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Part Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Part Number *
              </label>
              <input
                type="text"
                value={formData.id}
                onChange={(e) => handleInputChange('id', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.id ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Enter part number"
                disabled={partMutation.isPending}
              />
              {errors.id && (
                <p className="mt-1 text-sm text-red-600">{errors.id}</p>
              )}
            </div>

            {/* Manufacturer */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Manufacturer
              </label>
              <input
                type="text"
                value={formData.manufacturer}
                onChange={(e) => handleInputChange('manufacturer', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter manufacturer"
                disabled={partMutation.isPending}
              />
            </div>
          </div>

          {/* Description */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description *
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={3}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.description ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Enter detailed part description"
              disabled={partMutation.isPending}
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-600">{errors.description}</p>
            )}
          </div>
        </div>

        {/* Classification */}
        <div>
          <h4 className="text-lg font-medium text-gray-900 mb-4">Classification</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* HTS Code */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                HTS Code
              </label>
              <input
                type="text"
                value={formData.hts_code}
                onChange={(e) => handleInputChange('hts_code', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.hts_code ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="XXXX.XX.XXXX"
                disabled={partMutation.isPending}
              />
              {errors.hts_code && (
                <p className="mt-1 text-sm text-red-600">{errors.hts_code}</p>
              )}
            </div>

            {/* Country of Origin */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Country of Origin
              </label>
              <input
                type="text"
                value={formData.country_of_origin}
                onChange={(e) => handleInputChange('country_of_origin', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., USA, CHN, DEU"
                disabled={partMutation.isPending}
              />
            </div>

            {/* Material */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Material
              </label>
              <select
                value={formData.material}
                onChange={(e) => handleInputChange('material', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={partMutation.isPending}
              >
                <option value="">Select Material</option>
                {materialOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Unit of Measure */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Unit of Measure
              </label>
              <select
                value={formData.unit_of_measure}
                onChange={(e) => handleInputChange('unit_of_measure', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={partMutation.isPending}
              >
                <option value="EA">Each (EA)</option>
                <option value="LB">Pounds (LB)</option>
                <option value="KG">Kilograms (KG)</option>
                <option value="FT">Feet (FT)</option>
                <option value="M">Meters (M)</option>
                <option value="GAL">Gallons (GAL)</option>
                <option value="L">Liters (L)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Pricing & Weight */}
        <div>
          <h4 className="text-lg font-medium text-gray-900 mb-4">Pricing & Weight</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Material Price */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Material Cost ($)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.material_price}
                onChange={(e) => handleInputChange('material_price', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
                disabled={partMutation.isPending}
              />
            </div>

            {/* Labor Price */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Labor Cost ($)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.labor_price}
                onChange={(e) => handleInputChange('labor_price', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
                disabled={partMutation.isPending}
              />
            </div>

            {/* Standard Value (Auto-calculated) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Standard Value ($)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.standard_value}
                onChange={(e) => handleInputChange('standard_value', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.standard_value ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="0.00"
                disabled={partMutation.isPending}
              />
              {errors.standard_value && (
                <p className="mt-1 text-sm text-red-600">{errors.standard_value}</p>
              )}
            </div>

            {/* Material Weight */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Material Weight
              </label>
              <input
                type="number"
                step="0.001"
                min="0"
                value={formData.material_weight}
                onChange={(e) => handleInputChange('material_weight', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.material_weight ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="0.000"
                disabled={partMutation.isPending}
              />
              {errors.material_weight && (
                <p className="mt-1 text-sm text-red-600">{errors.material_weight}</p>
              )}
            </div>

            {/* Gross Weight */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Gross Weight
              </label>
              <input
                type="number"
                step="0.001"
                min="0"
                value={formData.gross_weight}
                onChange={(e) => handleInputChange('gross_weight', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.gross_weight ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="0.000"
                disabled={partMutation.isPending}
              />
              {errors.gross_weight && (
                <p className="mt-1 text-sm text-red-600">{errors.gross_weight}</p>
              )}
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => handleInputChange('status', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={partMutation.isPending}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="discontinued">Discontinued</option>
              </select>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 pt-6 border-t">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            disabled={partMutation.isPending}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={partMutation.isPending}
          >
            {partMutation.isPending ? (
              <span className="flex items-center">
                <i className="fas fa-spinner fa-spin mr-2"></i>
                {isEdit ? 'Updating...' : 'Adding...'}
              </span>
            ) : (
              isEdit ? 'Update Part' : 'Add Part'
            )}
          </button>
        </div>
      </form>
    </BaseModal>
  );
};

export default AddPartModal;