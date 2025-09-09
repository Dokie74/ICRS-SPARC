// src/frontend/components/modals/AddLocationModal.js
// Storage location creation/editing modal for ICRS SPARC

import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import BaseModal from '../shared/BaseModal';
import apiClient from '../../services/api-client';

const AddLocationModal = ({ 
  isOpen, 
  onClose, 
  onSuccess, 
  onError, 
  location = null, 
  isEdit = false 
}) => {
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    name: location?.name || '',
    code: location?.code || '',
    description: location?.description || '',
    location_type: location?.location_type || 'warehouse',
    address: location?.address || '',
    capacity: location?.capacity || '',
    status: location?.status || 'active',
    contact_name: location?.contact_name || '',
    contact_phone: location?.contact_phone || '',
    contact_email: location?.contact_email || '',
    notes: location?.notes || ''
  });

  const [errors, setErrors] = useState({});

  // Create/Update mutation
  const locationMutation = useMutation({
    mutationFn: async (data) => {
      if (isEdit) {
        return apiClient.locations.update(location.id, data);
      } else {
        return apiClient.locations.create(data);
      }
    },
    onSuccess: (response) => {
      if (response.success) {
        // Invalidate and refetch location queries
        queryClient.invalidateQueries(['locations']);
        queryClient.invalidateQueries(['admin', 'locations']);
        queryClient.invalidateQueries(['admin', 'storage-locations']);
        queryClient.invalidateQueries(['admin', 'stats']);
        
        onSuccess(
          isEdit 
            ? 'Storage location updated successfully' 
            : 'Storage location added successfully'
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

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Location name is required';
    }
    
    if (!formData.code.trim()) {
      newErrors.code = 'Location code is required';
    }
    
    if (formData.code && !/^[A-Z0-9]{2,10}$/.test(formData.code.toUpperCase())) {
      newErrors.code = 'Code must be 2-10 alphanumeric characters';
    }
    
    if (formData.contact_email && !/\S+@\S+\.\S+/.test(formData.contact_email)) {
      newErrors.contact_email = 'Invalid email format';
    }
    
    if (formData.capacity && isNaN(parseInt(formData.capacity))) {
      newErrors.capacity = 'Capacity must be a number';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    // Prepare data with proper types
    const submitData = {
      ...formData,
      code: formData.code.toUpperCase(),
      capacity: formData.capacity ? parseInt(formData.capacity) : null
    };
    
    locationMutation.mutate(submitData);
  };

  const handleClose = () => {
    if (!locationMutation.isPending) {
      setFormData({
        name: '',
        code: '',
        description: '',
        location_type: 'warehouse',
        address: '',
        capacity: '',
        status: 'active',
        contact_name: '',
        contact_phone: '',
        contact_email: '',
        notes: ''
      });
      setErrors({});
      onClose();
    }
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={handleClose}
      title={isEdit ? 'Edit Storage Location' : 'Add New Storage Location'}
      size="lg"
      preventCloseOnOverlay={locationMutation.isPending}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div>
          <h4 className="text-lg font-medium text-gray-900 mb-4">Location Information</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Location Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Location Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.name ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Enter location name"
                disabled={locationMutation.isPending}
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name}</p>
              )}
            </div>

            {/* Location Code */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Location Code *
              </label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => handleInputChange('code', e.target.value.toUpperCase())}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.code ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="WH01"
                maxLength="10"
                disabled={locationMutation.isPending}
              />
              {errors.code && (
                <p className="mt-1 text-sm text-red-600">{errors.code}</p>
              )}
            </div>

            {/* Location Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Location Type
              </label>
              <select
                value={formData.location_type}
                onChange={(e) => handleInputChange('location_type', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={locationMutation.isPending}
              >
                <option value="warehouse">Warehouse</option>
                <option value="yard">Yard</option>
                <option value="dock">Dock</option>
                <option value="staging">Staging Area</option>
                <option value="office">Office</option>
                <option value="other">Other</option>
              </select>
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
                disabled={locationMutation.isPending}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="maintenance">Under Maintenance</option>
              </select>
            </div>

            {/* Capacity */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Capacity (sq ft)
              </label>
              <input
                type="number"
                value={formData.capacity}
                onChange={(e) => handleInputChange('capacity', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.capacity ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Enter capacity in square feet"
                disabled={locationMutation.isPending}
              />
              {errors.capacity && (
                <p className="mt-1 text-sm text-red-600">{errors.capacity}</p>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter location description"
              disabled={locationMutation.isPending}
            />
          </div>

          {/* Address */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Address
            </label>
            <textarea
              value={formData.address}
              onChange={(e) => handleInputChange('address', e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter physical address"
              disabled={locationMutation.isPending}
            />
          </div>
        </div>

        {/* Contact Information */}
        <div>
          <h4 className="text-lg font-medium text-gray-900 mb-4">Contact Information</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Contact Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contact Name
              </label>
              <input
                type="text"
                value={formData.contact_name}
                onChange={(e) => handleInputChange('contact_name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter contact name"
                disabled={locationMutation.isPending}
              />
            </div>

            {/* Contact Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contact Phone
              </label>
              <input
                type="tel"
                value={formData.contact_phone}
                onChange={(e) => handleInputChange('contact_phone', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="(555) 123-4567"
                disabled={locationMutation.isPending}
              />
            </div>

            {/* Contact Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contact Email
              </label>
              <input
                type="email"
                value={formData.contact_email}
                onChange={(e) => handleInputChange('contact_email', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.contact_email ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="contact@location.com"
                disabled={locationMutation.isPending}
              />
              {errors.contact_email && (
                <p className="mt-1 text-sm text-red-600">{errors.contact_email}</p>
              )}
            </div>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notes
          </label>
          <textarea
            value={formData.notes}
            onChange={(e) => handleInputChange('notes', e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Additional notes about the location..."
            disabled={locationMutation.isPending}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 pt-6 border-t">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            disabled={locationMutation.isPending}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={locationMutation.isPending}
          >
            {locationMutation.isPending ? (
              <span className="flex items-center">
                <i className="fas fa-spinner fa-spin mr-2"></i>
                {isEdit ? 'Updating...' : 'Adding...'}
              </span>
            ) : (
              isEdit ? 'Update Location' : 'Add Location'
            )}
          </button>
        </div>
      </form>
    </BaseModal>
  );
};

export default AddLocationModal;