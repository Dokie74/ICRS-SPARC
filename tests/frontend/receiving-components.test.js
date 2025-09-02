// tests/frontend/receiving-components.test.js
// Comprehensive test suite for receiving components and FTZ compliance workflow
// Tests receiving page, dock audit modal, and service integrations

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom';

// Import components under test
import Receiving from '../../src/frontend/src/components/pages/Receiving';
import DockAuditModal from '../../src/frontend/src/components/modals/DockAuditModal';

// Import context providers
import { AppProvider } from '../../src/frontend/src/contexts/AppContext';

// Mock services
import { receivingService } from '../../src/frontend/src/services/receivingService';

// Mock the receiving service
jest.mock('../../src/frontend/src/services/receivingService');

// Mock react-hot-toast
jest.mock('react-hot-toast', () => ({
  success: jest.fn(),
  error: jest.fn(),
  __esModule: true
}));

// Mock media devices for camera functionality
Object.defineProperty(navigator, 'mediaDevices', {
  writable: true,
  value: {
    getUserMedia: jest.fn().mockResolvedValue({
      getTracks: () => [{ stop: jest.fn() }]
    })
  }
});

// Test wrapper component
const TestWrapper = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, cacheTime: 0 },
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

// Mock data
const mockReceivingItems = [
  {
    id: '1',
    admission_id: 'ADM-001',
    container_number: 'CONT123456',
    bol_number: 'BOL789012',
    customer_name: 'Test Customer 1',
    reference_number: 'REF-001',
    status: 'Arrived',
    ftz_status: 'Compliant',
    ftz_urgency: 'Normal',
    arrived_at: '2024-01-15T10:00:00Z',
    expected_arrival: '2024-01-15T09:00:00Z'
  },
  {
    id: '2',
    admission_id: 'ADM-002',
    container_number: 'CONT789012',
    bol_number: 'BOL345678',
    customer_name: 'Test Customer 2',
    reference_number: 'REF-002',
    status: 'Inspecting',
    ftz_status: 'Pending',
    ftz_urgency: 'Urgent',
    arrived_at: '2024-01-14T14:00:00Z',
    expected_arrival: '2024-01-14T13:00:00Z'
  },
  {
    id: '3',
    admission_id: 'ADM-003',
    container_number: 'CONT345678',
    bol_number: 'BOL901234',
    customer_name: 'Test Customer 3',
    reference_number: 'REF-003',
    status: 'Accepted',
    ftz_status: 'Compliant',
    ftz_urgency: 'Normal',
    arrived_at: '2024-01-13T08:00:00Z',
    expected_arrival: '2024-01-13T07:00:00Z'
  }
];

