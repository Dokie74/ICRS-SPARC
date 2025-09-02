// src/backend/api/routes/preshipments.js
// Pre-shipment management routes for ICRS SPARC API
// Complete implementation matching original ICRS functionality with ACE Entry Summary support

const express = require('express');
const { asyncHandler } = require('../middleware/error-handler');
const { requireStaff, requireManager } = require('../middleware/auth');
const supabaseClient = require('../../db/supabase-client');
const { isDemoToken } = require('../../utils/mock-data');
const validation = require('../../utils/validation');

const router = express.Router();

// Mock data for demo purposes
const mockPreshipments = [
  {
    id: '550e8400-e29b-41d4-a716-446655440001',
    shipmentId: 'PS-2024-001',
    type: '7501 Consumption Entry',
    customerId: '550e8400-e29b-41d4-a716-446655440000',
    items: [
      { lot: 'L-12345', qty: 100, part_id: 'PART-001', description: 'Widget A', unit_value: 25.50, total_value: 2550.00, hts_code: '8421.23.0000', country_of_origin: 'CN' }
    ],
    entryNumber: 'ENT-2024-001',
    stage: 'Planning',
    entry_summary_status: 'NOT_PREPARED',
    filing_district_port: '1001',
    entry_filer_code: 'ABC',
    carrier_code: 'SCAC',
    estimated_total_value: 2550.00,
    estimated_duty_amount: 255.00,
    requested_ship_date: '2024-12-31',
    priority: 'Normal',
    created_at: '2024-08-30T10:00:00Z',
    updated_at: '2024-08-30T10:00:00Z'
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440002',
    shipmentId: 'PS-2024-002',
    type: '7512 T&E Export',
    customerId: '550e8400-e29b-41d4-a716-446655440000',
    items: [
      { lot: 'L-12346', qty: 50, part_id: 'PART-002', description: 'Widget B', unit_value: 45.00, total_value: 2250.00, hts_code: '8421.23.0000', country_of_origin: 'US' }
    ],
    entryNumber: 'ENT-2024-002',
    stage: 'Shipped',
    entry_summary_status: 'ACCEPTED',
    driver_name: 'John Driver',
    driver_license_number: 'DL123456789',
    license_plate_number: 'ABC123',
    carrier_name: 'Express Shipping',
    shipped_at: '2024-08-29T15:30:00Z',
    tracking_number: 'TRACK123456',
    estimated_total_value: 2250.00,
    estimated_duty_amount: 0.00,
    requested_ship_date: '2024-08-29',
    priority: 'High',
    created_at: '2024-08-28T09:00:00Z',
    updated_at: '2024-08-29T15:30:00Z'
  }
];

// ACE field validation helpers
const validateACEFields = (data) => {
  const errors = [];
  
  if (data.filing_district_port && !/^[A-Za-z0-9]{4}$/.test(data.filing_district_port)) {
    errors.push('Filing District Port must be exactly 4 alphanumeric characters');
  }
  
  if (data.entry_filer_code && !/^[A-Za-z0-9]{3}$/.test(data.entry_filer_code)) {
    errors.push('Entry Filer Code must be exactly 3 alphanumeric characters');
  }
  
  if (data.carrier_code && !/^[A-Z]{4}$/.test(data.carrier_code)) {
    errors.push('Carrier Code must be exactly 4 uppercase letters (SCAC format)');
  }
  
  if (data.weekly_entry && !data.zone_week_ending_date) {
    errors.push('Zone week ending date is required for weekly entries');
  }
  
  return errors;
};

// Inventory allocation tracking (prevent over-allocation)
const checkInventoryAllocation = async (items, excludeShipmentId = null, accessToken) => {
  const allocationErrors = [];
  
  for (const item of items) {
    if (!item.part_id || !item.qty) continue;
    
    // Get current inventory for this part
    const inventoryQuery = await supabaseClient.getAll('inventory', {
      filters: [{ column: 'part_id', value: item.part_id }],
      accessToken
    });
    
    if (!inventoryQuery.success || inventoryQuery.data.length === 0) {
      allocationErrors.push(`Part ${item.part_id} not found in inventory`);
      continue;
    }
    
    const availableQty = inventoryQuery.data.reduce((sum, inv) => sum + (inv.quantity || 0), 0);
    
    // Get already allocated quantity (excluding current shipment if updating)
    let allocatedQty = 0;
    const allocationQuery = await supabaseClient.getAll('preshipments', {
      filters: [
        { column: 'stage', value: 'Shipped', operator: 'neq' }
      ],
      accessToken
    });
    
    if (allocationQuery.success) {
      allocatedQty = allocationQuery.data
        .filter(ps => excludeShipmentId ? ps.shipmentId !== excludeShipmentId : true)
        .reduce((sum, ps) => {
          const shipmentItems = ps.items || [];
          const partAllocation = shipmentItems
            .filter(si => si.part_id === item.part_id)
            .reduce((partSum, si) => partSum + (si.qty || 0), 0);
          return sum + partAllocation;
        }, 0);
    }
    
    const requestedQty = item.qty;
    if (availableQty - allocatedQty < requestedQty) {
      allocationErrors.push(
        `Insufficient inventory for ${item.part_id}: Available ${availableQty - allocatedQty}, Requested ${requestedQty}`
      );
    }
  }
  
  return allocationErrors;
};

