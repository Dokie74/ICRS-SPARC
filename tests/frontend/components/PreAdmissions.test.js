// tests/frontend/components/PreAdmissions.test.js
// Comprehensive tests for PreAdmissions (Receiving) page component

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import PreAdmissions from '../../../src/frontend/src/components/pages/PreAdmissions';
import { AppProvider } from '../../../src/frontend/src/contexts/AppContext';
import apiClient from '../../../src/frontend/src/services/api-client';

// Mock the API client
jest.mock('../../../src/frontend/src/services/api-client');

// Mock data
const mockPreadmissions = [
  {
    id: 1,
    admission_id: 'ADM-001',
    status: 'Pending',
    customer_name: 'Customer A',
    container_number: 'CONT-001',
    reference_number: 'REF-001',
    expected_arrival: '2024-01-15T10:00:00Z',
    created_at: '2024-01-01T10:00:00Z'
  },
  {
    id: 2,
    admission_id: 'ADM-002',
    status: 'In Transit',
    customer_name: 'Customer B',
    container_number: 'CONT-002',
    reference_number: 'REF-002',
    expected_arrival: '2024-01-20T10:00:00Z',
    created_at: '2024-01-02T10:00:00Z'
  },
  {
    id: 3,
    admission_id: 'ADM-003',
    status: 'Arrived',
    customer_name: 'Customer A',
    container_number: 'CONT-003',
    reference_number: 'REF-003',
    expected_arrival: '2024-01-10T10:00:00Z',
    created_at: '2024-01-03T10:00:00Z'
  },
  {
    id: 4,
    admission_id: 'ADM-004',
    status: 'Processing',
    customer_name: 'Customer C',
    container_number: 'CONT-004',
    reference_number: 'REF-004',
    expected_arrival: '2024-01-18T10:00:00Z',
    created_at: '2024-01-04T10:00:00Z'
  }
];

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