describe('Receiving Page', () => {
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Default mock implementation
    receivingService.getAll.mockResolvedValue({
      success: true,
      preadmissions: mockReceivingItems,
      total: mockReceivingItems.length
    });
  });

  test('renders receiving page with header and statistics', async () => {
    render(
      <TestWrapper>
        <Receiving />
      </TestWrapper>
    );

    // Check header
    expect(screen.getByText('Receiving Management')).toBeInTheDocument();
    expect(screen.getByText(/FTZ-compliant receiving workflow/)).toBeInTheDocument();

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('CONT123456')).toBeInTheDocument();
    });

    // Check statistics cards are rendered
    expect(screen.getByText('Total Items')).toBeInTheDocument();
    expect(screen.getByText('Arrived Today')).toBeInTheDocument();
    expect(screen.getByText('FTZ Urgent')).toBeInTheDocument();
    expect(screen.getByText('Awaiting Audit')).toBeInTheDocument();
    expect(screen.getByText('In Progress')).toBeInTheDocument();
  });

  test('displays receiving items with proper FTZ status indicators', async () => {
    render(
      <TestWrapper>
        <Receiving />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('CONT123456')).toBeInTheDocument();
    });

    // Check status badges
    expect(screen.getByText('Arrived at Dock')).toBeInTheDocument();
    expect(screen.getByText('Under Inspection')).toBeInTheDocument();
    expect(screen.getByText('Accepted')).toBeInTheDocument();

    // Check FTZ status indicators
    expect(screen.getAllByText('Compliant')).toHaveLength(2);
    expect(screen.getByText('Pending')).toBeInTheDocument();

    // Check urgency indicators
    expect(screen.getAllByText('Normal')).toHaveLength(2);
    expect(screen.getByText('Urgent')).toBeInTheDocument();
  });

  test('filters receiving items by view tabs', async () => {
    render(
      <TestWrapper>
        <Receiving />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('CONT123456')).toBeInTheDocument();
    });

    // Click on "Completed" tab
    const completedTab = screen.getByRole('button', { name: /completed/i });
    fireEvent.click(completedTab);

    // Should call API with completed view
    await waitFor(() => {
      expect(receivingService.getAll).toHaveBeenCalledWith(
        expect.objectContaining({ view: 'completed' })
      );
    });
  });

  test('searches receiving items by multiple criteria', async () => {
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <Receiving />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('CONT123456')).toBeInTheDocument();
    });

    // Type in search input
    const searchInput = screen.getByPlaceholderText('Search containers, BOL, customer...');
    await user.type(searchInput, 'CONT123');

    // Should filter results
    await waitFor(() => {
      expect(receivingService.getAll).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'CONT123' })
      );
    });
  });

  test('handles status updates through dock operations', async () => {
    receivingService.updateStatus.mockResolvedValue({
      success: true,
      message: 'Status updated successfully'
    });

    render(
      <TestWrapper>
        <Receiving />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('CONT123456')).toBeInTheDocument();
    });

    // Find and click the dock audit button for arrived status
    const arrivedRow = screen.getByText('CONT123456').closest('tr');
    const auditButton = within(arrivedRow).getByTitle('Start dock audit inspection');
    
    fireEvent.click(auditButton);

    // Should open dock audit modal
    expect(screen.getByText(/Dock Audit - CONT123456/)).toBeInTheDocument();
  });

  test('displays urgent items with proper highlighting', async () => {
    render(
      <TestWrapper>
        <Receiving />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('CONT789012')).toBeInTheDocument();
    });

    // Urgent items should have special styling (tested through class presence)
    const urgentRow = screen.getByText('CONT789012').closest('tr');
    expect(urgentRow).toHaveClass('bg-red-50');
  });

  test('handles empty state correctly', async () => {
    receivingService.getAll.mockResolvedValue({
      success: true,
      preadmissions: [],
      total: 0
    });

    render(
      <TestWrapper>
        <Receiving />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('No items in receiving')).toBeInTheDocument();
      expect(screen.getByText('Items will appear here when they arrive at the dock.')).toBeInTheDocument();
    });
  });

  test('handles error state with retry functionality', async () => {
    const errorMessage = 'Failed to fetch receiving data';
    receivingService.getAll.mockRejectedValue(new Error(errorMessage));

    render(
      <TestWrapper>
        <Receiving />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Error loading receiving data')).toBeInTheDocument();
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    // Test retry functionality
    const retryButton = screen.getByText('Try Again');
    expect(retryButton).toBeInTheDocument();
  });

  test('refreshes dock status manually', async () => {
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <Receiving />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('CONT123456')).toBeInTheDocument();
    });

    // Click refresh button
    const refreshButton = screen.getByText('Refresh Dock Status');
    await user.click(refreshButton);

    // Should refetch data
    await waitFor(() => {
      expect(receivingService.getAll).toHaveBeenCalledTimes(2);
    });
  });
});

