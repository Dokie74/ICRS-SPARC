// tests/frontend/modals/DockAuditModal.test.js
// Comprehensive tests for DockAuditModal component interactions

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import userEvent from '@testing-library/user-event';
import DockAuditModal from '../../../src/frontend/src/components/modals/DockAuditModal';
import { useApp } from '../../../src/frontend/src/contexts/AppContext';
import { receivingService } from '../../../src/frontend/src/services/receivingService';

// Mock dependencies
jest.mock('../../../src/frontend/src/contexts/AppContext');
jest.mock('../../../src/frontend/src/services/receivingService');

// Mock BaseModal
jest.mock('../../../src/frontend/src/components/shared/BaseModal', () => {
  return ({ isOpen, onClose, title, children, size, className }) => {
    if (!isOpen) return null;
    return (
      <div data-testid="base-modal" className={`modal-${size} ${className}`}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button onClick={onClose} data-testid="modal-close">×</button>
        </div>
        <div className="modal-content">
          {children}
        </div>
      </div>
    );
  };
});

// Mock URL.createObjectURL for photo previews
global.URL.createObjectURL = jest.fn(() => 'mock-blob-url');
global.URL.revokeObjectURL = jest.fn();

// Mock HTMLCanvasElement methods
HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
  fillStyle: '',
  fillRect: jest.fn(),
  drawImage: jest.fn(),
  scale: jest.fn(),
  lineCap: '',
  lineJoin: '',
  strokeStyle: '',
  lineWidth: 0
}));

HTMLCanvasElement.prototype.toBlob = jest.fn((callback) => {
  const blob = new Blob(['mock-image-data'], { type: 'image/jpeg' });
  callback(blob);
});

// Mock navigator.mediaDevices
const mockMediaStream = {
  getTracks: jest.fn(() => [{ stop: jest.fn() }])
};

Object.defineProperty(navigator, 'mediaDevices', {
  value: {
    getUserMedia: jest.fn(() => Promise.resolve(mockMediaStream))
  }
});