/**
 * GET /api/preshipments
 * Get all preshipments with filtering and pagination
 */
router.get('/', asyncHandler(async (req, res) => {
  const { 
    limit = 100,
    offset = 0,
    status,
    type,
    customer_id,
    stage,
    entry_summary_status,
    shipment_id,
    entry_number,
    start_date,
    end_date,
    priority,
    orderBy = 'created_at',
    ascending = 'false'
  } = req.query;

  const accessToken = req.headers.authorization?.replace('Bearer ', '') || req.accessToken;

  // Use mock data for demo tokens
  if (isDemoToken(accessToken)) {
    let filteredPreshipments = [...mockPreshipments];

    // Apply filters
    if (status) filteredPreshipments = filteredPreshipments.filter(ps => ps.stage === status);
    if (type) filteredPreshipments = filteredPreshipments.filter(ps => ps.type === type);
    if (customer_id && customer_id !== 'undefined') {
      filteredPreshipments = filteredPreshipments.filter(ps => ps.customerId === customer_id);
    }
    if (stage) filteredPreshipments = filteredPreshipments.filter(ps => ps.stage === stage);
    if (entry_summary_status) {
      filteredPreshipments = filteredPreshipments.filter(ps => ps.entry_summary_status === entry_summary_status);
    }
    if (shipment_id) {
      filteredPreshipments = filteredPreshipments.filter(ps => 
        ps.shipmentId.toLowerCase().includes(shipment_id.toLowerCase())
      );
    }
    if (entry_number) {
      filteredPreshipments = filteredPreshipments.filter(ps => 
        ps.entryNumber && ps.entryNumber.toLowerCase().includes(entry_number.toLowerCase())
      );
    }
    if (start_date) {
      filteredPreshipments = filteredPreshipments.filter(ps => ps.created_at >= start_date);
    }
    if (end_date) {
      filteredPreshipments = filteredPreshipments.filter(ps => ps.created_at <= end_date);
    }
    if (priority) filteredPreshipments = filteredPreshipments.filter(ps => ps.priority === priority);

    // Apply sorting
    filteredPreshipments.sort((a, b) => {
      const aVal = a[orderBy] || a.created_at;
      const bVal = b[orderBy] || b.created_at;
      const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return ascending === 'true' ? comparison : -comparison;
    });

    // Apply pagination
    const start = parseInt(offset) || 0;
    const count = parseInt(limit) || 100;
    const paginatedPreshipments = filteredPreshipments.slice(start, start + count);

    return res.json({
      success: true,
      data: paginatedPreshipments,
      count: filteredPreshipments.length,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: filteredPreshipments.length
      }
    });
  }

  try {
    const options = {
      select: `
        *,
        customers:customerId(id, name, code)
      `,
      orderBy: {
        column: orderBy,
        ascending: ascending === 'true'
      },
      limit: parseInt(limit),
      offset: parseInt(offset),
      accessToken: accessToken
    };

    // Add filters
    const filters = [];
    if (stage) filters.push({ column: 'stage', value: stage });
    if (type) filters.push({ column: 'type', value: type });
    if (customer_id) filters.push({ column: 'customerId', value: customer_id });
    if (entry_summary_status) filters.push({ column: 'entry_summary_status', value: entry_summary_status });
    if (shipment_id) {
      filters.push({ 
        column: 'shipmentId', 
        value: `%${shipment_id}%`, 
        operator: 'ilike' 
      });
    }
    if (entry_number) {
      filters.push({ 
        column: 'entryNumber', 
        value: `%${entry_number}%`, 
        operator: 'ilike' 
      });
    }
    if (start_date) {
      filters.push({ column: 'created_at', value: start_date, operator: 'gte' });
    }
    if (end_date) {
      filters.push({ column: 'created_at', value: end_date, operator: 'lte' });
    }
    if (priority) filters.push({ column: 'priority', value: priority });

    if (filters.length > 0) {
      options.filters = filters;
    }

    const result = await supabaseClient.getAll('preshipments', options);

    // Transform data to include calculated totals and customer info
    const transformedData = result.data.map(ps => {
      const items = ps.items || [];
      const totals = items.reduce((acc, item) => {
        acc.total_quantity += item.qty || 0;
        acc.total_value += item.total_value || 0;
        acc.item_count += 1;
        return acc;
      }, { total_quantity: 0, total_value: 0, item_count: 0 });

      return {
        ...ps,
        items_summary: totals,
        customer_name: ps.customers?.name,
        customer_code: ps.customers?.code
      };
    });

    res.json({
      success: true,
      data: transformedData,
      count: result.count,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: result.count
      }
    });
  } catch (error) {
    console.error('Get preshipments error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve preshipments'
    });
  }
}));