describe('DockAuditModal', () => {
  const mockReceivingItem = {
    id: '1',
    container_number: 'CONT123456',
    bol_number: 'BOL789012',
    customer_name: 'Test Customer',
    description: 'Test goods description'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders modal with container information', () => {
    render(
      <TestWrapper>
        <DockAuditModal
          isOpen={true}
          onClose={jest.fn()}
          data={mockReceivingItem}
        />
      </TestWrapper>
    );

    expect(screen.getByText('Dock Audit - CONT123456')).toBeInTheDocument();
    expect(screen.getByText('BOL789012')).toBeInTheDocument();
    expect(screen.getByText('Test Customer')).toBeInTheDocument();
    expect(screen.getByText('Test goods description')).toBeInTheDocument();
  });

  test('validates required fields before audit completion', async () => {
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <DockAuditModal
          isOpen={true}
          onClose={jest.fn()}
          data={mockReceivingItem}
        />
      </TestWrapper>
    );

    // Try to submit without filling required fields
    const submitButton = screen.getByText('Complete Dock Audit');
    await user.click(submitButton);

    // Should show validation errors
    await waitFor(() => {
      expect(screen.getByText('Container condition is required')).toBeInTheDocument();
      expect(screen.getByText('Seal number is required')).toBeInTheDocument();
      expect(screen.getByText('Audit result is required')).toBeInTheDocument();
      expect(screen.getByText('Inspector name is required')).toBeInTheDocument();
    });
  });

  test('handles physical inspection form inputs', async () => {
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <DockAuditModal
          isOpen={true}
          onClose={jest.fn()}
          data={mockReceivingItem}
        />
      </TestWrapper>
    );

    // Fill container condition
    const conditionSelect = screen.getByLabelText('Container Condition *');
    await user.selectOptions(conditionSelect, 'good');
    expect(screen.getByDisplayValue('good')).toBeInTheDocument();

    // Fill seal number
    const sealInput = screen.getByLabelText('Seal Number *');
    await user.type(sealInput, 'SEAL123456');
    expect(screen.getByDisplayValue('SEAL123456')).toBeInTheDocument();

    // Fill temperature check
    const tempInput = screen.getByLabelText('Temperature (if applicable)');
    await user.type(tempInput, '72°F');
    expect(screen.getByDisplayValue('72°F')).toBeInTheDocument();

    // Fill weight verification
    const weightInput = screen.getByLabelText('Weight Verification');
    await user.type(weightInput, '25,000 lbs');
    expect(screen.getByDisplayValue('25,000 lbs')).toBeInTheDocument();
  });

  test('manages compliance verification checkboxes', async () => {
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <DockAuditModal
          isOpen={true}
          onClose={jest.fn()}
          data={mockReceivingItem}
        />
      </TestWrapper>
    );

    // Check seal verified
    const sealCheckbox = screen.getByLabelText('Seal number verified and intact');
    await user.click(sealCheckbox);
    expect(sealCheckbox).toBeChecked();

    // Check customs inspection
    const customsCheckbox = screen.getByLabelText('Customs inspection completed (if required)');
    await user.click(customsCheckbox);
    expect(customsCheckbox).toBeChecked();

    // Check FTZ compliance
    const ftzCheckbox = screen.getByLabelText('FTZ compliance requirements met');
    await user.click(ftzCheckbox);
    expect(ftzCheckbox).toBeChecked();

    // Check documentation complete
    const docsCheckbox = screen.getByLabelText('All required documentation present');
    await user.click(docsCheckbox);
    expect(docsCheckbox).toBeChecked();
  });

  test('handles photo documentation functionality', async () => {
    const user = userEvent.setup();
    
    // Mock canvas and video elements
    HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
      drawImage: jest.fn(),
      fillStyle: '',
      fillRect: jest.fn()
    }));
    
    HTMLCanvasElement.prototype.toBlob = jest.fn((callback) => {
      callback(new Blob(['fake-image'], { type: 'image/jpeg' }));
    });

    render(
      <TestWrapper>
        <DockAuditModal
          isOpen={true}
          onClose={jest.fn()}
          data={mockReceivingItem}
        />
      </TestWrapper>
    );

    // Test start camera
    const startCameraButton = screen.getByText('Start Camera');
    await user.click(startCameraButton);

    // Should show camera controls
    await waitFor(() => {
      expect(screen.getByText('Capture Photo')).toBeInTheDocument();
      expect(screen.getByText('Stop Camera')).toBeInTheDocument();
    });

    // Test file upload
    const fileInput = screen.getByLabelText(/Upload Photos/);
    const file = new File(['fake-image'], 'test.jpg', { type: 'image/jpeg' });
    
    await user.upload(fileInput, file);
    
    // File should be uploaded (tested through input change)
    expect(fileInput.files[0]).toBe(file);
  });

  test('handles audit decision with rejection workflow', async () => {
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <DockAuditModal
          isOpen={true}
          onClose={jest.fn()}
          data={mockReceivingItem}
        />
      </TestWrapper>
    );

    // Select rejected result
    const auditResultSelect = screen.getByLabelText('Audit Result *');
    await user.selectOptions(auditResultSelect, 'rejected');

    // Should show rejection reason field
    await waitFor(() => {
      expect(screen.getByLabelText('Rejection Reason *')).toBeInTheDocument();
    });

    // Fill rejection reason
    const rejectionTextarea = screen.getByLabelText('Rejection Reason *');
    await user.type(rejectionTextarea, 'Container damaged during transport');
    expect(screen.getByDisplayValue('Container damaged during transport')).toBeInTheDocument();
  });

  test('completes dock audit with valid data', async () => {
    const user = userEvent.setup();
    const mockOnClose = jest.fn();
    
    receivingService.completeDockAudit.mockResolvedValue({
      success: true,
      message: 'Dock audit completed successfully'
    });

    render(
      <TestWrapper>
        <DockAuditModal
          isOpen={true}
          onClose={mockOnClose}
          data={mockReceivingItem}
        />
      </TestWrapper>
    );

    // Fill all required fields
    await user.selectOptions(screen.getByLabelText('Container Condition *'), 'good');
    await user.type(screen.getByLabelText('Seal Number *'), 'SEAL123456');
    await user.selectOptions(screen.getByLabelText('Audit Result *'), 'accepted');
    await user.type(screen.getByLabelText('Inspector Name *'), 'John Inspector');

    // Submit form
    const submitButton = screen.getByText('Complete Dock Audit');
    await user.click(submitButton);

    // Should call service with form data
    await waitFor(() => {
      expect(receivingService.completeDockAudit).toHaveBeenCalledWith(
        '1',
        expect.any(FormData)
      );
    });
  });

  test('handles audit completion errors gracefully', async () => {
    const user = userEvent.setup();
    const errorMessage = 'Failed to complete dock audit';
    
    receivingService.completeDockAudit.mockRejectedValue(new Error(errorMessage));

    render(
      <TestWrapper>
        <DockAuditModal
          isOpen={true}
          onClose={jest.fn()}
          data={mockReceivingItem}
        />
      </TestWrapper>
    );

    // Fill required fields
    await user.selectOptions(screen.getByLabelText('Container Condition *'), 'good');
    await user.type(screen.getByLabelText('Seal Number *'), 'SEAL123456');
    await user.selectOptions(screen.getByLabelText('Audit Result *'), 'accepted');
    await user.type(screen.getByLabelText('Inspector Name *'), 'John Inspector');

    // Submit form
    const submitButton = screen.getByText('Complete Dock Audit');
    await user.click(submitButton);

    // Should handle error gracefully
    await waitFor(() => {
      expect(receivingService.completeDockAudit).toHaveBeenCalled();
      // Error would be shown via toast (mocked)
    });
  });
});

