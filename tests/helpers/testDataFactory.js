// tests/helpers/testDataFactory.js
// Factory for creating consistent test data across all test suites

const { v4: uuidv4 } = require('uuid');

class TestDataFactory {
  constructor() {
    this.counters = {
      customer: 0,
      part: 0,
      lot: 0,
      user: 0,
      preadmission: 0,
      preshipment: 0
    };
  }

  reset() {
    this.counters = {
      customer: 0,
      part: 0,
      lot: 0,
      user: 0,
      preadmission: 0,
      preshipment: 0
    };
  }

  // Generate unique IDs with incremental counters for predictability
  generateId(prefix = 'test') {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Create base test data that most tests need
  async createBaseTestData() {
    const testUser = this.createTestEmployee({
      role: 'warehouse_staff',
      email: 'warehouse@test.com'
    });

    const testCustomer = this.createTestCustomer({
      name: 'Test Customer Corp',
      code: 'TESTCORP'
    });

    const testPart = this.createTestPart({
      description: 'Electronic Test Component',
      part_number: 'TEST-PART-001'
    });

    const testStorageLocation = this.createTestStorageLocation({
      location_code: 'A-01-05',
      description: 'Test Storage Location'
    });

    return {
      testUser,
      warehouseUser: testUser, // Alias for backward compatibility
      testCustomer,
      testPart,
      testStorageLocation
    };
  }

  // Employee/User factory
  createTestEmployee(overrides = {}) {
    this.counters.user++;
    
    const defaults = {
      id: this.generateId('user'),
      user_id: this.generateId('auth'),
      employee_number: `EMP${this.counters.user.toString().padStart(3, '0')}`,
      first_name: `Test${this.counters.user}`,
      last_name: 'User',
      email: `test${this.counters.user}@test.com`,
      role: 'warehouse_staff',
      active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    return { ...defaults, ...overrides };
  }

  // Customer factory
  createTestCustomer(overrides = {}) {
    this.counters.customer++;
    
    const defaults = {
      id: this.generateId('customer'),
      name: `Test Customer ${this.counters.customer}`,
      code: `CUST${this.counters.customer.toString().padStart(3, '0')}`,
      address: {
        street: `${this.counters.customer} Test Street`,
        city: 'Test City',
        state: 'TS',
        zip: `${(12345 + this.counters.customer).toString().padStart(5, '0')}`,
        country: 'US'
      },
      contact_info: {
        phone: '555-123-4567',
        email: `customer${this.counters.customer}@testcorp.com`,
        contact_person: `Contact Person ${this.counters.customer}`
      },
      bond_number: `BOND${this.counters.customer.toString().padStart(6, '0')}`,
      ftz_operator_id: `FTZ${this.counters.customer.toString().padStart(4, '0')}`,
      active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    return { ...defaults, ...overrides };
  }

  // Part factory
  createTestPart(overrides = {}) {
    this.counters.part++;
    
    const defaults = {
      id: this.generateId('part'),
      description: `Test Part Component ${this.counters.part}`,
      part_number: `PART${this.counters.part.toString().padStart(4, '0')}`,
      material: ['Steel', 'Aluminum', 'Plastic', 'Electronics'][this.counters.part % 4],
      hts_code: this.generateHTSCode(),
      unit_of_measure: ['EA', 'LB', 'KG', 'M2'][this.counters.part % 4],
      country_of_origin: ['CN', 'MX', 'DE', 'JP'][this.counters.part % 4],
      standard_value: Math.round((Math.random() * 500 + 10) * 100) / 100,
      active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    return { ...defaults, ...overrides };
  }

  // Storage location factory
  createTestStorageLocation(overrides = {}) {
    const locationNum = Object.keys(overrides).length || this.counters.lot;
    
    const defaults = {
      id: this.generateId('location'),
      location_code: `${String.fromCharCode(65 + (locationNum % 26))}-${Math.floor(locationNum / 26) + 1}-${(locationNum % 10) + 1}`,
      description: `Warehouse ${String.fromCharCode(65 + (locationNum % 26))}, Aisle ${Math.floor(locationNum / 26) + 1}, Rack ${(locationNum % 10) + 1}`,
      zone: `Zone ${String.fromCharCode(65 + (locationNum % 4))}`,
      aisle: `${Math.floor(locationNum / 26) + 1}`,
      rack: `R${(locationNum % 20) + 1}`,
      shelf: `S${(locationNum % 5) + 1}`,
      active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    return { ...defaults, ...overrides };
  }

  // Inventory lot factory
  createInventoryLot(overrides = {}) {
    this.counters.lot++;
    
    const defaults = {
      id: `LOT-${this.counters.lot.toString().padStart(6, '0')}`,
      part_id: overrides.part_id || this.generateId('part'),
      customer_id: overrides.customer_id || this.generateId('customer'),
      storage_location_id: overrides.storage_location_id || this.generateId('location'),
      status: 'In Stock',
      original_quantity: Math.floor(Math.random() * 1000) + 100,
      current_quantity: Math.floor(Math.random() * 900) + 50,
      admission_date: this.generateRandomPastDate(30),
      manifest_number: `MAN-${this.counters.lot.toString().padStart(6, '0')}`,
      e214_admission_number: `E214-${this.counters.lot.toString().padStart(8, '0')}`,
      conveyance_name: this.generateConveyanceName(),
      import_date: this.generateRandomPastDate(45),
      port_of_unlading: this.generatePort(),
      bill_of_lading: `BOL-${this.counters.lot.toString().padStart(8, '0')}`,
      total_value: Math.round((Math.random() * 50000 + 1000) * 100) / 100,
      total_charges: Math.round((Math.random() * 5000 + 100) * 100) / 100,
      voided: false,
      active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Ensure current_quantity <= original_quantity
    if (defaults.current_quantity > defaults.original_quantity) {
      defaults.current_quantity = defaults.original_quantity;
    }

    return { ...defaults, ...overrides };
  }

  // Transaction factory
  createTransaction(overrides = {}) {
    const defaults = {
      id: this.generateId('transaction'),
      lot_id: overrides.lot_id || this.generateId('lot'),
      type: overrides.type || ['Admission', 'Shipment', 'Adjustment', 'Removal'][Math.floor(Math.random() * 4)],
      quantity: overrides.quantity || (Math.random() > 0.5 ? Math.floor(Math.random() * 100) + 1 : -(Math.floor(Math.random() * 50) + 1)),
      source_document_number: overrides.source_document_number || this.generateDocumentNumber(),
      reference_data: overrides.reference_data || this.generateTransactionReference(),
      created_at: overrides.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: overrides.created_by || this.generateId('user')
    };

    return { ...defaults, ...overrides };
  }

  // Preadmission factory
  createPreadmission(overrides = {}) {
    this.counters.preadmission++;
    
    const defaults = {
      id: this.generateId('preadmission'),
      customer_id: overrides.customer_id || this.generateId('customer'),
      part_id: overrides.part_id || this.generateId('part'),
      status: 'Pending',
      quantity: Math.floor(Math.random() * 1000) + 100,
      estimated_admission_date: this.generateRandomFutureDate(14),
      manifest_number: `PRE-MAN-${this.counters.preadmission.toString().padStart(6, '0')}`,
      conveyance_name: this.generateConveyanceName(),
      import_date: this.generateRandomFutureDate(7),
      port_of_unlading: this.generatePort(),
      bill_of_lading: `PRE-BOL-${this.counters.preadmission.toString().padStart(8, '0')}`,
      total_value: Math.round((Math.random() * 50000 + 1000) * 100) / 100,
      notes: `Test preadmission notes for ${this.counters.preadmission}`,
      processed_to_lot_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    return { ...defaults, ...overrides };
  }

  // Preshipment factory
  createPreshipment(overrides = {}) {
    this.counters.preshipment++;
    
    const defaults = {
      id: this.generateId('preshipment'),
      customer_id: overrides.customer_id || this.generateId('customer'),
      status: 'Pending',
      shipment_date: this.generateRandomFutureDate(14),
      destination: {
        company: `Destination Company ${this.counters.preshipment}`,
        address: `${this.counters.preshipment} Destination Street`,
        city: 'Destination City',
        state: 'DS',
        zip: `${(54321 + this.counters.preshipment).toString().padStart(5, '0')}`,
        country: 'US'
      },
      total_value: Math.round((Math.random() * 25000 + 500) * 100) / 100,
      notes: `Test preshipment notes for ${this.counters.preshipment}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    return { ...defaults, ...overrides };
  }

  // Preshipment item factory
  createPreshipmentItem(overrides = {}) {
    const defaults = {
      id: this.generateId('preshipment-item'),
      preshipment_id: overrides.preshipment_id || this.generateId('preshipment'),
      lot_id: overrides.lot_id || this.generateId('lot'),
      quantity: Math.floor(Math.random() * 100) + 1,
      unit_value: Math.round((Math.random() * 500 + 10) * 100) / 100,
      created_at: new Date().toISOString()
    };

    return { ...defaults, ...overrides };
  }

  // Entry summary factory
  createEntrySummary(overrides = {}) {
    const entryNum = Math.floor(Math.random() * 999999) + 100000;
    
    const defaults = {
      id: this.generateId('entry-summary'),
      customer_id: overrides.customer_id || this.generateId('customer'),
      entry_number: `${entryNum}-${Math.floor(Math.random() * 99) + 10}`,
      entry_date: this.generateRandomPastDate(30),
      status: 'Draft',
      total_value: Math.round((Math.random() * 100000 + 5000) * 100) / 100,
      total_duty: Math.round((Math.random() * 10000 + 500) * 100) / 100,
      total_taxes: Math.round((Math.random() * 5000 + 250) * 100) / 100,
      cbp_form_data: {
        form_type: '7501',
        port_code: this.generatePortCode(),
        importer_number: `IMP${Math.floor(Math.random() * 999999).toString().padStart(6, '0')}`
      },
      ace_submission_data: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    return { ...defaults, ...overrides };
  }

  // Helper methods for generating realistic data
  generateHTSCode() {
    const chapter = Math.floor(Math.random() * 97) + 1;
    const heading = Math.floor(Math.random() * 99) + 1;
    const subheading = Math.floor(Math.random() * 99);
    const statisticalSuffix = Math.floor(Math.random() * 9999);
    
    return `${chapter.toString().padStart(2, '0')}${heading.toString().padStart(2, '0')}.${subheading.toString().padStart(2, '0')}.${statisticalSuffix.toString().padStart(4, '0')}`;
  }

  generateConveyanceName() {
    const prefixes = ['MV', 'SS', 'MSC', 'OOCL'];
    const names = ['Phoenix', 'Enterprise', 'Discovery', 'Victory', 'Liberty', 'Harmony', 'Challenger', 'Navigator'];
    
    return `${prefixes[Math.floor(Math.random() * prefixes.length)]} ${names[Math.floor(Math.random() * names.length)]}`;
  }

  generatePort() {
    const ports = [
      'Los Angeles',
      'Long Beach', 
      'New York',
      'Savannah',
      'Seattle',
      'Houston',
      'Charleston',
      'Miami',
      'Oakland',
      'Norfolk'
    ];
    
    return ports[Math.floor(Math.random() * ports.length)];
  }

  generatePortCode() {
    const codes = ['2704', '2704', '4601', '5701', '3011', '5301', '5706', '5401', '2801', '5501'];
    return codes[Math.floor(Math.random() * codes.length)];
  }

  generateDocumentNumber() {
    const types = ['BOL', 'INV', 'PL', 'CO', 'BL'];
    const type = types[Math.floor(Math.random() * types.length)];
    const number = Math.floor(Math.random() * 999999).toString().padStart(6, '0');
    
    return `${type}-${number}`;
  }

  generateTransactionReference() {
    return {
      document_type: ['Admission', 'Shipment', 'Transfer', 'Adjustment'][Math.floor(Math.random() * 4)],
      reference_number: this.generateDocumentNumber(),
      processed_by: `Test User ${Math.floor(Math.random() * 10) + 1}`,
      notes: 'Generated by test data factory'
    };
  }

  generateRandomPastDate(maxDaysAgo = 30) {
    const now = new Date();
    const pastTime = now.getTime() - (Math.random() * maxDaysAgo * 24 * 60 * 60 * 1000);
    return new Date(pastTime).toISOString();
  }

  generateRandomFutureDate(maxDaysAhead = 30) {
    const now = new Date();
    const futureTime = now.getTime() + (Math.random() * maxDaysAhead * 24 * 60 * 60 * 1000);
    return new Date(futureTime).toISOString();
  }

  // Create batch data for performance testing
  createLargeBatchData(config = {}) {
    const {
      customerCount = 10,
      partCount = 50,
      lotCount = 1000,
      transactionCount = 2000
    } = config;

    const customers = [];
    const parts = [];
    const lots = [];
    const transactions = [];

    // Create customers
    for (let i = 0; i < customerCount; i++) {
      customers.push(this.createTestCustomer());
    }

    // Create parts
    for (let i = 0; i < partCount; i++) {
      parts.push(this.createTestPart());
    }

    // Create lots
    for (let i = 0; i < lotCount; i++) {
      const customer = customers[i % customerCount];
      const part = parts[i % partCount];
      
      lots.push(this.createInventoryLot({
        customer_id: customer.id,
        part_id: part.id
      }));
    }

    // Create transactions
    for (let i = 0; i < transactionCount; i++) {
      const lot = lots[i % lotCount];
      
      transactions.push(this.createTransaction({
        lot_id: lot.id
      }));
    }

    return {
      customers,
      parts,
      lots,
      transactions
    };
  }

  // Create realistic business scenarios
  createBusinessScenario(scenarioType) {
    switch (scenarioType) {
      case 'complete_workflow':
        return this.createCompleteWorkflowScenario();
      
      case 'high_volume_operations':
        return this.createHighVolumeScenario();
      
      case 'complex_shipment':
        return this.createComplexShipmentScenario();
      
      default:
        throw new Error(`Unknown scenario type: ${scenarioType}`);
    }
  }

  createCompleteWorkflowScenario() {
    const customer = this.createTestCustomer();
    const part = this.createTestPart();
    const location = this.createTestStorageLocation();
    
    const preadmission = this.createPreadmission({
      customer_id: customer.id,
      part_id: part.id
    });

    const lot = this.createInventoryLot({
      customer_id: customer.id,
      part_id: part.id,
      storage_location_id: location.id
    });

    const admissionTransaction = this.createTransaction({
      lot_id: lot.id,
      type: 'Admission',
      quantity: lot.original_quantity
    });

    const preshipment = this.createPreshipment({
      customer_id: customer.id
    });

    const preshipmentItem = this.createPreshipmentItem({
      preshipment_id: preshipment.id,
      lot_id: lot.id,
      quantity: Math.floor(lot.current_quantity / 2)
    });

    return {
      customer,
      part,
      location,
      preadmission,
      lot,
      admissionTransaction,
      preshipment,
      preshipmentItem
    };
  }

  createHighVolumeScenario() {
    return this.createLargeBatchData({
      customerCount: 50,
      partCount: 200,
      lotCount: 5000,
      transactionCount: 15000
    });
  }

  createComplexShipmentScenario() {
    const customer = this.createTestCustomer();
    const parts = [
      this.createTestPart(),
      this.createTestPart(),
      this.createTestPart()
    ];

    const locations = [
      this.createTestStorageLocation(),
      this.createTestStorageLocation()
    ];

    const lots = parts.map((part, index) => 
      this.createInventoryLot({
        customer_id: customer.id,
        part_id: part.id,
        storage_location_id: locations[index % locations.length].id
      })
    );

    const preshipment = this.createPreshipment({
      customer_id: customer.id
    });

    const preshipmentItems = lots.map(lot =>
      this.createPreshipmentItem({
        preshipment_id: preshipment.id,
        lot_id: lot.id,
        quantity: Math.floor(lot.current_quantity * 0.3) // Ship 30% of each lot
      })
    );

    const entrySummary = this.createEntrySummary({
      customer_id: customer.id
    });

    return {
      customer,
      parts,
      locations,
      lots,
      preshipment,
      preshipmentItems,
      entrySummary
    };
  }
}

module.exports = new TestDataFactory();