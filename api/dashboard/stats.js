// api/dashboard/stats.js - Vercel serverless dashboard stats endpoint
const { setCorsHeaders, handleOptions } = require('../_utils/cors');
const { requireAuth } = require('../_utils/auth');
const { SupabaseClient } = require('../_utils/db');

async function handler(req, res) {
  // Handle CORS
  setCorsHeaders(res, req.headers.origin);
  if (handleOptions(req, res)) return;

  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: `Method ${req.method} not allowed`
    });
  }

  try {
    const supabaseClient = new SupabaseClient(req.accessToken);
    
    // Get basic counts for dashboard
    const [inventoryResult, preadmissionsResult, customersResult] = await Promise.allSettled([
      supabaseClient.getAll('inventory_lots', { select: 'quantity, estimated_value' }),
      supabaseClient.getAll('preadmissions', { select: 'status' }),
      supabaseClient.getAll('customers', { select: 'id' })
    ]);

    // Calculate metrics
    let totalInventoryValue = 0;
    let activeLots = 0;
    if (inventoryResult.status === 'fulfilled' && inventoryResult.value.success) {
      const inventory = inventoryResult.value.data;
      activeLots = inventory.length;
      totalInventoryValue = inventory.reduce((sum, lot) => 
        sum + (parseFloat(lot.estimated_value || 0) * parseInt(lot.quantity || 0)), 0
      );
    }

    let pendingPreadmissions = 0;
    let completedToday = 0;
    if (preadmissionsResult.status === 'fulfilled' && preadmissionsResult.value.success) {
      const preadmissions = preadmissionsResult.value.data;
      pendingPreadmissions = preadmissions.filter(p => p.status === 'pending').length;
      
      // Count completed today
      const today = new Date().toISOString().split('T')[0];
      completedToday = preadmissions.filter(p => 
        p.status === 'completed' && 
        p.updated_at && 
        p.updated_at.startsWith(today)
      ).length;
    }

    const totalCustomers = customersResult.status === 'fulfilled' && customersResult.value.success 
      ? customersResult.value.count 
      : 0;

    res.json({
      success: true,
      data: {
        totalInventoryValue: Math.round(totalInventoryValue),
        activeLots: activeLots,
        pendingPreadmissions: pendingPreadmissions,
        monthlyTransactions: 0, // TODO: Implement monthly transaction count
        lowStockAlerts: 0, // TODO: Implement low stock alert logic
        completedToday: completedToday,
        totalCustomers: totalCustomers
      }
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard statistics'
    });
  }
}

module.exports = requireAuth(handler);