/**
 * GET /api/preshipments/:id
 * Get specific preshipment by ID with full details
 */
router.get('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  const accessToken = req.headers.authorization?.replace('Bearer ', '') || req.accessToken;

  // Use mock data for demo tokens
  if (isDemoToken(accessToken)) {
    const preshipment = mockPreshipments.find(ps => ps.id === id || ps.shipmentId === id);
    if (!preshipment) {
      return res.status(404).json({
        success: false,
        error: 'Preshipment not found'
      });
    }
    return res.json({
      success: true,
      data: preshipment
    });
  }

  try {
    const result = await supabaseClient.getById(
      'preshipments',
      id,
      {
        select: `
          *,
          customers:customerId(id, name, code, contact_person, contact_email)
        `,
        accessToken: accessToken
      }
    );

    if (!result.success) {
      return res.status(500).json(result);
    }

    if (!result.data) {
      return res.status(404).json({
        success: false,
        error: 'Preshipment not found'
      });
    }

    // Calculate item totals
    const preshipment = result.data;
    const items = preshipment.items || [];
    
    const totals = items.reduce((acc, item) => {
      acc.total_quantity += item.qty || 0;
      acc.total_value += item.total_value || 0;
      acc.item_count += 1;
      return acc;
    }, { total_quantity: 0, total_value: 0, item_count: 0 });

    res.json({
      success: true,
      data: {
        ...preshipment,
        items_summary: totals
      }
    });
  } catch (error) {
    console.error('Get preshipment error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve preshipment'
    });
  }
}));

/**
 * POST /api/preshipments
 * Create new preshipment with ACE fields
 */
