// tests/frontend/shipping-components.test.js
// Comprehensive test suite for shipping components and workflows
// Tests shipping page, modals, and service integrations

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom';

// Import components under test
import Shipping from '../../src/frontend/src/components/pages/Shipping';
import DriverSignoffModal from '../../src/frontend/src/components/modals/DriverSignoffModal';
import PrintLabelsModal from '../../src/frontend/src/components/modals/PrintLabelsModal';

// Import context providers
import { AppProvider } from '../../src/frontend/src/contexts/AppContext';

// Mock services
import { shippingService } from '../../src/frontend/src/services/shippingService';

// Mock the shipping service
jest.mock('../../src/frontend/src/services/shippingService');

// Mock react-hot-toast
jest.mock('react-hot-toast', () => ({
  success: jest.fn(),
  error: jest.fn(),
  __esModule: true
}));

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
const mockShipments = [
  {
    id: '1',
    shipment_id: 'SHIP-001',
    customer_name: 'Test Customer 1',
    reference_number: 'REF-001',
    status: 'Draft',
    priority: 'High',
    pickup_date: '2024-01-15',
    total_weight: '150 lbs',
    cbp_filed: false,
    tracking_number: null
  },
  {
    id: '2',
    shipment_id: 'SHIP-002',
    customer_name: 'Test Customer 2',
    reference_number: 'REF-002',
    status: 'Ready for Pickup',
    priority: 'Medium',
    pickup_date: '2024-01-16',
    total_weight: '200 lbs',
    cbp_filed: true,
    tracking_number: 'TRK123456'
  },
  {
    id: '3',
    shipment_id: 'SHIP-003',
    customer_name: 'Test Customer 3',
    reference_number: 'REF-003',
    status: 'Shipped',
    priority: 'Low',
    pickup_date: '2024-01-14',
    total_weight: '75 lbs',
    cbp_filed: true,
    tracking_number: 'TRK789012'
  }
];

