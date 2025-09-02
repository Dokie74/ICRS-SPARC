import React, { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import BaseModal from '../shared/BaseModal';
import { useApp } from '../../contexts/AppContext';
import { receivingService } from '../../services/receivingService';

const DockAuditModal = ({ isOpen, onClose, data }) => {
  const { showSuccess, showError } = useApp();
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [cameraActive, setCameraActive] = useState(false);

  const [auditData, setAuditData] = useState({
    container_condition: '',
    seal_number: '',
    seal_verified: false,
    customs_inspection: false,
    ftz_compliance: false,
    temperature_check: '',
    weight_verification: '',
    documentation_complete: false,
    discrepancies_noted: '',
    photos: [],
    inspector_notes: '',
    audit_result: '', // 'accepted', 'rejected', 'hold'
    rejection_reason: '',
    inspector_name: '',
    inspector_signature: null
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  // Complete dock audit mutation
  const completeDockAuditMutation = useMutation(
    (formData) => receivingService.completeDockAudit(data.id, formData),
    {
      onSuccess: () => {
        showSuccess('Dock audit completed successfully');
        queryClient.invalidateQueries(['receiving']);
        resetForm();
        onClose();
      },
      onError: (error) => {
        showError(`Failed to complete dock audit: ${error.message}`);
        setLoading(false);
      }
    }
  );

  const resetForm = () => {
    setAuditData({
      container_condition: '',
      seal_number: '',
      seal_verified: false,
      customs_inspection: false,
      ftz_compliance: false,
      temperature_check: '',
      weight_verification: '',
      documentation_complete: false,
      discrepancies_noted: '',
      photos: [],
      inspector_notes: '',
      audit_result: '',
      rejection_reason: '',
      inspector_name: '',
      inspector_signature: null
    });
    setErrors({});
    setLoading(false);
    stopCamera();
  };

  const updateAuditData = (field, value) => {
    setAuditData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!auditData.container_condition) {
      newErrors.container_condition = 'Container condition is required';
    }

    if (!auditData.seal_number) {
      newErrors.seal_number = 'Seal number is required';
    }

    if (!auditData.audit_result) {
      newErrors.audit_result = 'Audit result is required';
    }

    if (auditData.audit_result === 'rejected' && !auditData.rejection_reason) {
      newErrors.rejection_reason = 'Rejection reason is required when rejecting';
    }

    if (!auditData.inspector_name) {
      newErrors.inspector_name = 'Inspector name is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);

    // Create FormData for file upload
    const formData = new FormData();
    
    // Add all audit data
    Object.keys(auditData).forEach(key => {
      if (key === 'photos') {
        auditData.photos.forEach((photo, index) => {
          formData.append(`photos[${index}]`, photo);
        });
      } else if (key === 'inspector_signature') {
        if (auditData.inspector_signature) {
          formData.append('inspector_signature', auditData.inspector_signature);
        }
      } else {
        formData.append(key, auditData[key]);
      }
    });

    completeDockAuditMutation.mutate(formData);
  };

  // Camera functions for photo capture
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: 1280, 
          height: 720,
          facingMode: { ideal: 'environment' } // Prefer rear camera
        } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);
      }
    } catch (error) {
      showError('Failed to access camera: ' + error.message);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setCameraActive(false);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0);
      
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], `dock-audit-${Date.now()}.jpg`, { type: 'image/jpeg' });
          setAuditData(prev => ({
            ...prev,
            photos: [...prev.photos, file]
          }));
          showSuccess('Photo captured successfully');
        }
      }, 'image/jpeg', 0.8);
    }
  };

  const removePhoto = (index) => {
    setAuditData(prev => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index)
    }));
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    setAuditData(prev => ({
      ...prev,
      photos: [...prev.photos, ...files]
    }));
  };

  if (!data) return null;

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={`Dock Audit - ${data.container_number || data.admission_id}`}
      size="xl"
      className="max-h-screen overflow-y-auto"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Container Information */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Container Information</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Container Number</label>
              <p className="mt-1 text-sm text-gray-900">{data.container_number || 'N/A'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">BOL Number</label>
              <p className="mt-1 text-sm text-gray-900">{data.bol_number || 'N/A'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Customer</label>
              <p className="mt-1 text-sm text-gray-900">{data.customer_name || 'N/A'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Expected Contents</label>
              <p className="mt-1 text-sm text-gray-900">{data.description || 'N/A'}</p>
            </div>
          </div>
        </div>

        {/* Physical Inspection */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Physical Inspection</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Container Condition *</label>
              <select
                value={auditData.container_condition}
                onChange={(e) => updateAuditData('container_condition', e.target.value)}
                className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                  errors.container_condition ? 'border-red-300' : ''
                }`}
              >
                <option value="">Select condition...</option>
                <option value="excellent">Excellent</option>
                <option value="good">Good</option>
                <option value="fair">Fair</option>
                <option value="poor">Poor</option>
                <option value="damaged">Damaged</option>
              </select>
              {errors.container_condition && (
                <p className="mt-1 text-sm text-red-600">{errors.container_condition}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Seal Number *</label>
              <input
                type="text"
                value={auditData.seal_number}
                onChange={(e) => updateAuditData('seal_number', e.target.value)}
                className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                  errors.seal_number ? 'border-red-300' : ''
                }`}
                placeholder="Enter seal number..."
              />
              {errors.seal_number && (
                <p className="mt-1 text-sm text-red-600">{errors.seal_number}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Temperature (if applicable)</label>
              <input
                type="text"
                value={auditData.temperature_check}
                onChange={(e) => updateAuditData('temperature_check', e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="e.g., -18°C, 72°F"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Weight Verification</label>
              <input
                type="text"
                value={auditData.weight_verification}
                onChange={(e) => updateAuditData('weight_verification', e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="e.g., 25,000 lbs"
              />
            </div>
          </div>
        </div>

        {/* Compliance Checks */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Compliance Verification</h3>
          
          <div className="space-y-3">
            <div className="flex items-center">
              <input
                id="seal_verified"
                type="checkbox"
                checked={auditData.seal_verified}
                onChange={(e) => updateAuditData('seal_verified', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="seal_verified" className="ml-2 block text-sm text-gray-900">
                Seal number verified and intact
              </label>
            </div>

            <div className="flex items-center">
              <input
                id="customs_inspection"
                type="checkbox"
                checked={auditData.customs_inspection}
                onChange={(e) => updateAuditData('customs_inspection', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="customs_inspection" className="ml-2 block text-sm text-gray-900">
                Customs inspection completed (if required)
              </label>
            </div>

            <div className="flex items-center">
              <input
                id="ftz_compliance"
                type="checkbox"
                checked={auditData.ftz_compliance}
                onChange={(e) => updateAuditData('ftz_compliance', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="ftz_compliance" className="ml-2 block text-sm text-gray-900">
                FTZ compliance requirements met
              </label>
            </div>

            <div className="flex items-center">
              <input
                id="documentation_complete"
                type="checkbox"
                checked={auditData.documentation_complete}
                onChange={(e) => updateAuditData('documentation_complete', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="documentation_complete" className="ml-2 block text-sm text-gray-900">
                All required documentation present
              </label>
            </div>
          </div>
        </div>

        {/* Photo Documentation */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Photo Documentation</h3>
          
          {/* Camera Controls */}
          <div className="flex space-x-2">
            {!cameraActive ? (
              <button
                type="button"
                onClick={startCamera}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <i className="fas fa-camera mr-2"></i>
                Start Camera
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={capturePhoto}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <i className="fas fa-camera mr-2"></i>
                  Capture Photo
                </button>
                <button
                  type="button"
                  onClick={stopCamera}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <i className="fas fa-stop mr-2"></i>
                  Stop Camera
                </button>
              </>
            )}
            
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <i className="fas fa-upload mr-2"></i>
              Upload Photos
            </button>
          </div>

          {/* Camera Preview */}
          {cameraActive && (
            <div className="border rounded-lg overflow-hidden">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-64 object-cover"
              />
            </div>
          )}

          {/* Hidden canvas for photo capture */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Photo Gallery */}
          {auditData.photos.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-2">Captured Photos ({auditData.photos.length})</h4>
              <div className="grid grid-cols-3 gap-2">
                {auditData.photos.map((photo, index) => (
                  <div key={index} className="relative">
                    <img
                      src={photo instanceof File ? URL.createObjectURL(photo) : photo}
                      alt={`Audit photo ${index + 1}`}
                      className="w-full h-24 object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => removePhoto(index)}
                      className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-700"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Notes and Discrepancies */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Discrepancies Noted</label>
            <textarea
              value={auditData.discrepancies_noted}
              onChange={(e) => updateAuditData('discrepancies_noted', e.target.value)}
              rows={3}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              placeholder="Note any discrepancies, damages, or issues..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Inspector Notes</label>
            <textarea
              value={auditData.inspector_notes}
              onChange={(e) => updateAuditData('inspector_notes', e.target.value)}
              rows={3}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              placeholder="Additional notes and observations..."
            />
          </div>
        </div>

        {/* Audit Decision */}
        <div className="space-y-4 bg-blue-50 p-4 rounded-lg">
          <h3 className="text-lg font-medium text-gray-900">Audit Decision</h3>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Audit Result *</label>
            <select
              value={auditData.audit_result}
              onChange={(e) => updateAuditData('audit_result', e.target.value)}
              className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                errors.audit_result ? 'border-red-300' : ''
              }`}
            >
              <option value="">Select result...</option>
              <option value="accepted">Accepted - Goods approved for admission</option>
              <option value="rejected">Rejected - Goods refused</option>
              <option value="hold">Hold - Additional review required</option>
            </select>
            {errors.audit_result && (
              <p className="mt-1 text-sm text-red-600">{errors.audit_result}</p>
            )}
          </div>

          {auditData.audit_result === 'rejected' && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Rejection Reason *</label>
              <textarea
                value={auditData.rejection_reason}
                onChange={(e) => updateAuditData('rejection_reason', e.target.value)}
                rows={3}
                className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                  errors.rejection_reason ? 'border-red-300' : ''
                }`}
                placeholder="Specify reason for rejection..."
              />
              {errors.rejection_reason && (
                <p className="mt-1 text-sm text-red-600">{errors.rejection_reason}</p>
              )}
            </div>
          )}
        </div>

        {/* Inspector Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Inspector Information</h3>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Inspector Name *</label>
            <input
              type="text"
              value={auditData.inspector_name}
              onChange={(e) => updateAuditData('inspector_name', e.target.value)}
              className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                errors.inspector_name ? 'border-red-300' : ''
              }`}
              placeholder="Enter inspector name..."
            />
            {errors.inspector_name && (
              <p className="mt-1 text-sm text-red-600">{errors.inspector_name}</p>
            )}
          </div>

          <div className="text-sm text-gray-600">
            <i className="fas fa-info-circle mr-2"></i>
            Digital signature will be captured upon form submission.
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
                : auditData.audit_result === 'accepted'
                ? 'bg-green-600 hover:bg-green-700'
                : auditData.audit_result === 'rejected'
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {loading ? (
              <>
                <i className="fas fa-spinner fa-spin mr-2"></i>
                Processing...
              </>
            ) : (
              <>
                <i className="fas fa-check mr-2"></i>
                Complete Dock Audit
              </>
            )}
          </button>
        </div>
      </form>
    </BaseModal>
  );
};

export default DockAuditModal;