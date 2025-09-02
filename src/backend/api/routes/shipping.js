// src/backend/api/routes/shipping.js
// Shipping management routes for ICRS SPARC API
// Handles preshipment staging workflow, driver signoff, and label printing

const express = require('express');
const { asyncHandler } = require('../middleware/error-handler');
const { requireStaff, requireManager } = require('../middleware/auth');
const ShippingService = require('../../services/business/ShippingService');
const { isDemoToken } = require('../../utils/mock-data');

const router = express.Router();

/**
 * GET /api/shipping
 * Get all shipments with filtering and pagination
 */
router.get('/', asyncHandler(async (req, res) => {
  const { 
    limit = 100,
    offset = 0,
    stage,
    customer_id,
    carrier,
    start_date,
    end_date,
    orderBy = 'created_at',
    ascending = 'false'
  } = req.query;

  const accessToken = req.headers.authorization?.replace('Bearer ', '') || req.accessToken;

  // Handle demo tokens with mock data
  if (isDemoToken(accessToken)) {
    const mockShipments = [
      {
        id: '1',
        shipment_id: 'SHP-2024-001',
        customer_id: 'CUST-001',
        customer_name: 'Acme Manufacturing',
        stage: 'Ready to Ship',
        carrier_name: 'FedEx',
        tracking_number: 'TRK123456789',
        requested_ship_date: '2024-01-15T10:00:00Z',
        items: [{ part_id: 'PART-001', quantity: 50, description: 'Widget A' }],
        created_at: '2024-01-14T09:00:00Z'
      },
      {
        id: '2',
        shipment_id: 'SHP-2024-002',
        customer_id: 'CUST-002',
        customer_name: 'Tech Solutions Inc',
        stage: 'Staged',
        carrier_name: 'UPS',
        tracking_number: 'TRK987654321',
        requested_ship_date: '2024-01-16T14:00:00Z',
        items: [{ part_id: 'PART-002', quantity: 25, description: 'Component B' }],
        created_at: '2024-01-14T11:00:00Z'
      }
    ];

    let filteredShipments = [...mockShipments];

    // Apply filters
    if (stage) {
      filteredShipments = filteredShipments.filter(s => s.stage === stage);
    }
    if (customer_id && customer_id !== 'undefined') {
      filteredShipments = filteredShipments.filter(s => s.customer_id === customer_id);
    }
    if (carrier) {
      filteredShipments = filteredShipments.filter(s => 
        s.carrier_name.toLowerCase().includes(carrier.toLowerCase())
      );
    }

    return res.json({
      success: true,
      data: filteredShipments.slice(parseInt(offset), parseInt(offset) + parseInt(limit)),
      count: filteredShipments.length,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: filteredShipments.length
      }
    });
  }

  try {
    const options = {
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
    if (customer_id) filters.push({ column: 'customer_id', value: customer_id });
    if (carrier) {
      filters.push({ 
        column: 'carrier_name', 
        value: `%${carrier}%`, 
        operator: 'ilike' 
      });
    }
    if (start_date) {
      filters.push({ column: 'created_at', value: start_date, operator: 'gte' });
    }
    if (end_date) {
      filters.push({ column: 'created_at', value: end_date, operator: 'lte' });
    }

    if (filters.length > 0) {
      options.filters = filters;
    }

    const result = await ShippingService.getAllShipments(options);

    if (!result.success) {
      return res.status(500).json(result);
    }

    // Transform data to include calculated totals
    const transformedData = result.data.map(shipment => {
      const lineItems = shipment.preshipment_line_items || [];
      const totals = lineItems.reduce((acc, item) => {
        acc.total_quantity += item.quantity || 0;
        acc.line_count += 1;
        return acc;
      }, { total_quantity: 0, line_count: 0 });

      return {
        ...shipment,
        line_items_summary: totals,
        customer_name: shipment.customers?.name,
        customer_code: shipment.customers?.code
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
    console.error('Get shipments error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve shipments'
    });
  }
}));

/**
 * GET /api/shipping/:id
 * Get specific shipment by ID with full details
 */
router.get('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    const result = await ShippingService.getById(id, {
      accessToken: req.accessToken
    });

    if (!result.success) {
      return res.status(500).json(result);
    }

    if (!result.data) {
      return res.status(404).json({
        success: false,
        error: 'Shipment not found'
      });
    }

    res.json({
      success: true,
      data: result.data
    });
  } catch (error) {
    console.error('Get shipment error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve shipment'
    });
  }
}));