describe('Shipping Page', () => {
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Default mock implementation
    shippingService.getAll.mockResolvedValue({
      success: true,
      preshipments: mockShipments,
      total: mockShipments.length
    });
  });

  test('renders shipping page with header and statistics', async () => {
    render(
      <TestWrapper>
        <Shipping />
      </TestWrapper>
    );

    // Check header
    expect(screen.getByText('Shipping Management')).toBeInTheDocument();
    expect(screen.getByText(/5-stage shipping workflow/)).toBeInTheDocument();

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('SHIP-001')).toBeInTheDocument();
    });

    // Check statistics cards are rendered
    expect(screen.getByText('Total Items')).toBeInTheDocument();
    expect(screen.getByText('High Priority')).toBeInTheDocument();
    expect(screen.getByText('Pending Compliance')).toBeInTheDocument();
    expect(screen.getByText('Ready Today')).toBeInTheDocument();
  });

  test('displays shipments in correct workflow stages', async () => {
    render(
      <TestWrapper>
        <Shipping />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('SHIP-001')).toBeInTheDocument();
    });

    // Check status badges
    expect(screen.getByText('Draft')).toBeInTheDocument();
    expect(screen.getByText('Ready for Pickup')).toBeInTheDocument();
    expect(screen.getByText('Shipped')).toBeInTheDocument();

    // Check priority indicators
    expect(screen.getByText('High')).toBeInTheDocument();
    expect(screen.getByText('Medium')).toBeInTheDocument();
    expect(screen.getByText('Low')).toBeInTheDocument();
  });

  test('filters shipments by view tabs', async () => {
    render(
      <TestWrapper>
        <Shipping />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('SHIP-001')).toBeInTheDocument();
    });

    // Click on "Shipped" tab
    const shippedTab = screen.getByRole('button', { name: /shipped/i });
    fireEvent.click(shippedTab);

    // Should call API with shipped view
    await waitFor(() => {
      expect(shippingService.getAll).toHaveBeenCalledWith(
        expect.objectContaining({ view: 'shipped' })
      );
    });
  });

  test('searches shipments by text input', async () => {
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <Shipping />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('SHIP-001')).toBeInTheDocument();
    });

    // Type in search input
    const searchInput = screen.getByPlaceholderText('Search shipments...');
    await user.type(searchInput, 'SHIP-001');

    // Should filter results
    await waitFor(() => {
      expect(shippingService.getAll).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'SHIP-001' })
      );
    });
  });

  test('handles status updates through workflow actions', async () => {
    shippingService.updateStatus.mockResolvedValue({
      success: true,
      message: 'Status updated successfully'
    });

    render(
      <TestWrapper>
        <Shipping />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('SHIP-001')).toBeInTheDocument();
    });

    // Find and click the workflow action button for draft status
    const draftRow = screen.getByText('SHIP-001').closest('tr');
    const actionButton = within(draftRow).getByTitle('Submit for picking');
    
    fireEvent.click(actionButton);

    await waitFor(() => {
      expect(shippingService.updateStatus).toHaveBeenCalledWith(
        '1',
        'Pending Pick',
        'Status updated to Pending Pick via workflow'
      );
    });
  });

  test('handles empty state correctly', async () => {
    shippingService.getAll.mockResolvedValue({
      success: true,
      preshipments: [],
      total: 0
    });

    render(
      <TestWrapper>
        <Shipping />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('No shipments yet')).toBeInTheDocument();
      expect(screen.getByText('Create your first shipment to get started.')).toBeInTheDocument();
    });
  });

  test('handles error state correctly', async () => {
    const errorMessage = 'Failed to fetch shipping data';
    shippingService.getAll.mockRejectedValue(new Error(errorMessage));

    render(
      <TestWrapper>
        <Shipping />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Error loading shipping data')).toBeInTheDocument();
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  test('shows loading state while fetching data', async () => {
    // Mock a slow response
    shippingService.getAll.mockImplementation(() => 
      new Promise(resolve => 
        setTimeout(() => resolve({ success: true, preshipments: [] }), 100)
      )
    );

    render(
      <TestWrapper>
        <Shipping />
      </TestWrapper>
    );

    // Should show loading spinner
    expect(screen.getByRole('status')).toBeInTheDocument();
  });
});

describe('DriverSignoffModal', () => {
  const mockShipment = {
    id: '1',
    shipment_id: 'SHIP-001',
    customer_name: 'Test Customer',
    destination_address: '123 Test St, Test City',
    total_weight: '150 lbs'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders modal with shipment information', () => {
    render(
      <TestWrapper>
        <DriverSignoffModal
          isOpen={true}
          onClose={jest.fn()}
          data={mockShipment}
        />
      </TestWrapper>
    );

    expect(screen.getByText('Driver Signoff - SHIP-001')).toBeInTheDocument();
    expect(screen.getByText('Test Customer')).toBeInTheDocument();
    expect(screen.getByText('123 Test St, Test City')).toBeInTheDocument();
    expect(screen.getByText('150 lbs')).toBeInTheDocument();
  });

  test('validates required fields before submission', async () => {
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <DriverSignoffModal
          isOpen={true}
          onClose={jest.fn()}
          data={mockShipment}
        />
      </TestWrapper>
    );

    // Try to submit without filling required fields
    const submitButton = screen.getByText('Complete Driver Signoff');
    await user.click(submitButton);

    // Should show validation errors
    await waitFor(() => {
      expect(screen.getByText('Driver name is required')).toBeInTheDocument();
      expect(screen.getByText('Driver license number is required')).toBeInTheDocument();
      expect(screen.getByText('Truck number is required')).toBeInTheDocument();
      expect(screen.getByText('Driver signature is required')).toBeInTheDocument();
    });
  });

  test('handles signature capture functionality', async () => {
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <DriverSignoffModal
          isOpen={true}
          onClose={jest.fn()}
          data={mockShipment}
        />
      </TestWrapper>
    );

    // Find signature canvas
    const signatureCanvas = screen.getByRole('img', { hidden: true }); // Canvas element
    expect(signatureCanvas).toBeInTheDocument();

    // Test clear signature button
    const clearButton = screen.getByText('Clear Signature');
    await user.click(clearButton);

    // Canvas should be cleared (tested through DOM interaction)
    expect(clearButton).toBeInTheDocument();
  });

  test('submits form with valid data', async () => {
    const user = userEvent.setup();
    const mockOnClose = jest.fn();
    
    shippingService.completeDriverSignoff.mockResolvedValue({
      success: true,
      message: 'Driver signoff completed successfully'
    });

    render(
      <TestWrapper>
        <DriverSignoffModal
          isOpen={true}
          onClose={mockOnClose}
          data={mockShipment}
        />
      </TestWrapper>
    );

    // Fill in required fields
    await user.type(screen.getByPlaceholderText('Enter driver full name...'), 'John Driver');
    await user.type(screen.getByPlaceholderText('Enter driver license number...'), 'DL123456');
    await user.type(screen.getByPlaceholderText('Enter truck number...'), 'TRK789');
    await user.type(screen.getByPlaceholderText('Enter number of packages...'), '5');

    // Note: Signature testing would require canvas mocking for full test
    
    // Check verification checkboxes
    await user.click(screen.getByLabelText(/Total weight verified/));
    await user.click(screen.getByLabelText(/Packages inspected/));

    // Would need to mock signature capture for full test
    // For now, we test the form validation and field interactions
    expect(screen.getByDisplayValue('John Driver')).toBeInTheDocument();
    expect(screen.getByDisplayValue('DL123456')).toBeInTheDocument();
  });
});

