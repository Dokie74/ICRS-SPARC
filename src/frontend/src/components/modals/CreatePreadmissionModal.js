// Placeholder Preadmission modal
import React from 'react';
import BaseModal from '../shared/BaseModal';

const CreatePreadmissionModal = ({ isOpen, onClose, onSuccess }) => (
  <BaseModal isOpen={isOpen} onClose={onClose} title="Create Pre-admission (Coming Soon)" size="lg">
    <div className="text-center py-8">
      <i className="fas fa-clipboard-list text-4xl text-gray-400 mb-4"></i>
      <p className="text-gray-600 mb-4">Pre-admission creation coming soon.</p>
      <button onClick={() => onSuccess('Pre-admission modal placeholder')} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">OK</button>
    </div>
  </BaseModal>
);

export default CreatePreadmissionModal;