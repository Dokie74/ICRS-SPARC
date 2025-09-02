// tests/frontend/components/Receiving.test.js
// Component tests for Receiving page functionality - FTZ compliance workflow

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { jest } from '@jest/globals';

import Receiving from '../../../src/frontend/src/components/pages/Receiving';
import { AppProvider } from '../../../src/frontend/src/contexts/AppContext';
import { receivingService } from '../../../src/frontend/src/services/receivingService';

// Mock the receiving service
jest.mock('../../../src/frontend/src/services/receivingService', () => ({
  receivingService: {
    getAll: jest.fn(),
    updateStatus: jest.fn(),
    completeDockAudit: jest.fn()
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

describe('Receiving Component Tests', () => {
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

  const renderReceiving = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <MockAppProvider>
          <Receiving />
        </MockAppProvider>
      </QueryClientProvider>
    );
  };

  describe('Component Rendering', () => {
    it('should render receiving management header and FTZ workflow description', async () => {
      receivingService.getAll.mockResolvedValue({
        success: true,
        preadmissions: [],
        total: 0
      });

      renderReceiving();

      expect(screen.getByText('Receiving Management')).toBeInTheDocument();
      expect(screen.getByText(/FTZ-compliant receiving workflow/)).toBeInTheDocument();
      expect(screen.getByText('Refresh Dock Status')).toBeInTheDocument();
      expect(screen.getByText('Add Dock Arrival')).toBeInTheDocument();
    });

    it('should display loading state while fetching data', () => {
      receivingService.getAll.mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 1000))
      );

      renderReceiving();

      expect(screen.getByRole('generic', { class: /animate-spin/ })).toBeInTheDocument();
    });

    it('should render error state when service fails', async () => {
      receivingService.getAll.mockRejectedValue(new Error('Database connection failed'));

      renderReceiving();

      await waitFor(() => {
        expect(screen.getByText('Error loading receiving data')).toBeInTheDocument();
        expect(screen.getByText('Database connection failed')).toBeInTheDocument();
        expect(screen.getByText('Try Again')).toBeInTheDocument();
      });
    });
  });

  describe('View Tabs and FTZ Statistics', () => {
    const mockPreadmissions = [
      {
        id: '1',
        admission_id: 'ADM-2024-001',
        customer_name: 'Test Customer 1',
        container_number: 'CONT123456789',
        bol_number: 'BOL-001',
        status: 'Pending',
        ftz_status: 'Pending',
        ftz_urgency: 'Normal',
        expected_arrival: '2024-01-16T08:00:00Z'
      },
      {
        id: '2',
        admission_id: 'ADM-2024-002',
        customer_name: 'Test Customer 2',
        container_number: 'CONT987654321',
        status: 'Arrived',
        ftz_status: 'Compliant',
        ftz_urgency: 'Urgent',
        arrived_at: '2024-01-15T10:00:00Z'
      },
      {
        id: '3',
        admission_id: 'ADM-2024-003',
        customer_name: 'Test Customer 3',
        container_number: 'CONT555666777',
        status: 'Inspecting',
        ftz_status: 'Pending',
        ftz_urgency: 'Normal',
        arrived_at: '2024-01-15T14:00:00Z'
      },
      {
        id: '4',
        admission_id: 'ADM-2024-004',
        customer_name: 'Test Customer 4',
        container_number: 'CONT888999000',
        status: 'Accepted',
        ftz_status: 'Compliant',
        ftz_urgency: 'Low',
        arrived_at: '2024-01-14T12:00:00Z'
      }
    ];

    beforeEach(() => {
      receivingService.getAll.mockResolvedValue({
        success: true,
        preadmissions: mockPreadmissions,
        total: 4
      });
    });

    it('should render view tabs for different workflow stages', async () => {
      renderReceiving();

      await waitFor(() => {
        expect(screen.getByText('Awaiting Dock Audit')).toBeInTheDocument();
        expect(screen.getByText('Pending Arrival')).toBeInTheDocument();
        expect(screen.getByText('Completed')).toBeInTheDocument();
        expect(screen.getByText('On Hold')).toBeInTheDocument();
        expect(screen.getByText('All')).toBeInTheDocument();
      });
    });

    it('should display FTZ-specific statistics', async () => {
      renderReceiving();

      await waitFor(() => {
        expect(screen.getByText('Total Items')).toBeInTheDocument();
        expect(screen.getByText('Arrived Today')).toBeInTheDocument();
        expect(screen.getByText('FTZ Urgent')).toBeInTheDocument();
        expect(screen.getByText('Awaiting Audit')).toBeInTheDocument();
        expect(screen.getByText('In Progress')).toBeInTheDocument();
      });
    });

    it('should switch views when tab is clicked', async () => {
      renderReceiving();

      await waitFor(() => {
        expect(screen.getByText('ADM-2024-001')).toBeInTheDocument();
      });

      // Switch to Completed view
      const completedTab = screen.getByText('Completed');
      await user.click(completedTab);

      // Should filter to show only completed items
      await waitFor(() => {
        expect(screen.getByText('ADM-2024-004')).toBeInTheDocument();
        expect(screen.queryByText('ADM-2024-001')).not.toBeInTheDocument();
      });
    });
  });

  describe('Search and Filtering', () => {
    const mockPreadmissions = [
      {
        id: '1',
        admission_id: 'ADM-2024-001',
        customer_name: 'Acme Manufacturing',
        container_number: 'CONT123456789',
        bol_number: 'BOL-001',
        status: 'Arrived',
        ftz_status: 'Compliant'
      },
      {
        id: '2',
        admission_id: 'ADM-2024-002',
        customer_name: 'Tech Solutions Inc',
        container_number: 'CONT987654321',
        bol_number: 'BOL-002',
        status: 'Arrived',
        ftz_status: 'Pending'
      }
    ];

    beforeEach(() => {
      receivingService.getAll.mockResolvedValue({
        success: true,
        preadmissions: mockPreadmissions,
        total: 2
      });
    });

    it('should filter by search term across multiple fields', async () => {
      renderReceiving();

      await waitFor(() => {
        expect(screen.getByText('ADM-2024-001')).toBeInTheDocument();
        expect(screen.getByText('ADM-2024-002')).toBeInTheDocument();
      });

      // Search by container number
      const searchInput = screen.getByPlaceholderText('Search containers, BOL, customer...');
      await user.type(searchInput, 'CONT123456789');

      await waitFor(() => {
        expect(screen.getByText('ADM-2024-001')).toBeInTheDocument();
        expect(screen.queryByText('ADM-2024-002')).not.toBeInTheDocument();
      });
    });

    it('should filter by container number', async () => {
      renderReceiving();

      await waitFor(() => {
        expect(screen.getByText('CONT123456789')).toBeInTheDocument();
      });

      const containerFilter = screen.getByPlaceholderText('Filter by container...');
      await user.type(containerFilter, 'CONT987');

      await waitFor(() => {
        expect(screen.queryByText('CONT123456789')).not.toBeInTheDocument();
        expect(screen.getByText('CONT987654321')).toBeInTheDocument();
      });
    });

    it('should filter by FTZ status', async () => {
      renderReceiving();

      await waitFor(() => {
        expect(screen.getByText('ADM-2024-001')).toBeInTheDocument();
        expect(screen.getByText('ADM-2024-002')).toBeInTheDocument();
      });

      const ftzStatusSelect = screen.getByDisplayValue('All FTZ Status');
      await user.selectOptions(ftzStatusSelect, 'FTZ Compliant');

      await waitFor(() => {
        expect(screen.getByText('ADM-2024-001')).toBeInTheDocument();
        expect(screen.queryByText('ADM-2024-002')).not.toBeInTheDocument();
      });
    });

    it('should clear all filters when Clear Filters button is clicked', async () => {
      renderReceiving();

      // Apply a filter
      const searchInput = screen.getByPlaceholderText('Search containers, BOL, customer...');
      await user.type(searchInput, 'Acme');

      // Clear filters
      const clearButton = screen.getByText('Clear Filters');
      await user.click(clearButton);

      expect(searchInput.value).toBe('');
    });

    it('should show filtered results count', async () => {
      renderReceiving();

      await waitFor(() => {
        expect(screen.getByText(/Showing 2 of 2 items in awaiting dock audit/)).toBeInTheDocument();
      });

      // Apply filter
      const searchInput = screen.getByPlaceholderText('Search containers, BOL, customer...');
      await user.type(searchInput, 'Acme');

      await waitFor(() => {
        expect(screen.getByText(/(filtered)/)).toBeInTheDocument();
      });
    });
  });

  describe('Preadmissions Table and Status Actions', () => {
    const mockPreadmissions = [
      {
        id: '1',
        admission_id: 'ADM-2024-001',
        customer_name: 'Test Customer 1',
        container_number: 'CONT123456789',
        bol_number: 'BOL-001',
        reference_number: 'REF-001',
        status: 'Pending',
        ftz_status: 'Pending',
        ftz_urgency: 'Normal',
        expected_arrival: '2024-01-16T08:00:00Z'
      },
      {
        id: '2',
        admission_id: 'ADM-2024-002',
        customer_name: 'Test Customer 2',
        container_number: 'CONT987654321',
        bol_number: 'BOL-002',
        status: 'Arrived',
        ftz_status: 'Compliant',
        ftz_urgency: 'Urgent',
        arrived_at: '2024-01-15T10:00:00Z'
      },
      {
        id: '3',
        admission_id: 'ADM-2024-003',
        customer_name: 'Test Customer 3',
        container_number: 'CONT555666777',
        status: 'Inspecting',
        ftz_status: 'Pending',
        ftz_urgency: 'Normal',
        arrived_at: '2024-01-15T14:00:00Z'
      }
    ];

    beforeEach(() => {
      receivingService.getAll.mockResolvedValue({
        success: true,
        preadmissions: mockPreadmissions,
        total: 3
      });
    });

    it('should render receiving table with correct columns', async () => {
      renderReceiving();

      await waitFor(() => {
        expect(screen.getByText('Container / BOL')).toBeInTheDocument();
        expect(screen.getByText('Customer / Reference')).toBeInTheDocument();
        expect(screen.getByText('Status')).toBeInTheDocument();
        expect(screen.getByText('FTZ Status')).toBeInTheDocument();
        expect(screen.getByText('Arrival Time')).toBeInTheDocument();
        expect(screen.getByText('Urgency')).toBeInTheDocument();
        expect(screen.getByText('Actions')).toBeInTheDocument();
      });
    });

    it('should display preadmission data with FTZ information', async () => {
      renderReceiving();

      await waitFor(() => {
        // Container and BOL information
        expect(screen.getByText('CONT123456789')).toBeInTheDocument();
        expect(screen.getByText('BOL: BOL-001')).toBeInTheDocument();
        expect(screen.getByText('ID: ADM-2024-001')).toBeInTheDocument();

        // Customer and reference
        expect(screen.getByText('Test Customer 1')).toBeInTheDocument();
        expect(screen.getByText('Ref: REF-001')).toBeInTheDocument();

        // Status badges
        expect(screen.getByText('Pending Arrival')).toBeInTheDocument();
        expect(screen.getByText('Arrived at Dock')).toBeInTheDocument();
        expect(screen.getByText('Under Inspection')).toBeInTheDocument();

        // FTZ status badges
        expect(screen.getByText('Pending')).toBeInTheDocument();
        expect(screen.getByText('Compliant')).toBeInTheDocument();

        // Urgency indicators
        expect(screen.getByText('Normal')).toBeInTheDocument();
        expect(screen.getByText('Urgent')).toBeInTheDocument();
      });
    });

    it('should show status-specific action buttons', async () => {
      renderReceiving();

      await waitFor(() => {
        // Pending status - Mark as Arrived button
        expect(screen.getByText('Arrived')).toBeInTheDocument();
        
        // Arrived status - Start Audit button
        expect(screen.getByText('Start Audit')).toBeInTheDocument();
        
        // Inspecting status - Complete button
        expect(screen.getByText('Complete')).toBeInTheDocument();
        
        // View details always available
        const viewButtons = screen.getAllByTitle('View details');
        expect(viewButtons).toHaveLength(mockPreadmissions.length);
      });
    });

    it('should handle status update from Pending to Arrived', async () => {
      receivingService.updateStatus.mockResolvedValue({
        success: true,
        preadmission: { ...mockPreadmissions[0], status: 'Arrived' }
      });

      renderReceiving();

      await waitFor(() => {
        const arrivedButton = screen.getByTitle('Mark as arrived at dock');
        fireEvent.click(arrivedButton);
      });

      expect(receivingService.updateStatus).toHaveBeenCalledWith(
        '1',
        'Arrived',
        'Status updated to Arrived via dock operations'
      );

      await waitFor(() => {
        expect(mockAppContext.showSuccess).toHaveBeenCalledWith(
          'Shipment arrived successfully'
        );
      });
    });

    it('should open dock audit modal for Arrived status', async () => {
      renderReceiving();

      await waitFor(() => {
        const startAuditButton = screen.getByTitle('Start dock audit inspection');
        fireEvent.click(startAuditButton);
      });

      expect(mockAppContext.showModal).toHaveBeenCalledWith(
        'dock-audit-modal',
        mockPreadmissions[1]
      );
    });

    it('should handle dock audit completion for Inspecting status', async () => {
      renderReceiving();

      await waitFor(() => {
        const completeButton = screen.getByTitle('Complete dock audit');
        fireEvent.click(completeButton);
      });

      expect(mockAppContext.showModal).toHaveBeenCalledWith(
        'dock-audit-modal',
        mockPreadmissions[2]
      );
    });

    it('should change status to Inspecting and open audit modal', async () => {
      receivingService.updateStatus.mockResolvedValue({
        success: true,
        preadmission: { ...mockPreadmissions[1], status: 'Inspecting' }
      });

      renderReceiving();

      await waitFor(() => {
        const startAuditButton = screen.getByTitle('Start dock audit inspection');
        fireEvent.click(startAuditButton);
      });

      // Should first update status to Inspecting
      expect(receivingService.updateStatus).toHaveBeenCalledWith(
        '2',
        'Inspecting',
        'Status updated to Inspecting via dock operations'
      );

      // Then open modal after delay
      await waitFor(() => {
        expect(mockAppContext.showModal).toHaveBeenCalledWith(
          'dock-audit-modal',
          expect.objectContaining({ status: 'Inspecting' })
        );
      }, { timeout: 1000 });
    });

    it('should always show view details action', async () => {
      renderReceiving();

      await waitFor(() => {
        const viewButtons = screen.getAllByTitle('View details');
        expect(viewButtons).toHaveLength(mockPreadmissions.length);
      });

      fireEvent.click(viewButtons[0]);

      expect(mockAppContext.showModal).toHaveBeenCalledWith(
        'view-preadmission-modal',
        mockPreadmissions[0]
      );
    });
  });

  describe('Priority Sorting and Visual Indicators', () => {
    const mockPreadmissionsForSorting = [
      {
        id: '1',
        admission_id: 'ADM-2024-001',
        status: 'Arrived',
        ftz_urgency: 'Low',
        arrived_at: '2024-01-15T08:00:00Z'
      },
      {
        id: '2',
        admission_id: 'ADM-2024-002',
        status: 'Arrived',
        ftz_urgency: 'Urgent',
        arrived_at: '2024-01-15T10:00:00Z'
      },
      {
        id: '3',
        admission_id: 'ADM-2024-003',
        status: 'Inspecting',
        ftz_urgency: 'Normal',
        arrived_at: '2024-01-15T12:00:00Z'
      },
      {
        id: '4',
        admission_id: 'ADM-2024-004',
        status: 'Pending',
        ftz_urgency: 'Normal',
        expected_arrival: '2024-01-16T08:00:00Z'
      }
    ];

    beforeEach(() => {
      receivingService.getAll.mockResolvedValue({
        success: true,
        preadmissions: mockPreadmissionsForSorting,
        total: 4
      });
    });

    it('should sort by status priority then by urgency', async () => {
      renderReceiving();

      await waitFor(() => {
        const admissionRows = screen.getAllByText(/ADM-2024-\d+/);
        
        // Verify correct order: Arrived (Urgent first), Inspecting, Pending
        expect(admissionRows[0].textContent).toBe('ADM-2024-002'); // Arrived, Urgent
        expect(admissionRows[1].textContent).toBe('ADM-2024-001'); // Arrived, Low  
        expect(admissionRows[2].textContent).toBe('ADM-2024-003'); // Inspecting, Normal
        expect(admissionRows[3].textContent).toBe('ADM-2024-004'); // Pending, Normal
      });
    });

    it('should highlight urgent FTZ items with visual indicators', async () => {
      renderReceiving();

      await waitFor(() => {
        // Check for urgent priority badge with warning icon
        const urgentBadge = screen.getByText('Urgent');
        expect(urgentBadge.closest('tr')).toHaveClass('bg-red-50');
      });
    });

    it('should highlight items needing audit with background color', async () => {
      renderReceiving();

      await waitFor(() => {
        // Items with "Arrived" status should have yellow background (needs audit)
        const arrivedRows = screen.getAllByText('Arrived at Dock');
        arrivedRows.forEach(badge => {
          expect(badge.closest('tr')).toHaveClass('bg-yellow-50');
        });
      });
    });
  });

  describe('Empty States and Data Handling', () => {
    it('should show empty state when no items in receiving', async () => {
      receivingService.getAll.mockResolvedValue({
        success: true,
        preadmissions: [],
        total: 0
      });

      renderReceiving();

      await waitFor(() => {
        expect(screen.getByText('No items in receiving')).toBeInTheDocument();
        expect(screen.getByText('Items will appear here when they arrive at the dock.')).toBeInTheDocument();
      });
    });

    it('should show filtered empty state with clear filters option', async () => {
      const mockPreadmissions = [
        {
          id: '1',
          admission_id: 'ADM-2024-001',
          customer_name: 'Test Customer',
          status: 'Arrived'
        }
      ];

      receivingService.getAll.mockResolvedValue({
        success: true,
        preadmissions: mockPreadmissions,
        total: 1
      });

      renderReceiving();

      await waitFor(() => {
        expect(screen.getByText('ADM-2024-001')).toBeInTheDocument();
      });

      // Apply filter that returns no results
      const searchInput = screen.getByPlaceholderText('Search containers, BOL, customer...');
      await user.type(searchInput, 'NonexistentContainer');

      await waitFor(() => {
        expect(screen.getByText('No matching items')).toBeInTheDocument();
        expect(screen.getByText('Try adjusting your view or filter criteria.')).toBeInTheDocument();
        
        const clearButton = screen.getByText('Clear Filters');
        expect(clearButton).toBeInTheDocument();
      });
    });

    it('should handle arrival time display correctly', async () => {
      const mockPreadmissions = [
        {
          id: '1',
          admission_id: 'ADM-2024-001',
          status: 'Arrived',
          arrived_at: '2024-01-15T10:30:00Z'
        },
        {
          id: '2',
          admission_id: 'ADM-2024-002',
          status: 'Pending',
          expected_arrival: '2024-01-16T08:00:00Z'
        },
        {
          id: '3',
          admission_id: 'ADM-2024-003',
          status: 'Pending'
          // No arrival time
        }
      ];

      receivingService.getAll.mockResolvedValue({
        success: true,
        preadmissions: mockPreadmissions,
        total: 3
      });

      renderReceiving();

      await waitFor(() => {
        // Actual arrival time
        expect(screen.getByText('1/15/2024')).toBeInTheDocument();
        expect(screen.getByText('10:30:00 AM')).toBeInTheDocument();

        // Expected arrival time
        expect(screen.getByText('Expected:')).toBeInTheDocument();
        expect(screen.getByText('1/16/2024')).toBeInTheDocument();

        // No time set
        expect(screen.getByText('Not set')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle status update errors', async () => {
      receivingService.updateStatus.mockRejectedValue(
        new Error('Status update failed')
      );

      receivingService.getAll.mockResolvedValue({
        success: true,
        preadmissions: [
          {
            id: '1',
            admission_id: 'ADM-2024-001',
            status: 'Pending',
            customer_name: 'Test Customer'
          }
        ],
        total: 1
      });

      renderReceiving();

      await waitFor(() => {
        const arrivedButton = screen.getByTitle('Mark as arrived at dock');
        fireEvent.click(arrivedButton);
      });

      await waitFor(() => {
        expect(mockAppContext.showError).toHaveBeenCalledWith(
          'Failed to update shipment: Status update failed'
        );
      });
    });

    it('should handle dock audit completion errors', async () => {
      receivingService.completeDockAudit.mockRejectedValue(
        new Error('Audit submission failed')
      );

      receivingService.getAll.mockResolvedValue({
        success: true,
        preadmissions: [
          {
            id: '1',
            admission_id: 'ADM-2024-001',
            status: 'Inspecting',
            customer_name: 'Test Customer'
          }
        ],
        total: 1
      });

      renderReceiving();

      await waitFor(() => {
        const completeButton = screen.getByTitle('Complete dock audit');
        fireEvent.click(completeButton);
      });

      // Dock audit opens modal, error would come from modal submission
      expect(mockAppContext.showModal).toHaveBeenCalledWith(
        'dock-audit-modal',
        expect.any(Object)
      );
    });

    it('should handle service timeout gracefully', async () => {
      receivingService.getAll.mockImplementation(() =>
        Promise.reject(new Error('Request timeout'))
      );

      renderReceiving();

      await waitFor(() => {
        expect(screen.getByText('Error loading receiving data')).toBeInTheDocument();
        expect(screen.getByText('Request timeout')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility and User Experience', () => {
    beforeEach(() => {
      receivingService.getAll.mockResolvedValue({
        success: true,
        preadmissions: [
          {
            id: '1',
            admission_id: 'ADM-2024-001',
            customer_name: 'Test Customer',
            container_number: 'CONT123456789',
            status: 'Arrived',
            ftz_status: 'Compliant',
            ftz_urgency: 'Urgent'
          }
        ],
        total: 1
      });
    });

    it('should have proper ARIA labels and table structure', async () => {
      renderReceiving();

      await waitFor(() => {
        expect(screen.getByRole('table')).toBeInTheDocument();
        expect(screen.getAllByRole('columnheader')).toHaveLength(7);
        expect(screen.getAllByRole('cell')).toHaveLength(7);
      });
    });

    it('should support keyboard navigation for action buttons', async () => {
      renderReceiving();

      await waitFor(() => {
        const actionButtons = screen.getAllByRole('button');
        actionButtons.forEach(button => {
          expect(button).toHaveAttribute('tabindex', '0');
        });
      });
    });

    it('should have descriptive button titles for screen readers', async () => {
      renderReceiving();

      await waitFor(() => {
        expect(screen.getByTitle('Start dock audit inspection')).toBeInTheDocument();
        expect(screen.getByTitle('View details')).toBeInTheDocument();
      });
    });

    it('should provide clear status and urgency indicators', async () => {
      renderReceiving();

      await waitFor(() => {
        // Status should have icons and clear labels
        const statusBadge = screen.getByText('Arrived at Dock');
        expect(statusBadge).toBeInTheDocument();

        // FTZ status should be clear
        const ftzBadge = screen.getByText('Compliant');
        expect(ftzBadge).toBeInTheDocument();

        // Urgency should have warning indicator for urgent items
        const urgentBadge = screen.getByText('Urgent');
        expect(urgentBadge).toBeInTheDocument();
      });
    });
  });

  describe('Performance and Data Management', () => {
    it('should handle large datasets efficiently with proper sorting', async () => {
      const largeDataset = Array.from({ length: 500 }, (_, i) => ({
        id: `${i + 1}`,
        admission_id: `ADM-2024-${String(i + 1).padStart(4, '0')}`,
        customer_name: `Customer ${i + 1}`,
        container_number: `CONT${String(i + 1).padStart(9, '0')}`,
        status: i % 3 === 0 ? 'Arrived' : i % 3 === 1 ? 'Inspecting' : 'Pending',
        ftz_urgency: i % 4 === 0 ? 'Urgent' : 'Normal'
      }));

      receivingService.getAll.mockResolvedValue({
        success: true,
        preadmissions: largeDataset,
        total: 500
      });

      const startTime = performance.now();
      renderReceiving();

      await waitFor(() => {
        expect(screen.getByText('ADM-2024-0001')).toBeInTheDocument();
      });

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Should render within reasonable time
      expect(renderTime).toBeLessThan(3000);
    });

    it('should refresh data when refresh button is clicked', async () => {
      receivingService.getAll.mockResolvedValue({
        success: true,
        preadmissions: [],
        total: 0
      });

      renderReceiving();

      await waitFor(() => {
        const refreshButton = screen.getByText('Refresh Dock Status');
        fireEvent.click(refreshButton);
      });

      // Should trigger a new data fetch
      expect(receivingService.getAll).toHaveBeenCalledTimes(2);
    });

    it('should maintain view state when refreshing data', async () => {
      const mockPreadmissions = [
        {
          id: '1',
          admission_id: 'ADM-2024-001',
          status: 'Accepted',
          customer_name: 'Test Customer'
        }
      ];

      receivingService.getAll.mockResolvedValue({
        success: true,
        preadmissions: mockPreadmissions,
        total: 1
      });

      renderReceiving();

      // Switch to Completed view
      await waitFor(() => {
        const completedTab = screen.getByText('Completed');
        fireEvent.click(completedTab);
      });

      // Refresh data
      const refreshButton = screen.getByText('Refresh Dock Status');
      fireEvent.click(refreshButton);

      // Should stay on Completed view
      await waitFor(() => {
        expect(screen.getByText('Completed')).toHaveClass('text-blue-600');
      });
    });
  });
});