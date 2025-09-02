// Placeholder Edit Preadmission modal
import React from 'react';
import BaseModal from '../shared/BaseModal';

const EditPreadmissionModal = ({ isOpen, onClose, onSuccess }) => (
  <BaseModal isOpen={isOpen} onClose={onClose} title="Edit Pre-admission (Coming Soon)" size="lg">
    <div className="text-center py-8">
      <i className="fas fa-edit text-4xl text-gray-400 mb-4"></i>
      <p className="text-gray-600 mb-4">Pre-admission editing coming soon.</p>
      <button onClick={() => onSuccess('Edit pre-admission modal placeholder')} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">OK</button>
    </div>
  </BaseModal>
);

export default EditPreadmissionModal;