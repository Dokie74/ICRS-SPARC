// tests/frontend/modal-components.test.js
// Unit and integration tests for Admin modal components - ICRS SPARC
// Tests component rendering, form validation, and API integration with mocked responses

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { jest } from '@jest/globals';

// Import components to test
import AddEmployeeModal from '../../src/frontend/src/components/modals/AddEmployeeModal';
import AddPartModal from '../../src/frontend/src/components/modals/AddPartModal';
import AddCustomerModal from '../../src/frontend/src/components/modals/AddCustomerModal';
import AddSupplierModal from '../../src/frontend/src/components/modals/AddSupplierModal';

// Mock API client
const mockApiClient = {
  post: jest.fn(),
  put: jest.fn(),
  get: jest.fn(),
  delete: jest.fn(),
  parts: {
    create: jest.fn(),
    update: jest.fn()
  },
  customers: {
    create: jest.fn(),
    update: jest.fn()
  }
};

jest.mock('../../src/frontend/src/services/api-client', () => mockApiClient);

// Mock material types utility
jest.mock('../../src/frontend/src/utils/materialTypes', () => ({
  getMaterialOptions: () => [
    { value: 'steel', label: 'Steel' },
    { value: 'aluminum', label: 'Aluminum' },
    { value: 'electronic', label: 'Electronic' }
  ],
  getMaterialLabel: (value) => value,
  getMaterialConfig: (value) => ({ color: 'bg-blue-100 text-blue-800' })
}));

// Test utilities
const createTestQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });
};

const renderWithProviders = (component, { queryClient = createTestQueryClient() } = {}) => {
  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  );
};

const defaultModalProps = {
  isOpen: true,
  onClose: jest.fn(),
  onSuccess: jest.fn(),
  onError: jest.fn()
};

