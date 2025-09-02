// src/frontend/components/modals/AddCustomerModal.js
// Customer creation/editing modal for ICRS SPARC

import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import BaseModal from '../shared/BaseModal';
import apiClient from '../../services/api-client';

const AddCustomerModal = ({ 
  isOpen, 
  onClose, 
  onSuccess, 
  onError, 
  customer = null, 
  isEdit = false 
}) => {
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    name: customer?.name || '',
    ein: customer?.ein || '',
    address: customer?.address || '',
    broker_name: customer?.broker_name || '',
    contact_email: customer?.contact_email || '',
    phone: customer?.phone || '',
    website: customer?.website || '',
    industry: customer?.industry || '',
    notes: customer?.notes || '',
    status: customer?.status || 'active'
  });

  const [contacts, setContacts] = useState(
    customer?.contacts?.length ? customer.contacts : [{
      name: '',
      email: '',
      phone: '',
      title: '',
      location: '',
      is_primary: true
    }]
  );

  const [errors, setErrors] = useState({});

  // Create/Update mutation
  const customerMutation = useMutation({
    mutationFn: async (data) => {
      const submitData = {
        ...data,
        contacts: contacts.filter(contact => contact.name.trim() || contact.email.trim())
      };
      
      if (isEdit) {
        return apiClient.customers.update(customer.id, submitData);
      } else {
        return apiClient.customers.create(submitData);
      }
    },
    onSuccess: (response) => {
      if (response.success) {
        // Invalidate and refetch customer queries
        queryClient.invalidateQueries(['customers']);
        queryClient.invalidateQueries(['admin', 'customers']);
        queryClient.invalidateQueries(['admin', 'customers-master']);
        queryClient.invalidateQueries(['admin', 'stats']);
        
        onSuccess(
          isEdit 
            ? 'Customer updated successfully' 
            : 'Customer added successfully'
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

  const handleContactChange = (index, field, value) => {
    setContacts(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      
      // If setting this contact as primary, unset others
      if (field === 'is_primary' && value) {
        updated.forEach((contact, i) => {
          if (i !== index) {
            contact.is_primary = false;
          }
        });
      }
      
      return updated;
    });
  };

  const addContact = () => {
    setContacts(prev => [...prev, {
      name: '',
      email: '',
      phone: '',
      title: '',
      location: '',
      is_primary: false
    }]);
  };

  const removeContact = (index) => {
    if (contacts.length > 1) {
      setContacts(prev => {
        const updated = prev.filter((_, i) => i !== index);
        // If we removed the primary contact, make the first one primary
        if (prev[index].is_primary && updated.length > 0) {
          updated[0].is_primary = true;
        }
        return updated;
      });
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Company name is required';
    }
    
    if (formData.ein && !/^\d{2}-\d{7}$/.test(formData.ein)) {
      newErrors.ein = 'EIN must be in format XX-XXXXXXX';
    }
    
    if (formData.contact_email && !/\S+@\S+\.\S+/.test(formData.contact_email)) {
      newErrors.contact_email = 'Invalid email format';
    }
    
    if (formData.website && !/^https?:\/\//.test(formData.website)) {
      // Auto-fix common website format issues
      if (formData.website.includes('.')) {
        setFormData(prev => ({ ...prev, website: `https://${formData.website}` }));
      } else {
        newErrors.website = 'Website must be a valid URL';
      }
    }
    
    // Validate at least one contact has required info
    const validContacts = contacts.filter(contact => contact.name.trim() || contact.email.trim());
    if (validContacts.length === 0) {
      newErrors.contacts = 'At least one contact with name or email is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    customerMutation.mutate(formData);
  };

  const handleClose = () => {
    if (!customerMutation.isPending) {
      setFormData({
        name: '',
        ein: '',
        address: '',
        broker_name: '',
        contact_email: '',
        phone: '',
        website: '',
        industry: '',
        notes: '',
        status: 'active'
      });
      setContacts([{
        name: '',
        email: '',
        phone: '',
        title: '',
        location: '',
        is_primary: true
      }]);
      setErrors({});
      onClose();
    }
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={handleClose}
      title={isEdit ? 'Edit Customer' : 'Add New Customer'}
      size="xl"
      preventCloseOnOverlay={customerMutation.isPending}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Company Information */}
        <div>
          <h4 className="text-lg font-medium text-gray-900 mb-4">Company Information</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Company Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Company Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.name ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Enter company name"
                disabled={customerMutation.isPending}
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name}</p>
              )}
            </div>

            {/* EIN */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                EIN (Tax ID)
              </label>
              <input
                type="text"
                value={formData.ein}
                onChange={(e) => handleInputChange('ein', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.ein ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="XX-XXXXXXX"
                disabled={customerMutation.isPending}
              />
              {errors.ein && (
                <p className="mt-1 text-sm text-red-600">{errors.ein}</p>
              )}
            </div>

            {/* Industry */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Industry
              </label>
              <select
                value={formData.industry}
                onChange={(e) => handleInputChange('industry', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={customerMutation.isPending}
              >
                <option value="">Select Industry</option>
                <option value="manufacturing">Manufacturing</option>
                <option value="automotive">Automotive</option>
                <option value="electronics">Electronics</option>
                <option value="textiles">Textiles</option>
                <option value="food-beverage">Food & Beverage</option>
                <option value="chemicals">Chemicals</option>
                <option value="pharmaceuticals">Pharmaceuticals</option>
                <option value="machinery">Machinery</option>
                <option value="aerospace">Aerospace</option>
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
                disabled={customerMutation.isPending}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
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
              placeholder="Enter company address"
              disabled={customerMutation.isPending}
            />
          </div>
        </div>

        {/* Contact Information */}
        <div>
          <h4 className="text-lg font-medium text-gray-900 mb-4">Contact Information</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Primary Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Primary Email
              </label>
              <input
                type="email"
                value={formData.contact_email}
                onChange={(e) => handleInputChange('contact_email', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.contact_email ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="contact@company.com"
                disabled={customerMutation.isPending}
              />
              {errors.contact_email && (
                <p className="mt-1 text-sm text-red-600">{errors.contact_email}</p>
              )}
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="(555) 123-4567"
                disabled={customerMutation.isPending}
              />
            </div>

            {/* Website */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Website
              </label>
              <input
                type="url"
                value={formData.website}
                onChange={(e) => handleInputChange('website', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.website ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="https://company.com"
                disabled={customerMutation.isPending}
              />
              {errors.website && (
                <p className="mt-1 text-sm text-red-600">{errors.website}</p>
              )}
            </div>
          </div>

          {/* Broker Name */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Customs Broker
            </label>
            <input
              type="text"
              value={formData.broker_name}
              onChange={(e) => handleInputChange('broker_name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter customs broker name"
              disabled={customerMutation.isPending}
            />
          </div>
        </div>

        {/* Additional Contacts */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-lg font-medium text-gray-900">Additional Contacts</h4>
            <button
              type="button"
              onClick={addContact}
              className="px-3 py-1 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
              disabled={customerMutation.isPending}
            >
              <i className="fas fa-plus mr-1"></i> Add Contact
            </button>
          </div>
          
          {errors.contacts && (
            <p className="mb-4 text-sm text-red-600">{errors.contacts}</p>
          )}

          <div className="space-y-4">
            {contacts.map((contact, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={contact.is_primary}
                      onChange={(e) => handleContactChange(index, 'is_primary', e.target.checked)}
                      className="mr-2"
                      disabled={customerMutation.isPending}
                    />
                    <label className="text-sm font-medium text-gray-700">
                      Primary Contact
                    </label>
                  </div>
                  {contacts.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeContact(index)}
                      className="text-red-600 hover:text-red-800 disabled:opacity-50"
                      disabled={customerMutation.isPending}
                    >
                      <i className="fas fa-trash text-sm"></i>
                    </button>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <input
                      type="text"
                      value={contact.name}
                      onChange={(e) => handleContactChange(index, 'name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Contact name"
                      disabled={customerMutation.isPending}
                    />
                  </div>
                  <div>
                    <input
                      type="email"
                      value={contact.email}
                      onChange={(e) => handleContactChange(index, 'email', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Email address"
                      disabled={customerMutation.isPending}
                    />
                  </div>
                  <div>
                    <input
                      type="tel"
                      value={contact.phone}
                      onChange={(e) => handleContactChange(index, 'phone', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Phone number"
                      disabled={customerMutation.isPending}
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      value={contact.title}
                      onChange={(e) => handleContactChange(index, 'title', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Job title"
                      disabled={customerMutation.isPending}
                    />
                  </div>
                </div>
              </div>
            ))}
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
            placeholder="Additional notes about the customer..."
            disabled={customerMutation.isPending}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 pt-6 border-t">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            disabled={customerMutation.isPending}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={customerMutation.isPending}
          >
            {customerMutation.isPending ? (
              <span className="flex items-center">
                <i className="fas fa-spinner fa-spin mr-2"></i>
                {isEdit ? 'Updating...' : 'Adding...'}
              </span>
            ) : (
              isEdit ? 'Update Customer' : 'Add Customer'
            )}
          </button>
        </div>
      </form>
    </BaseModal>
  );
};

export default AddCustomerModal;