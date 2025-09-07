// src/frontend/components/modals/AddSupplierModal.js
// Supplier creation/editing modal for ICRS SPARC

import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import BaseModal from '../shared/BaseModal';
import apiClient from '../../services/api-client';

const AddSupplierModal = ({ 
  isOpen, 
  onClose, 
  onSuccess, 
  onError, 
  supplier = null, 
  isEdit = false 
}) => {
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    name: supplier?.name || '',
    ein: supplier?.ein || '',
    address: supplier?.address || '',
    country: supplier?.country || '',
    contact_email: supplier?.contact_email || '',
    phone: supplier?.phone || '',
    contact_person: supplier?.contact_person || '',
    website: supplier?.website || '',
    industry: supplier?.industry || '',
    broker_name: supplier?.broker_name || '',
    broker_contact: supplier?.broker_contact || '',
    broker_contact_email: supplier?.broker_contact_email || '',
    broker_contact_phone: supplier?.broker_contact_phone || '',
    payment_terms: supplier?.payment_terms || '',
    currency: supplier?.currency || 'USD',
    notes: supplier?.notes || '',
    status: supplier?.status || 'active'
  });

  const [contacts, setContacts] = useState(
    supplier?.contacts?.length ? supplier.contacts : [{
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
  const supplierMutation = useMutation({
    mutationFn: async (data) => {
      const submitData = {
        ...data,
        contacts: contacts.filter(contact => contact.name.trim() || contact.email.trim())
      };
      
      if (isEdit) {
        return apiClient.put(`/api/admin/suppliers/${supplier.id}`, submitData);
      } else {
        return apiClient.post('/api/admin/suppliers', submitData);
      }
    },
    onSuccess: (response) => {
      if (response.success) {
        // Invalidate and refetch supplier queries
        queryClient.invalidateQueries(['admin', 'suppliers']);
        queryClient.invalidateQueries(['admin', 'suppliers-master']);
        queryClient.invalidateQueries(['admin', 'stats']);
        
        onSuccess(
          isEdit 
            ? 'Supplier updated successfully' 
            : 'Supplier added successfully'
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
      newErrors.name = 'Supplier name is required';
    }
    
    if (!formData.country.trim()) {
      newErrors.country = 'Country is required';
    }
    
    // Require contact_person
    if (!formData.contact_person.trim()) {
      newErrors.contact_person = 'Primary contact person is required';
    }
    
    // Require contact_email and validate format
    if (!formData.contact_email.trim()) {
      newErrors.contact_email = 'Contact email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.contact_email)) {
      newErrors.contact_email = 'Invalid email format';
    }
    
    if (formData.ein && !/^\d{2}-\d{7}$/.test(formData.ein)) {
      newErrors.ein = 'EIN must be in format XX-XXXXXXX';
    }
    
    if (formData.broker_contact_email && !/\S+@\S+\.\S+/.test(formData.broker_contact_email)) {
      newErrors.broker_contact_email = 'Invalid broker email format';
    }
    
    if (formData.website && !/^https?:\/\//.test(formData.website)) {
      // Auto-fix common website format issues
      if (formData.website.includes('.')) {
        setFormData(prev => ({ ...prev, website: `https://${formData.website}` }));
      } else {
        newErrors.website = 'Website must be a valid URL';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    supplierMutation.mutate(formData);
  };

  const handleClose = () => {
    if (!supplierMutation.isPending) {
      setFormData({
        name: '',
        ein: '',
        address: '',
        country: '',
        contact_email: '',
        phone: '',
        contact_person: '',
        website: '',
        industry: '',
        broker_name: '',
        broker_contact: '',
        broker_contact_email: '',
        broker_contact_phone: '',
        payment_terms: '',
        currency: 'USD',
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

  // Common country options
  const countries = [
    'USA', 'CHN', 'DEU', 'JPN', 'GBR', 'FRA', 'ITA', 'KOR', 'CAN', 'MEX',
    'IND', 'BRA', 'AUS', 'ESP', 'NLD', 'BEL', 'CHE', 'THA', 'TWN', 'VNM'
  ];

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={handleClose}
      title={isEdit ? 'Edit Supplier' : 'Add New Supplier'}
      size="xl"
      preventCloseOnOverlay={supplierMutation.isPending}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div>
          <h4 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Supplier Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Supplier Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.name ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Enter supplier name"
                disabled={supplierMutation.isPending}
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name}</p>
              )}
            </div>

            {/* Country */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Country *
              </label>
              <select
                value={formData.country}
                onChange={(e) => handleInputChange('country', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.country ? 'border-red-300' : 'border-gray-300'
                }`}
                disabled={supplierMutation.isPending}
              >
                <option value="">Select Country</option>
                {countries.map(country => (
                  <option key={country} value={country}>{country}</option>
                ))}
              </select>
              {errors.country && (
                <p className="mt-1 text-sm text-red-600">{errors.country}</p>
              )}
            </div>

            {/* EIN */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                EIN/Tax ID
              </label>
              <input
                type="text"
                value={formData.ein}
                onChange={(e) => handleInputChange('ein', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.ein ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="XX-XXXXXXX"
                disabled={supplierMutation.isPending}
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
                disabled={supplierMutation.isPending}
              >
                <option value="">Select Industry</option>
                <option value="manufacturing">Manufacturing</option>
                <option value="raw-materials">Raw Materials</option>
                <option value="electronics">Electronics</option>
                <option value="textiles">Textiles</option>
                <option value="chemicals">Chemicals</option>
                <option value="machinery">Machinery</option>
                <option value="automotive">Automotive</option>
                <option value="food-processing">Food Processing</option>
                <option value="other">Other</option>
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
              placeholder="Enter supplier address"
              disabled={supplierMutation.isPending}
            />
          </div>
        </div>

        {/* Contact Information */}
        <div>
          <h4 className="text-lg font-medium text-gray-900 mb-4">Contact Information</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Primary Contact Person */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Primary Contact Person *
              </label>
              <input
                type="text"
                value={formData.contact_person}
                onChange={(e) => handleInputChange('contact_person', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Contact person name"
                disabled={supplierMutation.isPending}
              />
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
                placeholder="+1 (555) 123-4567"
                disabled={supplierMutation.isPending}
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email *
              </label>
              <input
                type="email"
                value={formData.contact_email}
                onChange={(e) => handleInputChange('contact_email', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.contact_email ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="contact@supplier.com"
                disabled={supplierMutation.isPending}
              />
              {errors.contact_email && (
                <p className="mt-1 text-sm text-red-600">{errors.contact_email}</p>
              )}
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
                placeholder="https://supplier.com"
                disabled={supplierMutation.isPending}
              />
              {errors.website && (
                <p className="mt-1 text-sm text-red-600">{errors.website}</p>
              )}
            </div>
          </div>
        </div>

        {/* Broker Information */}
        <div>
          <h4 className="text-lg font-medium text-gray-900 mb-4">Customs Broker Information</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Broker Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Broker Name
              </label>
              <input
                type="text"
                value={formData.broker_name}
                onChange={(e) => handleInputChange('broker_name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter broker name"
                disabled={supplierMutation.isPending}
              />
            </div>

            {/* Broker Contact */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Broker Contact Person
              </label>
              <input
                type="text"
                value={formData.broker_contact}
                onChange={(e) => handleInputChange('broker_contact', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Broker contact name"
                disabled={supplierMutation.isPending}
              />
            </div>

            {/* Broker Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Broker Email
              </label>
              <input
                type="email"
                value={formData.broker_contact_email}
                onChange={(e) => handleInputChange('broker_contact_email', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.broker_contact_email ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="broker@company.com"
                disabled={supplierMutation.isPending}
              />
              {errors.broker_contact_email && (
                <p className="mt-1 text-sm text-red-600">{errors.broker_contact_email}</p>
              )}
            </div>

            {/* Broker Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Broker Phone
              </label>
              <input
                type="tel"
                value={formData.broker_contact_phone}
                onChange={(e) => handleInputChange('broker_contact_phone', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="+1 (555) 123-4567"
                disabled={supplierMutation.isPending}
              />
            </div>
          </div>
        </div>

        {/* Business Terms */}
        <div>
          <h4 className="text-lg font-medium text-gray-900 mb-4">Business Terms</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Payment Terms */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Terms
              </label>
              <select
                value={formData.payment_terms}
                onChange={(e) => handleInputChange('payment_terms', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={supplierMutation.isPending}
              >
                <option value="">Select Payment Terms</option>
                <option value="net-30">Net 30</option>
                <option value="net-60">Net 60</option>
                <option value="net-90">Net 90</option>
                <option value="cod">Cash on Delivery</option>
                <option value="prepaid">Prepaid</option>
                <option value="lc">Letter of Credit</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Currency */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Currency
              </label>
              <select
                value={formData.currency}
                onChange={(e) => handleInputChange('currency', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={supplierMutation.isPending}
              >
                <option value="USD">USD - US Dollar</option>
                <option value="EUR">EUR - Euro</option>
                <option value="CNY">CNY - Chinese Yuan</option>
                <option value="JPY">JPY - Japanese Yen</option>
                <option value="GBP">GBP - British Pound</option>
                <option value="CAD">CAD - Canadian Dollar</option>
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
                disabled={supplierMutation.isPending}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="blocked">Blocked</option>
                <option value="pending">Pending Approval</option>
              </select>
            </div>
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
              disabled={supplierMutation.isPending}
            >
              <i className="fas fa-plus mr-1"></i> Add Contact
            </button>
          </div>

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
                      disabled={supplierMutation.isPending}
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
                      disabled={supplierMutation.isPending}
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
                      disabled={supplierMutation.isPending}
                    />
                  </div>
                  <div>
                    <input
                      type="email"
                      value={contact.email}
                      onChange={(e) => handleContactChange(index, 'email', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Email address"
                      disabled={supplierMutation.isPending}
                    />
                  </div>
                  <div>
                    <input
                      type="tel"
                      value={contact.phone}
                      onChange={(e) => handleContactChange(index, 'phone', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Phone number"
                      disabled={supplierMutation.isPending}
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      value={contact.title}
                      onChange={(e) => handleContactChange(index, 'title', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Job title"
                      disabled={supplierMutation.isPending}
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
            placeholder="Additional notes about the supplier..."
            disabled={supplierMutation.isPending}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 pt-6 border-t">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            disabled={supplierMutation.isPending}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={supplierMutation.isPending}
          >
            {supplierMutation.isPending ? (
              <span className="flex items-center">
                <i className="fas fa-spinner fa-spin mr-2"></i>
                {isEdit ? 'Updating...' : 'Adding...'}
              </span>
            ) : (
              isEdit ? 'Update Supplier' : 'Add Supplier'
            )}
          </button>
        </div>
      </form>
    </BaseModal>
  );
};

export default AddSupplierModal;