describe('Modal Components', () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('AddEmployeeModal', () => {
    
    test('renders with all required fields', () => {
      renderWithProviders(
        <AddEmployeeModal {...defaultModalProps} />
      );

      expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/role/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/department/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/phone/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/status/i)).toBeInTheDocument();
    });

    test('shows validation errors for empty required fields', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <AddEmployeeModal {...defaultModalProps} />
      );

      const submitButton = screen.getByRole('button', { name: /add employee/i });
      await user.click(submitButton);

      expect(await screen.findByText('Name is required')).toBeInTheDocument();
      expect(await screen.findByText('Email is required')).toBeInTheDocument();
      expect(await screen.findByText('Role is required')).toBeInTheDocument();
    });

    test('validates email format', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <AddEmployeeModal {...defaultModalProps} />
      );

      const nameInput = screen.getByLabelText(/full name/i);
      const emailInput = screen.getByLabelText(/email address/i);
      const roleSelect = screen.getByLabelText(/role/i);

      await user.type(nameInput, 'John Doe');
      await user.type(emailInput, 'invalid-email');
      await user.selectOptions(roleSelect, 'admin');

      const submitButton = screen.getByRole('button', { name: /add employee/i });
      await user.click(submitButton);

      expect(await screen.findByText('Email is invalid')).toBeInTheDocument();
    });

    test('clears field errors when user starts typing', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <AddEmployeeModal {...defaultModalProps} />
      );

      // Trigger validation errors
      const submitButton = screen.getByRole('button', { name: /add employee/i });
      await user.click(submitButton);

      expect(await screen.findByText('Name is required')).toBeInTheDocument();

      // Start typing in name field
      const nameInput = screen.getByLabelText(/full name/i);
      await user.type(nameInput, 'J');

      // Error should disappear
      expect(screen.queryByText('Name is required')).not.toBeInTheDocument();
    });

    test('submits form with valid data', async () => {
      const user = userEvent.setup();
      mockApiClient.post.mockResolvedValueOnce({
        success: true,
        data: { id: 1, name: 'John Doe' }
      });

      renderWithProviders(
        <AddEmployeeModal {...defaultModalProps} />
      );

      // Fill out form
      await user.type(screen.getByLabelText(/full name/i), 'John Doe');
      await user.type(screen.getByLabelText(/email address/i), 'john@example.com');
      await user.selectOptions(screen.getByLabelText(/role/i), 'admin');
      await user.type(screen.getByLabelText(/department/i), 'IT');
      await user.type(screen.getByLabelText(/phone/i), '(555) 123-4567');

      const submitButton = screen.getByRole('button', { name: /add employee/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockApiClient.post).toHaveBeenCalledWith('/api/admin/employees', {
          name: 'John Doe',
          email: 'john@example.com',
          role: 'admin',
          department: 'IT',
          phone: '(555) 123-4567',
          status: 'active'
        });
      });

      expect(defaultModalProps.onSuccess).toHaveBeenCalledWith('Employee added successfully');
    });

    test('handles API errors gracefully', async () => {
      const user = userEvent.setup();
      mockApiClient.post.mockRejectedValueOnce(new Error('Network error'));

      renderWithProviders(
        <AddEmployeeModal {...defaultModalProps} />
      );

      // Fill out form
      await user.type(screen.getByLabelText(/full name/i), 'John Doe');
      await user.type(screen.getByLabelText(/email address/i), 'john@example.com');
      await user.selectOptions(screen.getByLabelText(/role/i), 'admin');

      const submitButton = screen.getByRole('button', { name: /add employee/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(defaultModalProps.onError).toHaveBeenCalledWith('Network error');
      });
    });

    test('shows loading state during form submission', async () => {
      const user = userEvent.setup();
      let resolvePromise;
      mockApiClient.post.mockImplementationOnce(() => 
        new Promise(resolve => { resolvePromise = resolve; })
      );

      renderWithProviders(
        <AddEmployeeModal {...defaultModalProps} />
      );

      // Fill out form
      await user.type(screen.getByLabelText(/full name/i), 'John Doe');
      await user.type(screen.getByLabelText(/email address/i), 'john@example.com');
      await user.selectOptions(screen.getByLabelText(/role/i), 'admin');

      const submitButton = screen.getByRole('button', { name: /add employee/i });
      await user.click(submitButton);

      // Check loading state
      expect(screen.getByText(/adding.../i)).toBeInTheDocument();
      expect(submitButton).toBeDisabled();

      // Resolve the promise
      resolvePromise({ success: true, data: { id: 1 } });

      await waitFor(() => {
        expect(screen.queryByText(/adding.../i)).not.toBeInTheDocument();
      });
    });

    test('populates form for editing existing employee', () => {
      const existingEmployee = {
        id: 1,
        name: 'Jane Smith',
        email: 'jane@example.com',
        role: 'manager',
        department: 'Sales',
        phone: '(555) 987-6543',
        status: 'active'
      };

      renderWithProviders(
        <AddEmployeeModal 
          {...defaultModalProps}
          employee={existingEmployee}
          isEdit={true}
        />
      );

      expect(screen.getByDisplayValue('Jane Smith')).toBeInTheDocument();
      expect(screen.getByDisplayValue('jane@example.com')).toBeInTheDocument();
      expect(screen.getByDisplayValue('manager')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Sales')).toBeInTheDocument();
      expect(screen.getByDisplayValue('(555) 987-6543')).toBeInTheDocument();
      expect(screen.getByText(/edit employee/i)).toBeInTheDocument();
    });

  });

  describe('AddPartModal', () => {
    
    test('renders with all form sections', () => {
      renderWithProviders(
        <AddPartModal {...defaultModalProps} />
      );

      expect(screen.getByText('Basic Information')).toBeInTheDocument();
      expect(screen.getByText('Classification')).toBeInTheDocument();
      expect(screen.getByText('Pricing & Weight')).toBeInTheDocument();
      
      expect(screen.getByLabelText(/part number/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/hts code/i)).toBeInTheDocument();
    });

    test('validates HTS code format', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <AddPartModal {...defaultModalProps} />
      );

      await user.type(screen.getByLabelText(/part number/i), 'TEST-001');
      await user.type(screen.getByLabelText(/description/i), 'Test part');
      await user.type(screen.getByLabelText(/hts code/i), 'invalid-format');

      const submitButton = screen.getByRole('button', { name: /add part/i });
      await user.click(submitButton);

      expect(await screen.findByText('HTS code must be in format XXXX.XX.XXXX')).toBeInTheDocument();
    });

    test('auto-calculates standard value from material and labor costs', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <AddPartModal {...defaultModalProps} />
      );

      const materialPriceInput = screen.getByLabelText(/material cost/i);
      const laborPriceInput = screen.getByLabelText(/labor cost/i);
      const standardValueInput = screen.getByLabelText(/standard value/i);

      await user.type(materialPriceInput, '15.50');
      await user.type(laborPriceInput, '9.50');

      // Standard value should auto-calculate
      expect(standardValueInput.value).toBe('25.00');
    });

    test('validates numeric fields', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <AddPartModal {...defaultModalProps} />
      );

      await user.type(screen.getByLabelText(/part number/i), 'TEST-001');
      await user.type(screen.getByLabelText(/description/i), 'Test part');
      await user.type(screen.getByLabelText(/standard value/i), 'not-a-number');

      const submitButton = screen.getByRole('button', { name: /add part/i });
      await user.click(submitButton);

      expect(await screen.findByText('Standard value must be a valid number')).toBeInTheDocument();
    });

    test('submits part with all data correctly', async () => {
      const user = userEvent.setup();
      mockApiClient.parts.create.mockResolvedValueOnce({
        success: true,
        data: { id: 'TEST-001' }
      });

      renderWithProviders(
        <AddPartModal {...defaultModalProps} />
      );

      // Fill basic information
      await user.type(screen.getByLabelText(/part number/i), 'TEST-001');
      await user.type(screen.getByLabelText(/manufacturer/i), 'Test Mfg');
      await user.type(screen.getByLabelText(/description/i), 'Test electronic component');

      // Fill classification
      await user.type(screen.getByLabelText(/hts code/i), '8541.10.0060');
      await user.type(screen.getByLabelText(/country of origin/i), 'USA');
      await user.selectOptions(screen.getByLabelText(/material/i), 'electronic');

      // Fill pricing
      await user.type(screen.getByLabelText(/material cost/i), '15.00');
      await user.type(screen.getByLabelText(/labor cost/i), '10.00');

      const submitButton = screen.getByRole('button', { name: /add part/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockApiClient.parts.create).toHaveBeenCalledWith({
          id: 'TEST-001',
          description: 'Test electronic component',
          hts_code: '8541.10.0060',
          country_of_origin: 'USA',
          standard_value: 25.00,
          material_price: 15.00,
          labor_price: 10.00,
          material_weight: 0,
          unit_of_measure: 'EA',
          gross_weight: 0,
          material: 'electronic',
          manufacturer: 'Test Mfg',
          status: 'active'
        });
      });

      expect(defaultModalProps.onSuccess).toHaveBeenCalledWith('Part added successfully');
    });

  });

  describe('AddCustomerModal', () => {
    
    test('renders with contact management section', () => {
      renderWithProviders(
        <AddCustomerModal {...defaultModalProps} />
      );

      expect(screen.getByText('Company Information')).toBeInTheDocument();
      expect(screen.getByText('Contact Information')).toBeInTheDocument();
      expect(screen.getByText('Additional Contacts')).toBeInTheDocument();
      
      expect(screen.getByLabelText(/company name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/ein/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Contact name')).toBeInTheDocument();
    });

    test('validates EIN format', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <AddCustomerModal {...defaultModalProps} />
      );

      await user.type(screen.getByLabelText(/company name/i), 'Test Company');
      await user.type(screen.getByLabelText(/ein/i), 'invalid-ein');

      const submitButton = screen.getByRole('button', { name: /add customer/i });
      await user.click(submitButton);

      expect(await screen.findByText('EIN must be in format XX-XXXXXXX')).toBeInTheDocument();
    });

    test('manages multiple contacts with primary designation', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <AddCustomerModal {...defaultModalProps} />
      );

      // Fill first contact
      await user.type(screen.getByPlaceholderText('Contact name'), 'Primary Contact');
      await user.type(screen.getByPlaceholderText('Email address'), 'primary@test.com');

      // Add second contact
      const addContactButton = screen.getByRole('button', { name: /add contact/i });
      await user.click(addContactButton);

      const contactNameInputs = screen.getAllByPlaceholderText('Contact name');
      const emailInputs = screen.getAllByPlaceholderText('Email address');
      
      await user.type(contactNameInputs[1], 'Secondary Contact');
      await user.type(emailInputs[1], 'secondary@test.com');

      // Make second contact primary
      const primaryCheckboxes = screen.getAllByLabelText(/primary contact/i);
      await user.click(primaryCheckboxes[1]);

      // Verify only second contact is primary
      expect(primaryCheckboxes[0]).not.toBeChecked();
      expect(primaryCheckboxes[1]).toBeChecked();
    });

    test('can remove contacts (but not if only one)', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <AddCustomerModal {...defaultModalProps} />
      );

      // Initially should not show delete button for single contact
      expect(screen.queryByRole('button', { name: /trash/i })).not.toBeInTheDocument();

      // Add second contact
      await user.click(screen.getByRole('button', { name: /add contact/i }));

      // Now should show delete buttons
      const deleteButtons = screen.getAllByRole('button');
      const trashButtons = deleteButtons.filter(btn => btn.innerHTML.includes('fa-trash'));
      expect(trashButtons).toHaveLength(2);

      // Remove one contact
      await user.click(trashButtons[0]);

      // Should be back to one contact with no delete button
      expect(screen.getAllByPlaceholderText('Contact name')).toHaveLength(1);
    });

    test('validates contact information requirement', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <AddCustomerModal {...defaultModalProps} />
      );

      // Fill company name but leave contacts empty
      await user.type(screen.getByLabelText(/company name/i), 'Test Company');
      
      // Clear the default contact fields
      const contactNameInput = screen.getByPlaceholderText('Contact name');
      const emailInput = screen.getByPlaceholderText('Email address');
      await user.clear(contactNameInput);
      await user.clear(emailInput);

      const submitButton = screen.getByRole('button', { name: /add customer/i });
      await user.click(submitButton);

      expect(await screen.findByText('At least one contact with name or email is required')).toBeInTheDocument();
    });

  });

  describe('AddSupplierModal', () => {
    
    test('renders with all business sections', () => {
      renderWithProviders(
        <AddSupplierModal {...defaultModalProps} />
      );

      expect(screen.getByText('Basic Information')).toBeInTheDocument();
      expect(screen.getByText('Contact Information')).toBeInTheDocument();
      expect(screen.getByText('Customs Broker Information')).toBeInTheDocument();
      expect(screen.getByText('Business Terms')).toBeInTheDocument();
      expect(screen.getByText('Additional Contacts')).toBeInTheDocument();
    });

    test('requires country selection', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <AddSupplierModal {...defaultModalProps} />
      );

      await user.type(screen.getByLabelText(/supplier name/i), 'Test Supplier');

      const submitButton = screen.getByRole('button', { name: /add supplier/i });
      await user.click(submitButton);

      expect(await screen.findByText('Country is required')).toBeInTheDocument();
    });

    test('populates country dropdown with common options', () => {
      renderWithProviders(
        <AddSupplierModal {...defaultModalProps} />
      );

      const countrySelect = screen.getByLabelText(/country/i);
      expect(countrySelect).toBeInTheDocument();

      // Check if common countries are in the DOM (options)
      expect(screen.getByText('USA')).toBeInTheDocument();
      expect(screen.getByText('CHN')).toBeInTheDocument();
      expect(screen.getByText('DEU')).toBeInTheDocument();
    });

    test('includes broker information fields', () => {
      renderWithProviders(
        <AddSupplierModal {...defaultModalProps} />
      );

      expect(screen.getByLabelText(/broker name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/broker contact person/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/broker email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/broker phone/i)).toBeInTheDocument();
    });

    test('includes business terms fields', () => {
      renderWithProviders(
        <AddSupplierModal {...defaultModalProps} />
      );

      expect(screen.getByLabelText(/payment terms/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/currency/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/status/i)).toBeInTheDocument();
    });

    test('submits with all supplier data', async () => {
      const user = userEvent.setup();
      mockApiClient.post.mockResolvedValueOnce({
        success: true,
        data: { id: 1 }
      });

      renderWithProviders(
        <AddSupplierModal {...defaultModalProps} />
      );

      // Fill basic information
      await user.type(screen.getByLabelText(/supplier name/i), 'Global Manufacturing');
      await user.selectOptions(screen.getByLabelText(/country/i), 'CHN');

      // Fill contact information  
      await user.type(screen.getByLabelText(/primary contact person/i), 'Li Wei');
      await user.type(screen.getByLabelText(/email/i), 'li@global.com');

      // Fill business terms
      await user.selectOptions(screen.getByLabelText(/payment terms/i), 'net-30');
      await user.selectOptions(screen.getByLabelText(/currency/i), 'USD');

      const submitButton = screen.getByRole('button', { name: /add supplier/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockApiClient.post).toHaveBeenCalledWith('/api/admin/suppliers', 
          expect.objectContaining({
            name: 'Global Manufacturing',
            country: 'CHN',
            contact_person: 'Li Wei',
            contact_email: 'li@global.com',
            payment_terms: 'net-30',
            currency: 'USD'
          })
        );
      });

      expect(defaultModalProps.onSuccess).toHaveBeenCalledWith('Supplier added successfully');
    });

  });

  describe('Common Modal Behaviors', () => {
    
    test('all modals close via onClose prop', () => {
      const modals = [
        <AddEmployeeModal {...defaultModalProps} />,
        <AddPartModal {...defaultModalProps} />,
        <AddCustomerModal {...defaultModalProps} />,
        <AddSupplierModal {...defaultModalProps} />
      ];

      modals.forEach((modal) => {
        const { unmount } = renderWithProviders(modal);
        
        const cancelButton = screen.getByRole('button', { name: /cancel/i });
        fireEvent.click(cancelButton);
        
        expect(defaultModalProps.onClose).toHaveBeenCalled();
        unmount();
        jest.clearAllMocks();
      });
    });

    test('all modals prevent submission when loading', async () => {
      const user = userEvent.setup();
      
      // Test with employee modal
      mockApiClient.post.mockImplementationOnce(() => 
        new Promise(() => {}) // Never resolving promise
      );

      renderWithProviders(
        <AddEmployeeModal {...defaultModalProps} />
      );

      await user.type(screen.getByLabelText(/full name/i), 'Test');
      await user.type(screen.getByLabelText(/email/i), 'test@test.com');
      await user.selectOptions(screen.getByLabelText(/role/i), 'admin');

      const submitButton = screen.getByRole('button', { name: /add employee/i });
      await user.click(submitButton);

      // Button should be disabled during submission
      expect(submitButton).toBeDisabled();
      
      // Cancel button should also be disabled
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      expect(cancelButton).toBeDisabled();
    });

    test('all modals reset form data on close', async () => {
      const user = userEvent.setup();
      
      const { rerender } = renderWithProviders(
        <AddEmployeeModal {...defaultModalProps} />
      );

      // Fill some data
      await user.type(screen.getByLabelText(/full name/i), 'Test User');
      
      // Close modal
      await user.click(screen.getByRole('button', { name: /cancel/i }));
      
      // Reopen modal
      rerender(
        <AddEmployeeModal {...defaultModalProps} isOpen={true} />
      );
      
      // Form should be reset
      expect(screen.getByLabelText(/full name/i)).toHaveValue('');
    });

  });

});