/**
 * GET /api/shipping/stage/:stage
 * Get shipments by stage for workflow management
 */
router.get('/stage/:stage', asyncHandler(async (req, res) => {
  const { stage } = req.params;
  const { limit = 50, offset = 0 } = req.query;

  try {
    const result = await ShippingService.getShipmentsByStage(stage, {
      limit: parseInt(limit),
      offset: parseInt(offset),
      accessToken: req.accessToken
    });

    res.json({
      success: true,
      data: result.data || [],
      count: result.count || 0,
      stage: stage
    });
  } catch (error) {
    console.error('Get shipments by stage error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve shipments by stage'
    });
  }
}));

/**
 * PUT /api/shipping/:id/staging
 * Update shipment staging status
 */
router.put('/:id/staging', requireStaff, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { stage, staging_notes, staging_location, items } = req.body;

  const validStages = ['Planning', 'Picking', 'Packing', 'Loading', 'Ready to Ship', 'Staged', 'Shipped'];
  
  if (!stage || !validStages.includes(stage)) {
    return res.status(400).json({
      success: false,
      error: `Invalid stage. Must be one of: ${validStages.join(', ')}`
    });
  }

  try {
    const stagingData = {
      shipmentId: id,
      stage,
      staging_notes,
      staging_location,
      items,
      staged_by: req.user.user_metadata?.full_name || req.user.email
    };

    const result = await ShippingService.updatePreshipmentStaging(
      id, 
      stagingData, 
      { accessToken: req.accessToken, userId: req.user.id }
    );

    res.json(result);
  } catch (error) {
    console.error('Update shipment staging error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update shipment staging'
    });
  }
}));

/**
 * POST /api/shipping/:id/signoff
 * Process driver signoff for shipment completion
 */
router.post('/:id/signoff', requireStaff, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    driver_name,
    driver_license_number,
    license_plate_number,
    carrier_name,
    tracking_number,
    signature_data,
    driver_notes
  } = req.body;

  if (!driver_name || !driver_license_number || !license_plate_number) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: driver_name, driver_license_number, license_plate_number'
    });
  }

  try {
    const signoffData = {
      driver_name,
      driver_license_number,
      license_plate_number,
      carrier_name,
      tracking_number,
      signature_data,
      driver_notes
    };

    const result = await ShippingService.processDriverSignoff(
      id, 
      signoffData, 
      { accessToken: req.accessToken, userId: req.user.id }
    );

    if (result.success) {
      res.status(200).json({
        success: true,
        data: {
          ...result.data,
          message: 'Shipment successfully signed off and marked as shipped'
        }
      });
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Process driver signoff error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process driver signoff'
    });
  }
}));

/**
 * POST /api/shipping/:id/label
 * Generate shipping label for shipment
 */
router.post('/:id/label', requireStaff, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    carrier,
    service_type,
    ship_to,
    package_info,
    label_format = 'PDF'
  } = req.body;

  try {
    const labelData = {
      carrier,
      service_type,
      ship_to,
      package_info,
      label_format
    };

    const result = await ShippingService.generateShippingLabel(
      id, 
      labelData, 
      { accessToken: req.accessToken, userId: req.user.id }
    );

    if (result.success) {
      res.status(201).json({
        success: true,
        data: {
          ...result.data,
          message: 'Shipping label generated successfully'
        }
      });
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Generate shipping label error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate shipping label'
    });
  }
}));

/**
 * GET /api/shipping/ready-to-ship
 * Get shipments ready for shipping
 */