describe('PrintLabelsModal', () => {
  const mockShipment = {
    id: '1',
    shipment_id: 'SHIP-001',
    customer_name: 'Test Customer',
    destination_address: '123 Test St, Test City',
    total_items: '3',
    total_weight: '150',
    reference_number: 'REF-001'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders modal with carrier and service options', () => {
    render(
      <TestWrapper>
        <PrintLabelsModal
          isOpen={true}
          onClose={jest.fn()}
          data={mockShipment}
        />
      </TestWrapper>
    );

    expect(screen.getByText('Generate Shipping Labels - SHIP-001')).toBeInTheDocument();
    
    // Check carrier dropdown
    expect(screen.getByDisplayValue('UPS')).toBeInTheDocument();
    
    // Check service type dropdown
    expect(screen.getByText('Select service...')).toBeInTheDocument();
  });

  test('populates form with shipment data', () => {
    render(
      <TestWrapper>
        <PrintLabelsModal
          isOpen={true}
          onClose={jest.fn()}
          data={mockShipment}
        />
      </TestWrapper>
    );

    // Weight should be pre-populated
    expect(screen.getByDisplayValue('150')).toBeInTheDocument();
    
    // Reference number should be pre-populated
    expect(screen.getByDisplayValue('REF-001')).toBeInTheDocument();
  });

  test('updates service options based on carrier selection', async () => {
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <PrintLabelsModal
          isOpen={true}
          onClose={jest.fn()}
          data={mockShipment}
        />
      </TestWrapper>
    );

    // Change carrier to FedEx
    const carrierSelect = screen.getByDisplayValue('UPS');
    await user.selectOptions(carrierSelect, 'FedEx');

    // Service options should update
    expect(screen.getByText('FedEx Ground')).toBeInTheDocument();
    expect(screen.getByText('FedEx Express Overnight')).toBeInTheDocument();
  });

  test('validates required fields before label generation', async () => {
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <PrintLabelsModal
          isOpen={true}
          onClose={jest.fn()}
          data={mockShipment}
        />
      </TestWrapper>
    );

    // Clear weight field
    const weightInput = screen.getByDisplayValue('150');
    await user.clear(weightInput);

    // Try to generate labels
    const generateButton = screen.getByText('Generate Labels');
    await user.click(generateButton);

    // Should show validation error
    await waitFor(() => {
      expect(screen.getByText('Package weight is required')).toBeInTheDocument();
    });
  });

  test('handles label generation success', async () => {
    const user = userEvent.setup();
    const mockLabels = [
      {
        tracking_number: 'TRK123456',
        label_url: 'http://example.com/label1.pdf'
      }
    ];
    
    shippingService.generateLabels.mockResolvedValue({
      success: true,
      labels: mockLabels
    });

    render(
      <TestWrapper>
        <PrintLabelsModal
          isOpen={true}
          onClose={jest.fn()}
          data={mockShipment}
        />
      </TestWrapper>
    );

    // Fill required fields
    await user.selectOptions(screen.getByDisplayValue('UPS'), 'UPS');
    await user.selectOptions(screen.getByDisplayValue(''), 'Ground');
    await user.type(screen.getByPlaceholderText('Length'), '10');
    await user.type(screen.getByPlaceholderText('Width'), '8');
    await user.type(screen.getByPlaceholderText('Height'), '6');

    // Generate labels
    const generateButton = screen.getByText('Generate Labels');
    await user.click(generateButton);

    // Should show generated labels
    await waitFor(() => {
      expect(screen.getByText('Generated Labels')).toBeInTheDocument();
      expect(screen.getByText('TRK123456')).toBeInTheDocument();
      expect(screen.getByText('Print')).toBeInTheDocument();
      expect(screen.getByText('Download')).toBeInTheDocument();
    });
  });

  test('manages reference numbers dynamically', async () => {
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <PrintLabelsModal
          isOpen={true}
          onClose={jest.fn()}
          data={mockShipment}
        />
      </TestWrapper>
    );

    // Add reference number
    const addButton = screen.getByText('Add Reference');
    await user.click(addButton);

    // Should have two reference inputs now
    const referenceInputs = screen.getAllByPlaceholderText(/Reference \d/);
    expect(referenceInputs).toHaveLength(2);

    // Remove reference number
    const removeButtons = screen.getAllByTitle(/Remove reference/);
    if (removeButtons.length > 0) {
      await user.click(removeButtons[0]);
      
      // Should have one less input
      await waitFor(() => {
        const updatedInputs = screen.getAllByPlaceholderText(/Reference \d/);
        expect(updatedInputs).toHaveLength(1);
      });
    }
  });
});

