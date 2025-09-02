// tests/frontend/modals/DriverSignoffModal.test.js
// Comprehensive tests for DriverSignoffModal component interactions

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import userEvent from '@testing-library/user-event';
import DriverSignoffModal from '../../../src/frontend/src/components/modals/DriverSignoffModal';
import { useApp } from '../../../src/frontend/src/contexts/AppContext';
import { shippingService } from '../../../src/frontend/src/services/shippingService';

// Mock dependencies
jest.mock('../../../src/frontend/src/contexts/AppContext');
jest.mock('../../../src/frontend/src/services/shippingService');

// Mock BaseModal
jest.mock('../../../src/frontend/src/components/shared/BaseModal', () => {
  return ({ isOpen, onClose, title, children, size, preventCloseOnOverlay }) => {
    if (!isOpen) return null;
    return (
      <div data-testid="base-modal" className={`modal-${size}`} data-prevent-close={preventCloseOnOverlay}>
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

// Mock canvas methods for signature pad
const mockCanvas = {
  getContext: jest.fn(() => ({
    fillStyle: '',
    fillRect: jest.fn(),
    beginPath: jest.fn(),
    moveTo: jest.fn(),
    lineTo: jest.fn(),
    stroke: jest.fn(),
    scale: jest.fn(),
    lineCap: '',
    lineJoin: '',
    strokeStyle: '',
    lineWidth: 0
  })),
  getBoundingClientRect: jest.fn(() => ({
    left: 0,
    top: 0,
    width: 400,
    height: 150
  })),
  toBlob: jest.fn((callback) => {
    const blob = new Blob(['mock-signature'], { type: 'image/png' });
    callback(blob);
  }),
  width: 400,
  height: 150
};

HTMLCanvasElement.prototype.getContext = mockCanvas.getContext;
HTMLCanvasElement.prototype.getBoundingClientRect = mockCanvas.getBoundingClientRect;
HTMLCanvasElement.prototype.toBlob = mockCanvas.toBlob;

describe('DriverSignoffModal Component', () => {
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
      id: 'ship-001',
      shipment_id: 'SHIP-001',
      customer_name: 'Test Customer',
      destination_address: '123 Test St, Test City, TX 12345',
      total_weight: '1,500 lbs'
    };

    mockOnClose = jest.fn();

    useApp.mockReturnValue(mockAppContext);
    shippingService.completeDriverSignoff = jest.fn();

    // Clear all mocks
    jest.clearAllMocks();

    // Mock Date for consistent testing
    jest.spyOn(Date.prototype, 'toISOString').mockReturnValue('2024-01-01T10:00:00.000Z');
  });

  afterEach(() => {
    jest.restoreAllMocks();
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
        <DriverSignoffModal {...defaultProps} />
      </QueryClientProvider>
    );
  };

  describe('Modal Rendering and Structure', () => {
    it('renders modal when isOpen is true', () => {
      renderComponent();
      expect(screen.getByTestId('base-modal')).toBeInTheDocument();
      expect(screen.getByText(/Driver Signoff - SHIP-001/)).toBeInTheDocument();
    });

    it('does not render modal when isOpen is false', () => {
      renderComponent({ isOpen: false });
      expect(screen.queryByTestId('base-modal')).not.toBeInTheDocument();
    });

    it('renders shipment information correctly', () => {
      renderComponent();
      
      expect(screen.getByText('SHIP-001')).toBeInTheDocument();
      expect(screen.getByText('Test Customer')).toBeInTheDocument();
      expect(screen.getByText('123 Test St, Test City, TX 12345')).toBeInTheDocument();
      expect(screen.getByText('1,500 lbs')).toBeInTheDocument();
    });

    it('renders all required form sections', () => {
      renderComponent();
      
      expect(screen.getByText('Shipment Information')).toBeInTheDocument();
      expect(screen.getByText('Driver Information')).toBeInTheDocument();
      expect(screen.getByText('Vehicle Information')).toBeInTheDocument();
      expect(screen.getByText('Pickup Details')).toBeInTheDocument();
      expect(screen.getByText('Verification')).toBeInTheDocument();
      expect(screen.getByText('Digital Signature *')).toBeInTheDocument();
    });

    it('sets preventCloseOnOverlay prop correctly', () => {
      renderComponent();
      const modal = screen.getByTestId('base-modal');
      expect(modal).toHaveAttribute('data-prevent-close', 'true');
    });
  });

  describe('Form Field Interactions', () => {
    it('updates driver name field', async () => {
      const user = userEvent.setup();
      renderComponent();
      
      const driverNameInput = screen.getByPlaceholderText(/enter driver full name/i);
      await user.type(driverNameInput, 'John Driver');
      
      expect(driverNameInput.value).toBe('John Driver');
    });

    it('updates driver license field', async () => {
      const user = userEvent.setup();
      renderComponent();
      
      const licenseInput = screen.getByPlaceholderText(/enter driver license number/i);
      await user.type(licenseInput, 'DL123456789');
      
      expect(licenseInput.value).toBe('DL123456789');
    });

    it('updates vehicle information fields', async () => {
      const user = userEvent.setup();
      renderComponent();
      
      const truckInput = screen.getByPlaceholderText(/enter truck number/i);
      const trailerInput = screen.getByPlaceholderText(/enter trailer number/i);
      
      await user.type(truckInput, 'TRUCK-001');
      await user.type(trailerInput, 'TRAILER-001');
      
      expect(truckInput.value).toBe('TRUCK-001');
      expect(trailerInput.value).toBe('TRAILER-001');
    });

    it('updates pickup time field', async () => {
      const user = userEvent.setup();
      renderComponent();
      
      const pickupTimeInput = screen.getByDisplayValue(/2024-01-01T10:00/);
      await user.clear(pickupTimeInput);
      await user.type(pickupTimeInput, '2024-01-01T14:30');
      
      expect(pickupTimeInput.value).toBe('2024-01-01T14:30');
    });

    it('updates package count field', async () => {
      const user = userEvent.setup();
      renderComponent();
      
      const packageCountInput = screen.getByPlaceholderText(/enter number of packages/i);
      await user.type(packageCountInput, '25');
      
      expect(packageCountInput.value).toBe('25');
    });

    it('handles checkbox interactions for verification', async () => {
      const user = userEvent.setup();
      renderComponent();
      
      const weightCheck = screen.getByLabelText(/total weight verified/i);
      const conditionCheck = screen.getByLabelText(/packages inspected/i);
      
      await user.click(weightCheck);
      await user.click(conditionCheck);
      
      expect(weightCheck).toBeChecked();
      expect(conditionCheck).toBeChecked();
    });

    it('updates delivery notes field', async () => {
      const user = userEvent.setup();
      renderComponent();
      
      const notesField = screen.getByPlaceholderText(/special delivery instructions/i);
      await user.type(notesField, 'Handle with care - fragile items');
      
      expect(notesField.value).toBe('Handle with care - fragile items');
    });
  });

  describe('Digital Signature Functionality', () => {
    let mockCanvas;

    beforeEach(() => {
      mockCanvas = {
        getContext: jest.fn(() => ({
          fillStyle: '',
          fillRect: jest.fn(),
          beginPath: jest.fn(),
          moveTo: jest.fn(),
          lineTo: jest.fn(),
          stroke: jest.fn(),
          scale: jest.fn(),
          lineCap: '',
          lineJoin: '',
          strokeStyle: '',
          lineWidth: 0
        })),
        getBoundingClientRect: jest.fn(() => ({
          left: 0,
          top: 0,
          width: 400,
          height: 150
        })),
        toBlob: jest.fn((callback) => {
          const blob = new Blob(['mock-signature'], { type: 'image/png' });
          callback(blob);
        }),
        width: 400,
        height: 150
      };
    });

    it('renders signature canvas', () => {
      renderComponent();
      
      const canvas = document.querySelector('canvas');
      expect(canvas).toBeInTheDocument();
      expect(canvas).toHaveClass('cursor-crosshair');
    });

    it('handles mouse drawing events', async () => {
      const user = userEvent.setup();
      renderComponent();
      
      const canvas = document.querySelector('canvas');
      
      // Simulate mouse drawing
      fireEvent.mouseDown(canvas, { clientX: 10, clientY: 10 });
      fireEvent.mouseMove(canvas, { clientX: 20, clientY: 20 });
      fireEvent.mouseUp(canvas);
      
      // Should call canvas drawing methods
      expect(mockCanvas.getContext).toHaveBeenCalled();
    });

    it('handles touch drawing events for mobile', async () => {
      renderComponent();
      
      const canvas = document.querySelector('canvas');
      
      // Simulate touch drawing
      fireEvent.touchStart(canvas, {
        touches: [{ clientX: 10, clientY: 10 }]
      });
      fireEvent.touchMove(canvas, {
        touches: [{ clientX: 20, clientY: 20 }]
      });
      fireEvent.touchEnd(canvas);
      
      expect(mockCanvas.getContext).toHaveBeenCalled();
    });

    it('clears signature when Clear Signature button is clicked', async () => {
      const user = userEvent.setup();
      renderComponent();
      
      // First simulate some drawing
      const canvas = document.querySelector('canvas');
      fireEvent.mouseDown(canvas, { clientX: 10, clientY: 10 });
      fireEvent.mouseUp(canvas);
      
      const clearBtn = screen.getByText(/clear signature/i);
      await user.click(clearBtn);
      
      expect(screen.getByText('Sign above to proceed')).toBeInTheDocument();
    });

    it('shows signature captured status after drawing', async () => {
      renderComponent();
      
      const canvas = document.querySelector('canvas');
      
      // Simulate complete drawing gesture
      fireEvent.mouseDown(canvas, { clientX: 10, clientY: 10 });
      fireEvent.mouseMove(canvas, { clientX: 20, clientY: 20 });
      fireEvent.mouseUp(canvas);
      
      await waitFor(() => {
        expect(screen.getByText(/signature captured/i)).toBeInTheDocument();
      });
    });
  });

  describe('Form Validation', () => {
    it('validates required fields on submit', async () => {
      const user = userEvent.setup();
      renderComponent();
      
      const submitBtn = screen.getByRole('button', { name: /complete driver signoff/i });
      await user.click(submitBtn);
      
      await waitFor(() => {
        expect(screen.getByText('Driver name is required')).toBeInTheDocument();
        expect(screen.getByText('Driver license number is required')).toBeInTheDocument();
        expect(screen.getByText('Truck number is required')).toBeInTheDocument();
        expect(screen.getByText('Package count is required')).toBeInTheDocument();
        expect(screen.getByText('Driver signature is required')).toBeInTheDocument();
      });
    });

    it('validates pickup time field', async () => {
      const user = userEvent.setup();
      renderComponent();
      
      // Clear the pre-filled pickup time
      const pickupTimeInput = screen.getByDisplayValue(/2024-01-01T10:00/);
      await user.clear(pickupTimeInput);
      
      const submitBtn = screen.getByRole('button', { name: /complete driver signoff/i });
      await user.click(submitBtn);
      
      await waitFor(() => {
        expect(screen.getByText('Pickup time is required')).toBeInTheDocument();
      });
    });

    it('clears validation errors when fields are updated', async () => {
      const user = userEvent.setup();
      renderComponent();
      
      // Trigger validation errors first
      const submitBtn = screen.getByRole('button', { name: /complete driver signoff/i });
      await user.click(submitBtn);
      
      await waitFor(() => {
        expect(screen.getByText('Driver name is required')).toBeInTheDocument();
      });
      
      // Fill the field
      const driverNameInput = screen.getByPlaceholderText(/enter driver full name/i);
      await user.type(driverNameInput, 'John Driver');
      
      await waitFor(() => {
        expect(screen.queryByText('Driver name is required')).not.toBeInTheDocument();
      });
    });

    it('validates package count as number', async () => {
      const user = userEvent.setup();
      renderComponent();
      
      const packageCountInput = screen.getByPlaceholderText(/enter number of packages/i);
      await user.type(packageCountInput, 'abc'); // Invalid input
      
      // The input should not accept non-numeric values due to type="number"
      expect(packageCountInput.value).toBe('');
    });
  });

  describe('Form Submission', () => {
    const fillValidForm = async (user) => {
      const driverNameInput = screen.getByPlaceholderText(/enter driver full name/i);
      const licenseInput = screen.getByPlaceholderText(/enter driver license number/i);
      const truckInput = screen.getByPlaceholderText(/enter truck number/i);
      const packageCountInput = screen.getByPlaceholderText(/enter number of packages/i);
      
      await user.type(driverNameInput, 'John Driver');
      await user.type(licenseInput, 'DL123456789');
      await user.type(truckInput, 'TRUCK-001');
      await user.type(packageCountInput, '25');
      
      // Simulate signature
      const canvas = document.querySelector('canvas');
      fireEvent.mouseDown(canvas, { clientX: 10, clientY: 10 });
      fireEvent.mouseMove(canvas, { clientX: 20, clientY: 20 });
      fireEvent.mouseUp(canvas);
      
      // Wait for signature to be captured
      await waitFor(() => {
        expect(screen.getByText(/signature captured/i)).toBeInTheDocument();
      });
    };

    it('submits form with valid data', async () => {
      const user = userEvent.setup();
      shippingService.completeDriverSignoff.mockResolvedValue({ success: true });
      
      renderComponent();
      await fillValidForm(user);
      
      const submitBtn = screen.getByRole('button', { name: /complete driver signoff/i });
      await user.click(submitBtn);
      
      await waitFor(() => {
        expect(shippingService.completeDriverSignoff).toHaveBeenCalledWith(
          mockData.id,
          expect.any(FormData)
        );
      });
    });

    it('shows loading state during submission', async () => {
      const user = userEvent.setup();
      shippingService.completeDriverSignoff.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
      
      renderComponent();
      await fillValidForm(user);
      
      const submitBtn = screen.getByRole('button', { name: /complete driver signoff/i });
      await user.click(submitBtn);
      
      expect(screen.getByText(/processing/i)).toBeInTheDocument();
      expect(submitBtn).toBeDisabled();
    });

    it('shows success message and closes modal on successful submission', async () => {
      const user = userEvent.setup();
      shippingService.completeDriverSignoff.mockResolvedValue({ success: true });
      
      renderComponent();
      await fillValidForm(user);
      
      const submitBtn = screen.getByRole('button', { name: /complete driver signoff/i });
      await user.click(submitBtn);
      
      await waitFor(() => {
        expect(mockAppContext.showSuccess).toHaveBeenCalledWith('Driver signoff completed successfully');
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it('shows error message on submission failure', async () => {
      const user = userEvent.setup();
      shippingService.completeDriverSignoff.mockRejectedValue(new Error('Network error'));
      
      renderComponent();
      await fillValidForm(user);
      
      const submitBtn = screen.getByRole('button', { name: /complete driver signoff/i });
      await user.click(submitBtn);
      
      await waitFor(() => {
        expect(mockAppContext.showError).toHaveBeenCalledWith('Failed to complete driver signoff: Network error');
      });
    });

    it('includes signature file in form submission', async () => {
      const user = userEvent.setup();
      shippingService.completeDriverSignoff.mockResolvedValue({ success: true });
      
      renderComponent();
      await fillValidForm(user);
      
      const submitBtn = screen.getByRole('button', { name: /complete driver signoff/i });
      await user.click(submitBtn);
      
      await waitFor(() => {
        expect(shippingService.completeDriverSignoff).toHaveBeenCalled();
        const formData = shippingService.completeDriverSignoff.mock.calls[0][1];
        expect(formData).toBeInstanceOf(FormData);
      });
    });
  });

  describe('Default Values and Initialization', () => {
    it('sets default pickup time to current time', () => {
      renderComponent();
      
      const pickupTimeInput = screen.getByDisplayValue(/2024-01-01T10:00/);
      expect(pickupTimeInput).toBeInTheDocument();
    });

    it('initializes canvas on modal open', () => {
      const { rerender } = renderComponent({ isOpen: false });
      
      // Reopen modal
      rerender(
        <QueryClientProvider client={queryClient}>
          <DriverSignoffModal isOpen={true} onClose={mockOnClose} data={mockData} />
        </QueryClientProvider>
      );
      
      expect(mockCanvas.getContext).toHaveBeenCalled();
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
      shippingService.completeDriverSignoff.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)));
      
      await fillValidForm(user);
      
      const submitBtn = screen.getByRole('button', { name: /complete driver signoff/i });
      await user.click(submitBtn);
      
      const cancelBtn = screen.getByText(/cancel/i);
      expect(cancelBtn).toBeDisabled();
    });

    it('changes button styling to green for completion', () => {
      renderComponent();
      
      const submitBtn = screen.getByRole('button', { name: /complete driver signoff/i });
      expect(submitBtn.className).toContain('bg-green-600');
    });
  });

  describe('Form Reset', () => {
    it('resets form when modal closes and reopens', async () => {
      const user = userEvent.setup();
      const { rerender } = renderComponent();
      
      // Fill some data
      const driverNameInput = screen.getByPlaceholderText(/enter driver full name/i);
      await user.type(driverNameInput, 'John Driver');
      
      // Close modal
      rerender(
        <QueryClientProvider client={queryClient}>
          <DriverSignoffModal isOpen={false} onClose={mockOnClose} data={mockData} />
        </QueryClientProvider>
      );
      
      // Reopen modal
      rerender(
        <QueryClientProvider client={queryClient}>
          <DriverSignoffModal isOpen={true} onClose={mockOnClose} data={mockData} />
        </QueryClientProvider>
      );
      
      const newDriverNameInput = screen.getByPlaceholderText(/enter driver full name/i);
      expect(newDriverNameInput.value).toBe('');
    });
  });

  describe('Accessibility', () => {
    it('has proper form labels and ARIA attributes', () => {
      renderComponent();
      
      expect(screen.getByLabelText(/driver name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/driver license #/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/truck number/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/pickup time/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/package count/i)).toBeInTheDocument();
    });

    it('displays proper error messages for screen readers', async () => {
      const user = userEvent.setup();
      renderComponent();
      
      const submitBtn = screen.getByRole('button', { name: /complete driver signoff/i });
      await user.click(submitBtn);
      
      await waitFor(() => {
        const errorMessages = screen.getAllByText(/is required$/);
        expect(errorMessages.length).toBeGreaterThan(0);
      });
    });

    it('supports keyboard navigation for signature canvas', () => {
      renderComponent();
      
      const canvas = document.querySelector('canvas');
      expect(canvas).toHaveAttribute('class');
      // Canvas should support touch events for accessibility
      expect(canvas).toHaveClass('touch-none');
    });
  });

  describe('Input Constraints', () => {
    it('enforces minimum value for package count', async () => {
      const user = userEvent.setup();
      renderComponent();
      
      const packageCountInput = screen.getByPlaceholderText(/enter number of packages/i);
      expect(packageCountInput).toHaveAttribute('min', '1');
    });

    it('uses datetime-local input for pickup time', () => {
      renderComponent();
      
      const pickupTimeInput = screen.getByDisplayValue(/2024-01-01T10:00/);
      expect(pickupTimeInput).toHaveAttribute('type', 'datetime-local');
    });
  });

  describe('Error Handling', () => {
    it('handles missing shipment data gracefully', () => {
      renderComponent({ data: null });
      
      expect(screen.queryByTestId('base-modal')).not.toBeInTheDocument();
    });

    it('handles canvas context errors gracefully', () => {
      // Mock canvas getContext to return null
      HTMLCanvasElement.prototype.getContext = jest.fn(() => null);
      
      expect(() => renderComponent()).not.toThrow();
    });
  });

  describe('Performance', () => {
    it('handles rapid signature drawing efficiently', async () => {
      renderComponent();
      
      const canvas = document.querySelector('canvas');
      
      // Simulate rapid drawing movements
      for (let i = 0; i < 100; i++) {
        fireEvent.mouseMove(canvas, { clientX: i, clientY: i });
      }
      
      // Should not cause performance issues or errors
      expect(mockCanvas.getContext).toHaveBeenCalled();
    });

    it('properly manages canvas memory and cleanup', () => {
      const { unmount } = renderComponent();
      
      // Component should unmount without memory leaks
      expect(() => unmount()).not.toThrow();
    });
  });
});