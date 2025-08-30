// src/frontend/components/shared/BatchUploader.js
// Batch CSV upload component for admin data management
// SPARC-compliant component using React Query for upload operations

import React, { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useApp } from '../../contexts/AppContext';
import apiClient from '../../services/api-client';
import LoadingSpinner, { ButtonSpinner } from './LoadingSpinner';
import clsx from 'clsx';

const BatchUploader = ({ 
  uploadType, 
  templateUrl, 
  onUploadSuccess,
  allowedTypes = ['.csv'],
  maxSize = 5 * 1024 * 1024 // 5MB default
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef(null);
  
  const { showSuccess, showError } = useApp();
  const queryClient = useQueryClient();

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (formData) => {
      return apiClient.post(`/api/admin/batch-upload/${uploadType}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percentCompleted);
        }
      });
    },
    onSuccess: (data) => {
      if (data.success) {
        showSuccess(`Successfully uploaded ${data.data.processed} records`);
        setSelectedFile(null);
        setUploadProgress(0);
        
        // Invalidate relevant queries to refresh data
        queryClient.invalidateQueries(['admin', uploadType]);
        
        if (onUploadSuccess) {
          onUploadSuccess(data.data);
        }
      } else {
        showError(data.error || 'Upload failed');
      }
    },
    onError: (error) => {
      showError(error.message || 'Upload failed');
      setUploadProgress(0);
    }
  });

  // File validation
  const validateFile = (file) => {
    if (!file) return 'No file selected';
    
    const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
    if (!allowedTypes.includes(fileExtension)) {
      return `Invalid file type. Allowed: ${allowedTypes.join(', ')}`;
    }
    
    if (file.size > maxSize) {
      return `File too large. Maximum size: ${(maxSize / 1024 / 1024).toFixed(1)}MB`;
    }
    
    return null;
  };

  // Handle file selection
  const handleFileSelect = (file) => {
    const error = validateFile(file);
    if (error) {
      showError(error);
      return;
    }
    
    setSelectedFile(file);
  };

  // Handle drag events
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  // Handle drop
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  // Handle file input change
  const handleInputChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  // Handle upload
  const handleUpload = () => {
    if (!selectedFile) return;
    
    const formData = new FormData();
    formData.append('file', selectedFile);
    
    uploadMutation.mutate(formData);
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedFile(null);
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const isUploading = uploadMutation.isPending;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="mb-4">
        <h4 className="text-lg font-medium text-gray-900 mb-2">Batch Upload</h4>
        <p className="text-sm text-gray-600">
          Upload CSV files to bulk import {uploadType} data
        </p>
      </div>

      {/* Template Download */}
      {templateUrl && (
        <div className="mb-4">
          <a
            href={templateUrl}
            download
            className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
          >
            <i className="fas fa-download mr-2"></i>
            Download Template
          </a>
        </div>
      )}

      {/* File Drop Zone */}
      <div
        className={clsx(
          'relative border-2 border-dashed rounded-lg p-6 text-center transition-colors',
          dragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-300',
          selectedFile ? 'border-green-400 bg-green-50' : '',
          isUploading && 'pointer-events-none opacity-50'
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={allowedTypes.join(',')}
          onChange={handleInputChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={isUploading}
        />
        
        {!selectedFile ? (
          <div>
            <i className="fas fa-cloud-upload-alt text-4xl text-gray-400 mb-4"></i>
            <p className="text-gray-600 mb-2">
              Drag and drop your CSV file here, or{' '}
              <span className="text-blue-600 font-medium">browse</span>
            </p>
            <p className="text-xs text-gray-500">
              Supported formats: {allowedTypes.join(', ')} (max {(maxSize / 1024 / 1024).toFixed(1)}MB)
            </p>
          </div>
        ) : (
          <div>
            <i className="fas fa-file-csv text-4xl text-green-600 mb-4"></i>
            <p className="text-gray-900 font-medium mb-1">{selectedFile.name}</p>
            <p className="text-sm text-gray-500 mb-4">
              {(selectedFile.size / 1024).toFixed(1)} KB
            </p>
          </div>
        )}
      </div>

      {/* Upload Progress */}
      {isUploading && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Uploading...</span>
            <span className="text-sm text-gray-600">{uploadProgress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {selectedFile && !isUploading && (
        <div className="mt-4 flex space-x-3">
          <button
            onClick={handleUpload}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <i className="fas fa-upload mr-2"></i>
            Upload File
          </button>
          <button
            onClick={clearSelection}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Upload Button (with loading state) */}
      {isUploading && (
        <div className="mt-4">
          <button
            disabled
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md opacity-50 cursor-not-allowed"
          >
            <ButtonSpinner size="sm" />
            Uploading...
          </button>
        </div>
      )}
    </div>
  );
};

export default BatchUploader;