router.post('/', requireStaff, asyncHandler(async (req, res) => {
  const {
    shipmentId,
    type,
    customerId,
    items = [],
    entryNumber,
    stage = 'Planning',
    
    // ACE Entry Summary fields
    entry_summary_status = 'NOT_PREPARED',
    filing_district_port,
    entry_filer_code,
    importer_of_record_number,
    date_of_importation,
    foreign_trade_zone_id,
    bill_of_lading_number,
    voyage_flight_trip_number,
    carrier_code,
    importing_conveyance_name,
    manufacturer_name,
    manufacturer_address,
    seller_name,
    seller_address,
    bond_type_code,
    surety_company_code,
    consolidated_entry = false,
    weekly_entry = false,
    zone_week_ending_date,
    requires_pga_review = false,
    compliance_notes,
    estimated_total_value = 0,
    estimated_duty_amount = 0,
    
    // Transport fields
    requested_ship_date,
    carrier_name,
    tracking_number,
    priority = 'Normal',
    notes
  } = req.body;

  if (!shipmentId || !type || !customerId) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: shipmentId, type, customerId'
    });
  }

  if (!['7501 Consumption Entry', '7512 T&E Export'].includes(type)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid type. Must be "7501 Consumption Entry" or "7512 T&E Export"'
    });
  }

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'At least one item is required'
    });
  }

  // Validate ACE fields
  const aceErrors = validateACEFields({
    filing_district_port,
    entry_filer_code,
    carrier_code,
    weekly_entry,
    zone_week_ending_date
  });

  if (aceErrors.length > 0) {
    return res.status(400).json({
      success: false,
      error: 'ACE validation failed',
      validationErrors: aceErrors
    });
  }

  try {
    // Check if shipment ID already exists
    const existingShipment = await supabaseClient.getAll(
      'preshipments',
      {
        filters: [{ column: 'shipmentId', value: shipmentId }],
        limit: 1,
        accessToken: req.accessToken
      }
    );

    if (existingShipment.success && existingShipment.data.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Shipment ID already exists'
      });
    }

    // Check inventory allocation
    const allocationErrors = await checkInventoryAllocation(items, null, req.accessToken);
    if (allocationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Inventory allocation failed',
        validationErrors: allocationErrors
      });
    }

    // Calculate totals from items
    const calculatedTotals = items.reduce((acc, item) => {
      const itemTotal = (item.qty || 0) * (item.unit_value || 0);
      acc.total_value += itemTotal;
      acc.total_quantity += item.qty || 0;
      
      // Update item with calculated total
      item.total_value = itemTotal;
      
      return acc;
    }, { total_value: 0, total_quantity: 0 });

    const preshipmentData = {
      shipmentId: validation.sanitizeInput(shipmentId),
      type,
      customerId,
      items,
      entryNumber: entryNumber ? validation.sanitizeInput(entryNumber) : null,
      stage,
      
      // ACE Entry Summary fields
      entry_summary_status,
      filing_district_port: filing_district_port ? filing_district_port.toUpperCase() : null,
      entry_filer_code: entry_filer_code ? entry_filer_code.toUpperCase() : null,
      importer_of_record_number: importer_of_record_number ? validation.sanitizeInput(importer_of_record_number) : null,
      date_of_importation,
      foreign_trade_zone_id: foreign_trade_zone_id ? validation.sanitizeInput(foreign_trade_zone_id) : null,
      bill_of_lading_number: bill_of_lading_number ? validation.sanitizeInput(bill_of_lading_number) : null,
      voyage_flight_trip_number: voyage_flight_trip_number ? validation.sanitizeInput(voyage_flight_trip_number) : null,
      carrier_code: carrier_code ? carrier_code.toUpperCase() : null,
      importing_conveyance_name: importing_conveyance_name ? validation.sanitizeInput(importing_conveyance_name) : null,
      manufacturer_name: manufacturer_name ? validation.sanitizeInput(manufacturer_name) : null,
      manufacturer_address: manufacturer_address ? validation.sanitizeInput(manufacturer_address) : null,
      seller_name: seller_name ? validation.sanitizeInput(seller_name) : null,
      seller_address: seller_address ? validation.sanitizeInput(seller_address) : null,
      bond_type_code: bond_type_code ? validation.sanitizeInput(bond_type_code) : null,
      surety_company_code: surety_company_code ? validation.sanitizeInput(surety_company_code) : null,
      consolidated_entry,
      weekly_entry,
      zone_week_ending_date,
      requires_pga_review,
      compliance_notes: compliance_notes ? validation.sanitizeInput(compliance_notes) : null,
      estimated_total_value: estimated_total_value || calculatedTotals.total_value,
      estimated_duty_amount: estimated_duty_amount || 0,
      
      // Transport fields
      requested_ship_date,
      carrier_name: carrier_name ? validation.sanitizeInput(carrier_name) : null,
      tracking_number: tracking_number ? validation.sanitizeInput(tracking_number) : null,
      priority,
      notes: notes ? validation.sanitizeInput(notes) : null,
      created_by: req.user.id
    };

    const result = await supabaseClient.create(
      'preshipments',
      preshipmentData,
      { accessToken: req.accessToken }
    );

    res.status(201).json(result);
  } catch (error) {
    console.error('Create preshipment error:', error);
    
    // Handle unique constraint violations
    if (error.message.includes('duplicate key') || error.message.includes('unique constraint')) {
      return res.status(400).json({
        success: false,
        error: `Shipment ID '${shipmentId}' already exists`
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to create preshipment'
    });
  }
}));

/**
 * PUT /api/preshipments/:id
 * Update preshipment stage and ACE status
 */