describe('Integration Tests', () => {
  test('receiving workflow integration - arrival to acceptance', async () => {
    const user = userEvent.setup();
    
    // Mock service calls
    receivingService.getAll.mockResolvedValue({
      success: true,
      preadmissions: [
        {
          id: '1',
          container_number: 'CONT123456',
          status: 'Pending',
          customer_name: 'Test Customer'
        }
      ]
    });
    
    receivingService.updateStatus.mockResolvedValue({
      success: true,
      message: 'Status updated'
    });

    render(
      <TestWrapper>
        <Receiving />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('CONT123456')).toBeInTheDocument();
    });

    // Mark as arrived
    const pendingRow = screen.getByText('CONT123456').closest('tr');
    const arrivedButton = within(pendingRow).getByTitle('Mark as arrived at dock');
    
    await user.click(arrivedButton);

    // Verify service call
    await waitFor(() => {
      expect(receivingService.updateStatus).toHaveBeenCalledWith(
        '1',
        'Arrived',
        'Status updated to Arrived via dock operations'
      );
    });
  });

  test('FTZ compliance validation integration', async () => {
    const user = userEvent.setup();
    
    receivingService.getAll.mockResolvedValue({
      success: true,
      preadmissions: [
        {
          id: '1',
          container_number: 'CONT123456',
          status: 'Arrived',
          ftz_status: 'Pending',
          ftz_urgency: 'Urgent'
        }
      ]
    });

    render(
      <TestWrapper>
        <Receiving />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('CONT123456')).toBeInTheDocument();
    });

    // Check FTZ urgent indicator
    expect(screen.getByText('Urgent')).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();

    // Row should be highlighted for urgent FTZ items
    const urgentRow = screen.getByText('CONT123456').closest('tr');
    expect(urgentRow).toHaveClass('bg-red-50');
  });

  test('dock audit modal integration with receiving page', async () => {
    const user = userEvent.setup();
    
    receivingService.getAll.mockResolvedValue({
      success: true,
      preadmissions: mockReceivingItems
    });

    receivingService.completeDockAudit.mockResolvedValue({
      success: true,
      message: 'Audit completed'
    });

    render(
      <TestWrapper>
        <Receiving />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('CONT123456')).toBeInTheDocument();
    });

    // Open dock audit modal
    const arrivedRow = screen.getByText('CONT123456').closest('tr');
    const auditButton = within(arrivedRow).getByTitle('Start dock audit inspection');
    
    await user.click(auditButton);

    // Modal should open
    await waitFor(() => {
      expect(screen.getByText('Dock Audit - CONT123456')).toBeInTheDocument();
    });

    // Complete minimal audit
    await user.selectOptions(screen.getByLabelText('Container Condition *'), 'good');
    await user.type(screen.getByLabelText('Seal Number *'), 'SEAL123');
    await user.selectOptions(screen.getByLabelText('Audit Result *'), 'accepted');
    await user.type(screen.getByLabelText('Inspector Name *'), 'Test Inspector');

    // Submit audit
    const submitButton = screen.getByText('Complete Dock Audit');
    await user.click(submitButton);

    // Should complete audit
    await waitFor(() => {
      expect(receivingService.completeDockAudit).toHaveBeenCalled();
    });
  });
});

