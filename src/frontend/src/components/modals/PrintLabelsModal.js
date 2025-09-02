import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import BaseModal from '../shared/BaseModal';
import { useApp } from '../../contexts/AppContext';
import { shippingService } from '../../services/shippingService';

const PrintLabelsModal = ({ isOpen, onClose, data }) => {
  const { showSuccess, showError } = useApp();
  const queryClient = useQueryClient();

  const [labelData, setLabelData] = useState({
    carrier: 'UPS',
    service_type: 'Ground',
    package_type: 'Package',
    dimensions: {
      length: '',
      width: '',
      height: '',
      weight: ''
    },
    insurance_value: '',
    delivery_confirmation: true,
    signature_required: false,
    reference_numbers: [''],
    special_instructions: ''
  });

  const [labelOptions, setLabelOptions] = useState({
    label_format: '4x6',
    print_receipt: true,
    print_customs_form: false,
    copies: 1
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [generatedLabels, setGeneratedLabels] = useState([]);

  // Generate shipping labels mutation
  const generateLabelsMutation = useMutation(
    (formData) => shippingService.generateLabels(data.id, formData),
    {
      onSuccess: (response) => {
        showSuccess('Shipping labels generated successfully');
        setGeneratedLabels(response.labels || []);
        queryClient.invalidateQueries(['shipping']);
        // Automatically advance shipment status
        setTimeout(() => {
          updateStatusMutation.mutate({
            id: data.id,
            status: 'Ready for Pickup',
            notes: 'Labels generated and printed'
          });
        }, 1000);
      },
      onError: (error) => {
        showError(`Failed to generate labels: ${error.message}`);
        setLoading(false);
      }
    }
  );

  // Update shipment status mutation
  const updateStatusMutation = useMutation(
    ({ id, status, notes }) => shippingService.updateStatus(id, status, notes),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['shipping']);
      },
      onError: (error) => {
        showError(`Failed to update shipment status: ${error.message}`);
      }
    }
  );

  const resetForm = () => {
    setLabelData({
      carrier: 'UPS',
      service_type: 'Ground',
      package_type: 'Package',
      dimensions: {
        length: '',
        width: '',
        height: '',
        weight: ''
      },
      insurance_value: '',
      delivery_confirmation: true,
      signature_required: false,
      reference_numbers: [''],
      special_instructions: ''
    });
    setLabelOptions({
      label_format: '4x6',
      print_receipt: true,
      print_customs_form: false,
      copies: 1
    });
    setErrors({});
    setLoading(false);
    setGeneratedLabels([]);
  };

  const updateLabelData = (field, value) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setLabelData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setLabelData(prev => ({ ...prev, [field]: value }));
    }
    
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const updateLabelOptions = (field, value) => {
    setLabelOptions(prev => ({ ...prev, [field]: value }));
  };

  const addReferenceNumber = () => {
    setLabelData(prev => ({
      ...prev,
      reference_numbers: [...prev.reference_numbers, '']
    }));
  };

  const removeReferenceNumber = (index) => {
    setLabelData(prev => ({
      ...prev,
      reference_numbers: prev.reference_numbers.filter((_, i) => i !== index)
    }));
  };

  const updateReferenceNumber = (index, value) => {
    setLabelData(prev => ({
      ...prev,
      reference_numbers: prev.reference_numbers.map((ref, i) => i === index ? value : ref)
    }));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!labelData.carrier) {
      newErrors.carrier = 'Carrier is required';
    }

    if (!labelData.service_type) {
      newErrors.service_type = 'Service type is required';
    }

    if (!labelData.dimensions.weight) {
      newErrors.weight = 'Package weight is required';
    }

    if (!labelData.dimensions.length || !labelData.dimensions.width || !labelData.dimensions.height) {
      newErrors.dimensions = 'Package dimensions are required';
    }

    // Validate insurance value if provided
    if (labelData.insurance_value && isNaN(parseFloat(labelData.insurance_value))) {
      newErrors.insurance_value = 'Insurance value must be a number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);

    const formData = {
      ...labelData,
      ...labelOptions,
      // Filter out empty reference numbers
      reference_numbers: labelData.reference_numbers.filter(ref => ref.trim() !== '')
    };

    generateLabelsMutation.mutate(formData);
  };

  const handlePrintLabel = (labelUrl) => {
    // Open label in new window for printing
    const printWindow = window.open(labelUrl, '_blank', 'width=600,height=800');
    printWindow?.focus();
  };

  const handleDownloadLabel = (labelUrl, fileName) => {
    const link = document.createElement('a');
    link.href = labelUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Pre-populate form with shipment data
  useEffect(() => {
    if (isOpen && data) {
      setLabelData(prev => ({
        ...prev,
        dimensions: {
          ...prev.dimensions,
          weight: data.total_weight || ''
        },
        insurance_value: data.insurance_value || '',
        reference_numbers: [data.reference_number || ''].filter(Boolean)
      }));
    }
  }, [isOpen, data]);

  if (!data) return null;

  // Service type options by carrier
  const serviceTypes = {
    UPS: [
      { value: 'Ground', label: 'UPS Ground' },
      { value: 'Next Day Air', label: 'UPS Next Day Air' },
      { value: '2nd Day Air', label: 'UPS 2nd Day Air' },
      { value: '3 Day Select', label: 'UPS 3 Day Select' }
    ],
    FedEx: [
      { value: 'Ground', label: 'FedEx Ground' },
      { value: 'Express Overnight', label: 'FedEx Express Overnight' },
      { value: '2Day', label: 'FedEx 2Day' },
      { value: 'Express Saver', label: 'FedEx Express Saver' }
    ],
    USPS: [
      { value: 'Ground Advantage', label: 'USPS Ground Advantage' },
      { value: 'Priority', label: 'USPS Priority Mail' },
      { value: 'Express', label: 'USPS Priority Mail Express' },
      { value: 'First Class', label: 'USPS First-Class Mail' }
    ]
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={`Generate Shipping Labels - ${data.shipment_id || data.id}`}
      size="xl"
      className="max-h-screen overflow-y-auto"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Shipment Information */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Shipment Information</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Shipment ID</label>
              <p className="mt-1 text-sm text-gray-900">{data.shipment_id || data.id}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Customer</label>
              <p className="mt-1 text-sm text-gray-900">{data.customer_name || 'N/A'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Destination</label>
              <p className="mt-1 text-sm text-gray-900">{data.destination_address || 'N/A'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Total Items</label>
              <p className="mt-1 text-sm text-gray-900">{data.total_items || 'N/A'}</p>
            </div>
          </div>
        </div>

        {/* Carrier and Service Selection */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Carrier and Service</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Carrier *</label>
              <select
                value={labelData.carrier}
                onChange={(e) => updateLabelData('carrier', e.target.value)}
                className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                  errors.carrier ? 'border-red-300' : ''
                }`}
              >
                <option value="UPS">UPS</option>
                <option value="FedEx">FedEx</option>
                <option value="USPS">USPS</option>
              </select>
              {errors.carrier && (
                <p className="mt-1 text-sm text-red-600">{errors.carrier}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Service Type *</label>
              <select
                value={labelData.service_type}
                onChange={(e) => updateLabelData('service_type', e.target.value)}
                className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                  errors.service_type ? 'border-red-300' : ''
                }`}
              >
                <option value="">Select service...</option>
                {serviceTypes[labelData.carrier]?.map(service => (
                  <option key={service.value} value={service.value}>
                    {service.label}
                  </option>
                ))}
              </select>
              {errors.service_type && (
                <p className="mt-1 text-sm text-red-600">{errors.service_type}</p>
              )}
            </div>
          </div>
        </div>

        {/* Package Details */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Package Details</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Package Type</label>
              <select
                value={labelData.package_type}
                onChange={(e) => updateLabelData('package_type', e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              >
                <option value="Package">Package</option>
                <option value="Envelope">Envelope</option>
                <option value="Box">Box</option>
                <option value="Tube">Tube</option>
                <option value="Pak">Pak</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Weight (lbs) *</label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={labelData.dimensions.weight}
                onChange={(e) => updateLabelData('dimensions.weight', e.target.value)}
                className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                  errors.weight ? 'border-red-300' : ''
                }`}
                placeholder="0.0"
              />
              {errors.weight && (
                <p className="mt-1 text-sm text-red-600">{errors.weight}</p>
              )}
            </div>
          </div>

          {/* Dimensions */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Dimensions (inches) *</label>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={labelData.dimensions.length}
                  onChange={(e) => updateLabelData('dimensions.length', e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  placeholder="Length"
                />
              </div>
              <div>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={labelData.dimensions.width}
                  onChange={(e) => updateLabelData('dimensions.width', e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  placeholder="Width"
                />
              </div>
              <div>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={labelData.dimensions.height}
                  onChange={(e) => updateLabelData('dimensions.height', e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  placeholder="Height"
                />
              </div>
            </div>
            {errors.dimensions && (
              <p className="mt-1 text-sm text-red-600">{errors.dimensions}</p>
            )}
          </div>
        </div>

        {/* Service Options */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Service Options</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Insurance Value ($)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={labelData.insurance_value}
                onChange={(e) => updateLabelData('insurance_value', e.target.value)}
                className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                  errors.insurance_value ? 'border-red-300' : ''
                }`}
                placeholder="0.00"
              />
              {errors.insurance_value && (
                <p className="mt-1 text-sm text-red-600">{errors.insurance_value}</p>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center">
              <input
                id="delivery_confirmation"
                type="checkbox"
                checked={labelData.delivery_confirmation}
                onChange={(e) => updateLabelData('delivery_confirmation', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="delivery_confirmation" className="ml-2 block text-sm text-gray-900">
                Delivery Confirmation
              </label>
            </div>

            <div className="flex items-center">
              <input
                id="signature_required"
                type="checkbox"
                checked={labelData.signature_required}
                onChange={(e) => updateLabelData('signature_required', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="signature_required" className="ml-2 block text-sm text-gray-900">
                Signature Required
              </label>
            </div>
          </div>
        </div>

        {/* Reference Numbers */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Reference Numbers</h3>
            <button
              type="button"
              onClick={addReferenceNumber}
              className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <i className="fas fa-plus mr-1"></i>
              Add Reference
            </button>
          </div>
          
          {labelData.reference_numbers.map((ref, index) => (
            <div key={index} className="flex items-center space-x-2">
              <input
                type="text"
                value={ref}
                onChange={(e) => updateReferenceNumber(index, e.target.value)}
                className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder={`Reference ${index + 1}`}
              />
              {labelData.reference_numbers.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeReferenceNumber(index)}
                  className="inline-flex items-center p-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  <i className="fas fa-trash"></i>
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Special Instructions */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Special Instructions</label>
          <textarea
            value={labelData.special_instructions}
            onChange={(e) => updateLabelData('special_instructions', e.target.value)}
            rows={3}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            placeholder="Special handling instructions, delivery notes, etc..."
          />
        </div>

        {/* Label Options */}
        <div className="space-y-4 bg-blue-50 p-4 rounded-lg">
          <h3 className="text-lg font-medium text-gray-900">Label Options</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Label Format</label>
              <select
                value={labelOptions.label_format}
                onChange={(e) => updateLabelOptions('label_format', e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              >
                <option value="4x6">4" x 6" (Standard)</option>
                <option value="8.5x11">8.5" x 11" (Letter)</option>
                <option value="thermal">Thermal Printer</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Number of Copies</label>
              <input
                type="number"
                min="1"
                max="5"
                value={labelOptions.copies}
                onChange={(e) => updateLabelOptions('copies', parseInt(e.target.value))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center">
              <input
                id="print_receipt"
                type="checkbox"
                checked={labelOptions.print_receipt}
                onChange={(e) => updateLabelOptions('print_receipt', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="print_receipt" className="ml-2 block text-sm text-gray-900">
                Print Receipt
              </label>
            </div>

            <div className="flex items-center">
              <input
                id="print_customs_form"
                type="checkbox"
                checked={labelOptions.print_customs_form}
                onChange={(e) => updateLabelOptions('print_customs_form', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="print_customs_form" className="ml-2 block text-sm text-gray-900">
                Print Customs Form (International)
              </label>
            </div>
          </div>
        </div>

        {/* Generated Labels Display */}
        {generatedLabels.length > 0 && (
          <div className="space-y-4 bg-green-50 p-4 rounded-lg">
            <h3 className="text-lg font-medium text-gray-900">Generated Labels</h3>
            
            <div className="space-y-2">
              {generatedLabels.map((label, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-white rounded border">
                  <div className="flex items-center">
                    <i className="fas fa-tag text-green-600 mr-3"></i>
                    <div>
                      <p className="font-medium text-gray-900">Label {index + 1}</p>
                      <p className="text-sm text-gray-600">Tracking: {label.tracking_number}</p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      type="button"
                      onClick={() => handlePrintLabel(label.label_url)}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <i className="fas fa-print mr-2"></i>
                      Print
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownloadLabel(label.label_url, `label-${label.tracking_number}.pdf`)}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <i className="fas fa-download mr-2"></i>
                      Download
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Form Actions */}
        <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            disabled={loading}
          >
            {generatedLabels.length > 0 ? 'Done' : 'Cancel'}
          </button>
          {generatedLabels.length === 0 && (
            <button
              type="submit"
              disabled={loading}
              className={`px-4 py-2 text-sm font-medium text-white border border-transparent rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                loading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {loading ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                  Generating...
                </>
              ) : (
                <>
                  <i className="fas fa-print mr-2"></i>
                  Generate Labels
                </>
              )}
            </button>
          )}
        </div>
      </form>
    </BaseModal>
  );
};

export default PrintLabelsModal;