router.put('/:id', requireStaff, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updateData = { ...req.body };

  // Remove fields that shouldn't be updated directly
  delete updateData.id;
  delete updateData.created_at;
  delete updateData.created_by;
  delete updateData.shipmentId; // Prevent shipment ID changes

  // Validate ACE fields if provided
  if (updateData.filing_district_port || updateData.entry_filer_code || updateData.carrier_code) {
    const aceErrors = validateACEFields(updateData);
    if (aceErrors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'ACE validation failed',
        validationErrors: aceErrors
      });
    }
  }

  // If updating items, check inventory allocation
  if (updateData.items && Array.isArray(updateData.items)) {
    const allocationErrors = await checkInventoryAllocation(updateData.items, null, req.accessToken);
    if (allocationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Inventory allocation failed',
        validationErrors: allocationErrors
      });
    }

    // Recalculate totals from items
    const calculatedTotals = updateData.items.reduce((acc, item) => {
      const itemTotal = (item.qty || 0) * (item.unit_value || 0);
      acc.total_value += itemTotal;
      item.total_value = itemTotal; // Update item with calculated total
      return acc;
    }, { total_value: 0 });

    updateData.estimated_total_value = updateData.estimated_total_value || calculatedTotals.total_value;
  }

  // Sanitize string inputs
  ['entryNumber', 'filing_district_port', 'entry_filer_code', 'carrier_code', 'notes', 
   'compliance_notes', 'carrier_name', 'tracking_number'].forEach(field => {
    if (updateData[field]) {
      updateData[field] = validation.sanitizeInput(updateData[field]);
    }
  });

  // Uppercase specific codes
  if (updateData.filing_district_port) updateData.filing_district_port = updateData.filing_district_port.toUpperCase();
  if (updateData.entry_filer_code) updateData.entry_filer_code = updateData.entry_filer_code.toUpperCase();
  if (updateData.carrier_code) updateData.carrier_code = updateData.carrier_code.toUpperCase();

  // Add audit fields
  updateData.updated_at = new Date().toISOString();
  updateData.updated_by = req.user.id;

  try {
    const result = await supabaseClient.update(
      'preshipments',
      id,
      updateData,
      { accessToken: req.accessToken }
    );

    res.json(result);
  } catch (error) {
    console.error('Update preshipment error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update preshipment'
    });
  }
}));

/**
 * DELETE /api/preshipments/:id
 * Delete preshipment (hard delete, manager required)
 */
router.delete('/:id', requireManager, asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    const result = await supabaseClient.delete(
      'preshipments',
      id,
      { accessToken: req.accessToken }
    );

    res.json(result);
  } catch (error) {
    console.error('Delete preshipment error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete preshipment'
    });
  }
}));

/**
 * POST /api/preshipments/:id/finalize
 * Finalize shipment with driver sign-off
 */
router.post('/:id/finalize', requireStaff, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    driver_name,
    driver_license_number,
    license_plate_number,
    carrier_name,
    signature_data
  } = req.body;

  if (!driver_name || !driver_license_number || !license_plate_number) {
    return res.status(400).json({
      success: false,
      error: 'Driver name, license number, and license plate are required'
    });
  }

  try {
    const updateData = {
      stage: 'Shipped',
      driver_name: validation.sanitizeInput(driver_name),
      driver_license_number: validation.sanitizeInput(driver_license_number),
      license_plate_number: validation.sanitizeInput(license_plate_number),
      carrier_name: carrier_name ? validation.sanitizeInput(carrier_name) : null,
      signature_data: signature_data || null,
      shipped_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      updated_by: req.user.id
    };

    const result = await supabaseClient.update(
      'preshipments',
      id,
      updateData,
      { accessToken: req.accessToken }
    );

    if (!result.success) {
      return res.status(500).json(result);
    }

    res.json({
      success: true,
      data: {
        ...result.data,
        message: 'Shipment finalized successfully'
      }
    });
  } catch (error) {
    console.error('Finalize shipment error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to finalize shipment'
    });
  }
}));

/**
 * GET /api/preshipments/stats
 * Get dashboard statistics
 */
