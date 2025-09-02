import React, { useState, useRef, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import BaseModal from '../shared/BaseModal';
import { useApp } from '../../contexts/AppContext';
import { shippingService } from '../../services/shippingService';

const DriverSignoffModal = ({ isOpen, onClose, data }) => {
  const { showSuccess, showError } = useApp();
  const queryClient = useQueryClient();
  const signatureCanvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [lastPosition, setLastPosition] = useState({ x: 0, y: 0 });

  const [signoffData, setSignoffData] = useState({
    driver_name: '',
    driver_license: '',
    truck_number: '',
    trailer_number: '',
    pickup_time: '',
    delivery_notes: '',
    driver_signature: null,
    signature_timestamp: null,
    packages_count: '',
    weight_confirmed: false,
    condition_verified: false
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  // Complete driver signoff mutation
  const completeSignoffMutation = useMutation(
    (formData) => shippingService.completeDriverSignoff(data.id, formData),
    {
      onSuccess: () => {
        showSuccess('Driver signoff completed successfully');
        queryClient.invalidateQueries(['shipping']);
        resetForm();
        onClose();
      },
      onError: (error) => {
        showError(`Failed to complete driver signoff: ${error.message}`);
        setLoading(false);
      }
    }
  );

  // Set up signature canvas when modal opens
  useEffect(() => {
    if (isOpen && signatureCanvasRef.current) {
      const canvas = signatureCanvasRef.current;
      const ctx = canvas.getContext('2d');
      
      // Set canvas size
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      
      // Fill with white background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }, [isOpen]);

  const resetForm = () => {
    setSignoffData({
      driver_name: '',
      driver_license: '',
      truck_number: '',
      trailer_number: '',
      pickup_time: '',
      delivery_notes: '',
      driver_signature: null,
      signature_timestamp: null,
      packages_count: '',
      weight_confirmed: false,
      condition_verified: false
    });
    setErrors({});
    setLoading(false);
    clearSignature();
  };

  const updateSignoffData = (field, value) => {
    setSignoffData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!signoffData.driver_name) {
      newErrors.driver_name = 'Driver name is required';
    }

    if (!signoffData.driver_license) {
      newErrors.driver_license = 'Driver license number is required';
    }

    if (!signoffData.truck_number) {
      newErrors.truck_number = 'Truck number is required';
    }

    if (!signoffData.pickup_time) {
      newErrors.pickup_time = 'Pickup time is required';
    }

    if (!signoffData.packages_count) {
      newErrors.packages_count = 'Package count is required';
    }

    if (!signoffData.driver_signature) {
      newErrors.driver_signature = 'Driver signature is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);

    // Create FormData for signature upload
    const formData = new FormData();
    
    // Add all signoff data
    Object.keys(signoffData).forEach(key => {
      if (key === 'driver_signature' && signoffData.driver_signature) {
        formData.append('driver_signature', signoffData.driver_signature);
      } else {
        formData.append(key, signoffData[key]);
      }
    });

    completeSignoffMutation.mutate(formData);
  };

  // Signature canvas functions
  const getCanvasPosition = (e) => {
    const canvas = signatureCanvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    // Handle both mouse and touch events
    const clientX = e.clientX || (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
    const clientY = e.clientY || (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
    
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const startDrawing = (e) => {
    e.preventDefault();
    const position = getCanvasPosition(e);
    setIsDrawing(true);
    setLastPosition(position);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    
    e.preventDefault();
    const canvas = signatureCanvasRef.current;
    const ctx = canvas.getContext('2d');
    const currentPosition = getCanvasPosition(e);
    
    ctx.beginPath();
    ctx.moveTo(lastPosition.x, lastPosition.y);
    ctx.lineTo(currentPosition.x, currentPosition.y);
    ctx.stroke();
    
    setLastPosition(currentPosition);
  };

  const stopDrawing = (e) => {
    if (isDrawing) {
      e.preventDefault();
      setIsDrawing(false);
      captureSignature();
    }
  };

  const captureSignature = () => {
    const canvas = signatureCanvasRef.current;
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `driver-signature-${Date.now()}.png`, { type: 'image/png' });
        setSignoffData(prev => ({
          ...prev,
          driver_signature: file,
          signature_timestamp: new Date().toISOString()
        }));
        if (errors.driver_signature) {
          setErrors(prev => ({ ...prev, driver_signature: null }));
        }
      }
    }, 'image/png');
  };

  const clearSignature = () => {
    const canvas = signatureCanvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      setSignoffData(prev => ({
        ...prev,
        driver_signature: null,
        signature_timestamp: null
      }));
    }
  };

  // Set default pickup time to current time when modal opens
  useEffect(() => {
    if (isOpen && !signoffData.pickup_time) {
      const now = new Date();
      const currentTime = now.toISOString().slice(0, 16); // Format for datetime-local input
      setSignoffData(prev => ({ ...prev, pickup_time: currentTime }));
    }
  }, [isOpen, signoffData.pickup_time]);

  if (!data) return null;

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={`Driver Signoff - ${data.shipment_id || data.id}`}
      size="lg"
      preventCloseOnOverlay={true}
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
              <label className="block text-sm font-medium text-gray-700">Total Weight</label>
              <p className="mt-1 text-sm text-gray-900">{data.total_weight || 'N/A'}</p>
            </div>
          </div>
        </div>

        {/* Driver Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Driver Information</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Driver Name *</label>
              <input
                type="text"
                value={signoffData.driver_name}
                onChange={(e) => updateSignoffData('driver_name', e.target.value)}
                className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                  errors.driver_name ? 'border-red-300' : ''
                }`}
                placeholder="Enter driver full name..."
              />
              {errors.driver_name && (
                <p className="mt-1 text-sm text-red-600">{errors.driver_name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Driver License # *</label>
              <input
                type="text"
                value={signoffData.driver_license}
                onChange={(e) => updateSignoffData('driver_license', e.target.value)}
                className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                  errors.driver_license ? 'border-red-300' : ''
                }`}
                placeholder="Enter driver license number..."
              />
              {errors.driver_license && (
                <p className="mt-1 text-sm text-red-600">{errors.driver_license}</p>
              )}
            </div>
          </div>
        </div>

        {/* Vehicle Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Vehicle Information</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Truck Number *</label>
              <input
                type="text"
                value={signoffData.truck_number}
                onChange={(e) => updateSignoffData('truck_number', e.target.value)}
                className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                  errors.truck_number ? 'border-red-300' : ''
                }`}
                placeholder="Enter truck number..."
              />
              {errors.truck_number && (
                <p className="mt-1 text-sm text-red-600">{errors.truck_number}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Trailer Number</label>
              <input
                type="text"
                value={signoffData.trailer_number}
                onChange={(e) => updateSignoffData('trailer_number', e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="Enter trailer number (if applicable)..."
              />
            </div>
          </div>
        </div>

        {/* Pickup Details */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Pickup Details</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Pickup Time *</label>
              <input
                type="datetime-local"
                value={signoffData.pickup_time}
                onChange={(e) => updateSignoffData('pickup_time', e.target.value)}
                className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                  errors.pickup_time ? 'border-red-300' : ''
                }`}
              />
              {errors.pickup_time && (
                <p className="mt-1 text-sm text-red-600">{errors.pickup_time}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Package Count *</label>
              <input
                type="number"
                min="1"
                value={signoffData.packages_count}
                onChange={(e) => updateSignoffData('packages_count', e.target.value)}
                className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                  errors.packages_count ? 'border-red-300' : ''
                }`}
                placeholder="Enter number of packages..."
              />
              {errors.packages_count && (
                <p className="mt-1 text-sm text-red-600">{errors.packages_count}</p>
              )}
            </div>
          </div>
        </div>

        {/* Verification Checks */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Verification</h3>
          
          <div className="space-y-3">
            <div className="flex items-center">
              <input
                id="weight_confirmed"
                type="checkbox"
                checked={signoffData.weight_confirmed}
                onChange={(e) => updateSignoffData('weight_confirmed', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="weight_confirmed" className="ml-2 block text-sm text-gray-900">
                Total weight verified and matches shipping documents
              </label>
            </div>

            <div className="flex items-center">
              <input
                id="condition_verified"
                type="checkbox"
                checked={signoffData.condition_verified}
                onChange={(e) => updateSignoffData('condition_verified', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="condition_verified" className="ml-2 block text-sm text-gray-900">
                Packages inspected - no visible damage or issues
              </label>
            </div>
          </div>
        </div>

        {/* Delivery Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Delivery Notes</label>
          <textarea
            value={signoffData.delivery_notes}
            onChange={(e) => updateSignoffData('delivery_notes', e.target.value)}
            rows={3}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            placeholder="Special delivery instructions, route notes, or other comments..."
          />
        </div>

        {/* Digital Signature */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Digital Signature *</h3>
          
          <div className="space-y-2">
            <p className="text-sm text-gray-600">
              Driver, please sign below to confirm receipt of shipment:
            </p>
            
            <div className="border-2 border-gray-300 rounded-lg p-2">
              <canvas
                ref={signatureCanvasRef}
                className="w-full h-32 bg-white rounded cursor-crosshair touch-none"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
              />
            </div>
            
            <div className="flex justify-between items-center">
              <button
                type="button"
                onClick={clearSignature}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <i className="fas fa-eraser mr-2"></i>
                Clear Signature
              </button>
              
              <div className="text-xs text-gray-500">
                {signoffData.driver_signature ? (
                  <span className="text-green-600">
                    <i className="fas fa-check mr-1"></i>
                    Signature captured
                  </span>
                ) : (
                  'Sign above to proceed'
                )}
              </div>
            </div>
            
            {errors.driver_signature && (
              <p className="mt-1 text-sm text-red-600">{errors.driver_signature}</p>
            )}
          </div>

          <div className="text-xs text-gray-500">
            By signing above, the driver acknowledges receipt of the shipment in good condition and agrees to deliver as instructed.
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className={`px-4 py-2 text-sm font-medium text-white border border-transparent rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
              loading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-700'
            }`}
          >
            {loading ? (
              <>
                <i className="fas fa-spinner fa-spin mr-2"></i>
                Processing...
              </>
            ) : (
              <>
                <i className="fas fa-truck mr-2"></i>
                Complete Driver Signoff
              </>
            )}
          </button>
        </div>
      </form>
    </BaseModal>
  );
};

export default DriverSignoffModal;