// tests/fixtures/test-data.js
// Mock data for testing shipping and receiving functionality

module.exports = {
  // User data for authentication tests
  users: {
    admin: {
      id: '1',
      email: 'admin@icrs-sparc.com',
      password: 'test123',
      role: 'admin',
      permissions: ['receiving', 'shipping', 'inventory', 'reports'],
      name: 'Admin User',
      created_at: '2024-01-01T00:00:00Z'
    },
    inspector: {
      id: '2',
      email: 'inspector@icrs-sparc.com',
      password: 'inspector123',
      role: 'inspector',
      permissions: ['receiving', 'dock_audit'],
      name: 'John Inspector',
      created_at: '2024-01-01T00:00:00Z'
    },
    shipping_clerk: {
      id: '3',
      email: 'shipping@icrs-sparc.com',
      password: 'shipping123',
      role: 'shipping_clerk',
      permissions: ['shipping', 'label_generation'],
      name: 'Jane Shipping',
      created_at: '2024-01-01T00:00:00Z'
    }
  },

  // Pre-admission data for receiving tests
  preadmissions: {
    pending: {
      id: 'preadmit-001',
      container_number: 'TEST-CONT-001',
      bol_number: 'BOL-TEST-12345',
      customer_name: 'Test Customer Inc',
      customer_id: 'CUST-001',
      description: 'Test goods for FTZ processing',
      urgency: 'normal',
      expected_arrival: '2024-02-01T08:00:00Z',
      status: 'Pending',
      created_at: '2024-01-15T10:00:00Z',
      created_by: '1'
    },
    urgent: {
      id: 'preadmit-002',
      container_number: 'URGENT-CONT-001',
      bol_number: 'BOL-URGENT-001',
      customer_name: 'Priority Customer',
      customer_id: 'CUST-002',
      description: 'Time-sensitive goods requiring immediate processing',
      urgency: 'urgent',
      expected_arrival: '2024-02-01T06:00:00Z',
      status: 'Pending',
      created_at: '2024-01-15T09:00:00Z',
      created_by: '1'
    },
    arrived: {
      id: 'preadmit-003',
      container_number: 'ARRIVED-CONT-001',
      bol_number: 'BOL-ARRIVED-001',
      customer_name: 'Arrived Customer',
      customer_id: 'CUST-003',
      description: 'Container that has arrived and needs dock audit',
      urgency: 'normal',
      expected_arrival: '2024-01-20T08:00:00Z',
      actual_arrival: '2024-01-20T08:15:00Z',
      status: 'Arrived',
      created_at: '2024-01-15T11:00:00Z',
      created_by: '1'
    }
  },

  // Dock audit data
  dockAudits: {
    accepted: {
      id: 'audit-001',
      preadmission_id: 'preadmit-003',
      container_condition: 'good',
      seal_number: 'SEAL-12345',
      seal_verified: true,
      customs_inspection: true,
      ftz_compliance: true,
      temperature_check: '72°F',
      weight_verification: '25000 lbs',
      documentation_complete: true,
      discrepancies_noted: '',
      photos: ['audit-photo-1.jpg', 'audit-photo-2.jpg'],
      inspector_notes: 'Container in excellent condition. All seals intact.',
      audit_result: 'accepted',
      inspector_name: 'John Inspector',
      inspector_signature: 'inspector_signature.png',
      audit_timestamp: '2024-01-20T09:00:00Z',
      created_by: '2'
    },
    rejected: {
      id: 'audit-002',
      preadmission_id: 'preadmit-004',
      container_condition: 'damaged',
      seal_number: 'SEAL-BROKEN',
      seal_verified: false,
      customs_inspection: false,
      ftz_compliance: false,
      temperature_check: '',
      weight_verification: '',
      documentation_complete: false,
      discrepancies_noted: 'Container shows significant damage. Seal appears broken.',
      photos: ['audit-damaged-1.jpg', 'audit-damaged-2.jpg'],
      inspector_notes: 'Container rejected due to damage and security concerns.',
      audit_result: 'rejected',
      rejection_reason: 'Container damaged, seal compromised, goods potentially contaminated',
      inspector_name: 'Safety Inspector',
      inspector_signature: 'safety_inspector_signature.png',
      audit_timestamp: '2024-01-20T10:30:00Z',
      created_by: '2'
    }
  },

  // Shipment data for shipping tests
  preshipments: {
    draft: {
      id: 'ship-001',
      shipment_id: 'SHIP-TEST-001',
      customer_name: 'Test Customer Inc',
      customer_id: 'CUST-001',
      destination_address: '123 Test St, Test City, TX 12345',
      destination_country: 'US',
      carrier: 'UPS',
      service_type: 'Ground',
      status: 'Draft',
      priority: 'normal',
      total_weight: '15.5',
      total_value: '500.00',
      package_count: 1,
      items: [
        {
          inventory_id: 'INV-001',
          part_number: 'PART-001',
          description: 'Test Item',
          quantity: 100,
          unit_value: '5.00',
          total_value: '500.00'
        }
      ],
      created_at: '2024-01-20T12:00:00Z',
      created_by: '3'
    },
    rush: {
      id: 'ship-002',
      shipment_id: 'SHIP-RUSH-001',
      customer_name: 'Rush Customer',
      customer_id: 'CUST-004',
      destination_address: '789 Express Ave, Rush City, TX 12345',
      destination_country: 'US',
      carrier: 'FedEx',
      service_type: 'Express Overnight',
      status: 'Draft',
      priority: 'rush',
      total_weight: '8.0',
      total_value: '1250.00',
      package_count: 1,
      items: [
        {
          inventory_id: 'INV-002',
          part_number: 'PART-002',
          description: 'Rush Item',
          quantity: 25,
          unit_value: '50.00',
          total_value: '1250.00'
        }
      ],
      created_at: '2024-01-20T14:00:00Z',
      created_by: '3'
    },
    international: {
      id: 'ship-003',
      shipment_id: 'SHIP-INTL-001',
      customer_name: 'International Customer',
      customer_id: 'CUST-005',
      destination_address: '123 International St, Toronto, ON M1M 1M1, Canada',
      destination_country: 'CA',
      carrier: 'FedEx',
      service_type: 'International Priority',
      status: 'Draft',
      priority: 'normal',
      total_weight: '25.0',
      total_value: '1875.00',
      package_count: 1,
      customs_required: true,
      items: [
        {
          inventory_id: 'INV-003',
          part_number: 'PART-003',
          description: 'International Item',
          quantity: 75,
          unit_value: '25.00',
          total_value: '1875.00',
          country_of_origin: 'US',
          hs_code: '123456.78'
        }
      ],
      created_at: '2024-01-20T15:00:00Z',
      created_by: '3'
    },
    hazmat: {
      id: 'ship-004',
      shipment_id: 'SHIP-HAZMAT-001',
      customer_name: 'Chemical Company',
      customer_id: 'CUST-006',
      destination_address: '321 Chemical Blvd, Industrial City, TX 12345',
      destination_country: 'US',
      carrier: 'UPS',
      service_type: 'Ground', // Ground only for hazmat
      status: 'Draft',
      priority: 'normal',
      hazmat: true,
      hazmat_class: 'Class 3 - Flammable Liquids',
      un_number: 'UN1993',
      proper_shipping_name: 'Flammable liquids, n.o.s.',
      packing_group: 'II',
      total_weight: '50.0',
      total_value: '2500.00',
      package_count: 1,
      items: [
        {
          inventory_id: 'INV-004',
          part_number: 'HAZMAT-001',
          description: 'Hazardous Chemical',
          quantity: 10,
          unit_value: '250.00',
          total_value: '2500.00'
        }
      ],
      created_at: '2024-01-20T16:00:00Z',
      created_by: '3'
    }
  },

  // Driver signoff data
  driverSignoffs: {
    standard: {
      id: 'signoff-001',
      shipment_id: 'ship-001',
      driver_name: 'Mike Driver',
      driver_license: 'DL123456789',
      truck_number: 'TRUCK-001',
      trailer_number: 'TRAILER-001',
      pickup_time: '2024-01-21T10:00:00Z',
      delivery_notes: 'Package in good condition. Handle with care.',
      driver_signature: 'driver_signature.png',
      signature_timestamp: '2024-01-21T10:05:00Z',
      packages_count: '1',
      weight_confirmed: true,
      condition_verified: true,
      created_at: '2024-01-21T10:05:00Z',
      created_by: '3'
    }
  },

  // Generated labels data
  shippingLabels: {
    ups_ground: {
      id: 'label-001',
      shipment_id: 'ship-001',
      carrier: 'UPS',
      service_type: 'Ground',
      tracking_number: '1Z999AA1234567890',
      label_url: 'https://example.com/labels/ups-ground-1.pdf',
      label_format: '4x6',
      created_at: '2024-01-21T09:00:00Z'
    },
    fedex_overnight: {
      id: 'label-002',
      shipment_id: 'ship-002',
      carrier: 'FedEx',
      service_type: 'Express Overnight',
      tracking_number: '7712345678901234',
      label_url: 'https://example.com/labels/fedex-overnight-1.pdf',
      label_format: '4x6',
      created_at: '2024-01-21T09:15:00Z'
    },
    international_with_customs: {
      id: 'label-003',
      shipment_id: 'ship-003',
      carrier: 'FedEx',
      service_type: 'International Priority',
      tracking_number: '7712345678901235',
      label_url: 'https://example.com/labels/fedex-intl-1.pdf',
      customs_form_url: 'https://example.com/customs/commercial-invoice-1.pdf',
      label_format: '4x6',
      created_at: '2024-01-21T09:30:00Z'
    }
  },

  // Inventory data
  inventory: {
    available: [
      {
        id: 'INV-001',
        part_number: 'PART-001',
        description: 'Standard Test Item',
        quantity_on_hand: 1000,
        quantity_reserved: 100,
        quantity_available: 900,
        unit_value: '5.00',
        storage_location: 'ZONE-A-001',
        lot_number: 'LOT-2024-001',
        expiry_date: null,
        hazmat: false,
        ftz_status: 'admitted',
        last_updated: '2024-01-20T12:00:00Z'
      },
      {
        id: 'INV-002',
        part_number: 'PART-002',
        description: 'Premium Rush Item',
        quantity_on_hand: 500,
        quantity_reserved: 25,
        quantity_available: 475,
        unit_value: '50.00',
        storage_location: 'ZONE-A-002',
        lot_number: 'LOT-2024-002',
        expiry_date: null,
        hazmat: false,
        ftz_status: 'admitted',
        last_updated: '2024-01-20T14:00:00Z'
      },
      {
        id: 'INV-003',
        part_number: 'PART-003',
        description: 'International Export Item',
        quantity_on_hand: 250,
        quantity_reserved: 75,
        quantity_available: 175,
        unit_value: '25.00',
        storage_location: 'ZONE-B-001',
        lot_number: 'LOT-2024-003',
        expiry_date: null,
        hazmat: false,
        ftz_status: 'admitted',
        country_of_origin: 'US',
        hs_code: '123456.78',
        last_updated: '2024-01-20T15:00:00Z'
      },
      {
        id: 'INV-004',
        part_number: 'HAZMAT-001',
        description: 'Hazardous Chemical Compound',
        quantity_on_hand: 100,
        quantity_reserved: 10,
        quantity_available: 90,
        unit_value: '250.00',
        storage_location: 'ZONE-HAZ-001',
        lot_number: 'LOT-HAZ-001',
        expiry_date: '2025-12-31T23:59:59Z',
        hazmat: true,
        hazmat_class: 'Class 3 - Flammable Liquids',
        un_number: 'UN1993',
        ftz_status: 'admitted',
        last_updated: '2024-01-20T16:00:00Z'
      }
    ]
  },

  // Customer data
  customers: [
    {
      id: 'CUST-001',
      name: 'Test Customer Inc',
      address: '123 Test St, Test City, TX 12345',
      country: 'US',
      contact_email: 'contact@testcustomer.com',
      account_type: 'standard',
      credit_limit: '50000.00',
      payment_terms: 'NET30',
      active: true
    },
    {
      id: 'CUST-002',
      name: 'Priority Customer',
      address: '456 Priority Ave, Rush City, TX 12345',
      country: 'US',
      contact_email: 'urgent@prioritycustomer.com',
      account_type: 'premium',
      credit_limit: '100000.00',
      payment_terms: 'NET15',
      active: true
    },
    {
      id: 'CUST-005',
      name: 'International Customer',
      address: '123 International St, Toronto, ON M1M 1M1, Canada',
      country: 'CA',
      contact_email: 'orders@internationalcustomer.ca',
      account_type: 'international',
      credit_limit: '75000.00',
      payment_terms: 'NET30',
      active: true
    }
  ],

  // FTZ compliance data
  ftzCompliance: {
    verified: {
      id: 'ftz-001',
      preadmission_id: 'preadmit-003',
      customs_documentation: true,
      entry_permit: true,
      zone_authorization: true,
      tariff_classification: true,
      country_of_origin: true,
      compliance_notes: 'All documentation verified. FTZ entry requirements met.',
      compliance_documents: ['ftz-compliance-doc.pdf'],
      verified_by: '2',
      verified_at: '2024-01-20T11:00:00Z'
    }
  },

  // CBP filing data
  cbpFilings: {
    export: {
      id: 'cbp-001',
      shipment_id: 'ship-003',
      export_declaration: 'EXP-2024-001',
      commodity_code: '123456',
      declared_value: '1875.00',
      destination_country: 'CA',
      filing_status: 'Filed',
      filed_at: '2024-01-21T12:00:00Z',
      filed_by: '3'
    }
  },

  // Error scenarios for testing
  errorScenarios: {
    networkError: {
      message: 'Network request failed',
      code: 'NETWORK_ERROR',
      status: 0
    },
    serverError: {
      message: 'Internal server error',
      code: 'SERVER_ERROR',
      status: 500
    },
    validationError: {
      message: 'Validation failed',
      code: 'VALIDATION_ERROR',
      status: 400,
      errors: [
        { field: 'container_number', message: 'Container number is required' },
        { field: 'bol_number', message: 'BOL number is required' },
        { field: 'customer_name', message: 'Customer name is required' }
      ]
    },
    authError: {
      message: 'Unauthorized access',
      code: 'UNAUTHORIZED',
      status: 401
    },
    notFoundError: {
      message: 'Resource not found',
      code: 'NOT_FOUND',
      status: 404
    }
  },

  // Performance test data
  performanceData: {
    largePreadmissionSet: (count = 100) => {
      const items = [];
      for (let i = 1; i <= count; i++) {
        items.push({
          id: `preadmit-perf-${i.toString().padStart(3, '0')}`,
          container_number: `PERF-CONT-${i.toString().padStart(3, '0')}`,
          bol_number: `BOL-PERF-${i.toString().padStart(3, '0')}`,
          customer_name: `Performance Customer ${i}`,
          customer_id: `CUST-PERF-${i.toString().padStart(3, '0')}`,
          description: `Performance test container ${i}`,
          urgency: i % 10 === 0 ? 'urgent' : 'normal',
          expected_arrival: new Date(Date.now() + i * 3600000).toISOString(),
          status: 'Pending',
          created_at: new Date(Date.now() - i * 60000).toISOString(),
          created_by: '1'
        });
      }
      return items;
    },
    largeShipmentSet: (count = 100) => {
      const items = [];
      for (let i = 1; i <= count; i++) {
        items.push({
          id: `ship-perf-${i.toString().padStart(3, '0')}`,
          shipment_id: `SHIP-PERF-${i.toString().padStart(3, '0')}`,
          customer_name: `Performance Customer ${i}`,
          customer_id: `CUST-PERF-${i.toString().padStart(3, '0')}`,
          destination_address: `${i}00 Performance St, Test City, TX 12345`,
          destination_country: 'US',
          carrier: i % 2 === 0 ? 'UPS' : 'FedEx',
          service_type: i % 2 === 0 ? 'Ground' : 'Express',
          status: 'Draft',
          priority: i % 20 === 0 ? 'rush' : 'normal',
          total_weight: `${(Math.random() * 50 + 1).toFixed(1)}`,
          total_value: `${(Math.random() * 5000 + 100).toFixed(2)}`,
          package_count: Math.floor(Math.random() * 5) + 1,
          created_at: new Date(Date.now() - i * 60000).toISOString(),
          created_by: '3'
        });
      }
      return items;
    }
  }
};