describe('Accessibility Tests', () => {
  test('receiving page has proper ARIA labels and roles', async () => {
    render(
      <TestWrapper>
        <Receiving />
      </TestWrapper>
    );

    await waitFor(() => {
      // Check for proper heading structure
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Receiving Management');
      
      // Check for table accessibility
      expect(screen.getByRole('table')).toBeInTheDocument();
      
      // Check for tablist accessibility (view tabs)
      const tabs = screen.getAllByRole('button');
      expect(tabs.length).toBeGreaterThan(0);
    });
  });

  test('dock audit modal has proper accessibility features', () => {
    render(
      <TestWrapper>
        <DockAuditModal
          isOpen={true}
          onClose={jest.fn()}
          data={{ id: '1', container_number: 'TEST123' }}
        />
      </TestWrapper>
    );

    // Modal should have proper dialog role
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    
    // Should have proper aria-modal attribute
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
    
    // Form should have proper labels
    const form = screen.getByRole('form');
    expect(form).toBeInTheDocument();
    
    // Required fields should be properly marked
    const requiredInputs = screen.getAllByText('*');
    expect(requiredInputs.length).toBeGreaterThan(0);
  });

  test('keyboard navigation works correctly', async () => {
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <DockAuditModal
          isOpen={true}
          onClose={jest.fn()}
          data={{ id: '1', container_number: 'TEST123' }}
        />
      </TestWrapper>
    );

    // Tab through form elements
    const conditionSelect = screen.getByLabelText('Container Condition *');
    await user.tab();
    
    // Focus should move through form elements
    expect(document.activeElement).toBe(conditionSelect);
  });

  test('screen reader friendly content structure', () => {
    render(
      <TestWrapper>
        <DockAuditModal
          isOpen={true}
          onClose={jest.fn()}
          data={{ 
            id: '1', 
            container_number: 'TEST123',
            customer_name: 'Test Customer'
          }}
        />
      </TestWrapper>
    );

    // Check for proper heading hierarchy
    const headings = screen.getAllByRole('heading');
    expect(headings.length).toBeGreaterThan(0);
    
    // Check for descriptive labels
    expect(screen.getByLabelText('Container Condition *')).toBeInTheDocument();
    expect(screen.getByLabelText('Seal Number *')).toBeInTheDocument();
    
    // Check for helpful descriptions
    expect(screen.getByText(/Digital signature will be captured/)).toBeInTheDocument();
  });
});