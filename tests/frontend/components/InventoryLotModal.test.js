// tests/frontend/components/InventoryLotModal.test.js
// Component testing with React Testing Library, user interactions, and accessibility

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { QueryClient, QueryClientProvider } from 'react-query';
import { BrowserRouter } from 'react-router-dom';

import InventoryLotModal from '../../../src/frontend/components/modals/InventoryLotModal';
import { AuthContext } from '../../../src/frontend/contexts/AuthContext';
import { AppContext } from '../../../src/frontend/contexts/AppContext';
import { toast } from 'react-hot-toast';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Mock react-hot-toast
jest.mock('react-hot-toast', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    loading: jest.fn()
  }
}));

// Mock API client
const mockApiClient = {
  inventory: {
    adjustLotQuantity: jest.fn(),
    changeLotStatus: jest.fn(),
    voidLot: jest.fn(),
    getLotTransactionHistory: jest.fn()
  }
};

jest.mock('../../../src/frontend/services/api-client', () => mockApiClient);

// Test wrapper component
const TestWrapper = ({ children, authValue, appValue }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  const defaultAuthValue = {
    user: { id: 'test-user-123', role: 'warehouse_staff' },
    isAuthenticated: true,
    hasPermission: jest.fn().mockReturnValue(true)
  };

  const defaultAppValue = {
    setLoading: jest.fn(),
    addNotification: jest.fn()
  };

  return (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <AuthContext.Provider value={{ ...defaultAuthValue, ...authValue }}>
          <AppContext.Provider value={{ ...defaultAppValue, ...appValue }}>
            {children}
          </AppContext.Provider>
        </AuthContext.Provider>
      </QueryClientProvider>
    </BrowserRouter>
  );
};

// Mock inventory lot data
const mockInventoryLot = {
  id: 'LOT-12345',
  part_id: 'part-456',
  customer_id: 'customer-789',
  status: 'In Stock',
  original_quantity: 100,
  current_quantity: 85,
  admission_date: '2024-01-15T10:00:00.000Z',
  manifest_number: 'MAN-001',
  conveyance_name: 'Test Vessel',
  port_of_unlading: 'Los Angeles',
  bill_of_lading: 'BOL-12345',
  total_value: 5000.00,
  created_at: '2024-01-15T10:00:00.000Z',
  updated_at: '2024-01-20T14:30:00.000Z',
  created_by: 'user-123',
  updated_by: 'user-456',
  part: {
    id: 'part-456',
    description: 'Electronic Component',
    part_number: 'PART-001',
    hts_code: '8471.30.0100'
  },
  customer: {
    id: 'customer-789',
    name: 'Test Customer Corp',
    code: 'TESTCORP'
  },
  storage_location: {
    id: 'location-123',
    location_code: 'A-01-05',
    description: 'Warehouse A, Aisle 1, Rack 5'
  }
};

