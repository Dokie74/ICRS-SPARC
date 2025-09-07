// src/backend/api/routes/dashboard.js
// Dashboard analytics routes for ICRS SPARC API
// Provides real-time metrics for Foreign Trade Zone operations

const express = require('express');
const { asyncHandler } = require('../middleware/error-handler');
const supabaseClient = require('../../db/supabase-client');

const router = express.Router();

/**
 * GET /api/dashboard/metrics
 * Get comprehensive dashboard metrics
 */
router.get('/metrics', asyncHandler(async (req, res) => {
  const { period = '30' } = req.query;
  
  try {
    const periodDays = parseInt(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays);
    const startDateIso = startDate.toISOString();

    // Parallel queries for all metrics
    const [
      inventoryMetrics,
      customerMetrics,
      preadmissionMetrics,
      recentActivity,
      topParts,
      topCustomers,
      statusDistribution
    ] = await Promise.all([
      getInventoryMetrics(req.accessToken),
      getCustomerMetrics(req.accessToken),
      getPreadmissionMetrics(req.accessToken, startDateIso),
      getRecentActivity(req.accessToken),
      getTopParts(req.accessToken),
      getTopCustomers(req.accessToken),
      getPreadmissionStatusDistribution(req.accessToken)
    ]);

    res.json({
      success: true,
      data: {
        inventory: inventoryMetrics,
        customers: customerMetrics,
        preadmissions: preadmissionMetrics,
        recent_activity: recentActivity,
        top_parts: topParts,
        top_customers: topCustomers,
        status_distribution: statusDistribution,
        period_days: periodDays,
        generated_at: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Get dashboard metrics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve dashboard metrics'
    });
  }
}));

/**
 * GET /api/dashboard/stats
 * Get basic dashboard statistics (frontend compatible route)
 */
router.get('/stats', asyncHandler(async (req, res) => {
  const accessToken = req.headers.authorization?.replace('Bearer ', '') || req.accessToken;


  try {
    const [inventoryMetrics, preadmissionMetrics, transactionCount] = await Promise.all([
      getInventoryMetrics(req.accessToken),
      getPreadmissionMetrics(req.accessToken, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
      getMonthlyTransactionCount(req.accessToken)
    ]);

    res.json({
      success: true,
      data: {
        totalInventoryValue: inventoryMetrics.total_value || 0,
        activeLots: inventoryMetrics.total_lots || 0,
        pendingPreadmissions: preadmissionMetrics.status_counts?.pending || 0,
        monthlyTransactions: transactionCount,
        lowStockAlerts: 0, // TODO: Implement low stock alert logic
        completedToday: preadmissionMetrics.status_counts?.completed || 0
      }
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve dashboard stats'
    });
  }
}));

/**
 * GET /api/dashboard/recent-activity
 * Get recent activity feed
 */
router.get('/recent-activity', asyncHandler(async (req, res) => {
  const { limit = 10 } = req.query;
  const accessToken = req.headers.authorization?.replace('Bearer ', '') || req.accessToken;


  try {
    const activity = await getRecentActivity(req.accessToken);
    const formattedActivity = activity.map((item, index) => ({
      id: index + 1,
      description: formatActivityDescription(item),
      timestamp: item.created_at,
      type: item.type || 'transaction'
    })).slice(0, parseInt(limit));

    res.json({
      success: true,
      data: formattedActivity
    });
  } catch (error) {
    console.error('Get recent activity error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve recent activity'
    });
  }
}));

/**
 * GET /api/dashboard/inventory-summary
 * Get detailed inventory summary
 */
router.get('/inventory-summary', asyncHandler(async (req, res) => {
  const accessToken = req.headers.authorization?.replace('Bearer ', '') || req.accessToken;


  try {
    const result = await supabaseClient.getAll(
      'inventory_lots',
      {
        select: `
          id, quantity, unit_value, total_value,
          parts:part_id(description, material),
          customers(name),
          storage_locations:storage_location_id(location_code),
          transactions(quantity)
        `,
        filters: [],
        accessToken: req.accessToken
      }
    );

    if (!result.success) {
      return res.status(500).json(result);
    }

    // Process inventory data
    const lots = result.data.map(lot => {
      const currentQuantity = lot.transactions.reduce((sum, t) => sum + (t.quantity || 0), 0);
      return {
        ...lot,
        current_quantity: currentQuantity,
        calculated_value: currentQuantity * (lot.unit_value || 0)
      };
    });

    // Calculate summary statistics
    const summary = lots.reduce((acc, lot) => {
      acc.total_lots += 1;
      acc.total_quantity += lot.current_quantity;
      acc.total_value += lot.calculated_value;
      
      // Material breakdown
      const material = lot.parts?.material || 'unknown';
      if (!acc.by_material[material]) {
        acc.by_material[material] = { lots: 0, quantity: 0, value: 0 };
      }
      acc.by_material[material].lots += 1;
      acc.by_material[material].quantity += lot.current_quantity;
      acc.by_material[material].value += lot.calculated_value;
      
      // Customer breakdown
      const customer = lot.customers?.name || 'unknown';
      if (!acc.by_customer[customer]) {
        acc.by_customer[customer] = { lots: 0, quantity: 0, value: 0 };
      }
      acc.by_customer[customer].lots += 1;
      acc.by_customer[customer].quantity += lot.current_quantity;
      acc.by_customer[customer].value += lot.calculated_value;
      
      return acc;
    }, {
      total_lots: 0,
      total_quantity: 0,
      total_value: 0,
      by_material: {},
      by_customer: {}
    });

    res.json({
      success: true,
      data: {
        summary,
        lots: lots.slice(0, 10), // Return first 10 lots for preview
        total_lots: lots.length
      }
    });
  } catch (error) {
    console.error('Get inventory summary error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve inventory summary'
    });
  }
}));

