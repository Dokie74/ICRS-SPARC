// src/backend/utils/mock-data.js
// Mock data generator for demo mode - bypasses Supabase PostgREST
// Provides realistic test data for development and demonstration

// Helper function to detect demo tokens
function isDemoToken(accessToken) {
  return accessToken && accessToken.startsWith('demo-token-for-testing-only-');
}

// Mock customers data
const mockCustomers = [
  {
    id: '1',
    name: 'Acme Manufacturing Corp',
    code: 'ACME001',
    contact_person: 'John Smith',
    email: 'john.smith@acme.com',
    phone: '+1-555-0101',
    address: '123 Industrial Way',
    city: 'Houston',
    state: 'TX',
    postal_code: '77001',
    country: 'USA',
    tax_id: '75-1234567',
    customs_broker: 'ABC Customs',
    notes: 'Major manufacturing client',
    active: true,
    created_at: '2024-01-15T10:00:00Z',
    created_by: '550e8400-e29b-41d4-a716-446655440000'
  },
  {
    id: '2',
    name: 'Global Electronics Ltd',
    code: 'GLOB002',
    contact_person: 'Sarah Wilson',
    email: 'sarah.wilson@global-elec.com',
    phone: '+1-555-0202',
    address: '456 Tech Boulevard',
    city: 'Austin',
    state: 'TX',
    postal_code: '73301',
    country: 'USA',
    tax_id: '75-9876543',
    customs_broker: 'Tech Trade Services',
    notes: 'Electronics importer',
    active: true,
    created_at: '2024-02-10T14:30:00Z',
    created_by: '550e8400-e29b-41d4-a716-446655440000'
  },
  {
    id: '3',
    name: 'Pacific Import Solutions',
    code: 'PAC003',
    contact_person: 'Michael Chen',
    email: 'm.chen@pacific-import.com',
    phone: '+1-555-0303',
    address: '789 Harbor Drive',
    city: 'Long Beach',
    state: 'CA',
    postal_code: '90802',
    country: 'USA',
    tax_id: '95-5555555',
    customs_broker: 'Harbor Customs Group',
    notes: 'West Coast distribution hub',
    active: true,
    created_at: '2024-03-05T09:15:00Z',
    created_by: '550e8400-e29b-41d4-a716-446655440000'
  }
];

// Mock locations data
const mockLocations = [
  {
    id: '1',
    name: 'Warehouse A - Zone 1',
    code: 'WH-A-Z1',
    description: 'Main warehouse - Zone 1 (Climate Controlled)',
    zone: 'Zone 1',
    capacity: 10000,
    available_space: 7500,
    active: true,
    created_at: '2024-01-01T08:00:00Z',
    updated_at: '2024-01-01T08:00:00Z'
  },
  {
    id: '2',
    name: 'Warehouse A - Zone 2',
    code: 'WH-A-Z2',
    description: 'Main warehouse - Zone 2 (General Storage)',
    zone: 'Zone 2',
    capacity: 15000,
    available_space: 12000,
    active: true,
    created_at: '2024-01-01T08:00:00Z',
    updated_at: '2024-01-01T08:00:00Z'
  },
  {
    id: '3',
    name: 'Warehouse B - Overflow',
    code: 'WH-B-OF',
    description: 'Overflow warehouse (Temporary Storage)',
    zone: 'Overflow',
    capacity: 5000,
    available_space: 3000,
    active: true,
    created_at: '2024-01-01T08:00:00Z',
    updated_at: '2024-01-01T08:00:00Z'
  },
  {
    id: '4',
    name: 'Loading Dock A',
    code: 'LD-A',
    description: 'Loading dock for incoming shipments',
    zone: 'Dock',
    capacity: 500,
    available_space: 200,
    active: true,
    created_at: '2024-01-01T08:00:00Z',
    updated_at: '2024-01-01T08:00:00Z'
  }
];