router.get('/workflow/ready-to-ship', asyncHandler(async (req, res) => {
  const { limit = 50, offset = 0 } = req.query;

  try {
    const result = await ShippingService.getReadyToShipShipments({
      limit: parseInt(limit),
      offset: parseInt(offset),
      accessToken: req.accessToken
    });

    res.json({
      success: true,
      data: result.data || [],
      count: result.count || 0
    });
  } catch (error) {
    console.error('Get ready-to-ship shipments error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve ready-to-ship shipments'
    });
  }
}));

/**
 * GET /api/shipping/staged
 * Get staged shipments awaiting pickup
 */
router.get('/workflow/staged', asyncHandler(async (req, res) => {
  const { limit = 50, offset = 0 } = req.query;

  try {
    const result = await ShippingService.getStagedShipments({
      limit: parseInt(limit),
      offset: parseInt(offset),
      accessToken: req.accessToken
    });

    res.json({
      success: true,
      data: result.data || [],
      count: result.count || 0
    });
  } catch (error) {
    console.error('Get staged shipments error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve staged shipments'
    });
  }
}));

/**
 * POST /api/shipping/search
 * Search shipments with filters
 */
router.post('/search', asyncHandler(async (req, res) => {
  const {
    search_term,
    filters = {},
    limit = 100,
    offset = 0
  } = req.body;

  try {
    const result = await ShippingService.searchShipments(
      search_term,
      filters,
      {
        limit: parseInt(limit),
        offset: parseInt(offset),
        accessToken: req.accessToken
      }
    );

    res.json({
      success: true,
      data: result.data || [],
      count: result.data?.length || 0,
      search_term,
      filters
    });
  } catch (error) {
    console.error('Search shipments error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search shipments'
    });
  }
}));

/**
 * GET /api/shipping/statistics
 * Get shipping statistics for reporting
 */
router.get('/reports/statistics', requireManager, asyncHandler(async (req, res) => {
  const {
    start_date,
    end_date
  } = req.query;

  try {
    const dateRange = {};
    if (start_date) dateRange.startDate = start_date;
    if (end_date) dateRange.endDate = end_date;

    const result = await ShippingService.getShippingStatistics(
      dateRange,
      { accessToken: req.accessToken }
    );

    res.json({
      success: true,
      data: result.data || {},
      date_range: dateRange
    });
  } catch (error) {
    console.error('Get shipping statistics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve shipping statistics'
    });
  }
}));

/**
 * GET /api/shipping/reference/stages
 * Get available shipping stages
 */
router.get('/reference/stages', asyncHandler(async (req, res) => {
  const stages = [
    { value: 'Planning', label: 'Planning', description: 'Initial planning phase' },
    { value: 'Picking', label: 'Picking', description: 'Items being picked from inventory' },
    { value: 'Packing', label: 'Packing', description: 'Items being packed for shipment' },
    { value: 'Loading', label: 'Loading', description: 'Items being loaded for transport' },
    { value: 'Ready to Ship', label: 'Ready to Ship', description: 'Ready for carrier pickup' },
    { value: 'Staged', label: 'Staged', description: 'Staged for pickup' },
    { value: 'Shipped', label: 'Shipped', description: 'Picked up by carrier' }
  ];

  res.json({
    success: true,
    data: stages
  });
}));

/**
 * GET /api/shipping/reference/carriers
 * Get available carriers
 */
router.get('/reference/carriers', asyncHandler(async (req, res) => {
  const carriers = [
    { value: 'FEDEX', label: 'FedEx', services: ['OVERNIGHT', 'EXPRESS', 'GROUND'] },
    { value: 'UPS', label: 'UPS', services: ['NEXT_DAY', 'EXPRESS', 'GROUND'] },
    { value: 'DHL', label: 'DHL', services: ['EXPRESS', 'STANDARD'] },
    { value: 'USPS', label: 'USPS', services: ['PRIORITY', 'EXPRESS', 'GROUND'] },
    { value: 'FREIGHT', label: 'Freight Carrier', services: ['LTL', 'FTL'] },
    { value: 'CUSTOMER_PICKUP', label: 'Customer Pickup', services: ['PICKUP'] }
  ];

  res.json({
    success: true,
    data: carriers
  });
}));

module.exports = router;