describe('DockAuditModal Component', () => {
  let queryClient;
  let mockAppContext;
  let mockData;
  let mockOnClose;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });

    mockAppContext = {
      showSuccess: jest.fn(),
      showError: jest.fn()
    };

    mockData = {
      id: 'test-admission-1',
      container_number: 'CONT-001',
      bol_number: 'BOL-12345',
      customer_name: 'Test Customer',
      description: 'Test containers for FTZ processing'
    };

    mockOnClose = jest.fn();

    useApp.mockReturnValue(mockAppContext);
    receivingService.completeDockAudit = jest.fn();

    // Clear all mocks
    jest.clearAllMocks();
  });

  const renderComponent = (props = {}) => {
    const defaultProps = {
      isOpen: true,
      onClose: mockOnClose,
      data: mockData,
      ...props
    };

    return render(
      <QueryClientProvider client={queryClient}>
        <DockAuditModal {...defaultProps} />
      </QueryClientProvider>
    );
  };

  describe('Modal Rendering and Structure', () => {
    it('renders modal when isOpen is true', () => {
      renderComponent();
      expect(screen.getByTestId('base-modal')).toBeInTheDocument();
      expect(screen.getByText(/Dock Audit - CONT-001/)).toBeInTheDocument();
    });

    it('does not render modal when isOpen is false', () => {
      renderComponent({ isOpen: false });
      expect(screen.queryByTestId('base-modal')).not.toBeInTheDocument();
    });

    it('renders container information correctly', () => {
      renderComponent();
      
      expect(screen.getByText('CONT-001')).toBeInTheDocument();
      expect(screen.getByText('BOL-12345')).toBeInTheDocument();
      expect(screen.getByText('Test Customer')).toBeInTheDocument();
      expect(screen.getByText('Test containers for FTZ processing')).toBeInTheDocument();
    });

    it('renders all required form sections', () => {
      renderComponent();
      
      expect(screen.getByText('Container Information')).toBeInTheDocument();
      expect(screen.getByText('Physical Inspection')).toBeInTheDocument();
      expect(screen.getByText('Compliance Verification')).toBeInTheDocument();
      expect(screen.getByText('Photo Documentation')).toBeInTheDocument();
      expect(screen.getByText('Audit Decision')).toBeInTheDocument();
      expect(screen.getByText('Inspector Information')).toBeInTheDocument();
    });
  });

  describe('Form Field Interactions', () => {
    it('updates container condition field', async () => {
      const user = userEvent.setup();
      renderComponent();
      
      const conditionSelect = screen.getByRole('combobox', { name: /container condition/i });
      await user.selectOptions(conditionSelect, 'good');
      
      expect(conditionSelect.value).toBe('good');
    });

    it('updates seal number field', async () => {
      const user = userEvent.setup();
      renderComponent();
      
      const sealInput = screen.getByPlaceholderText(/enter seal number/i);
      await user.type(sealInput, 'SEAL-12345');
      
      expect(sealInput.value).toBe('SEAL-12345');
    });

    it('handles checkbox interactions for compliance', async () => {
      const user = userEvent.setup();
      renderComponent();
      
      const sealVerifiedCheck = screen.getByLabelText(/seal number verified/i);
      const ftzComplianceCheck = screen.getByLabelText(/ftz compliance/i);
      
      await user.click(sealVerifiedCheck);
      await user.click(ftzComplianceCheck);
      
      expect(sealVerifiedCheck).toBeChecked();
      expect(ftzComplianceCheck).toBeChecked();
    });

    it('updates temperature and weight fields', async () => {
      const user = userEvent.setup();
      renderComponent();
      
      const tempInput = screen.getByPlaceholderText(/e.g., -18°C, 72°F/);
      const weightInput = screen.getByPlaceholderText(/e.g., 25,000 lbs/);
      
      await user.type(tempInput, '72°F');
      await user.type(weightInput, '25000 lbs');
      
      expect(tempInput.value).toBe('72°F');
      expect(weightInput.value).toBe('25000 lbs');
    });

    it('updates textarea fields correctly', async () => {
      const user = userEvent.setup();
      renderComponent();
      
      const discrepanciesField = screen.getByPlaceholderText(/note any discrepancies/i);
      const notesField = screen.getByPlaceholderText(/additional notes/i);
      
      await user.type(discrepanciesField, 'Minor scratches on container door');
      await user.type(notesField, 'Container arrived on time');
      
      expect(discrepanciesField.value).toBe('Minor scratches on container door');
      expect(notesField.value).toBe('Container arrived on time');
    });

    it('shows rejection reason field when rejected is selected', async () => {
      const user = userEvent.setup();
      renderComponent();
      
      const auditResultSelect = screen.getByRole('combobox', { name: /audit result/i });
      await user.selectOptions(auditResultSelect, 'rejected');
      
      expect(screen.getByPlaceholderText(/specify reason for rejection/i)).toBeInTheDocument();
    });

    it('hides rejection reason field when not rejected', async () => {
      const user = userEvent.setup();
      renderComponent();
      
      const auditResultSelect = screen.getByRole('combobox', { name: /audit result/i });
      await user.selectOptions(auditResultSelect, 'accepted');
      
      expect(screen.queryByPlaceholderText(/specify reason for rejection/i)).not.toBeInTheDocument();
    });
  });

  describe('Camera and Photo Functionality', () => {
    it('starts camera when Start Camera button is clicked', async () => {
      const user = userEvent.setup();
      renderComponent();
      
      const startCameraBtn = screen.getByText(/start camera/i);
      await user.click(startCameraBtn);
      
      await waitFor(() => {
        expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
          video: { 
            width: 1280, 
            height: 720,
            facingMode: { ideal: 'environment' }
          }
        });
      });
    });

    it('shows camera controls when camera is active', async () => {
      const user = userEvent.setup();
      renderComponent();
      
      const startCameraBtn = screen.getByText(/start camera/i);
      await user.click(startCameraBtn);
      
      await waitFor(() => {
        expect(screen.getByText(/capture photo/i)).toBeInTheDocument();
        expect(screen.getByText(/stop camera/i)).toBeInTheDocument();
      });
    });

    it('captures photo when Capture Photo button is clicked', async () => {
      const user = userEvent.setup();
      renderComponent();
      
      // Start camera first
      const startCameraBtn = screen.getByText(/start camera/i);
      await user.click(startCameraBtn);
      
      await waitFor(() => {
        expect(screen.getByText(/capture photo/i)).toBeInTheDocument();
      });
      
      const captureBtn = screen.getByText(/capture photo/i);
      await user.click(captureBtn);
      
      await waitFor(() => {
        expect(mockAppContext.showSuccess).toHaveBeenCalledWith('Photo captured successfully');
      });
    });

    it('handles file upload for photos', async () => {
      const user = userEvent.setup();
      renderComponent();
      
      const file = new File(['mock-image'], 'test.jpg', { type: 'image/jpeg' });
      const uploadInput = screen.getByRole('button', { name: /upload photos/i });
      
      // Simulate file selection
      const hiddenInput = document.querySelector('input[type="file"]');
      
      await act(async () => {
        fireEvent.change(hiddenInput, {
          target: { files: [file] }
        });
      });
      
      await waitFor(() => {
        expect(screen.getByText(/captured photos \(1\)/i)).toBeInTheDocument();
      });
    });

    it('displays photo gallery when photos are captured', async () => {
      const user = userEvent.setup();
      renderComponent();
      
      const file = new File(['mock-image'], 'test.jpg', { type: 'image/jpeg' });
      const hiddenInput = document.querySelector('input[type="file"]');
      
      await act(async () => {
        fireEvent.change(hiddenInput, {
          target: { files: [file] }
        });
      });
      
      await waitFor(() => {
        expect(screen.getByText(/captured photos \(1\)/i)).toBeInTheDocument();
        expect(screen.getByAltText(/audit photo 1/i)).toBeInTheDocument();
      });
    });

    it('removes photo when remove button is clicked', async () => {
      const user = userEvent.setup();
      renderComponent();
      
      const file = new File(['mock-image'], 'test.jpg', { type: 'image/jpeg' });
      const hiddenInput = document.querySelector('input[type="file"]');
      
      await act(async () => {
        fireEvent.change(hiddenInput, {
          target: { files: [file] }
        });
      });
      
      await waitFor(() => {
        expect(screen.getByText(/captured photos \(1\)/i)).toBeInTheDocument();
      });
      
      const removeBtn = screen.getByRole('button', { name: /×/i });
      await user.click(removeBtn);
      
      await waitFor(() => {
        expect(screen.queryByText(/captured photos/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Form Validation', () => {
    it('validates required fields on submit', async () => {
      const user = userEvent.setup();
      renderComponent();
      
      const submitBtn = screen.getByRole('button', { name: /complete dock audit/i });
      await user.click(submitBtn);
      
      await waitFor(() => {
        expect(screen.getByText('Container condition is required')).toBeInTheDocument();
        expect(screen.getByText('Seal number is required')).toBeInTheDocument();
        expect(screen.getByText('Audit result is required')).toBeInTheDocument();
        expect(screen.getByText('Inspector name is required')).toBeInTheDocument();
      });
    });

    it('validates rejection reason when rejected is selected', async () => {
      const user = userEvent.setup();
      renderComponent();
      
      // Fill required fields except rejection reason
      const conditionSelect = screen.getByRole('combobox', { name: /container condition/i });
      const sealInput = screen.getByPlaceholderText(/enter seal number/i);
      const auditResultSelect = screen.getByRole('combobox', { name: /audit result/i });
      const inspectorInput = screen.getByPlaceholderText(/enter inspector name/i);
      
      await user.selectOptions(conditionSelect, 'good');
      await user.type(sealInput, 'SEAL-123');
      await user.selectOptions(auditResultSelect, 'rejected');
      await user.type(inspectorInput, 'John Inspector');
      
      const submitBtn = screen.getByRole('button', { name: /complete dock audit/i });
      await user.click(submitBtn);
      
      await waitFor(() => {
        expect(screen.getByText('Rejection reason is required when rejecting')).toBeInTheDocument();
      });
    });

    it('clears validation errors when fields are updated', async () => {
      const user = userEvent.setup();
      renderComponent();
      
      // Trigger validation errors first
      const submitBtn = screen.getByRole('button', { name: /complete dock audit/i });
      await user.click(submitBtn);
      
      await waitFor(() => {
        expect(screen.getByText('Container condition is required')).toBeInTheDocument();
      });
      
      // Fill the field
      const conditionSelect = screen.getByRole('combobox', { name: /container condition/i });
      await user.selectOptions(conditionSelect, 'good');
      
      await waitFor(() => {
        expect(screen.queryByText('Container condition is required')).not.toBeInTheDocument();
      });
    });
  });

  describe('Form Submission', () => {
    const fillValidForm = async (user) => {
      const conditionSelect = screen.getByRole('combobox', { name: /container condition/i });
      const sealInput = screen.getByPlaceholderText(/enter seal number/i);
      const auditResultSelect = screen.getByRole('combobox', { name: /audit result/i });
      const inspectorInput = screen.getByPlaceholderText(/enter inspector name/i);
      
      await user.selectOptions(conditionSelect, 'good');
      await user.type(sealInput, 'SEAL-123');
      await user.selectOptions(auditResultSelect, 'accepted');
      await user.type(inspectorInput, 'John Inspector');
    };

    it('submits form with valid data', async () => {
      const user = userEvent.setup();
      receivingService.completeDockAudit.mockResolvedValue({ success: true });
      
      renderComponent();
      await fillValidForm(user);
      
      const submitBtn = screen.getByRole('button', { name: /complete dock audit/i });
      await user.click(submitBtn);
      
      await waitFor(() => {
        expect(receivingService.completeDockAudit).toHaveBeenCalledWith(
          mockData.id,
          expect.any(FormData)
        );
      });
    });

    it('shows loading state during submission', async () => {
      const user = userEvent.setup();
      receivingService.completeDockAudit.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
      
      renderComponent();
      await fillValidForm(user);
      
      const submitBtn = screen.getByRole('button', { name: /complete dock audit/i });
      await user.click(submitBtn);
      
      expect(screen.getByText(/processing/i)).toBeInTheDocument();
      expect(submitBtn).toBeDisabled();
    });

    it('shows success message and closes modal on successful submission', async () => {
      const user = userEvent.setup();
      receivingService.completeDockAudit.mockResolvedValue({ success: true });
      
      renderComponent();
      await fillValidForm(user);
      
      const submitBtn = screen.getByRole('button', { name: /complete dock audit/i });
      await user.click(submitBtn);
      
      await waitFor(() => {
        expect(mockAppContext.showSuccess).toHaveBeenCalledWith('Dock audit completed successfully');
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it('shows error message on submission failure', async () => {
      const user = userEvent.setup();
      receivingService.completeDockAudit.mockRejectedValue(new Error('Network error'));
      
      renderComponent();
      await fillValidForm(user);
      
      const submitBtn = screen.getByRole('button', { name: /complete dock audit/i });
      await user.click(submitBtn);
      
      await waitFor(() => {
        expect(mockAppContext.showError).toHaveBeenCalledWith('Failed to complete dock audit: Network error');
      });
    });

    it('includes photos in form submission', async () => {
      const user = userEvent.setup();
      receivingService.completeDockAudit.mockResolvedValue({ success: true });
      
      renderComponent();
      await fillValidForm(user);
      
      // Add a photo
      const file = new File(['mock-image'], 'test.jpg', { type: 'image/jpeg' });
      const hiddenInput = document.querySelector('input[type="file"]');
      
      await act(async () => {
        fireEvent.change(hiddenInput, {
          target: { files: [file] }
        });
      });
      
      const submitBtn = screen.getByRole('button', { name: /complete dock audit/i });
      await user.click(submitBtn);
      
      await waitFor(() => {
        expect(receivingService.completeDockAudit).toHaveBeenCalled();
        const formData = receivingService.completeDockAudit.mock.calls[0][1];
        expect(formData).toBeInstanceOf(FormData);
      });
    });
  });

  describe('Modal Controls', () => {
    it('closes modal when cancel button is clicked', async () => {
      const user = userEvent.setup();
      renderComponent();
      
      const cancelBtn = screen.getByText(/cancel/i);
      await user.click(cancelBtn);
      
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('prevents closing modal while loading', async () => {
      const user = userEvent.setup();
      renderComponent();
      
      // Set loading state by triggering submission
      receivingService.completeDockAudit.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)));
      
      const conditionSelect = screen.getByRole('combobox', { name: /container condition/i });
      await user.selectOptions(conditionSelect, 'good');
      
      const submitBtn = screen.getByRole('button', { name: /complete dock audit/i });
      await user.click(submitBtn);
      
      const cancelBtn = screen.getByText(/cancel/i);
      expect(cancelBtn).toBeDisabled();
    });

    it('changes button color based on audit result', async () => {
      const user = userEvent.setup();
      renderComponent();
      
      const auditResultSelect = screen.getByRole('combobox', { name: /audit result/i });
      const submitBtn = screen.getByRole('button', { name: /complete dock audit/i });
      
      // Test accepted (green)
      await user.selectOptions(auditResultSelect, 'accepted');
      expect(submitBtn.className).toContain('bg-green-600');
      
      // Test rejected (red)
      await user.selectOptions(auditResultSelect, 'rejected');
      expect(submitBtn.className).toContain('bg-red-600');
      
      // Test default (blue)
      await user.selectOptions(auditResultSelect, 'hold');
      expect(submitBtn.className).toContain('bg-blue-600');
    });
  });

  describe('Form Reset', () => {
    it('resets form when modal closes and reopens', async () => {
      const user = userEvent.setup();
      const { rerender } = renderComponent();
      
      // Fill some data
      const sealInput = screen.getByPlaceholderText(/enter seal number/i);
      await user.type(sealInput, 'SEAL-123');
      
      // Close modal
      rerender(
        <QueryClientProvider client={queryClient}>
          <DockAuditModal isOpen={false} onClose={mockOnClose} data={mockData} />
        </QueryClientProvider>
      );
      
      // Reopen modal
      rerender(
        <QueryClientProvider client={queryClient}>
          <DockAuditModal isOpen={true} onClose={mockOnClose} data={mockData} />
        </QueryClientProvider>
      );
      
      const newSealInput = screen.getByPlaceholderText(/enter seal number/i);
      expect(newSealInput.value).toBe('');
    });
  });

  describe('Accessibility', () => {
    it('has proper form labels and ARIA attributes', () => {
      renderComponent();
      
      expect(screen.getByLabelText(/container condition/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/seal number/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/audit result/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/inspector name/i)).toBeInTheDocument();
    });

    it('displays proper error messages with ARIA attributes', async () => {
      const user = userEvent.setup();
      renderComponent();
      
      const submitBtn = screen.getByRole('button', { name: /complete dock audit/i });
      await user.click(submitBtn);
      
      await waitFor(() => {
        const errorMessages = screen.getAllByRole('alert');
        expect(errorMessages.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Error Handling', () => {
    it('handles camera access errors gracefully', async () => {
      const user = userEvent.setup();
      navigator.mediaDevices.getUserMedia.mockRejectedValue(new Error('Camera not available'));
      
      renderComponent();
      
      const startCameraBtn = screen.getByText(/start camera/i);
      await user.click(startCameraBtn);
      
      await waitFor(() => {
        expect(mockAppContext.showError).toHaveBeenCalledWith('Failed to access camera: Camera not available');
      });
    });

    it('handles missing container data gracefully', () => {
      renderComponent({ data: null });
      
      expect(screen.queryByTestId('base-modal')).not.toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('handles large numbers of photos efficiently', async () => {
      const user = userEvent.setup();
      renderComponent();
      
      const files = Array.from({ length: 10 }, (_, i) => 
        new File([`mock-image-${i}`], `test${i}.jpg`, { type: 'image/jpeg' })
      );
      
      const hiddenInput = document.querySelector('input[type="file"]');
      
      await act(async () => {
        fireEvent.change(hiddenInput, {
          target: { files }
        });
      });
      
      await waitFor(() => {
        expect(screen.getByText(/captured photos \(10\)/i)).toBeInTheDocument();
      }, { timeout: 5000 });
    });
  });
});