// Mock materials/parts data
const mockMaterials = [
  {
    id: '1',
    name: 'Steel Coil - Grade A36',
    code: 'STL-A36-001',
    description: 'Hot-rolled steel coil, ASTM A36 grade',
    category: 'Raw Materials',
    unit_of_measure: 'MT',
    standard_cost: 650.00,
    hs_code: '7208.52.00',
    country_of_origin: 'China',
    active: true,
    created_at: '2024-01-10T10:00:00Z',
    updated_at: '2024-01-10T10:00:00Z'
  },
  {
    id: '2',
    name: 'Aluminum Sheet - 6061-T6',
    code: 'ALU-6061-002',
    description: 'Aluminum sheet, alloy 6061-T6, 0.125" thickness',
    category: 'Raw Materials',
    unit_of_measure: 'SQ FT',
    standard_cost: 3.25,
    hs_code: '7606.12.30',
    country_of_origin: 'Canada',
    active: true,
    created_at: '2024-01-12T11:30:00Z',
    updated_at: '2024-01-12T11:30:00Z'
  },
  {
    id: '3',
    name: 'Electronic Component - IC Chip',
    code: 'ELEC-IC-003',
    description: 'Integrated circuit chip, ARM Cortex-M4',
    category: 'Electronics',
    unit_of_measure: 'EA',
    standard_cost: 15.50,
    hs_code: '8542.33.00',
    country_of_origin: 'Taiwan',
    active: true,
    created_at: '2024-01-15T14:00:00Z',
    updated_at: '2024-01-15T14:00:00Z'
  },
  {
    id: '4',
    name: 'Plastic Resin - HDPE',
    code: 'PLS-HDPE-004',
    description: 'High-density polyethylene resin pellets',
    category: 'Plastics',
    unit_of_measure: 'KG',
    standard_cost: 1.85,
    hs_code: '3901.20.00',
    country_of_origin: 'USA',
    active: true,
    created_at: '2024-01-20T09:45:00Z',
    updated_at: '2024-01-20T09:45:00Z'
  }
];

// Mock parts data (for backwards compatibility)
const mockParts = mockMaterials.map(material => ({
  ...material,
  material: material.category?.toLowerCase()?.includes('steel') ? 'steel' : 
           material.category?.toLowerCase()?.includes('aluminum') ? 'aluminum' :
           material.category?.toLowerCase()?.includes('electronic') ? 'other' :
           material.category?.toLowerCase()?.includes('plastic') ? 'plastic' : 'other',
  part_number: material.code,
  unit_cost: material.standard_cost,
  standard_value: material.standard_cost,
  hts_code: material.hs_code,
  hts_description: material.description,
  gross_weight: Math.round(Math.random() * 10 + 1), // Random weight between 1-10 kg
  manufacturer_id: `MFG-${Math.floor(Math.random() * 100)}`,
  status: 'active'
}));

// Mock inventory lots
const mockInventoryLots = [
  {
    id: '1',
    lot_number: 'LOT-2024-001',
    customer_id: '1',
    part_id: '1',
    quantity: 50,
    unit_value: 650.00,
    total_value: 32500.00,
    entry_date: '2024-01-15T10:30:00Z',
    storage_location_id: '1',
    active: true,
    parts: { description: 'Steel Coil - Grade A36', material: 'Steel' },
    storage_locations: { location_code: 'WH-A-Z1' }
  },
  {
    id: '2',
    lot_number: 'LOT-2024-002',
    customer_id: '1',
    part_id: '2',
    quantity: 1000,
    unit_value: 3.25,
    total_value: 3250.00,
    entry_date: '2024-01-20T14:15:00Z',
    storage_location_id: '2',
    active: true,
    parts: { description: 'Aluminum Sheet - 6061-T6', material: 'Aluminum' },
    storage_locations: { location_code: 'WH-A-Z2' }
  }
];

// Mock preadmissions
const mockPreadmissions = [
  {
    id: '1',
    container_number: 'MSKU1234567',
    customer_id: '1',
    status: 'pending',
    entry_date: '2024-01-25T08:00:00Z',
    arrival_date: '2024-01-24T16:30:00Z',
    customs_value: 45000.00,
    bill_of_lading: 'BOL-2024-001',
    vessel_name: 'Pacific Trader',
    voyage_number: 'PT-024A'
  },
  {
    id: '2',
    container_number: 'TCLU9876543',
    customer_id: '2',
    status: 'approved',
    entry_date: '2024-01-28T10:15:00Z',
    arrival_date: '2024-01-27T12:45:00Z',
    customs_value: 28750.00,
    bill_of_lading: 'BOL-2024-002',
    vessel_name: 'Global Express',
    voyage_number: 'GE-156B'
  }
];