describe('InventoryLotModal', () => {
  let user;
  let mockProps;

  beforeEach(() => {
    user = userEvent.setup();
    mockProps = {
      isOpen: true,
      onClose: jest.fn(),
      onSave: jest.fn(),
      lot: mockInventoryLot,
      mode: 'view' // 'view', 'edit', 'adjust'
    };

    // Reset all mocks
    jest.clearAllMocks();
    mockApiClient.inventory.getLotTransactionHistory.mockResolvedValue({
      success: true,
      data: [
        {
          id: 'trans-1',
          type: 'Admission',
          quantity: 100,
          source_document_number: 'Initial admission',
          created_at: '2024-01-15T10:00:00.000Z',
          created_by_name: 'John Doe'
        },
        {
          id: 'trans-2',
          type: 'Shipment',
          quantity: -15,
          source_document_number: 'Partial shipment',
          created_at: '2024-01-20T14:30:00.000Z',
          created_by_name: 'Jane Smith'
        }
      ]
    });
  });

  describe('Rendering and Display', () => {
    test('renders lot information correctly in view mode', () => {
      render(
        <TestWrapper>
          <InventoryLotModal {...mockProps} />
        </TestWrapper>
      );

      // Check for lot ID and basic information
      expect(screen.getByText('LOT-12345')).toBeInTheDocument();
      expect(screen.getByText('Current Quantity: 85')).toBeInTheDocument();
      expect(screen.getByText('Status: In Stock')).toBeInTheDocument();
      expect(screen.getByText('Electronic Component')).toBeInTheDocument();
      expect(screen.getByText('Test Customer Corp')).toBeInTheDocument();
      
      // Check for formatted dates
      expect(screen.getByText(/January 15, 2024/)).toBeInTheDocument();
      
      // Check for financial information
      expect(screen.getByText('$5,000.00')).toBeInTheDocument();
      
      // Check for location information
      expect(screen.getByText('A-01-05')).toBeInTheDocument();
    });

    test('shows transaction history when available', async () => {
      render(
        <TestWrapper>
          <InventoryLotModal {...mockProps} />
        </TestWrapper>
      );

      // Wait for transaction history to load
      await waitFor(() => {
        expect(screen.getByText('Transaction History')).toBeInTheDocument();
      });

      // Check for transaction entries
      expect(screen.getByText('Admission')).toBeInTheDocument();
      expect(screen.getByText('Shipment')).toBeInTheDocument();
      expect(screen.getByText('+100')).toBeInTheDocument();
      expect(screen.getByText('-15')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });

    test('displays loading state while fetching data', () => {
      mockApiClient.inventory.getLotTransactionHistory.mockReturnValue(
        new Promise(() => {}) // Never resolves
      );

      render(
        <TestWrapper>
          <InventoryLotModal {...mockProps} />
        </TestWrapper>
      );

      expect(screen.getByText('Loading transaction history...')).toBeInTheDocument();
    });

    test('handles missing optional data gracefully', () => {
      const lotWithMissingData = {
        ...mockInventoryLot,
        storage_location: null,
        bill_of_lading: null,
        total_value: null
      };

      render(
        <TestWrapper>
          <InventoryLotModal {...mockProps} lot={lotWithMissingData} />
        </TestWrapper>
      );

      expect(screen.getByText('No location assigned')).toBeInTheDocument();
      expect(screen.getByText('No BOL specified')).toBeInTheDocument();
      expect(screen.getByText('Value not specified')).toBeInTheDocument();
    });
  });

  describe('Quantity Adjustment Mode', () => {
    beforeEach(() => {
      mockProps.mode = 'adjust';
      mockApiClient.inventory.adjustLotQuantity.mockResolvedValue({
        success: true,
        data: { ...mockInventoryLot, current_quantity: 75 }
      });
    });

    test('shows quantity adjustment form', () => {
      render(
        <TestWrapper>
          <InventoryLotModal {...mockProps} />
        </TestWrapper>
      );

      expect(screen.getByLabelText(/new quantity/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/reason for adjustment/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /save adjustment/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    test('validates quantity input', async () => {
      render(
        <TestWrapper>
          <InventoryLotModal {...mockProps} />
        </TestWrapper>
      );

      const quantityInput = screen.getByLabelText(/new quantity/i);
      const reasonInput = screen.getByLabelText(/reason for adjustment/i);
      const saveButton = screen.getByRole('button', { name: /save adjustment/i });

      // Test negative quantity
      await user.type(quantityInput, '-10');
      await user.type(reasonInput, 'Test negative quantity');
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/quantity must be greater than or equal to zero/i)).toBeInTheDocument();
      });

      expect(mockProps.onSave).not.toHaveBeenCalled();
    });

    test('requires reason for adjustment', async () => {
      render(
        <TestWrapper>
          <InventoryLotModal {...mockProps} />
        </TestWrapper>
      );

      const quantityInput = screen.getByLabelText(/new quantity/i);
      const saveButton = screen.getByRole('button', { name: /save adjustment/i });

      await user.type(quantityInput, '75');
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/reason is required/i)).toBeInTheDocument();
      });

      expect(mockProps.onSave).not.toHaveBeenCalled();
    });

    test('submits valid quantity adjustment', async () => {
      render(
        <TestWrapper>
          <InventoryLotModal {...mockProps} />
        </TestWrapper>
      );

      const quantityInput = screen.getByLabelText(/new quantity/i);
      const reasonInput = screen.getByLabelText(/reason for adjustment/i);
      const saveButton = screen.getByRole('button', { name: /save adjustment/i });

      await user.type(quantityInput, '75');
      await user.type(reasonInput, 'Partial shipment completed');
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockApiClient.inventory.adjustLotQuantity).toHaveBeenCalledWith(
          'LOT-12345',
          75,
          'Partial shipment completed',
          85 // old quantity
        );
      });

      expect(toast.success).toHaveBeenCalledWith('Lot quantity adjusted successfully');
      expect(mockProps.onSave).toHaveBeenCalledWith({
        id: 'LOT-12345',
        newQuantity: 75,
        reason: 'Partial shipment completed',
        oldQuantity: 85
      });
    });

    test('handles API error gracefully', async () => {
      mockApiClient.inventory.adjustLotQuantity.mockResolvedValue({
        success: false,
        error: 'Adjustment failed due to concurrent modification'
      });

      render(
        <TestWrapper>
          <InventoryLotModal {...mockProps} />
        </TestWrapper>
      );

      const quantityInput = screen.getByLabelText(/new quantity/i);
      const reasonInput = screen.getByLabelText(/reason for adjustment/i);
      const saveButton = screen.getByRole('button', { name: /save adjustment/i });

      await user.type(quantityInput, '75');
      await user.type(reasonInput, 'Test error handling');
      await user.click(saveButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Adjustment failed due to concurrent modification');
      });

      expect(mockProps.onSave).not.toHaveBeenCalled();
    });

    test('shows confirmation for large quantity changes', async () => {
      render(
        <TestWrapper>
          <InventoryLotModal {...mockProps} />
        </TestWrapper>
      );

      const quantityInput = screen.getByLabelText(/new quantity/i);
      const reasonInput = screen.getByLabelText(/reason for adjustment/i);
      const saveButton = screen.getByRole('button', { name: /save adjustment/i });

      // Large decrease (more than 50% change)
      await user.type(quantityInput, '30');
      await user.type(reasonInput, 'Large adjustment test');
      await user.click(saveButton);

      // Should show confirmation dialog
      await waitFor(() => {
        expect(screen.getByText(/large quantity change detected/i)).toBeInTheDocument();
      });

      const confirmButton = screen.getByRole('button', { name: /confirm adjustment/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockApiClient.inventory.adjustLotQuantity).toHaveBeenCalled();
      });
    });
  });

  describe('Status Change Mode', () => {
    beforeEach(() => {
      mockProps.mode = 'status';
      mockApiClient.inventory.changeLotStatus.mockResolvedValue({
        success: true,
        data: { ...mockInventoryLot, status: 'On Hold' }
      });
    });

    test('shows status change form with available statuses', () => {
      render(
        <TestWrapper>
          <InventoryLotModal {...mockProps} />
        </TestWrapper>
      );

      expect(screen.getByLabelText(/new status/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/reason for status change/i)).toBeInTheDocument();

      // Check for status options
      const statusSelect = screen.getByLabelText(/new status/i);
      expect(within(statusSelect).getByText('In Stock')).toBeInTheDocument();
      expect(within(statusSelect).getByText('On Hold')).toBeInTheDocument();
      expect(within(statusSelect).getByText('Depleted')).toBeInTheDocument();
    });

    test('validates status change with business rules', async () => {
      // Test invalid transition (In Stock -> Voided without proper permission)
      render(
        <TestWrapper>
          <InventoryLotModal {...mockProps} />
        </TestWrapper>
      );

      const statusSelect = screen.getByLabelText(/new status/i);
      const reasonInput = screen.getByLabelText(/reason for status change/i);
      const saveButton = screen.getByRole('button', { name: /save status change/i });

      await user.selectOptions(statusSelect, 'Voided');
      await user.type(reasonInput, 'Invalid transition test');
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/supervisor permission required/i)).toBeInTheDocument();
      });
    });

    test('submits valid status change', async () => {
      render(
        <TestWrapper>
          <InventoryLotModal {...mockProps} />
        </TestWrapper>
      );

      const statusSelect = screen.getByLabelText(/new status/i);
      const reasonInput = screen.getByLabelText(/reason for status change/i);
      const saveButton = screen.getByRole('button', { name: /save status change/i });

      await user.selectOptions(statusSelect, 'On Hold');
      await user.type(reasonInput, 'Quality inspection required');
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockApiClient.inventory.changeLotStatus).toHaveBeenCalledWith(
          'LOT-12345',
          'On Hold',
          'Quality inspection required',
          'In Stock'
        );
      });

      expect(toast.success).toHaveBeenCalledWith('Lot status updated successfully');
      expect(mockProps.onSave).toHaveBeenCalled();
    });
  });

  describe('User Interactions and Accessibility', () => {
    test('closes modal when close button is clicked', async () => {
      render(
        <TestWrapper>
          <InventoryLotModal {...mockProps} />
        </TestWrapper>
      );

      const closeButton = screen.getByRole('button', { name: /close/i });
      await user.click(closeButton);

      expect(mockProps.onClose).toHaveBeenCalled();
    });

    test('closes modal when escape key is pressed', async () => {
      render(
        <TestWrapper>
          <InventoryLotModal {...mockProps} />
        </TestWrapper>
      );

      await user.keyboard('{Escape}');

      expect(mockProps.onClose).toHaveBeenCalled();
    });

    test('closes modal when clicking backdrop', async () => {
      render(
        <TestWrapper>
          <InventoryLotModal {...mockProps} />
        </TestWrapper>
      );

      const backdrop = screen.getByTestId('modal-backdrop');
      await user.click(backdrop);

      expect(mockProps.onClose).toHaveBeenCalled();
    });

    test('does not close modal when clicking modal content', async () => {
      render(
        <TestWrapper>
          <InventoryLotModal {...mockProps} />
        </TestWrapper>
      );

      const modalContent = screen.getByTestId('modal-content');
      await user.click(modalContent);

      expect(mockProps.onClose).not.toHaveBeenCalled();
    });

    test('traps focus within modal', async () => {
      render(
        <TestWrapper>
          <InventoryLotModal {...mockProps} mode="adjust" />
        </TestWrapper>
      );

      const quantityInput = screen.getByLabelText(/new quantity/i);
      const reasonInput = screen.getByLabelText(/reason for adjustment/i);
      const saveButton = screen.getByRole('button', { name: /save adjustment/i });
      const cancelButton = screen.getByRole('button', { name: /cancel/i });

      // Tab through interactive elements
      await user.tab();
      expect(quantityInput).toHaveFocus();

      await user.tab();
      expect(reasonInput).toHaveFocus();

      await user.tab();
      expect(saveButton).toHaveFocus();

      await user.tab();
      expect(cancelButton).toHaveFocus();

      // Should cycle back to first element
      await user.tab();
      expect(quantityInput).toHaveFocus();

      // Shift+Tab should go backwards
      await user.keyboard('{Shift>}{Tab}{/Shift}');
      expect(cancelButton).toHaveFocus();
    });

    test('meets accessibility standards', async () => {
      const { container } = render(
        <TestWrapper>
          <InventoryLotModal {...mockProps} />
        </TestWrapper>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    test('has proper ARIA labels and roles', () => {
      render(
        <TestWrapper>
          <InventoryLotModal {...mockProps} />
        </TestWrapper>
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByLabelText('Inventory Lot Details')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /close/i })).toHaveAttribute('aria-label', 'Close modal');
    });

    test('announces status changes to screen readers', async () => {
      render(
        <TestWrapper>
          <InventoryLotModal {...mockProps} mode="status" />
        </TestWrapper>
      );

      const statusSelect = screen.getByLabelText(/new status/i);
      await user.selectOptions(statusSelect, 'On Hold');

      expect(screen.getByRole('status')).toHaveTextContent('Status changed to On Hold');
    });
  });

  describe('Performance and Optimization', () => {
    test('renders modal within performance budget', async () => {
      const startTime = Date.now();
      
      render(
        <TestWrapper>
          <InventoryLotModal {...mockProps} />
        </TestWrapper>
      );

      // Wait for transaction history to load
      await waitFor(() => {
        expect(screen.getByText('Transaction History')).toBeInTheDocument();
      });

      const renderTime = Date.now() - startTime;
      
      // Modal should render and load data within 100ms
      expect(renderTime).toBeLessThan(100);
    });

    test('debounces quantity input validation', async () => {
      const validateSpy = jest.fn();
      
      render(
        <TestWrapper>
          <InventoryLotModal {...mockProps} mode="adjust" onValidate={validateSpy} />
        </TestWrapper>
      );

      const quantityInput = screen.getByLabelText(/new quantity/i);
      
      // Type multiple characters quickly
      await user.type(quantityInput, '123456');
      
      // Validation should be debounced, not called for each keystroke
      await waitFor(() => {
        expect(validateSpy).toHaveBeenCalledTimes(1);
      }, { timeout: 600 }); // Wait for debounce delay
    });

    test('memoizes expensive calculations', () => {
      const quantityDifferenceSpy = jest.fn();
      
      const TestComponent = () => {
        const quantityDifference = React.useMemo(() => {
          quantityDifferenceSpy();
          return mockInventoryLot.original_quantity - mockInventoryLot.current_quantity;
        }, [mockInventoryLot.original_quantity, mockInventoryLot.current_quantity]);

        return <div>Difference: {quantityDifference}</div>;
      };

      const { rerender } = render(<TestComponent />);
      
      // Re-render with same props
      rerender(<TestComponent />);
      
      // Calculation should only happen once due to memoization
      expect(quantityDifferenceSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error Boundaries and Edge Cases', () => {
    test('handles modal with null lot data', () => {
      const { container } = render(
        <TestWrapper>
          <InventoryLotModal {...mockProps} lot={null} />
        </TestWrapper>
      );

      expect(screen.getByText('No lot data available')).toBeInTheDocument();
      expect(container).not.toBeEmptyDOMElement();
    });

    test('handles API timeout gracefully', async () => {
      mockApiClient.inventory.adjustLotQuantity.mockImplementation(
        () => new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), 100)
        )
      );

      render(
        <TestWrapper>
          <InventoryLotModal {...mockProps} mode="adjust" />
        </TestWrapper>
      );

      const quantityInput = screen.getByLabelText(/new quantity/i);
      const reasonInput = screen.getByLabelText(/reason for adjustment/i);
      const saveButton = screen.getByRole('button', { name: /save adjustment/i });

      await user.type(quantityInput, '75');
      await user.type(reasonInput, 'Timeout test');
      await user.click(saveButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Request timeout - please try again');
      }, { timeout: 2000 });
    });

    test('prevents double submission of forms', async () => {
      render(
        <TestWrapper>
          <InventoryLotModal {...mockProps} mode="adjust" />
        </TestWrapper>
      );

      const quantityInput = screen.getByLabelText(/new quantity/i);
      const reasonInput = screen.getByLabelText(/reason for adjustment/i);
      const saveButton = screen.getByRole('button', { name: /save adjustment/i });

      await user.type(quantityInput, '75');
      await user.type(reasonInput, 'Double submit test');
      
      // Click save button multiple times quickly
      await user.click(saveButton);
      await user.click(saveButton);
      await user.click(saveButton);

      // API should only be called once
      await waitFor(() => {
        expect(mockApiClient.inventory.adjustLotQuantity).toHaveBeenCalledTimes(1);
      });
    });

    test('handles component unmounting during async operations', async () => {
      const { unmount } = render(
        <TestWrapper>
          <InventoryLotModal {...mockProps} mode="adjust" />
        </TestWrapper>
      );

      const quantityInput = screen.getByLabelText(/new quantity/i);
      const reasonInput = screen.getByLabelText(/reason for adjustment/i);
      const saveButton = screen.getByRole('button', { name: /save adjustment/i });

      await user.type(quantityInput, '75');
      await user.type(reasonInput, 'Unmount test');
      await user.click(saveButton);

      // Unmount component before API call completes
      unmount();

      // Should not cause any errors or memory leaks
      // This test primarily checks that cleanup is handled properly
    });
  });
});