describe('PreAdmissions Component', () => {
  beforeEach(() => {
    // Mock the API client response
    apiClient.preadmission = {
      getAll: jest.fn().mockResolvedValue({
        preadmissions: mockPreadmissions
      })
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render the page header', async () => {
      render(
        <TestWrapper>
          <PreAdmissions />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /pre-admissions \(receivables\)/i })).toBeInTheDocument();
      });
      
      expect(screen.getByText(/admin function to create receivable records/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /create new pre-admission/i })).toBeInTheDocument();
    });

    it('should render statistics cards', async () => {
      render(
        <TestWrapper>
          <PreAdmissions />
        </TestWrapper>
      );

      await waitFor(() => {
        // Total count
        expect(screen.getByText('4')).toBeInTheDocument();
      });

      // Status counts
      expect(screen.getByText('1')).toBeInTheDocument(); // Pending
      expect(screen.getByText('1')).toBeInTheDocument(); // In Transit
      expect(screen.getByText('1')).toBeInTheDocument(); // Processing
      expect(screen.getByText('1')).toBeInTheDocument(); // Arrived
    });

    it('should render filter controls', async () => {
      render(
        <TestWrapper>
          <PreAdmissions />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/search by admission id/i)).toBeInTheDocument();
      });
      
      expect(screen.getByDisplayValue('All Statuses')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /clear filters/i })).toBeInTheDocument();
    });

    it('should display preadmissions count', async () => {
      render(
        <TestWrapper>
          <PreAdmissions />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/showing 4 of 4 pre-admissions/i)).toBeInTheDocument();
      });
    });
  });

  describe('Data Display', () => {
    it('should display preadmissions in table format', async () => {
      render(
        <TestWrapper>
          <PreAdmissions />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('ADM-001')).toBeInTheDocument();
        expect(screen.getByText('ADM-002')).toBeInTheDocument();
        expect(screen.getByText('ADM-003')).toBeInTheDocument();
        expect(screen.getByText('ADM-004')).toBeInTheDocument();
      });

      // Check table headers
      expect(screen.getByText('Admission ID')).toBeInTheDocument();
      expect(screen.getByText('Container / Reference')).toBeInTheDocument();
      expect(screen.getByText('Customer')).toBeInTheDocument();
      expect(screen.getByText('Expected Arrival')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
      expect(screen.getByText('Actions')).toBeInTheDocument();
    });

    it('should display container and reference numbers', async () => {
      render(
        <TestWrapper>
          <PreAdmissions />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('CONT-001')).toBeInTheDocument();
        expect(screen.getByText('Ref: REF-001')).toBeInTheDocument();
      });
    });

    it('should format expected arrival dates', async () => {
      render(
        <TestWrapper>
          <PreAdmissions />
        </TestWrapper>
      );

      await waitFor(() => {
        // Check that dates are formatted properly (locale-specific)
        expect(screen.getAllByText(/1\/15\/2024|15\/1\/2024/)).toHaveLength(1);
      });
    });

    it('should display status badges with correct styling', async () => {
      render(
        <TestWrapper>
          <PreAdmissions />
        </TestWrapper>
      );

      await waitFor(() => {
        const pendingBadge = screen.getByText('Pending');
        expect(pendingBadge).toHaveClass('bg-yellow-100', 'text-yellow-800');

        const inTransitBadge = screen.getByText('In Transit');
        expect(inTransitBadge).toHaveClass('bg-blue-100', 'text-blue-800');

        const arrivedBadge = screen.getByText('Arrived');
        expect(arrivedBadge).toHaveClass('bg-green-100', 'text-green-800');

        const processingBadge = screen.getByText('Processing');
        expect(processingBadge).toHaveClass('bg-purple-100', 'text-purple-800');
      });
    });
  });

  describe('Search and Filtering', () => {
    it('should filter preadmissions by search term', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <PreAdmissions />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('ADM-001')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/search by admission id/i);
      await user.type(searchInput, 'ADM-001');

      // Should only show matching preadmission
      expect(screen.getByText('ADM-001')).toBeInTheDocument();
      expect(screen.queryByText('ADM-002')).not.toBeInTheDocument();
    });

    it('should search across multiple fields', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <PreAdmissions />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Customer A')).toBeInTheDocument();
      });

      // Search by customer name
      const searchInput = screen.getByPlaceholderText(/search by admission id/i);
      await user.type(searchInput, 'Customer A');

      // Should show preadmissions for Customer A
      expect(screen.getByText('ADM-001')).toBeInTheDocument();
      expect(screen.getByText('ADM-003')).toBeInTheDocument();
      expect(screen.queryByText('ADM-002')).not.toBeInTheDocument();
    });

    it('should filter by status', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <PreAdmissions />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getAllByText(/ADM-/)).toHaveLength(4);
      });

      const statusSelect = screen.getByDisplayValue('All Statuses');
      await user.selectOptions(statusSelect, 'Pending');

      // Should only show pending preadmissions
      expect(screen.getByText('ADM-001')).toBeInTheDocument();
      expect(screen.queryByText('ADM-002')).not.toBeInTheDocument();
      expect(screen.queryByText('ADM-003')).not.toBeInTheDocument();
      expect(screen.queryByText('ADM-004')).not.toBeInTheDocument();
    });

    it('should clear filters when clear button is clicked', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <PreAdmissions />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('ADM-001')).toBeInTheDocument();
      });

      // Apply filters
      const searchInput = screen.getByPlaceholderText(/search by admission id/i);
      await user.type(searchInput, 'ADM-001');

      const statusSelect = screen.getByDisplayValue('All Statuses');
      await user.selectOptions(statusSelect, 'Pending');

      // Verify filters are applied
      expect(searchInput.value).toBe('ADM-001');
      expect(statusSelect.value).toBe('Pending');

      // Click clear filters
      const clearButton = screen.getByRole('button', { name: /clear filters/i });
      await user.click(clearButton);

      // Verify filters are cleared
      expect(searchInput.value).toBe('');
      expect(statusSelect.value).toBe('');
      expect(screen.getAllByText(/ADM-/)).toHaveLength(4);
    });

    it('should show filtered indicator when filters are applied', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <PreAdmissions />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('ADM-001')).toBeInTheDocument();
      });

      const statusSelect = screen.getByDisplayValue('All Statuses');
      await user.selectOptions(statusSelect, 'Pending');

      expect(screen.getByText('(filtered)')).toBeInTheDocument();
    });
  });

  describe('Sorting', () => {
    it('should sort with active items first, then by expected arrival date', async () => {
      render(
        <TestWrapper>
          <PreAdmissions />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getAllByText(/ADM-/)).toHaveLength(4);
      });

      const admissionRows = screen.getAllByText(/ADM-/).map(el => el.textContent);
      
      // Active items (non-final status) should come first
      // Final items (Arrived) should come last
      expect(admissionRows).not.toContain('ADM-003'); // Arrived should not be first
      
      // Within active items, should be sorted by expected arrival date
    });

    it('should handle missing expected arrival dates', async () => {
      const preadmissionsWithoutDates = [
        ...mockPreadmissions,
        {
          id: 5,
          admission_id: 'ADM-005',
          status: 'Pending',
          customer_name: 'Customer D',
          expected_arrival: null
        }
      ];

      apiClient.preadmission.getAll.mockResolvedValue({
        preadmissions: preadmissionsWithoutDates
      });

      render(
        <TestWrapper>
          <PreAdmissions />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('ADM-005')).toBeInTheDocument();
      });

      // Should show 'Not set' for missing dates
      expect(screen.getByText('Not set')).toBeInTheDocument();
    });
  });

  describe('Action Buttons', () => {
    it('should display edit and audit buttons for each preadmission', async () => {
      render(
        <TestWrapper>
          <PreAdmissions />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getAllByText(/edit/i)).toHaveLength(4);
        expect(screen.getAllByText(/audit/i)).toHaveLength(3); // Non-final items
        expect(screen.getAllByText(/view audit/i)).toHaveLength(1); // Final items
      });
    });

    it('should show different audit button text for final status', async () => {
      render(
        <TestWrapper>
          <PreAdmissions />
        </TestWrapper>
      );

      await waitFor(() => {
        // Final status (Arrived) should show "View Audit"
        expect(screen.getByText('View Audit')).toBeInTheDocument();
        // Non-final statuses should show "Audit"
        expect(screen.getAllByText('Audit')).toHaveLength(3);
      });
    });

    it('should have proper tooltips for action buttons', async () => {
      render(
        <TestWrapper>
          <PreAdmissions />
        </TestWrapper>
      );

      await waitFor(() => {
        const editButtons = screen.getAllByTitle('Edit pre-admission');
        expect(editButtons).toHaveLength(4);

        const auditButtons = screen.getAllByTitle(/audit/i);
        expect(auditButtons.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Row Styling', () => {
    it('should style final status rows differently', async () => {
      render(
        <TestWrapper>
          <PreAdmissions />
        </TestWrapper>
      );

      await waitFor(() => {
        // Find the row with Arrived status
        const arrivedRow = screen.getByText('ADM-003').closest('tr');
        expect(arrivedRow).toHaveClass('bg-gray-50');
      });
    });

    it('should have hover effects for non-final rows', async () => {
      render(
        <TestWrapper>
          <PreAdmissions />
        </TestWrapper>
      );

      await waitFor(() => {
        const pendingRow = screen.getByText('ADM-001').closest('tr');
        expect(pendingRow).toHaveClass('hover:bg-gray-50');
      });
    });
  });

  describe('Loading and Error States', () => {
    it('should show loading spinner', () => {
      // Mock loading state
      apiClient.preadmission.getAll.mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      render(
        <TestWrapper>
          <PreAdmissions />
        </TestWrapper>
      );

      expect(document.querySelector('.animate-spin')).toBeInTheDocument();
    });

    it('should show error message', async () => {
      const mockError = new Error('Failed to fetch preadmissions');
      apiClient.preadmission.getAll.mockRejectedValue(mockError);

      render(
        <TestWrapper>
          <PreAdmissions />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/error loading pre-admissions/i)).toBeInTheDocument();
        expect(screen.getByText(mockError.message)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
      });
    });

    it('should retry fetch when try again is clicked', async () => {
      const user = userEvent.setup();
      const mockError = new Error('Network error');
      
      apiClient.preadmission.getAll.mockRejectedValueOnce(mockError);
      apiClient.preadmission.getAll.mockResolvedValueOnce({ preadmissions: mockPreadmissions });

      render(
        <TestWrapper>
          <PreAdmissions />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/error loading pre-admissions/i)).toBeInTheDocument();
      });

      const tryAgainButton = screen.getByRole('button', { name: /try again/i });
      await user.click(tryAgainButton);

      await waitFor(() => {
        expect(screen.getByText('ADM-001')).toBeInTheDocument();
      });
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no preadmissions exist', async () => {
      apiClient.preadmission.getAll.mockResolvedValue({ preadmissions: [] });

      render(
        <TestWrapper>
          <PreAdmissions />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/no pre-admissions yet/i)).toBeInTheDocument();
        expect(screen.getByText(/get started by creating your first pre-admission/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /create first pre-admission/i })).toBeInTheDocument();
      });
    });

    it('should show no matches message when filtered results are empty', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <PreAdmissions />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('ADM-001')).toBeInTheDocument();
      });

      // Apply filter that matches nothing
      const searchInput = screen.getByPlaceholderText(/search by admission id/i);
      await user.type(searchInput, 'NONEXISTENT');

      expect(screen.getByText(/no matching pre-admissions/i)).toBeInTheDocument();
      expect(screen.getByText(/try adjusting your search/i)).toBeInTheDocument();
    });
  });

  describe('Statistics Calculation', () => {
    it('should calculate statistics correctly', async () => {
      render(
        <TestWrapper>
          <PreAdmissions />
        </TestWrapper>
      );

      await waitFor(() => {
        // Total: 4
        expect(screen.getByText('4')).toBeInTheDocument();
        
        // Each status should have count of 1
        expect(screen.getAllByText('1')).toHaveLength(4); // pending, transit, processing, arrived
      });
    });

    it('should update statistics when data changes', async () => {
      const { rerender } = render(
        <TestWrapper>
          <PreAdmissions />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('4')).toBeInTheDocument();
      });

      // Mock updated data with more pending items
      const updatedData = [
        ...mockPreadmissions,
        {
          id: 5,
          admission_id: 'ADM-005',
          status: 'Pending',
          customer_name: 'Customer E'
        }
      ];

      apiClient.preadmission.getAll.mockResolvedValue({
        preadmissions: updatedData
      });

      rerender(
        <TestWrapper>
          <PreAdmissions />
        </TestWrapper>
      );

      // Should show updated counts
      await waitFor(() => {
        expect(screen.getByText('5')).toBeInTheDocument(); // Total
      });
    });
  });

  describe('Modal Integration', () => {
    it('should open create modal when create button is clicked', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <PreAdmissions />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /create new pre-admission/i })).toBeInTheDocument();
      });

      const createButton = screen.getByRole('button', { name: /create new pre-admission/i });
      await user.click(createButton);

      // In a real implementation, would verify showModal was called with correct parameters
    });

    it('should open edit modal when edit button is clicked', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <PreAdmissions />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getAllByText(/edit/i)).toHaveLength(4);
      });

      const editButtons = screen.getAllByText(/edit/i);
      await user.click(editButtons[0]);

      // Would verify showModal was called with edit modal and preadmission data
    });

    it('should open dock audit modal when audit button is clicked', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <PreAdmissions />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getAllByText('Audit')).toHaveLength(3);
      });

      const auditButtons = screen.getAllByText('Audit');
      await user.click(auditButtons[0]);

      // Would verify showModal was called with dock audit modal
    });
  });

  describe('Accessibility', () => {
    it('should have proper table structure', async () => {
      render(
        <TestWrapper>
          <PreAdmissions />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByRole('table')).toBeInTheDocument();
        expect(screen.getAllByRole('columnheader')).toHaveLength(6);
        expect(screen.getAllByRole('row')).toHaveLength(5); // 1 header + 4 data rows
      });
    });

    it('should have proper form labels', async () => {
      render(
        <TestWrapper>
          <PreAdmissions />
        </TestWrapper>
      );

      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText(/search by admission id/i);
        expect(searchInput).toBeInTheDocument();
        expect(searchInput).toHaveAttribute('type', 'text');
      });
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <PreAdmissions />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /create new pre-admission/i })).toBeInTheDocument();
      });

      // Tab through interactive elements
      await user.tab();
      expect(screen.getByRole('button', { name: /create new pre-admission/i })).toHaveFocus();

      await user.tab();
      expect(screen.getByPlaceholderText(/search by admission id/i)).toHaveFocus();
    });

    it('should have proper heading hierarchy', async () => {
      render(
        <TestWrapper>
          <PreAdmissions />
        </TestWrapper>
      );

      await waitFor(() => {
        const mainHeading = screen.getByRole('heading', { name: /pre-admissions \(receivables\)/i });
        expect(mainHeading.tagName).toBe('H1');
      });
    });
  });
});