router.get('/stats/dashboard', asyncHandler(async (req, res) => {
  const { start_date, end_date } = req.query;
  const accessToken = req.headers.authorization?.replace('Bearer ', '') || req.accessToken;

  // Use mock data for demo tokens
  if (isDemoToken(accessToken)) {
    const stats = {
      total: mockPreshipments.length,
      by_stage: {
        'Planning': 1,
        'Picking': 0,
        'Packing': 0,
        'Loading': 0,
        'Ready to Ship': 0,
        'Shipped': 1
      },
      by_type: {
        '7501 Consumption Entry': 1,
        '7512 T&E Export': 1
      },
      by_entry_status: {
        'NOT_PREPARED': 1,
        'DRAFT': 0,
        'READY_TO_FILE': 0,
        'FILED': 0,
        'ACCEPTED': 1,
        'REJECTED': 0
      },
      by_priority: {
        'Low': 0,
        'Normal': 1,
        'High': 1,
        'Urgent': 0
      },
      total_estimated_value: 4800.00,
      total_estimated_duty: 255.00,
      shipped_count: 1,
      in_progress_count: 1
    };

    return res.json({
      success: true,
      data: stats
    });
  }

  try {
    const options = {
      accessToken: accessToken
    };

    // Add date filter if provided
    const filters = [];
    if (start_date) {
      filters.push({ column: 'created_at', value: start_date, operator: 'gte' });
    }
    if (end_date) {
      filters.push({ column: 'created_at', value: end_date, operator: 'lte' });
    }

    if (filters.length > 0) {
      options.filters = filters;
    }

    const result = await supabaseClient.getAll('preshipments', options);

    if (!result.success) {
      return res.status(500).json(result);
    }

    const preshipments = result.data;

    // Calculate statistics
    const stats = {
      total: preshipments.length,
      by_stage: {},
      by_type: {},
      by_entry_status: {},
      by_priority: {},
      total_estimated_value: 0,
      total_estimated_duty: 0,
      shipped_count: 0,
      in_progress_count: 0
    };

    preshipments.forEach(ps => {
      // Stage breakdown
      stats.by_stage[ps.stage] = (stats.by_stage[ps.stage] || 0) + 1;
      
      // Type breakdown
      stats.by_type[ps.type] = (stats.by_type[ps.type] || 0) + 1;
      
      // Entry status breakdown
      stats.by_entry_status[ps.entry_summary_status] = (stats.by_entry_status[ps.entry_summary_status] || 0) + 1;
      
      // Priority breakdown
      stats.by_priority[ps.priority] = (stats.by_priority[ps.priority] || 0) + 1;
      
      // Financial totals
      stats.total_estimated_value += ps.estimated_total_value || 0;
      stats.total_estimated_duty += ps.estimated_duty_amount || 0;
      
      // Count shipped and in-progress
      if (ps.stage === 'Shipped') {
        stats.shipped_count += 1;
      } else {
        stats.in_progress_count += 1;
      }
    });

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Get preshipment stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve preshipment statistics'
    });
  }
}));

/**
 * GET /api/preshipments/reference/stages
 * Get available preshipment stages
 */
router.get('/reference/stages', asyncHandler(async (req, res) => {
  const stages = [
    { value: 'Planning', label: 'Planning', description: 'Initial planning stage' },
    { value: 'Picking', label: 'Picking', description: 'Items being picked from inventory' },
    { value: 'Packing', label: 'Packing', description: 'Items being packed for shipment' },
    { value: 'Loading', label: 'Loading', description: 'Items being loaded for transport' },
    { value: 'Ready to Ship', label: 'Ready to Ship', description: 'Ready for pickup/shipment' },
    { value: 'Shipped', label: 'Shipped', description: 'Shipped and in transit' }
  ];

  res.json({
    success: true,
    data: stages
  });
}));

/**
 * GET /api/preshipments/reference/entry-statuses
 * Get available ACE entry summary statuses
 */
router.get('/reference/entry-statuses', asyncHandler(async (req, res) => {
  const statuses = [
    { value: 'NOT_PREPARED', label: 'Not Prepared', description: 'Entry summary not yet prepared' },
    { value: 'DRAFT', label: 'Draft', description: 'Entry summary in draft status' },
    { value: 'READY_TO_FILE', label: 'Ready to File', description: 'Ready for ACE filing' },
    { value: 'FILED', label: 'Filed', description: 'Filed with ACE system' },
    { value: 'ACCEPTED', label: 'Accepted', description: 'Accepted by CBP' },
    { value: 'REJECTED', label: 'Rejected', description: 'Rejected by CBP - requires correction' }
  ];

  res.json({
    success: true,
    data: statuses
  });
}));

/**
 * GET /api/preshipments/reference/types
 * Get available preshipment types
 */
router.get('/reference/types', asyncHandler(async (req, res) => {
  const types = [
    { value: '7501 Consumption Entry', label: '7501 Consumption Entry', description: 'Consumption entry for goods entering US commerce' },
    { value: '7512 T&E Export', label: '7512 T&E Export', description: 'Temporary export for repair and return' }
  ];

  res.json({
    success: true,
    data: types
  });
}));

module.exports = router;