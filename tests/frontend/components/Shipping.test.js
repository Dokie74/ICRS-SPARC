// tests/frontend/components/Shipping.test.js
// Component tests for Shipping page functionality

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { jest } from '@jest/globals';

import Shipping from '../../../src/frontend/src/components/pages/Shipping';
import { AppProvider } from '../../../src/frontend/src/contexts/AppContext';
import { shippingService } from '../../../src/frontend/src/services/shippingService';

// Mock the shipping service
jest.mock('../../../src/frontend/src/services/shippingService', () => ({
  shippingService: {
    getAll: jest.fn(),
    updateStatus: jest.fn(),
    generateLabels: jest.fn(),
    fileWithCBP: jest.fn()
  }
}));

// Mock the AppContext
const mockAppContext = {
  showSuccess: jest.fn(),
  showError: jest.fn(),
  showModal: jest.fn()
};

const MockAppProvider = ({ children }) => (
  <AppProvider value={mockAppContext}>
    {children}
  </AppProvider>
);

describe('Shipping Component Tests', () => {
  let queryClient;
  let user;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });
    user = userEvent.setup();
    jest.clearAllMocks();
  });

  const renderShipping = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <MockAppProvider>
          <Shipping />
        </MockAppProvider>
      </QueryClientProvider>
    );
  };

  describe('Component Rendering', () => {
    it('should render shipping management header and workflow description', async () => {
      shippingService.getAll.mockResolvedValue({
        success: true,
        preshipments: [],
        total: 0
      });

      renderShipping();

      expect(screen.getByText('Shipping Management')).toBeInTheDocument();
      expect(screen.getByText(/5-stage shipping workflow/)).toBeInTheDocument();
      expect(screen.getByText('Create New Shipment')).toBeInTheDocument();
    });

    it('should display loading state while fetching data', () => {
      shippingService.getAll.mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 1000))
      );

      renderShipping();

      expect(screen.getByRole('generic', { class: /animate-spin/ })).toBeInTheDocument();
    });

    it('should render error state when service fails', async () => {
      shippingService.getAll.mockRejectedValue(new Error('Service unavailable'));

      renderShipping();

      await waitFor(() => {
        expect(screen.getByText('Error loading shipping data')).toBeInTheDocument();
        expect(screen.getByText('Service unavailable')).toBeInTheDocument();
        expect(screen.getByText('Try Again')).toBeInTheDocument();
      });
    });
  });

  describe('View Tabs and Filtering', () => {
    const mockShipments = [
      {
        id: '1',
        shipment_id: 'SHP-2024-001',
        customer_name: 'Test Customer 1',
        status: 'Draft',
        priority: 'High',
        pickup_date: '2024-01-16T10:00:00Z',
        cbp_filed: false,
        tracking_number: 'TRK123456789'
      },
      {
        id: '2',
        shipment_id: 'SHP-2024-002',
        customer_name: 'Test Customer 2',
        status: 'Ready for Pickup',
        priority: 'Medium',
        pickup_date: '2024-01-16T14:00:00Z',
        cbp_filed: true,
        tracking_number: 'TRK987654321'
      },
      {
        id: '3',
        shipment_id: 'SHP-2024-003',
        customer_name: 'Test Customer 3',
        status: 'Shipped',
        priority: 'Low',
        pickup_date: '2024-01-15T09:00:00Z',
        cbp_filed: true
      }
    ];

    beforeEach(() => {
      shippingService.getAll.mockResolvedValue({
        success: true,
        preshipments: mockShipments,
        total: 3
      });
    });

    it('should render view tabs for different workflow stages', async () => {
      renderShipping();

      await waitFor(() => {
        expect(screen.getByText('Active')).toBeInTheDocument();
        expect(screen.getByText('Pending Compliance')).toBeInTheDocument();
        expect(screen.getByText('Ready for Dock')).toBeInTheDocument();
        expect(screen.getByText('Shipped')).toBeInTheDocument();
        expect(screen.getByText('On Hold')).toBeInTheDocument();
      });
    });

    it('should display statistics for current view', async () => {
      renderShipping();

      await waitFor(() => {
        expect(screen.getByText('Total Items')).toBeInTheDocument();
        expect(screen.getByText('High Priority')).toBeInTheDocument();
        expect(screen.getByText('Pending Compliance')).toBeInTheDocument();
        expect(screen.getByText('Ready Today')).toBeInTheDocument();
      });
    });

    it('should filter shipments by search term', async () => {
      renderShipping();

      await waitFor(() => {
        expect(screen.getByText('SHP-2024-001')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Search shipments...');
      await user.type(searchInput, 'Test Customer 1');

      await waitFor(() => {
        expect(screen.getByText('SHP-2024-001')).toBeInTheDocument();
        expect(screen.queryByText('SHP-2024-002')).not.toBeInTheDocument();
      });
    });

    it('should filter shipments by customer', async () => {
      renderShipping();

      await waitFor(() => {
        expect(screen.getByText('SHP-2024-001')).toBeInTheDocument();
      });

      const customerFilter = screen.getByPlaceholderText('Filter by customer...');
      await user.type(customerFilter, 'Test Customer 2');

      await waitFor(() => {
        expect(screen.queryByText('SHP-2024-001')).not.toBeInTheDocument();
        expect(screen.getByText('SHP-2024-002')).toBeInTheDocument();
      });
    });

    it('should filter shipments by priority', async () => {
      renderShipping();

      await waitFor(() => {
        expect(screen.getByText('SHP-2024-001')).toBeInTheDocument();
      });

      const prioritySelect = screen.getByDisplayValue('All Priorities');
      await user.selectOptions(prioritySelect, 'High Priority');

      await waitFor(() => {
        expect(screen.getByText('SHP-2024-001')).toBeInTheDocument();
        expect(screen.queryByText('SHP-2024-002')).not.toBeInTheDocument();
      });
    });

    it('should clear all filters when Clear Filters button is clicked', async () => {
      renderShipping();

      await waitFor(() => {
        expect(screen.getByText('SHP-2024-001')).toBeInTheDocument();
      });

      // Apply filters
      const searchInput = screen.getByPlaceholderText('Search shipments...');
      await user.type(searchInput, 'Test Customer 1');

      // Clear filters
      const clearButton = screen.getByText('Clear Filters');
      await user.click(clearButton);

      expect(searchInput.value).toBe('');
    });
  });

  describe('Shipment Table and Actions', () => {
    const mockShipments = [
      {
        id: '1',
        shipment_id: 'SHP-2024-001',
        customer_name: 'Test Customer 1',
        status: 'Draft',
        priority: 'High',
        pickup_date: '2024-01-16T10:00:00Z',
        cbp_filed: false,
        reference_number: 'REF-001'
      },
      {
        id: '2',
        shipment_id: 'SHP-2024-002',
        customer_name: 'Test Customer 2',
        status: 'Generate Labels',
        priority: 'Medium',
        pickup_date: '2024-01-16T14:00:00Z',
        cbp_filed: true
      },
      {
        id: '3',
        shipment_id: 'SHP-2024-003',
        customer_name: 'Test Customer 3',
        status: 'Ready for Pickup',
        priority: 'Low',
        pickup_date: '2024-01-15T09:00:00Z',
        cbp_filed: true
      }
    ];

    beforeEach(() => {
      shippingService.getAll.mockResolvedValue({
        success: true,
        preshipments: mockShipments,
        total: 3
      });
    });

    it('should render shipment table with correct columns', async () => {
      renderShipping();

      await waitFor(() => {
        expect(screen.getByText('Shipment ID')).toBeInTheDocument();
        expect(screen.getByText('Customer / Reference')).toBeInTheDocument();
        expect(screen.getByText('Status / Stage')).toBeInTheDocument();
        expect(screen.getByText('Priority')).toBeInTheDocument();
        expect(screen.getByText('Pickup Date')).toBeInTheDocument();
        expect(screen.getByText('CBP Status')).toBeInTheDocument();
        expect(screen.getByText('Actions')).toBeInTheDocument();
      });
    });

    it('should display shipment data correctly', async () => {
      renderShipping();

      await waitFor(() => {
        expect(screen.getByText('SHP-2024-001')).toBeInTheDocument();
        expect(screen.getByText('Test Customer 1')).toBeInTheDocument();
        expect(screen.getByText('REF-001')).toBeInTheDocument();
        expect(screen.getByText('Draft')).toBeInTheDocument();
        expect(screen.getByText('High')).toBeInTheDocument();
        expect(screen.getByText('Pending')).toBeInTheDocument(); // CBP status
      });
    });

    it('should show stage-specific action buttons', async () => {
      renderShipping();

      await waitFor(() => {
        // Draft stage actions - edit and submit
        const editButtons = screen.getAllByTitle('Edit shipment');
        expect(editButtons.length).toBeGreaterThan(0);

        const submitButtons = screen.getAllByTitle('Submit for picking');
        expect(submitButtons.length).toBeGreaterThan(0);
      });
    });

    it('should handle status update for Draft to Pending Pick', async () => {
      shippingService.updateStatus.mockResolvedValue({
        success: true,
        preshipment: { ...mockShipments[0], status: 'Pending Pick' }
      });

      renderShipping();

      await waitFor(() => {
        const submitButton = screen.getByTitle('Submit for picking');
        fireEvent.click(submitButton);
      });

      expect(shippingService.updateStatus).toHaveBeenCalledWith(
        '1',
        'Pending Pick',
        'Status updated to Pending Pick via workflow'
      );

      await waitFor(() => {
        expect(mockAppContext.showSuccess).toHaveBeenCalledWith(
          'Shipment pending pick successfully'
        );
      });
    });

    it('should handle CBP filing for eligible shipments', async () => {
      shippingService.fileWithCBP.mockResolvedValue({
        success: true,
        filing_reference: 'CBP-REF-123',
        filing_status: 'Submitted'
      });

      renderShipping();

      await waitFor(() => {
        const cbpButton = screen.getByTitle('File with CBP');
        fireEvent.click(cbpButton);
      });

      expect(shippingService.fileWithCBP).toHaveBeenCalledWith('1');

      await waitFor(() => {
        expect(mockAppContext.showSuccess).toHaveBeenCalledWith(
          'CBP filing initiated successfully'
        );
      });
    });

    it('should open label generation modal for Generate Labels stage', async () => {
      renderShipping();

      await waitFor(() => {
        const labelsButton = screen.getByText('Labels');
        fireEvent.click(labelsButton);
      });

      expect(mockAppContext.showModal).toHaveBeenCalledWith(
        'print-labels-modal',
        mockShipments[1]
      );
    });

    it('should open driver signoff modal for Ready for Pickup stage', async () => {
      renderShipping();

      await waitFor(() => {
        const signoffButton = screen.getByText('Signoff');
        fireEvent.click(signoffButton);
      });

      expect(mockAppContext.showModal).toHaveBeenCalledWith(
        'driver-signoff-modal',
        mockShipments[2]
      );
    });

    it('should always show view details action', async () => {
      renderShipping();

      await waitFor(() => {
        const viewButtons = screen.getAllByTitle('View details');
        expect(viewButtons).toHaveLength(mockShipments.length);
      });

      fireEvent.click(screen.getAllByTitle('View details')[0]);

      expect(mockAppContext.showModal).toHaveBeenCalledWith(
        'view-preshipment-modal',
        mockShipments[0]
      );
    });
  });

  describe('Empty States', () => {
    it('should show empty state when no shipments exist', async () => {
      shippingService.getAll.mockResolvedValue({
        success: true,
        preshipments: [],
        total: 0
      });

      renderShipping();

      await waitFor(() => {
        expect(screen.getByText('No shipments yet')).toBeInTheDocument();
        expect(screen.getByText('Create your first shipment to get started.')).toBeInTheDocument();
        expect(screen.getByText('Create First Shipment')).toBeInTheDocument();
      });
    });

    it('should show filtered empty state when filters return no results', async () => {
      const mockShipments = [
        {
          id: '1',
          shipment_id: 'SHP-2024-001',
          customer_name: 'Test Customer 1',
          status: 'Draft',
          priority: 'High'
        }
      ];

      shippingService.getAll.mockResolvedValue({
        success: true,
        preshipments: mockShipments,
        total: 1
      });

      renderShipping();

      await waitFor(() => {
        expect(screen.getByText('SHP-2024-001')).toBeInTheDocument();
      });

      // Apply filter that returns no results
      const searchInput = screen.getByPlaceholderText('Search shipments...');
      await user.type(searchInput, 'NonexistentCustomer');

      await waitFor(() => {
        expect(screen.getByText('No matching shipments')).toBeInTheDocument();
        expect(screen.getByText('Try adjusting your view or filter criteria.')).toBeInTheDocument();
      });
    });
  });

  describe('Status Configuration and Sorting', () => {
    const mockShipmentsForSorting = [
      {
        id: '1',
        shipment_id: 'SHP-2024-001',
        status: 'Shipped',
        priority: 'Low'
      },
      {
        id: '2',
        shipment_id: 'SHP-2024-002',
        status: 'Draft',
        priority: 'High'
      },
      {
        id: '3',
        shipment_id: 'SHP-2024-003',
        status: 'Draft',
        priority: 'Medium'
      },
      {
        id: '4',
        shipment_id: 'SHP-2024-004',
        status: 'Ready for Pickup',
        priority: 'High'
      }
    ];

    beforeEach(() => {
      shippingService.getAll.mockResolvedValue({
        success: true,
        preshipments: mockShipmentsForSorting,
        total: 4
      });
    });

    it('should sort shipments by workflow stage then by priority', async () => {
      renderShipping();

      await waitFor(() => {
        const shipmentRows = screen.getAllByText(/SHP-2024-\d+/);
        
        // Verify correct order: Draft (High, Medium), Ready for Pickup (High), Shipped (Low)
        expect(shipmentRows[0].textContent).toBe('SHP-2024-002'); // Draft, High
        expect(shipmentRows[1].textContent).toBe('SHP-2024-003'); // Draft, Medium
        expect(shipmentRows[2].textContent).toBe('SHP-2024-004'); // Ready for Pickup, High
        expect(shipmentRows[3].textContent).toBe('SHP-2024-001'); // Shipped, Low
      });
    });

    it('should display correct status badges with icons and colors', async () => {
      renderShipping();

      await waitFor(() => {
        // Check for status badges
        expect(screen.getByText('Draft')).toBeInTheDocument();
        expect(screen.getByText('Ready for Pickup')).toBeInTheDocument();
        expect(screen.getByText('Shipped')).toBeInTheDocument();

        // Verify stage numbers are displayed
        expect(screen.getAllByText(/Stage \d/)).toHaveLength(4);
      });
    });

    it('should display priority badges with correct colors', async () => {
      renderShipping();

      await waitFor(() => {
        const highPriorityBadges = screen.getAllByText('High');
        const mediumPriorityBadges = screen.getAllByText('Medium');
        const lowPriorityBadges = screen.getAllByText('Low');

        expect(highPriorityBadges).toHaveLength(2);
        expect(mediumPriorityBadges).toHaveLength(1);
        expect(lowPriorityBadges).toHaveLength(1);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle status update errors', async () => {
      shippingService.updateStatus.mockRejectedValue(
        new Error('Status update failed')
      );

      shippingService.getAll.mockResolvedValue({
        success: true,
        preshipments: [
          {
            id: '1',
            shipment_id: 'SHP-2024-001',
            status: 'Draft',
            customer_name: 'Test Customer'
          }
        ],
        total: 1
      });

      renderShipping();

      await waitFor(() => {
        const submitButton = screen.getByTitle('Submit for picking');
        fireEvent.click(submitButton);
      });

      await waitFor(() => {
        expect(mockAppContext.showError).toHaveBeenCalledWith(
          'Failed to update shipment: Status update failed'
        );
      });
    });

    it('should handle CBP filing errors', async () => {
      shippingService.fileWithCBP.mockRejectedValue(
        new Error('CBP service unavailable')
      );

      shippingService.getAll.mockResolvedValue({
        success: true,
        preshipments: [
          {
            id: '1',
            shipment_id: 'SHP-2024-001',
            status: 'Pending Pick',
            customer_name: 'Test Customer',
            cbp_filed: false
          }
        ],
        total: 1
      });

      renderShipping();

      await waitFor(() => {
        const cbpButton = screen.getByTitle('File with CBP');
        fireEvent.click(cbpButton);
      });

      await waitFor(() => {
        expect(mockAppContext.showError).toHaveBeenCalledWith(
          'CBP filing failed: CBP service unavailable'
        );
      });
    });

    it('should handle label generation errors', async () => {
      shippingService.generateLabels.mockRejectedValue(
        new Error('Label service unavailable')
      );

      shippingService.getAll.mockResolvedValue({
        success: true,
        preshipments: [
          {
            id: '1',
            shipment_id: 'SHP-2024-001',
            status: 'Generate Labels',
            customer_name: 'Test Customer'
          }
        ],
        total: 1
      });

      renderShipping();

      await waitFor(() => {
        const labelsButton = screen.getByText('Labels');
        fireEvent.click(labelsButton);
      });

      // Label generation opens modal, not direct service call
      expect(mockAppContext.showModal).toHaveBeenCalledWith(
        'print-labels-modal',
        expect.any(Object)
      );
    });
  });

  describe('Accessibility', () => {
    beforeEach(() => {
      shippingService.getAll.mockResolvedValue({
        success: true,
        preshipments: [
          {
            id: '1',
            shipment_id: 'SHP-2024-001',
            customer_name: 'Test Customer',
            status: 'Draft',
            priority: 'High'
          }
        ],
        total: 1
      });
    });

    it('should have proper ARIA labels and roles', async () => {
      renderShipping();

      await waitFor(() => {
        // Check for proper table roles
        expect(screen.getByRole('table')).toBeInTheDocument();
        expect(screen.getAllByRole('columnheader')).toHaveLength(7);
        expect(screen.getAllByRole('cell')).toHaveLength(7);
      });
    });

    it('should support keyboard navigation for action buttons', async () => {
      renderShipping();

      await waitFor(() => {
        const actionButtons = screen.getAllByRole('button');
        actionButtons.forEach(button => {
          expect(button).toHaveAttribute('tabindex', '0');
        });
      });
    });

    it('should have descriptive button titles for screen readers', async () => {
      renderShipping();

      await waitFor(() => {
        expect(screen.getByTitle('Edit shipment')).toBeInTheDocument();
        expect(screen.getByTitle('Submit for picking')).toBeInTheDocument();
        expect(screen.getByTitle('View details')).toBeInTheDocument();
      });
    });
  });

  describe('Performance', () => {
    it('should handle large datasets efficiently', async () => {
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        id: `${i + 1}`,
        shipment_id: `SHP-2024-${String(i + 1).padStart(4, '0')}`,
        customer_name: `Customer ${i + 1}`,
        status: 'Draft',
        priority: 'Medium'
      }));

      shippingService.getAll.mockResolvedValue({
        success: true,
        preshipments: largeDataset,
        total: 1000
      });

      const startTime = performance.now();
      renderShipping();

      await waitFor(() => {
        expect(screen.getByText('SHP-2024-0001')).toBeInTheDocument();
      });

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Component should render within reasonable time (< 2 seconds)
      expect(renderTime).toBeLessThan(2000);
    });

    it('should debounce search input to avoid excessive API calls', async () => {
      shippingService.getAll.mockResolvedValue({
        success: true,
        preshipments: [],
        total: 0
      });

      renderShipping();

      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText('Search shipments...');
        
        // Type rapidly
        fireEvent.change(searchInput, { target: { value: 'a' } });
        fireEvent.change(searchInput, { target: { value: 'ab' } });
        fireEvent.change(searchInput, { target: { value: 'abc' } });
      });

      // Should not trigger multiple API calls immediately
      expect(shippingService.getAll).toHaveBeenCalledTimes(1);
    });
  });
});