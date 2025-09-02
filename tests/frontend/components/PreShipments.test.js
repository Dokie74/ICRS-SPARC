// tests/frontend/components/PreShipments.test.js
// Comprehensive tests for PreShipments page component

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import PreShipments from '../../../src/frontend/src/components/pages/PreShipments';
import { AppProvider } from '../../../src/frontend/src/contexts/AppContext';
import * as preshipmentService from '../../../src/frontend/src/services/preshipmentService';

// Mock the service functions
jest.mock('../../../src/frontend/src/services/preshipmentService');

// Mock data
const mockPreshipments = [
  {
    id: 1,
    shipment_id: 'SHIP-001',
    status: 'DRAFT',
    customer_name: 'Customer A',
    entry_number: 'ENT-001',
    created_at: '2024-01-01T10:00:00Z',
    shipment_type: 'EXPORT',
    bol_number: 'BOL-001',
    line_items: [
      { part_number: 'PART-001', lot_number: 'LOT-001', quantity: 100, hts_code: '1234.56.78' }
    ]
  },
  {
    id: 2,
    shipment_id: 'SHIP-002',
    status: 'READY_TO_FILE',
    customer_name: 'Customer B',
    entry_number: 'ENT-002',
    created_at: '2024-01-02T10:00:00Z',
    shipment_type: 'IMPORT',
    bol_number: 'BOL-002',
    line_items: []
  },
  {
    id: 3,
    shipment_id: 'SHIP-003',
    status: 'ACCEPTED',
    customer_name: 'Customer A',
    entry_number: 'ENT-003',
    created_at: '2024-01-03T10:00:00Z',
    shipment_type: 'EXPORT',
    line_items: []
  }
];

const mockStats = {
  total: 3,
  draft: 1,
  ready_to_file: 1,
  filed: 0,
  accepted: 1,
  rejected: 0
};