/**
 * GET /api/dashboard/alerts
 * Get system alerts and notifications
 */
router.get('/alerts', asyncHandler(async (req, res) => {
  try {
    const alerts = [];
    
    // Check for low inventory
    const lowInventoryResult = await supabaseClient.callFunction(
      'get_low_inventory_alerts',
      { threshold: 10 },
      { accessToken: req.accessToken }
    );
    
    if (lowInventoryResult.success && lowInventoryResult.data) {
      lowInventoryResult.data.forEach(item => {
        alerts.push({
          type: 'warning',
          category: 'inventory',
          title: 'Low Inventory',
          message: `${item.part_description} is running low (${item.current_quantity} remaining)`,
          data: item,
          created_at: new Date().toISOString()
        });
      });
    }

    // Check for pending preadmissions
    const pendingPreadmissions = await supabaseClient.getAll(
      'preadmissions',
      {
        filters: [{ column: 'status', value: 'pending' }],
        select: 'id, container_number, customer_id, created_at',
        limit: 10,
        accessToken: req.accessToken
      }
    );

    if (pendingPreadmissions.success) {
      pendingPreadmissions.data.forEach(pa => {
        const daysPending = Math.floor((new Date() - new Date(pa.created_at)) / (1000 * 60 * 60 * 24));
        if (daysPending > 7) {
          alerts.push({
            type: 'info',
            category: 'preadmission',
            title: 'Pending Preadmission',
            message: `Container ${pa.container_number} has been pending for ${daysPending} days`,
            data: pa,
            created_at: new Date().toISOString()
          });
        }
      });
    }

    // Check for expiring lots
    const expiringDate = new Date();
    expiringDate.setDate(expiringDate.getDate() + 30);
    
    const expiringLots = await supabaseClient.getAll(
      'inventory_lots',
      {
        filters: [
          { column: 'expiration_date', value: expiringDate.toISOString(), operator: 'lte' },
          
        ],
        select: 'id, expiration_date, parts:part_id(description)',
        accessToken: req.accessToken
      }
    );

    if (expiringLots.success) {
      expiringLots.data.forEach(lot => {
        const daysUntilExpiration = Math.floor((new Date(lot.expiration_date) - new Date()) / (1000 * 60 * 60 * 24));
        alerts.push({
          type: 'warning',
          category: 'expiration',
          title: 'Lot Expiring Soon',
          message: `Lot ID ${lot.id} expires in ${daysUntilExpiration} days`,
          data: lot,
          created_at: new Date().toISOString()
        });
      });
    }

    res.json({
      success: true,
      data: {
        alerts,
        count: alerts.length,
        categories: {
          inventory: alerts.filter(a => a.category === 'inventory').length,
          preadmission: alerts.filter(a => a.category === 'preadmission').length,
          expiration: alerts.filter(a => a.category === 'expiration').length
        }
      }
    });
  } catch (error) {
    console.error('Get dashboard alerts error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve dashboard alerts'
    });
  }
}));

// Helper functions for metrics calculations
async function getInventoryMetrics(accessToken) {
  const result = await supabaseClient.getAll(
    'inventory_lots',
    {
      select: 'id, quantity, total_value, transactions(quantity)',
      filters: [],
      accessToken
    }
  );

  if (!result.success) return { total_lots: 0, total_quantity: 0, total_value: 0 };

  return result.data.reduce((acc, lot) => {
    const currentQuantity = lot.transactions.reduce((sum, t) => sum + (t.quantity || 0), 0);
    acc.total_lots += 1;
    acc.total_quantity += currentQuantity;
    acc.total_value += lot.total_value || 0;
    return acc;
  }, { total_lots: 0, total_quantity: 0, total_value: 0 });
}

async function getCustomerMetrics(accessToken) {
  const result = await supabaseClient.getAll(
    'customers',
    {
      select: 'id',
      filters: [],
      accessToken
    }
  );

  return {
    total_customers: result.success ? result.data.length : 0,
    active_customers: result.success ? result.data.length : 0
  };
}