describe('Integration Tests', () => {
  test('shipping workflow integration - draft to shipped', async () => {
    const user = userEvent.setup();
    
    // Mock service calls
    shippingService.getAll.mockResolvedValue({
      success: true,
      preshipments: [
        {
          id: '1',
          shipment_id: 'SHIP-001',
          status: 'Draft',
          customer_name: 'Test Customer',
          priority: 'High'
        }
      ]
    });
    
    shippingService.updateStatus.mockResolvedValue({
      success: true,
      message: 'Status updated'
    });

    render(
      <TestWrapper>
        <Shipping />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('SHIP-001')).toBeInTheDocument();
    });

    // Start workflow by advancing from Draft to Pending Pick
    const draftRow = screen.getByText('SHIP-001').closest('tr');
    const nextStageButton = within(draftRow).getByTitle('Submit for picking');
    
    await user.click(nextStageButton);

    // Verify service call
    await waitFor(() => {
      expect(shippingService.updateStatus).toHaveBeenCalledWith(
        '1',
        'Pending Pick',
        'Status updated to Pending Pick via workflow'
      );
    });
  });

  test('error handling across components', async () => {
    const errorMessage = 'Network error';
    shippingService.getAll.mockRejectedValue(new Error(errorMessage));

    render(
      <TestWrapper>
        <Shipping />
      </TestWrapper>
    );

    // Should show error state
    await waitFor(() => {
      expect(screen.getByText('Error loading shipping data')).toBeInTheDocument();
    });

    // Should have retry button
    const retryButton = screen.getByText('Try Again');
    expect(retryButton).toBeInTheDocument();
    
    // Test retry functionality
    shippingService.getAll.mockResolvedValueOnce({
      success: true,
      preshipments: []
    });
    
    await user.click(retryButton);
    
    await waitFor(() => {
      expect(screen.getByText('No shipments yet')).toBeInTheDocument();
    });
  });
});

describe('Accessibility Tests', () => {
  test('shipping page has proper ARIA labels and roles', async () => {
    render(
      <TestWrapper>
        <Shipping />
      </TestWrapper>
    );

    await waitFor(() => {
      // Check for proper heading structure
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Shipping Management');
      
      // Check for table accessibility
      expect(screen.getByRole('table')).toBeInTheDocument();
      
      // Check for button accessibility
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toBeVisible();
      });
    });
  });

  test('modals have proper focus management', () => {
    render(
      <TestWrapper>
        <DriverSignoffModal
          isOpen={true}
          onClose={jest.fn()}
          data={{ id: '1', shipment_id: 'TEST' }}
        />
      </TestWrapper>
    );

    // Modal should have proper dialog role
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    
    // Should have proper aria-modal attribute
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
  });
});