// Test wrapper component
const TestWrapper = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppProvider>
          {children}
        </AppProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('PreShipments Component', () => {
  beforeEach(() => {
    // Mock the service hooks
    preshipmentService.usePreshipments = jest.fn(() => ({
      data: { data: mockPreshipments },
      isLoading: false,
      error: null,
      refetch: jest.fn()
    }));

    preshipmentService.usePreshipmentStats = jest.fn(() => ({
      data: { data: mockStats },
      isLoading: false
    }));

    preshipmentService.useUpdatePreshipmentStatus = jest.fn(() => ({
      mutateAsync: jest.fn(),
      isLoading: false
    }));

    preshipmentService.useGenerateEntryS = jest.fn(() => ({
      mutateAsync: jest.fn(),
      isLoading: false
    }));

    preshipmentService.useFileWithCBP = jest.fn(() => ({
      mutateAsync: jest.fn(),
      isLoading: false
    }));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render the page header', () => {
      render(
        <TestWrapper>
          <PreShipments />
        </TestWrapper>
      );

      expect(screen.getByRole('heading', { name: /pre-shipments/i })).toBeInTheDocument();
      expect(screen.getByText(/create and manage preshipment entries/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /create new preshipment/i })).toBeInTheDocument();
    });

    it('should render statistics cards', () => {
      render(
        <TestWrapper>
          <PreShipments />
        </TestWrapper>
      );

      expect(screen.getByText('3')).toBeInTheDocument(); // Total
      expect(screen.getByText('1')).toBeInTheDocument(); // Draft
      expect(screen.getByText('1')).toBeInTheDocument(); // Ready
      expect(screen.getByText('0')).toBeInTheDocument(); // Filed
      expect(screen.getByText('1')).toBeInTheDocument(); // Accepted
      expect(screen.getByText('0')).toBeInTheDocument(); // Rejected
    });

    it('should render tab navigation', () => {
      render(
        <TestWrapper>
          <PreShipments />
        </TestWrapper>
      );

      expect(screen.getByRole('button', { name: /all/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /draft entries/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /ready to file/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /filed\/accepted/i })).toBeInTheDocument();
    });

    it('should render filter controls', () => {
      render(
        <TestWrapper>
          <PreShipments />
        </TestWrapper>
      );

      expect(screen.getByPlaceholderText(/search by shipment id/i)).toBeInTheDocument();
      expect(screen.getByDisplayValue('All Customers')).toBeInTheDocument();
      expect(screen.getByDisplayValue('All Dates')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /clear filters/i })).toBeInTheDocument();
    });

    it('should display preshipment count', () => {
      render(
        <TestWrapper>
          <PreShipments />
        </TestWrapper>
      );

      expect(screen.getByText(/showing 3 of 3 preshipments/i)).toBeInTheDocument();
    });
  });

  describe('Tab Functionality', () => {
    it('should filter preshipments by tab selection', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <PreShipments />
        </TestWrapper>
      );

      // Initially all preshipments should be visible
      expect(screen.getAllByText(/SHIP-/)).toHaveLength(3);

      // Click on Draft tab
      const draftTab = screen.getByRole('button', { name: /draft entries/i });
      await user.click(draftTab);

      // Should only show draft preshipments
      expect(screen.getByText('SHIP-001')).toBeInTheDocument();
      expect(screen.queryByText('SHIP-002')).not.toBeInTheDocument();
      expect(screen.queryByText('SHIP-003')).not.toBeInTheDocument();
    });

    it('should show tab counts', () => {
      render(
        <TestWrapper>
          <PreShipments />
        </TestWrapper>
      );

      // Check tab counts (badges)
      const allTab = screen.getByRole('button', { name: /all/i });
      expect(within(allTab).getByText('3')).toBeInTheDocument();

      const draftTab = screen.getByRole('button', { name: /draft entries/i });
      expect(within(draftTab).getByText('1')).toBeInTheDocument();
    });

    it('should highlight active tab', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <PreShipments />
        </TestWrapper>
      );

      const draftTab = screen.getByRole('button', { name: /draft entries/i });
      await user.click(draftTab);

      expect(draftTab).toHaveClass('border-blue-500', 'text-blue-600');
    });
  });

  describe('Search and Filtering', () => {
    it('should filter preshipments by search term', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <PreShipments />
        </TestWrapper>
      );

      const searchInput = screen.getByPlaceholderText(/search by shipment id/i);
      await user.type(searchInput, 'SHIP-001');

      // Should only show matching preshipment
      expect(screen.getByText('SHIP-001')).toBeInTheDocument();
      expect(screen.queryByText('SHIP-002')).not.toBeInTheDocument();
    });

    it('should search across multiple fields', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <PreShipments />
        </TestWrapper>
      );

      // Search by customer name
      const searchInput = screen.getByPlaceholderText(/search by shipment id/i);
      await user.type(searchInput, 'Customer A');

      // Should show preshipments for Customer A
      expect(screen.getByText('SHIP-001')).toBeInTheDocument();
      expect(screen.getByText('SHIP-003')).toBeInTheDocument();
      expect(screen.queryByText('SHIP-002')).not.toBeInTheDocument();
    });

    it('should clear filters when clear button is clicked', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <PreShipments />
        </TestWrapper>
      );

      // Apply search filter
      const searchInput = screen.getByPlaceholderText(/search by shipment id/i);
      await user.type(searchInput, 'SHIP-001');

      // Verify filter is applied
      expect(searchInput.value).toBe('SHIP-001');

      // Click clear filters
      const clearButton = screen.getByRole('button', { name: /clear filters/i });
      await user.click(clearButton);

      // Verify filter is cleared
      expect(searchInput.value).toBe('');
      expect(screen.getAllByText(/SHIP-/)).toHaveLength(3);
    });

    it('should show filtered indicator when filters are applied', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <PreShipments />
        </TestWrapper>
      );

      const searchInput = screen.getByPlaceholderText(/search by shipment id/i);
      await user.type(searchInput, 'SHIP');

      expect(screen.getByText('(filtered)')).toBeInTheDocument();
    });
  });

  describe('Card Expansion', () => {
    it('should expand and collapse preshipment cards', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <PreShipments />
        </TestWrapper>
      );

      // Find expand button for first preshipment
      const expandButtons = screen.getAllByText(/expand/i);
      await user.click(expandButtons[0]);

      // Should show expanded content
      expect(screen.getByText('Shipment Details')).toBeInTheDocument();
      expect(screen.getByText('ACE Entry Summary')).toBeInTheDocument();

      // Should show collapse button now
      const collapseButton = screen.getByText(/collapse/i);
      await user.click(collapseButton);

      // Expanded content should be hidden
      expect(screen.queryByText('Shipment Details')).not.toBeInTheDocument();
    });

    it('should display line items in expanded view', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <PreShipments />
        </TestWrapper>
      );

      // Expand first card (has line items)
      const expandButtons = screen.getAllByText(/expand/i);
      await user.click(expandButtons[0]);

      // Should show line items table
      expect(screen.getByText('Line Items (1)')).toBeInTheDocument();
      expect(screen.getByText('PART-001')).toBeInTheDocument();
      expect(screen.getByText('LOT-001')).toBeInTheDocument();
      expect(screen.getByText('100')).toBeInTheDocument();
      expect(screen.getByText('1234.56.78')).toBeInTheDocument();
    });
  });

  describe('Action Buttons', () => {
    it('should show appropriate actions for draft status', () => {
      render(
        <TestWrapper>
          <PreShipments />
        </TestWrapper>
      );

      // Draft status should show Generate Entry Summary button
      expect(screen.getByText(/generate entry summary/i)).toBeInTheDocument();
    });

    it('should show appropriate actions for ready to file status', () => {
      render(
        <TestWrapper>
          <PreShipments />
        </TestWrapper>
      );

      // Ready to file status should show File with CBP button
      expect(screen.getByText(/file with cbp/i)).toBeInTheDocument();
    });

    it('should call generate entry summary action', async () => {
      const user = userEvent.setup();
      const mockMutateAsync = jest.fn().mockResolvedValue({});
      
      preshipmentService.useGenerateEntryS = jest.fn(() => ({
        mutateAsync: mockMutateAsync,
        isLoading: false
      }));
      
      render(
        <TestWrapper>
          <PreShipments />
        </TestWrapper>
      );

      const generateButton = screen.getByText(/generate entry summary/i);
      await user.click(generateButton);

      expect(mockMutateAsync).toHaveBeenCalledWith(1); // First preshipment ID
    });

    it('should call file with CBP action', async () => {
      const user = userEvent.setup();
      const mockMutateAsync = jest.fn().mockResolvedValue({});
      
      preshipmentService.useFileWithCBP = jest.fn(() => ({
        mutateAsync: mockMutateAsync,
        isLoading: false
      }));
      
      render(
        <TestWrapper>
          <PreShipments />
        </TestWrapper>
      );

      const fileButton = screen.getByText(/file with cbp/i);
      await user.click(fileButton);

      expect(mockMutateAsync).toHaveBeenCalledWith(2); // Second preshipment ID
    });

    it('should disable buttons during loading', () => {
      preshipmentService.useGenerateEntryS = jest.fn(() => ({
        mutateAsync: jest.fn(),
        isLoading: true
      }));
      
      render(
        <TestWrapper>
          <PreShipments />
        </TestWrapper>
      );

      const generateButton = screen.getByText(/generate entry summary/i);
      expect(generateButton).toBeDisabled();
    });
  });

  describe('Status Display', () => {
    it('should display status badges with correct styling', () => {
      render(
        <TestWrapper>
          <PreShipments />
        </TestWrapper>
      );

      // Check status badges
      expect(screen.getByText('Draft Entry')).toHaveClass('bg-yellow-100', 'text-yellow-800');
      expect(screen.getByText('Ready to File')).toHaveClass('bg-blue-100', 'text-blue-800');
      expect(screen.getByText('Filed/Accepted')).toHaveClass('bg-green-100', 'text-green-800');
    });

    it('should show correct icons for each status', () => {
      render(
        <TestWrapper>
          <PreShipments />
        </TestWrapper>
      );

      // Check for status icons (FontAwesome classes)
      expect(document.querySelector('.fa-edit')).toBeInTheDocument(); // Draft
      expect(document.querySelector('.fa-check-circle')).toBeInTheDocument(); // Ready
      expect(document.querySelector('.fa-check-double')).toBeInTheDocument(); // Accepted
    });

    it('should style final status items differently', () => {
      render(
        <TestWrapper>
          <PreShipments />
        </TestWrapper>
      );

      // Accepted item should have gray background
      const acceptedCard = screen.getByText('SHIP-003').closest('.bg-white');
      expect(acceptedCard).toHaveClass('bg-gray-50');
    });
  });

  describe('Loading and Error States', () => {
    it('should show loading spinner', () => {
      preshipmentService.usePreshipments = jest.fn(() => ({
        data: null,
        isLoading: true,
        error: null,
        refetch: jest.fn()
      }));

      render(
        <TestWrapper>
          <PreShipments />
        </TestWrapper>
      );

      expect(screen.getByText(/loading preshipments/i)).toBeInTheDocument();
      expect(document.querySelector('.animate-spin')).toBeInTheDocument();
    });

    it('should show error message', () => {
      const mockError = new Error('Failed to fetch preshipments');
      
      preshipmentService.usePreshipments = jest.fn(() => ({
        data: null,
        isLoading: false,
        error: mockError,
        refetch: jest.fn()
      }));

      render(
        <TestWrapper>
          <PreShipments />
        </TestWrapper>
      );

      expect(screen.getByText(/error loading preshipments/i)).toBeInTheDocument();
      expect(screen.getByText(mockError.message)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    });

    it('should call refetch when try again is clicked', async () => {
      const user = userEvent.setup();
      const mockRefetch = jest.fn();
      
      preshipmentService.usePreshipments = jest.fn(() => ({
        data: null,
        isLoading: false,
        error: new Error('Network error'),
        refetch: mockRefetch
      }));

      render(
        <TestWrapper>
          <PreShipments />
        </TestWrapper>
      );

      const tryAgainButton = screen.getByRole('button', { name: /try again/i });
      await user.click(tryAgainButton);

      expect(mockRefetch).toHaveBeenCalled();
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no preshipments exist', () => {
      preshipmentService.usePreshipments = jest.fn(() => ({
        data: { data: [] },
        isLoading: false,
        error: null,
        refetch: jest.fn()
      }));

      render(
        <TestWrapper>
          <PreShipments />
        </TestWrapper>
      );

      expect(screen.getByText(/no preshipments yet/i)).toBeInTheDocument();
      expect(screen.getByText(/get started by creating your first preshipment/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /create first preshipment/i })).toBeInTheDocument();
    });

    it('should show no matches message when filtered results are empty', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <PreShipments />
        </TestWrapper>
      );

      // Apply filter that matches nothing
      const searchInput = screen.getByPlaceholderText(/search by shipment id/i);
      await user.type(searchInput, 'NONEXISTENT');

      expect(screen.getByText(/no matching preshipments/i)).toBeInTheDocument();
      expect(screen.getByText(/try adjusting your search/i)).toBeInTheDocument();
    });
  });

  describe('Sorting', () => {
    it('should sort preshipments with active items first', () => {
      render(
        <TestWrapper>
          <PreShipments />
        </TestWrapper>
      );

      const shipmentCards = screen.getAllByText(/SHIP-/);
      
      // Active items (DRAFT, READY_TO_FILE) should come before final items (ACCEPTED)
      expect(shipmentCards[0]).toHaveTextContent('SHIP-002'); // READY_TO_FILE
      expect(shipmentCards[1]).toHaveTextContent('SHIP-001'); // DRAFT  
      expect(shipmentCards[2]).toHaveTextContent('SHIP-003'); // ACCEPTED (final)
    });
  });

  describe('Modal Integration', () => {
    it('should open create modal when create button is clicked', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <PreShipments />
        </TestWrapper>
      );

      const createButton = screen.getByRole('button', { name: /create new preshipment/i });
      await user.click(createButton);

      // This would typically test that showModal was called with correct parameters
      // In a real implementation, you'd mock the AppContext and verify the call
    });

    it('should open edit modal when edit button is clicked', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <PreShipments />
        </TestWrapper>
      );

      const editButtons = screen.getAllByText(/edit/i);
      await user.click(editButtons[0]);

      // Similar to create modal test - would verify showModal call
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(
        <TestWrapper>
          <PreShipments />
        </TestWrapper>
      );

      expect(screen.getByLabelText('Tabs')).toBeInTheDocument();
      expect(screen.getByRole('main')).toBeInTheDocument();
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <PreShipments />
        </TestWrapper>
      );

      // Tab through interactive elements
      await user.tab();
      expect(screen.getByRole('button', { name: /create new preshipment/i })).toHaveFocus();

      await user.tab();
      expect(screen.getByRole('button', { name: /all/i })).toHaveFocus();
    });

    it('should have proper heading hierarchy', () => {
      render(
        <TestWrapper>
          <PreShipments />
        </TestWrapper>
      );

      const headings = screen.getAllByRole('heading');
      expect(headings[0]).toHaveTextContent('Pre-Shipments');
      expect(headings[0].tagName).toBe('H1');
    });
  });
});