async function getPreadmissionMetrics(accessToken, startDate) {
  const result = await supabaseClient.getAll(
    'preadmissions',
    {
      select: 'id, status',
      filters: [
        { column: 'created_at', value: startDate, operator: 'gte' }
      ],
      accessToken
    }
  );

  if (!result.success) return { total_preadmissions: 0, total_value: 0, status_counts: {} };

  return result.data.reduce((acc, pa) => {
    acc.total_preadmissions += 1;
    acc.status_counts[pa.status] = (acc.status_counts[pa.status] || 0) + 1;
    return acc;
  }, { total_preadmissions: 0, status_counts: {} });
}

async function getRecentActivity(accessToken) {
  // Get recent inventory transactions
  const transactions = await supabaseClient.getAll(
    'transactions',
    {
      select: `
        id, type, quantity, created_at,
        inventory_lots:lot_id(id, parts:part_id(description))
      `,
      orderBy: { column: 'created_at', ascending: false },
      limit: 5,
      accessToken
    }
  );

  return transactions.success ? transactions.data : [];
}

async function getTopParts(accessToken) {
  // This would ideally be a database function for performance
  // For now, we'll get inventory data and calculate in memory
  const result = await supabaseClient.getAll(
    'inventory_lots',
    {
      select: `
        quantity, total_value,
        parts:part_id(id, description, material),
        transactions(quantity)
      `,
      filters: [],
      accessToken
    }
  );

  if (!result.success) return [];

  const partTotals = result.data.reduce((acc, lot) => {
    const partId = lot.parts?.id;
    const currentQuantity = lot.transactions.reduce((sum, t) => sum + (t.quantity || 0), 0);
    
    if (partId) {
      if (!acc[partId]) {
        acc[partId] = {
          id: partId,
          description: lot.parts.description,
          material: lot.parts.material,
          total_quantity: 0,
          total_value: 0,
          lot_count: 0
        };
      }
      acc[partId].total_quantity += currentQuantity;
      acc[partId].total_value += lot.total_value || 0;
      acc[partId].lot_count += 1;
    }
    return acc;
  }, {});

  return Object.values(partTotals)
    .sort((a, b) => b.total_value - a.total_value)
    .slice(0, 5);
}

async function getTopCustomers(accessToken) {
  const result = await supabaseClient.getAll(
    'inventory_lots',
    {
      select: `
        quantity, total_value,
        customers(id, name),
        transactions(quantity)
      `,
      filters: [],
      accessToken
    }
  );

  if (!result.success) return [];

  const customerTotals = result.data.reduce((acc, lot) => {
    const customerId = lot.customers?.id;
    const currentQuantity = lot.transactions.reduce((sum, t) => sum + (t.quantity || 0), 0);
    
    if (customerId) {
      if (!acc[customerId]) {
        acc[customerId] = {
          id: customerId,
          name: lot.customers.name,
          total_quantity: 0,
          total_value: 0,
          lot_count: 0
        };
      }
      acc[customerId].total_quantity += currentQuantity;
      acc[customerId].total_value += lot.total_value || 0;
      acc[customerId].lot_count += 1;
    }
    return acc;
  }, {});

  return Object.values(customerTotals)
    .sort((a, b) => b.total_value - a.total_value)
    .slice(0, 5);
}

async function getPreadmissionStatusDistribution(accessToken) {
  const result = await supabaseClient.getAll(
    'preadmissions',
    {
      select: 'status',
      accessToken
    }
  );

  if (!result.success) return {};

  return result.data.reduce((acc, pa) => {
    acc[pa.status] = (acc[pa.status] || 0) + 1;
    return acc;
  }, {});
}

async function getMonthlyTransactionCount(accessToken) {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const result = await supabaseClient.getAll(
    'transactions',
    {
      select: 'id',
      filters: [
        { column: 'created_at', value: startOfMonth.toISOString(), operator: 'gte' }
      ],
      accessToken
    }
  );

  return result.success ? result.data.length : 0;
}

function formatActivityDescription(item) {
  if (item.type) {
    const partDescription = item.inventory_lots?.parts?.description || 'Unknown Part';
    const lotNumber = item.inventory_lots?.id ? `ID: ${item.inventory_lots.id}` : 'Unknown Lot';
    
    switch (item.type) {
      case 'receipt':
        return `Received ${Math.abs(item.quantity)} units of ${partDescription} (Lot: ${lotNumber})`;
      case 'shipment':
        return `Shipped ${Math.abs(item.quantity)} units of ${partDescription} (Lot: ${lotNumber})`;
      case 'adjustment':
        return `Inventory adjustment: ${item.quantity > 0 ? '+' : ''}${item.quantity} units of ${partDescription}`;
      default:
        return `${item.type}: ${Math.abs(item.quantity)} units of ${partDescription}`;
    }
  }
  
  return 'Unknown activity';
}

module.exports = router;