// Helper functions for filtering and pagination
function applyFilters(data, filters = []) {
  if (!filters || filters.length === 0) return data;
  
  return data.filter(item => {
    return filters.every(filter => {
      const value = item[filter.column];
      const filterValue = filter.value;
      
      switch (filter.operator || 'eq') {
        case 'eq':
          return value === filterValue;
        case 'neq':
          return value !== filterValue;
        case 'gt':
          return value > filterValue;
        case 'gte':
          return value >= filterValue;
        case 'lt':
          return value < filterValue;
        case 'lte':
          return value <= filterValue;
        case 'like':
        case 'ilike':
          return String(value).toLowerCase().includes(String(filterValue).toLowerCase().replace(/%/g, ''));
        case 'in':
          return Array.isArray(filterValue) ? filterValue.includes(value) : value === filterValue;
        default:
          return value === filterValue;
      }
    });
  });
}

function applyPagination(data, limit = 100, offset = 0) {
  const start = parseInt(offset) || 0;
  const count = parseInt(limit) || 100;
  return data.slice(start, start + count);
}

function applySorting(data, orderBy) {
  if (!orderBy || !orderBy.column) return data;
  
  return data.sort((a, b) => {
    const aVal = a[orderBy.column];
    const bVal = b[orderBy.column];
    
    if (aVal === bVal) return 0;
    if (aVal === null || aVal === undefined) return 1;
    if (bVal === null || bVal === undefined) return -1;
    
    const comparison = aVal < bVal ? -1 : 1;
    return orderBy.ascending !== false ? comparison : -comparison;
  });
}

// Main mock data functions
function getMockCustomers(options = {}) {
  let data = [...mockCustomers];
  
  if (options.filters) {
    data = applyFilters(data, options.filters);
  }
  
  if (options.orderBy) {
    data = applySorting(data, options.orderBy);
  }
  
  const totalCount = data.length;
  
  if (options.limit || options.offset) {
    data = applyPagination(data, options.limit, options.offset);
  }
  
  return {
    success: true,
    data,
    count: totalCount
  };
}

function getMockCustomerById(id) {
  const customer = mockCustomers.find(c => c.id === id);
  if (!customer) {
    return { success: false, error: 'Customer not found' };
  }
  
  // Add related data
  const inventoryLots = mockInventoryLots.filter(lot => lot.customer_id === id);
  const preadmissions = mockPreadmissions.filter(pa => pa.customer_id === id);
  
  return {
    success: true,
    data: {
      ...customer,
      inventory_lots: inventoryLots,
      preadmissions: preadmissions
    }
  };
}

function getMockLocations(options = {}) {
  let data = [...mockLocations];
  
  if (options.filters) {
    data = applyFilters(data, options.filters);
  }
  
  if (options.orderBy) {
    data = applySorting(data, options.orderBy);
  }
  
  const totalCount = data.length;
  
  if (options.limit || options.offset) {
    data = applyPagination(data, options.limit, options.offset);
  }
  
  return {
    success: true,
    data,
    count: totalCount
  };
}

function getMockLocationById(id) {
  const location = mockLocations.find(l => l.id === id);
  return location 
    ? { success: true, data: location }
    : { success: false, error: 'Location not found' };
}

function getMockMaterials(options = {}) {
  let data = [...mockMaterials];
  
  if (options.filters) {
    data = applyFilters(data, options.filters);
  }
  
  if (options.orderBy) {
    data = applySorting(data, options.orderBy);
  }
  
  const totalCount = data.length;
  
  if (options.limit || options.offset) {
    data = applyPagination(data, options.limit, options.offset);
  }
  
  return {
    success: true,
    data,
    count: totalCount
  };
}

function getMockMaterialById(id) {
  const material = mockMaterials.find(m => m.id === id);
  return material 
    ? { success: true, data: material }
    : { success: false, error: 'Material not found' };
}

// Parts functions (for backwards compatibility)
function getMockParts(options = {}) {
  return getMockMaterials(options);
}

function getMockPartById(id) {
  const part = mockParts.find(p => p.id === id);
  return part 
    ? { success: true, data: part }
    : { success: false, error: 'Part not found' };
}

module.exports = {
  isDemoToken,
  getMockCustomers,
  getMockCustomerById,
  getMockLocations,
  getMockLocationById,
  getMockMaterials,
  getMockMaterialById,
  getMockParts,
  getMockPartById,
  mockCustomers,
  mockLocations,
  mockMaterials,
  mockParts,
  mockInventoryLots,
  mockPreadmissions
};