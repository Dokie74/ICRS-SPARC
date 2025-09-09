// src/frontend/components/modals/ModalContainer.js
// Modal container system for ICRS SPARC
// Adapted from original icrs-app modal system with React Query integration

import React from 'react';
import { useApp } from '../../contexts/AppContext';

// Import modal components (will be created progressively)
import AddEmployeeModal from './AddEmployeeModal';
import AddPartModal from './AddPartModal';
import AddCustomerModal from './AddCustomerModal';
import AddSupplierModal from './AddSupplierModal';
import AddLocationModal from './AddLocationModal';
import AddPreadmissionModal from './AddPreadmissionModal';
import CreatePreshipmentModal from './CreatePreshipmentModal';
import EnhancedQuarterlyUpdateModal from './EnhancedQuarterlyUpdateModal';
import DockAuditModal from './DockAuditModal';
import DriverSignoffModal from './DriverSignoffModal';
import PrintLabelsModal from './PrintLabelsModal';

const ModalContainer = () => {
  const { activeModal, modalData, hideModal, showSuccess, showError, showModal } = useApp();

  // Modal component registry - maps modal types to components
  const modalComponents = {
    // Employee/User Management
    'EmployeeCreateModal': AddEmployeeModal,
    'add-employee-modal': AddEmployeeModal,
    'edit-employee-modal': AddEmployeeModal, // Will handle edit vs create via props
    
    // Parts Management
    'PartCreateModal': AddPartModal,
    'add-part-modal': AddPartModal,
    'edit-part-modal': AddPartModal,
    'part-detail-modal': AddPartModal,
    
    // Customer Management
    'CustomerCreateModal': AddCustomerModal,
    'add-customer-modal': AddCustomerModal,
    'edit-customer-modal': AddCustomerModal,
    
    // Supplier Management
    'SupplierCreateModal': AddSupplierModal,
    'add-supplier-modal': AddSupplierModal,
    'edit-supplier-modal': AddSupplierModal,
    
    // Location Management
    'LocationCreateModal': AddLocationModal,
    'add-location-modal': AddLocationModal,
    'edit-location-modal': AddLocationModal,
    
    // Pre-admission Workflows  
    'create-preadmission-modal': AddPreadmissionModal,
    'add-preadmission-modal': AddPreadmissionModal,
    'edit-preadmission-modal': AddPreadmissionModal,
    'PreadmissionCreateModal': AddPreadmissionModal,
    
    // Pre-shipment Workflows
    'create-preshipment-modal': CreatePreshipmentModal,
    'add-preshipment-modal': CreatePreshipmentModal,
    'edit-preshipment-modal': CreatePreshipmentModal,
    'PreshipmentCreateModal': CreatePreshipmentModal,
    
    // Quarterly Pricing
    'enhanced-quarterly-update-modal': EnhancedQuarterlyUpdateModal,
    'quarterly-pricing-modal': EnhancedQuarterlyUpdateModal,
    
    // Dock Operations
    'dock-audit-modal': DockAuditModal,
    'DockAuditModal': DockAuditModal,
    
    // Driver Operations
    'driver-signoff-modal': DriverSignoffModal,
    'DriverSignoffModal': DriverSignoffModal,
    
    // Label Operations
    'print-labels-modal': PrintLabelsModal,
    'PrintLabelsModal': PrintLabelsModal,
    
    // Add more modal mappings as components are created
  };

  const ModalComponent = modalComponents[activeModal];

  if (!ModalComponent) {
    // Log missing modal for debugging
    if (activeModal) {
      console.warn(`Modal component not found for type: ${activeModal}`);
    }
    return null;
  }

  // Standardized props for all modals
  const getModalProps = () => {
    const baseProps = {
      isOpen: true,
      onClose: hideModal,
      onSuccess: (message) => {
        showSuccess(message);
        hideModal();
      },
      onError: (message) => {
        showError(message);
      },
      showModal,
      data: modalData
    };

    // Handle specific modal prop requirements
    switch (activeModal) {
      case 'edit-employee-modal':
        return { ...baseProps, employee: modalData, isEdit: true };
      
      case 'edit-part-modal':
        return { ...baseProps, part: modalData, isEdit: true };
        
      case 'edit-customer-modal':
        return { ...baseProps, customer: modalData, isEdit: true };
        
      case 'edit-supplier-modal':
        return { ...baseProps, supplier: modalData, isEdit: true };
        
      case 'edit-location-modal':
        return { ...baseProps, location: modalData, isEdit: true };
        
      case 'edit-preadmission-modal':
        return { ...baseProps, preadmission: modalData, isEdit: true };
        
      case 'edit-preshipment-modal':
        return { ...baseProps, preshipment: modalData, isEdit: true };
        
      case 'enhanced-quarterly-update-modal':
      case 'quarterly-pricing-modal':
        return { 
          ...baseProps, 
          showNotification: (type, message) => {
            if (type === 'success') showSuccess(message);
            else showError(message);
          },
          onDataUpdate: () => {
            // Trigger any necessary data refreshes
            console.log('Quarterly pricing data updated');
          }
        };
        
      default:
        return baseProps;
    }
  };

  return <ModalComponent {...getModalProps()} />;
};

export default ModalContainer;