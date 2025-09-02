// tests/frontend/modals/PrintLabelsModal.test.js
// Comprehensive tests for PrintLabelsModal component interactions

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import userEvent from '@testing-library/user-event';
import PrintLabelsModal from '../../../src/frontend/src/components/modals/PrintLabelsModal';
import { useApp } from '../../../src/frontend/src/contexts/AppContext';
import { shippingService } from '../../../src/frontend/src/services/shippingService';

// Mock dependencies
jest.mock('../../../src/frontend/src/contexts/AppContext');
jest.mock('../../../src/frontend/src/services/shippingService');

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

// Mock window.open and document methods for print/download functionality
global.window.open = jest.fn();
const mockLink = {
  href: '',
  download: '',
  click: jest.fn()
};
jest.spyOn(document, 'createElement').mockImplementation((tagName) => {
  if (tagName === 'a') return mockLink;
  return document.createElement(tagName);
});
jest.spyOn(document.body, 'appendChild').mockImplementation(() => {});
jest.spyOn(document.body, 'removeChild').mockImplementation(() => {});

describe('PrintLabelsModal Component', () => {
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
      total_items: 25,
      total_weight: '1,500 lbs',
      insurance_value: '5000.00',
      reference_number: 'REF-12345'
    };

    mockOnClose = jest.fn();

    useApp.mockReturnValue(mockAppContext);
    shippingService.generateLabels = jest.fn();
    shippingService.updateStatus = jest.fn();

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
        <PrintLabelsModal {...defaultProps} />
      </QueryClientProvider>
    );
  };

  describe('Modal Rendering and Structure', () => {
    it('renders modal when isOpen is true', () => {
      renderComponent();
      expect(screen.getByTestId('base-modal')).toBeInTheDocument();
      expect(screen.getByText(/Generate Shipping Labels - SHIP-001/)).toBeInTheDocument();
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
      expect(screen.getByText('25')).toBeInTheDocument();
    });

    it('renders all required form sections', () => {
      renderComponent();
      
      expect(screen.getByText('Shipment Information')).toBeInTheDocument();
      expect(screen.getByText('Carrier and Service')).toBeInTheDocument();
      expect(screen.getByText('Package Details')).toBeInTheDocument();
      expect(screen.getByText('Service Options')).toBeInTheDocument();
      expect(screen.getByText('Reference Numbers')).toBeInTheDocument();
      expect(screen.getByText('Label Options')).toBeInTheDocument();
    });

    it('has xl size and scrollable class', () => {
      renderComponent();
      const modal = screen.getByTestId('base-modal');
      expect(modal).toHaveClass('modal-xl');
      expect(modal).toHaveClass('max-h-screen');
      expect(modal).toHaveClass('overflow-y-auto');
    });
  });

  describe('Form Field Interactions', () => {
    it('updates carrier selection and service types', async () => {
      const user = userEvent.setup();
      renderComponent();
      
      const carrierSelect = screen.getByRole('combobox', { name: /carrier/i });
      await user.selectOptions(carrierSelect, 'FedEx');
      
      expect(carrierSelect.value).toBe('FedEx');
      
      // Service types should update based on carrier
      await waitFor(() => {
        expect(screen.getByText('FedEx Ground')).toBeInTheDocument();
        expect(screen.getByText('FedEx Express Overnight')).toBeInTheDocument();
      });
    });

    it('updates service type selection', async () => {
      const user = userEvent.setup();
      renderComponent();
      
      const serviceSelect = screen.getByRole('combobox', { name: /service type/i });
      await user.selectOptions(serviceSelect, 'Next Day Air');
      
      expect(serviceSelect.value).toBe('Next Day Air');
    });

    it('updates package type and dimensions', async () => {
      const user = userEvent.setup();
      renderComponent();
      
      const packageTypeSelect = screen.getByRole('combobox', { name: /package type/i });
      const weightInput = screen.getByPlaceholderText('0.0');
      const lengthInput = screen.getByPlaceholderText('Length');
      const widthInput = screen.getByPlaceholderText('Width');
      const heightInput = screen.getByPlaceholderText('Height');
      
      await user.selectOptions(packageTypeSelect, 'Box');
      await user.type(weightInput, '15.5');
      await user.type(lengthInput, '12');
      await user.type(widthInput, '8');
      await user.type(heightInput, '6');
      
      expect(packageTypeSelect.value).toBe('Box');
      expect(weightInput.value).toBe('15.5');
      expect(lengthInput.value).toBe('12');
      expect(widthInput.value).toBe('8');
      expect(heightInput.value).toBe('6');
    });

    it('updates insurance value', async () => {
      const user = userEvent.setup();
      renderComponent();
      
      const insuranceInput = screen.getByPlaceholderText('0.00');
      await user.type(insuranceInput, '1000.50');
      
      expect(insuranceInput.value).toBe('1000.50');
    });

    it('handles service option checkboxes', async () => {
      const user = userEvent.setup();
      renderComponent();
      
      const deliveryConfirmationCheck = screen.getByLabelText(/delivery confirmation/i);
      const signatureRequiredCheck = screen.getByLabelText(/signature required/i);
      
      // Delivery confirmation should be checked by default
      expect(deliveryConfirmationCheck).toBeChecked();
      
      await user.click(deliveryConfirmationCheck);
      await user.click(signatureRequiredCheck);
      
      expect(deliveryConfirmationCheck).not.toBeChecked();
      expect(signatureRequiredCheck).toBeChecked();
    });

    it('updates special instructions', async () => {
      const user = userEvent.setup();
      renderComponent();
      
      const instructionsField = screen.getByPlaceholderText(/special handling instructions/i);
      await user.type(instructionsField, 'Fragile - handle with care');
      
      expect(instructionsField.value).toBe('Fragile - handle with care');
    });
  });

  describe('Reference Numbers Management', () => {
    it('pre-populates reference number from shipment data', () => {
      renderComponent();
      
      const referenceInput = screen.getByDisplayValue('REF-12345');
      expect(referenceInput).toBeInTheDocument();
    });

    it('adds new reference number field', async () => {
      const user = userEvent.setup();
      renderComponent();
      
      const addReferenceBtn = screen.getByText(/add reference/i);
      await user.click(addReferenceBtn);
      
      const referenceInputs = screen.getAllByPlaceholderText(/reference \d+/i);
      expect(referenceInputs).toHaveLength(2);
    });

    it('removes reference number field', async () => {
      const user = userEvent.setup();
      renderComponent();
      
      // Add a second reference first
      const addReferenceBtn = screen.getByText(/add reference/i);
      await user.click(addReferenceBtn);
      
      // Now remove one
      const removeBtn = screen.getByRole('button', { name: /trash/i });
      await user.click(removeBtn);
      
      const referenceInputs = screen.getAllByPlaceholderText(/reference \d+/i);
      expect(referenceInputs).toHaveLength(1);
    });

    it('updates reference number values', async () => {
      const user = userEvent.setup();
      renderComponent();
      
      const referenceInput = screen.getByDisplayValue('REF-12345');
      await user.clear(referenceInput);
      await user.type(referenceInput, 'NEW-REF-789');
      
      expect(referenceInput.value).toBe('NEW-REF-789');
    });

    it('does not show remove button for single reference', () => {
      renderComponent();
      
      const removeBtn = screen.queryByRole('button', { name: /trash/i });
      expect(removeBtn).not.toBeInTheDocument();
    });
  });

  describe('Label Options', () => {
    it('updates label format selection', async () => {
      const user = userEvent.setup();
      renderComponent();
      
      const formatSelect = screen.getByRole('combobox', { name: /label format/i });
      await user.selectOptions(formatSelect, '8.5x11');
      
      expect(formatSelect.value).toBe('8.5x11');
    });

    it('updates number of copies', async () => {
      const user = userEvent.setup();
      renderComponent();
      
      const copiesInput = screen.getByRole('spinbutton', { name: /number of copies/i });
      await user.clear(copiesInput);
      await user.type(copiesInput, '3');
      
      expect(copiesInput.value).toBe('3');
    });

    it('enforces copy limits', async () => {
      const user = userEvent.setup();
      renderComponent();
      
      const copiesInput = screen.getByRole('spinbutton', { name: /number of copies/i });
      expect(copiesInput).toHaveAttribute('min', '1');
      expect(copiesInput).toHaveAttribute('max', '5');
    });

    it('handles label option checkboxes', async () => {
      const user = userEvent.setup();
      renderComponent();
      
      const printReceiptCheck = screen.getByLabelText(/print receipt/i);
      const printCustomsCheck = screen.getByLabelText(/print customs form/i);
      
      // Print receipt should be checked by default
      expect(printReceiptCheck).toBeChecked();
      
      await user.click(printReceiptCheck);
      await user.click(printCustomsCheck);
      
      expect(printReceiptCheck).not.toBeChecked();
      expect(printCustomsCheck).toBeChecked();
    });
  });

  describe('Form Validation', () => {
    it('validates required fields on submit', async () => {
      const user = userEvent.setup();
      renderComponent();
      
      // Clear pre-filled weight
      const weightInput = screen.getByPlaceholderText('0.0');
      await user.clear(weightInput);
      
      // Clear dimensions
      const lengthInput = screen.getByPlaceholderText('Length');
      await user.clear(lengthInput);
      
      const submitBtn = screen.getByRole('button', { name: /generate labels/i });
      await user.click(submitBtn);
      
      await waitFor(() => {
        expect(screen.getByText('Package weight is required')).toBeInTheDocument();
        expect(screen.getByText('Package dimensions are required')).toBeInTheDocument();
      });
    });

    it('validates insurance value as number', async () => {
      const user = userEvent.setup();
      renderComponent();
      
      const insuranceInput = screen.getByPlaceholderText('0.00');
      await user.type(insuranceInput, 'invalid');
      
      const submitBtn = screen.getByRole('button', { name: /generate labels/i });
      await user.click(submitBtn);
      
      await waitFor(() => {
        expect(screen.getByText('Insurance value must be a number')).toBeInTheDocument();
      });
    });

    it('clears validation errors when fields are updated', async () => {
      const user = userEvent.setup();
      renderComponent();
      
      // Clear weight to trigger error
      const weightInput = screen.getByPlaceholderText('0.0');
      await user.clear(weightInput);
      
      const submitBtn = screen.getByRole('button', { name: /generate labels/i });
      await user.click(submitBtn);
      
      await waitFor(() => {
        expect(screen.getByText('Package weight is required')).toBeInTheDocument();
      });
      
      // Fill the field
      await user.type(weightInput, '10');
      
      await waitFor(() => {
        expect(screen.queryByText('Package weight is required')).not.toBeInTheDocument();
      });
    });
  });

  describe('Form Submission and Label Generation', () => {
    const fillValidForm = async (user) => {
      const weightInput = screen.getByPlaceholderText('0.0');
      const lengthInput = screen.getByPlaceholderText('Length');
      const widthInput = screen.getByPlaceholderText('Width');
      const heightInput = screen.getByPlaceholderText('Height');
      
      await user.type(weightInput, '15.5');
      await user.type(lengthInput, '12');
      await user.type(widthInput, '8');
      await user.type(heightInput, '6');
    };

    it('submits form with valid data', async () => {
      const user = userEvent.setup();
      shippingService.generateLabels.mockResolvedValue({ 
        success: true, 
        labels: [{ tracking_number: 'TRK123', label_url: 'http://example.com/label.pdf' }]
      });
      
      renderComponent();
      await fillValidForm(user);
      
      const submitBtn = screen.getByRole('button', { name: /generate labels/i });
      await user.click(submitBtn);
      
      await waitFor(() => {
        expect(shippingService.generateLabels).toHaveBeenCalledWith(
          mockData.id,
          expect.objectContaining({
            carrier: 'UPS',
            service_type: 'Ground',
            dimensions: expect.objectContaining({
              weight: '15.5',
              length: '12',
              width: '8',
              height: '6'
            })
          })
        );
      });
    });

    it('shows loading state during submission', async () => {
      const user = userEvent.setup();
      shippingService.generateLabels.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
      
      renderComponent();
      await fillValidForm(user);
      
      const submitBtn = screen.getByRole('button', { name: /generate labels/i });
      await user.click(submitBtn);
      
      expect(screen.getByText(/generating/i)).toBeInTheDocument();
      expect(submitBtn).toBeDisabled();
    });

    it('displays generated labels after successful submission', async () => {
      const user = userEvent.setup();
      const mockLabels = [
        { tracking_number: 'TRK123', label_url: 'http://example.com/label1.pdf' },
        { tracking_number: 'TRK124', label_url: 'http://example.com/label2.pdf' }
      ];
      
      shippingService.generateLabels.mockResolvedValue({ 
        success: true, 
        labels: mockLabels
      });
      
      renderComponent();
      await fillValidForm(user);
      
      const submitBtn = screen.getByRole('button', { name: /generate labels/i });
      await user.click(submitBtn);
      
      await waitFor(() => {
        expect(screen.getByText('Generated Labels')).toBeInTheDocument();
        expect(screen.getByText('Tracking: TRK123')).toBeInTheDocument();
        expect(screen.getByText('Tracking: TRK124')).toBeInTheDocument();
      });
    });

    it('automatically updates shipment status after label generation', async () => {
      const user = userEvent.setup();
      shippingService.generateLabels.mockResolvedValue({ 
        success: true, 
        labels: [{ tracking_number: 'TRK123', label_url: 'http://example.com/label.pdf' }]
      });
      shippingService.updateStatus.mockResolvedValue({ success: true });
      
      renderComponent();
      await fillValidForm(user);
      
      const submitBtn = screen.getByRole('button', { name: /generate labels/i });
      await user.click(submitBtn);
      
      await waitFor(() => {
        expect(shippingService.updateStatus).toHaveBeenCalledWith(
          mockData.id,
          'Ready for Pickup',
          'Labels generated and printed'
        );
      }, { timeout: 2000 });
    });

    it('filters out empty reference numbers in submission', async () => {
      const user = userEvent.setup();
      shippingService.generateLabels.mockResolvedValue({ success: true, labels: [] });
      
      renderComponent();
      await fillValidForm(user);
      
      // Add empty reference number
      const addReferenceBtn = screen.getByText(/add reference/i);
      await user.click(addReferenceBtn);
      
      const submitBtn = screen.getByRole('button', { name: /generate labels/i });
      await user.click(submitBtn);
      
      await waitFor(() => {
        const submittedData = shippingService.generateLabels.mock.calls[0][1];
        expect(submittedData.reference_numbers).toEqual(['REF-12345']); // Only non-empty refs
      });
    });

    it('shows error message on submission failure', async () => {
      const user = userEvent.setup();
      shippingService.generateLabels.mockRejectedValue(new Error('API Error'));
      
      renderComponent();
      await fillValidForm(user);
      
      const submitBtn = screen.getByRole('button', { name: /generate labels/i });
      await user.click(submitBtn);
      
      await waitFor(() => {
        expect(mockAppContext.showError).toHaveBeenCalledWith('Failed to generate labels: API Error');
      });
    });
  });

  describe('Label Actions (Print and Download)', () => {
    const setupGeneratedLabels = async (user) => {
      const mockLabels = [
        { tracking_number: 'TRK123', label_url: 'http://example.com/label1.pdf' }
      ];
      
      shippingService.generateLabels.mockResolvedValue({ 
        success: true, 
        labels: mockLabels
      });
      
      await fillValidForm(user);
      
      const submitBtn = screen.getByRole('button', { name: /generate labels/i });
      await user.click(submitBtn);
      
      await waitFor(() => {
        expect(screen.getByText('Generated Labels')).toBeInTheDocument();
      });
    };

    const fillValidForm = async (user) => {
      const weightInput = screen.getByPlaceholderText('0.0');
      const lengthInput = screen.getByPlaceholderText('Length');
      const widthInput = screen.getByPlaceholderText('Width');
      const heightInput = screen.getByPlaceholderText('Height');
      
      await user.type(weightInput, '15.5');
      await user.type(lengthInput, '12');
      await user.type(widthInput, '8');
      await user.type(heightInput, '6');
    };

    it('opens print window when print button is clicked', async () => {
      const user = userEvent.setup();
      const mockPrintWindow = { focus: jest.fn() };
      global.window.open.mockReturnValue(mockPrintWindow);
      
      renderComponent();
      await setupGeneratedLabels(user);
      
      const printBtn = screen.getByRole('button', { name: /print/i });
      await user.click(printBtn);
      
      expect(global.window.open).toHaveBeenCalledWith(
        'http://example.com/label1.pdf',
        '_blank',
        'width=600,height=800'
      );
      expect(mockPrintWindow.focus).toHaveBeenCalled();
    });

    it('initiates download when download button is clicked', async () => {
      const user = userEvent.setup();
      
      renderComponent();
      await setupGeneratedLabels(user);
      
      const downloadBtn = screen.getByRole('button', { name: /download/i });
      await user.click(downloadBtn);
      
      expect(document.createElement).toHaveBeenCalledWith('a');
      expect(mockLink.href).toBe('http://example.com/label1.pdf');
      expect(mockLink.download).toBe('label-TRK123.pdf');
      expect(mockLink.click).toHaveBeenCalled();
    });
  });

  describe('Pre-population from Shipment Data', () => {
    it('pre-populates form with shipment data on modal open', () => {
      renderComponent();
      
      const weightInput = screen.getByPlaceholderText('0.0');
      const insuranceInput = screen.getByPlaceholderText('0.00');
      const referenceInput = screen.getByDisplayValue('REF-12345');
      
      expect(weightInput.value).toBe('');
      expect(insuranceInput.value).toBe('5000.00');
      expect(referenceInput).toBeInTheDocument();
    });
  });

  describe('Modal Controls', () => {
    it('shows "Cancel" button when no labels generated', () => {
      renderComponent();
      
      const cancelBtn = screen.getByText(/cancel/i);
      expect(cancelBtn).toBeInTheDocument();
    });

    it('shows "Done" button when labels are generated', async () => {
      const user = userEvent.setup();
      shippingService.generateLabels.mockResolvedValue({ 
        success: true, 
        labels: [{ tracking_number: 'TRK123', label_url: 'http://example.com/label.pdf' }]
      });
      
      renderComponent();
      
      const weightInput = screen.getByPlaceholderText('0.0');
      const lengthInput = screen.getByPlaceholderText('Length');
      const widthInput = screen.getByPlaceholderText('Width');
      const heightInput = screen.getByPlaceholderText('Height');
      
      await user.type(weightInput, '15.5');
      await user.type(lengthInput, '12');
      await user.type(widthInput, '8');
      await user.type(heightInput, '6');
      
      const submitBtn = screen.getByRole('button', { name: /generate labels/i });
      await user.click(submitBtn);
      
      await waitFor(() => {
        expect(screen.getByText(/done/i)).toBeInTheDocument();
        expect(screen.queryByText(/cancel/i)).not.toBeInTheDocument();
      });
    });

    it('hides generate button when labels are generated', async () => {
      const user = userEvent.setup();
      shippingService.generateLabels.mockResolvedValue({ 
        success: true, 
        labels: [{ tracking_number: 'TRK123', label_url: 'http://example.com/label.pdf' }]
      });
      
      renderComponent();
      
      const weightInput = screen.getByPlaceholderText('0.0');
      await user.type(weightInput, '15.5');
      
      const submitBtn = screen.getByRole('button', { name: /generate labels/i });
      await user.click(submitBtn);
      
      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /generate labels/i })).not.toBeInTheDocument();
      });
    });

    it('closes modal when cancel/done button is clicked', async () => {
      const user = userEvent.setup();
      renderComponent();
      
      const cancelBtn = screen.getByText(/cancel/i);
      await user.click(cancelBtn);
      
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Service Type Options by Carrier', () => {
    it('shows UPS service types when UPS is selected', async () => {
      const user = userEvent.setup();
      renderComponent();
      
      const carrierSelect = screen.getByRole('combobox', { name: /carrier/i });
      await user.selectOptions(carrierSelect, 'UPS');
      
      expect(screen.getByText('UPS Ground')).toBeInTheDocument();
      expect(screen.getByText('UPS Next Day Air')).toBeInTheDocument();
      expect(screen.getByText('UPS 2nd Day Air')).toBeInTheDocument();
    });

    it('shows USPS service types when USPS is selected', async () => {
      const user = userEvent.setup();
      renderComponent();
      
      const carrierSelect = screen.getByRole('combobox', { name: /carrier/i });
      await user.selectOptions(carrierSelect, 'USPS');
      
      expect(screen.getByText('USPS Ground Advantage')).toBeInTheDocument();
      expect(screen.getByText('USPS Priority Mail')).toBeInTheDocument();
      expect(screen.getByText('USPS Priority Mail Express')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('handles missing shipment data gracefully', () => {
      renderComponent({ data: null });
      
      expect(screen.queryByTestId('base-modal')).not.toBeInTheDocument();
    });

    it('handles print window failure gracefully', async () => {
      const user = userEvent.setup();
      global.window.open.mockReturnValue(null); // Simulate blocked popup
      
      renderComponent();
      
      const mockLabels = [
        { tracking_number: 'TRK123', label_url: 'http://example.com/label1.pdf' }
      ];
      
      shippingService.generateLabels.mockResolvedValue({ 
        success: true, 
        labels: mockLabels
      });
      
      const weightInput = screen.getByPlaceholderText('0.0');
      await user.type(weightInput, '15.5');
      
      const submitBtn = screen.getByRole('button', { name: /generate labels/i });
      await user.click(submitBtn);
      
      await waitFor(() => {
        expect(screen.getByText('Generated Labels')).toBeInTheDocument();
      });
      
      const printBtn = screen.getByRole('button', { name: /print/i });
      await user.click(printBtn);
      
      // Should not throw error even if print window fails
      expect(global.window.open).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('has proper form labels and ARIA attributes', () => {
      renderComponent();
      
      expect(screen.getByLabelText(/carrier/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/service type/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/weight \(lbs\)/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/label format/i)).toBeInTheDocument();
    });

    it('displays proper error messages for validation', async () => {
      const user = userEvent.setup();
      renderComponent();
      
      const weightInput = screen.getByPlaceholderText('0.0');
      await user.clear(weightInput);
      
      const submitBtn = screen.getByRole('button', { name: /generate labels/i });
      await user.click(submitBtn);
      
      await waitFor(() => {
        const errorMessages = screen.getAllByText(/is required$/);
        expect(errorMessages.length).toBeGreaterThan(0);
      });
    });
  });
});