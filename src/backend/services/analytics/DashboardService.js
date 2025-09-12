// src/backend/services/analytics/DashboardService.js
// Dashboard analytics service for ICRS SPARC - transferred from original ICRS
// Maintains comprehensive FTZ dashboard metrics with parallel data loading

const BaseService = require('../BaseService');
const DatabaseService = require('../../db/supabase-client');

class DashboardService extends BaseService {
  constructor() {
    super('dashboard_analytics');
    // Store current inventory for fallback calculations (preserves original pattern)
    this.currentInventory = null;
  }

  /**
   * Get comprehensive FTZ dashboard metrics
   * Parallel data loading for optimal performance
   */
  async getDashboardMetrics(options = {}) {
    try {
      const [
        inventoryMetrics,
        preadmissionMetrics,
        preshipmentMetrics,
        recentActivity,
        alertsData,
        storageMetrics,
        materialPricing
      ] = await Promise.all([
        this.getInventoryMetrics(options),
        this.getPreadmissionMetrics(options),
        this.getPreshipmentMetrics(options),
        this.getRecentActivity(options),
        this.getAlerts(options),
        this.getStorageMetrics(options),
        this.getMaterialPricingMetrics(options)
      ]);

      // Get historical trend data (preserves original pattern)
      const inventoryTrendData = await this.getInventoryTrendData(options);
      const materialBreakdownData = await this.getMaterialBreakdownData(options);

      return {
        success: true,
        data: {
          inventory: inventoryMetrics,
          preadmissions: preadmissionMetrics,
          preshipments: preshipmentMetrics,
          activity: recentActivity,
          alerts: alertsData,
          storage: storageMetrics,
          pricing: materialPricing,
          trends: {
            inventory: inventoryTrendData,
            materials: materialBreakdownData
          },
          lastUpdated: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('Error fetching dashboard metrics:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Inventory metrics - live inventory status
   * Supports both old schema (current_quantity) and new schema (quantity)
   */
  async getInventoryMetrics(options = {}) {
    try {
      // Get active inventory lots with part and customer info (preserves original query structure)
      const result = await DatabaseService.getAll('inventory_lots', {
        select: `
          id,
          quantity,
          unit_value,
          total_value,
          status,
          part_id,
          customer_id,
          created_at,
          parts!inner (
            id,
            description,
            standard_value,
            material,
            material_weight
          ),
          customers (
            id,
            name
          )
        `,
        filters: [
          { column: 'status', operator: 'neq', value: 'voided' }
        ],
        ...options
      });

      if (!result.success) {
        console.error('Inventory lots query error:', result.error);
        return { totalLots: 0, totalValue: 0, totalWeight: 0, statusCounts: {}, materialBreakdown: {}, recentLots: [] };
      }

      const activeLots = result.data;
      console.log('Raw inventory lots data:', activeLots);

      // Calculate metrics with schema flexibility (preserves original calculation logic)
      const totalLots = activeLots?.length || 0;
      
      const totalValue = activeLots?.reduce((acc, lot) => {
        // Use total_value if available, otherwise calculate from quantity * unit_value or standard_value
        if (lot.total_value && lot.total_value > 0) {
          return acc + parseFloat(lot.total_value);
        }
        
        const qty = lot.quantity || 0;
        const unitVal = lot.unit_value || lot.parts?.standard_value || 0;
        return acc + (qty * parseFloat(unitVal));
      }, 0) || 0;

      const totalWeight = activeLots?.reduce((acc, lot) => {
        const qty = lot.quantity || 0;
        return acc + (qty * (lot.parts?.material_weight || 0));
      }, 0) || 0;

      // Status distribution (preserves original analytics)
      const statusCounts = activeLots?.reduce((acc, lot) => {
        acc[lot.status] = (acc[lot.status] || 0) + 1;
        return acc;
      }, {}) || {};

      // Material breakdown (critical for FTZ material classification)
      const materialBreakdown = activeLots?.reduce((acc, lot) => {
        const material = lot.parts?.material || 'unknown';
        const qty = lot.quantity || 0;
        acc[material] = (acc[material] || 0) + qty;
        return acc;
      }, {}) || {};

      const inventoryResult = {
        totalLots,
        totalValue,
        totalWeight,
        statusCounts,
        materialBreakdown,
        recentLots: activeLots?.slice(0, 5) || []
      };

      // Store for fallback trend calculations (preserves original caching pattern)
      this.currentInventory = inventoryResult;
      
      return inventoryResult;
    } catch (error) {
      console.error('Error fetching inventory metrics:', error);
      return { totalLots: 0, totalValue: 0, totalWeight: 0, statusCounts: {}, materialBreakdown: {}, recentLots: [] };
    }
  }

  /**
   * Preadmission metrics - customs workflow status
   * Critical for FTZ customs compliance monitoring
   */
  async getPreadmissionMetrics(options = {}) {
    try {
      const result = await DatabaseService.getAll('preadmissions', {
        select: `
          id,
          "admission_id",
          status,
          container_number,
          arrival_date,
          customer_id,
          created_at,
          customers (
            name
          )
        `,
        orderBy: 'created_at.desc',
        limit: 50,
        ...options
      });

      if (!result.success) {
        console.error('Preadmissions query error:', result.error);
        return { total: 0, pendingAudits: 0, awaitingArrival: 0, statusCounts: {}, recentPreadmissions: [], pendingAuditsList: [] };
      }

      const preadmissions = result.data;
      const total = preadmissions?.length || 0;
      const pendingAudits = preadmissions?.filter(pa => pa.status === 'Arrived - Pending Audit') || [];
      const awaitingArrival = preadmissions?.filter(pa => pa.status === 'Approved - Awaiting Arrival') || [];
      const recent = preadmissions?.slice(0, 10) || [];

      // Status distribution for customs workflow monitoring
      const statusCounts = preadmissions?.reduce((acc, pa) => {
        acc[pa.status] = (acc[pa.status] || 0) + 1;
        return acc;
      }, {}) || {};

      return {
        total,
        pendingAudits: pendingAudits.length,
        awaitingArrival: awaitingArrival.length,
        statusCounts,
        recentPreadmissions: recent,
        pendingAuditsList: pendingAudits
      };
    } catch (error) {
      console.error('Error fetching preadmission metrics:', error);
      return { total: 0, pendingAudits: 0, awaitingArrival: 0, statusCounts: {}, recentPreadmissions: [], pendingAuditsList: [] };
    }
  }

  /**
   * Preshipment metrics - outbound workflow
   * FTZ outbound customs processing status
   */
  async getPreshipmentMetrics(options = {}) {
    try {
      const result = await DatabaseService.getAll('preshipments', {
        select: `
          id,
          "shipment_id",
          status,
          customer_id,
          created_at,
          customers (
            name
          )
        `,
        orderBy: 'created_at.desc',
        limit: 50,
        ...options
      });

      if (!result.success) {
        console.error('Preshipments query error:', result.error);
        return { total: 0, readyToShip: 0, shipped: 0, statusCounts: {}, recentPreshipments: [] };
      }

      const preshipments = result.data;
      const total = preshipments?.length || 0;
      const readyToShip = preshipments?.filter(ps => ps.status === 'Ready to Ship') || [];
      const shipped = preshipments?.filter(ps => ps.status === 'Shipped') || [];

      // Status distribution for outbound workflow monitoring
      const statusCounts = preshipments?.reduce((acc, ps) => {
        acc[ps.status] = (acc[ps.status] || 0) + 1;
        return acc;
      }, {}) || {};

      return {
        total,
        readyToShip: readyToShip.length,
        shipped: shipped.length,
        statusCounts,
        recentPreshipments: preshipments?.slice(0, 10) || []
      };
    } catch (error) {
      console.error('Error fetching preshipment metrics:', error);
      return { total: 0, readyToShip: 0, shipped: 0, statusCounts: {}, recentPreshipments: [] };
    }
  }

  /**
   * Recent activity - permission audit log
   * FTZ compliance activity monitoring
   */
  async getRecentActivity(options = {}) {
    try {
      const result = await DatabaseService.getAll('permission_audit_log', {
        select: `
          id,
          action,
          module_code,
          change_type,
          created_at,
          user_id,
          employees!permission_audit_log_user_id_fkey (
            name,
            email
          )
        `,
        orderBy: 'created_at.desc',
        limit: 20,
        ...options
      });

      if (!result.success) {
        console.error('Activity query error:', result.error);
        return [];
      }

      // Transform activity data for UI display (preserves original formatting)
      return result.data?.map(act => ({
        id: act.id,
        user: act.employees?.name || 'System',
        email: act.employees?.email,
        action: this.formatActivityAction(act.change_type, act.module_code),
        timestamp: act.created_at,
        time: new Date(act.created_at).toLocaleTimeString()
      })) || [];
    } catch (error) {
      console.error('Error fetching recent activity:', error);
      return [];
    }
  }

  /**
   * System alerts - things requiring attention
   * FTZ compliance and operational alerting system
   */
  async getAlerts(options = {}) {
    try {
      const alerts = [];

      // Check for low inventory - support both schema types (preserves schema flexibility)
      const lowInventoryResult = await DatabaseService.getAll('inventory_lots', {
        select: `
          id,
          quantity,
          status,
          parts (
            description
          )
        `,
        filters: [
          { column: 'status', operator: 'neq', value: 'voided' },
          { column: 'quantity', operator: 'lt', value: 10 }
        ],
        ...options
      });

      if (lowInventoryResult.success && lowInventoryResult.data?.length > 0) {
        alerts.push({
          type: 'warning',
          category: 'inventory',
          title: 'Low Inventory Alert',
          message: `${lowInventoryResult.data.length} lots have quantity below 10 units`,
          count: lowInventoryResult.data.length,
          priority: 'medium'
        });
      }

      // Check for overdue audits (preadmissions older than 3 days) - FTZ compliance critical
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

      const overdueAuditsResult = await DatabaseService.getAll('preadmissions', {
        select: 'id, "admission_id", arrival_date',
        filters: [
          { column: 'status', value: 'Arrived - Pending Audit' },
          { column: 'arrival_date', operator: 'lt', value: threeDaysAgo.toISOString() }
        ],
        ...options
      });

      if (overdueAuditsResult.success && overdueAuditsResult.data?.length > 0) {
        alerts.push({
          type: 'error',
          category: 'compliance',
          title: 'Overdue Audits',
          message: `${overdueAuditsResult.data.length} containers have been awaiting audit for over 3 days`,
          count: overdueAuditsResult.data.length,
          priority: 'high'
        });
      }

      // Check for upcoming quarterly pricing updates (Shanghai Steel Price Index)
      const pricingUpdatesResult = await DatabaseService.getAll('pricing_adjustments', {
        select: 'id, quarter, effective_date, status',
        filters: [{ column: 'status', value: 'draft' }],
        limit: 5,
        ...options
      });

      if (pricingUpdatesResult.success && pricingUpdatesResult.data?.length > 0) {
        alerts.push({
          type: 'info',
          category: 'pricing',
          title: 'Pricing Updates Available',
          message: `${pricingUpdatesResult.data.length} draft pricing adjustments ready for review`,
          count: pricingUpdatesResult.data.length,
          priority: 'low'
        });
      }

      // Sort by priority (preserves original sorting logic)
      return alerts.sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      });
    } catch (error) {
      console.error('Error fetching alerts:', error);
      return [];
    }
  }

  /**
   * Storage utilization metrics
   * FTZ storage capacity and utilization monitoring
   */
  async getStorageMetrics(options = {}) {
    try {
      const result = await DatabaseService.getAll('storage_locations', {
        select: `
          id,
          location_code,
          location_type,
          capacity_weight_kg,
          capacity_volume_m3,
          is_active
        `,
        filters: [{ column: 'is_active', value: true }],
        ...options
      });

      if (!result.success) {
        console.error('Storage locations query error:', result.error);
        return { totalLocations: 0, typeBreakdown: {}, totalCapacityWeight: 0, totalCapacityVolume: 0 };
      }

      const locations = result.data;
      const totalLocations = locations?.length || 0;
      
      // Type breakdown for storage analysis
      const typeBreakdown = locations?.reduce((acc, loc) => {
        acc[loc.location_type] = (acc[loc.location_type] || 0) + 1;
        return acc;
      }, {}) || {};

      const totalCapacityWeight = locations?.reduce((acc, loc) => acc + (loc.capacity_weight_kg || 0), 0) || 0;
      const totalCapacityVolume = locations?.reduce((acc, loc) => acc + (loc.capacity_volume_m3 || 0), 0) || 0;

      return {
        totalLocations,
        typeBreakdown,
        totalCapacityWeight,
        totalCapacityVolume
      };
    } catch (error) {
      console.error('Error fetching storage metrics:', error);
      return { totalLocations: 0, typeBreakdown: {}, totalCapacityWeight: 0, totalCapacityVolume: 0 };
    }
  }

  /**
   * Material pricing trends
   * Shanghai Steel Price Index (SHSPI) integration for quarterly adjustments
   */
  async getMaterialPricingMetrics(options = {}) {
    try {
      const result = await DatabaseService.getAll('material_indices', {
        select: 'material, price_usd_per_mt, price_date, index_source',
        orderBy: 'price_date.desc',
        limit: 20,
        ...options
      });

      if (!result.success) {
        console.error('Material pricing query error:', result.error);
        return [];
      }

      // Get latest price for each material (preserves original logic)
      const materialPrices = {};
      result.data?.forEach(price => {
        if (!materialPrices[price.material] || new Date(price.price_date) > new Date(materialPrices[price.material].price_date)) {
          materialPrices[price.material] = price;
        }
      });

      return Object.values(materialPrices);
    } catch (error) {
      console.error('Error fetching material pricing metrics:', error);
      return [];
    }
  }

  /**
   * Get real historical inventory trend data
   * Transaction-based trends with intelligent fallback mechanisms
   */
  async getInventoryTrendData(options = {}) {
    try {
      // First try to get transaction-based historical data (preserves original strategy)
      const historicalData = await this.getTransactionBasedTrends(options);
      if (historicalData && historicalData.length > 0) {
        return historicalData;
      }

      // Fallback to creation date based trends
      const last7Days = [];
      const today = new Date();
      
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        
        // Query inventory lots created up to this date
        const lotsResult = await DatabaseService.getAll('inventory_lots', {
          select: `
            id,
            quantity,
            created_at,
            parts!inner (
              standard_value,
              material_weight
            )
          `,
          filters: [
            { column: 'created_at', operator: 'lte', value: date.toISOString() },
            { column: 'status', operator: 'neq', value: 'voided' }
          ],
          ...options
        });

        if (!lotsResult.success) {
          console.error('Error fetching historical inventory:', lotsResult.error);
          // Use fallback data
          return this.generateFallbackTrendData();
        }

        const lotsUpToDate = lotsResult.data;
        const totalLots = lotsUpToDate?.length || 0;
        const totalValue = lotsUpToDate?.reduce((acc, lot) => {
          return acc + (lot.quantity * (lot.parts?.standard_value || 0));
        }, 0) || 0;

        last7Days.push({
          date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          inventory: totalLots,
          value: totalValue
        });
      }
      
      return last7Days;
    } catch (error) {
      console.error('Error generating inventory trend data:', error);
      // Return fallback data based on current metrics
      return this.generateFallbackTrendData();
    }
  }

  /**
   * Get transaction-based trend data (more accurate for historical trends)
   * Advanced analytics for FTZ transaction history
   */
  async getTransactionBasedTrends(options = {}) {
    try {
      const result = await DatabaseService.getAll('transactions', {
        select: `
          id,
          created_at,
          quantity,
          type,
          lot_id,
          inventory_lots!inner (
            parts!inner (
              standard_value
            )
          )
        `,
        orderBy: 'created_at.asc',
        limit: 100,
        ...options
      });

      if (!result.success || !result.data?.length) {
        return null;
      }

      const transactions = result.data;

      // Group transactions by date and calculate running totals (preserves original algorithm)
      const dailyData = {};
      let runningQuantity = 0;
      let runningValue = 0;

      transactions.forEach(txn => {
        const date = new Date(txn.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const quantity = txn.quantity || 0;
        const unitValue = txn.inventory_lots?.parts?.standard_value || 0;

        if (txn.type === 'received') {
          runningQuantity += quantity;
          runningValue += quantity * unitValue;
        } else if (txn.type === 'shipped') {
          runningQuantity -= quantity;
          runningValue -= quantity * unitValue;
        }

        dailyData[date] = {
          inventory: Math.max(0, runningQuantity),
          value: Math.max(0, runningValue)
        };
      });

      // Get last 7 days of data
      const last7Days = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateKey = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        
        last7Days.push({
          date: dateKey,
          inventory: dailyData[dateKey]?.inventory || runningQuantity,
          value: dailyData[dateKey]?.value || runningValue
        });
      }

      return last7Days;
    } catch (error) {
      console.error('Error fetching transaction-based trends:', error);
      return null;
    }
  }

  /**
   * Get real material breakdown data for charts
   * 40+ material types across 6 categories for FTZ classification
   */
  async getMaterialBreakdownData(options = {}) {
    try {
      const result = await DatabaseService.getAll('inventory_lots', {
        select: `
          quantity,
          parts!inner (
            material,
            standard_value,
            material_weight
          )
        `,
        filters: [{ column: 'status', operator: 'neq', value: 'voided' }],
        ...options
      });

      if (!result.success) {
        console.error('Material breakdown query error:', result.error);
        return [];
      }

      // Group by material and calculate totals (preserves original analysis logic)
      const materialBreakdown = result.data?.reduce((acc, lot) => {
        const material = lot.parts?.material || 'unknown';
        if (!acc[material]) {
          acc[material] = { quantity: 0, value: 0, weight: 0 };
        }
        acc[material].quantity += lot.quantity || 0;
        acc[material].value += (lot.quantity || 0) * (lot.parts?.standard_value || 0);
        acc[material].weight += (lot.quantity || 0) * (lot.parts?.material_weight || 0);
        return acc;
      }, {}) || {};

      // Convert to chart format (preserves original format)
      return Object.entries(materialBreakdown).map(([material, data]) => ({
        name: material.replace('_', ' ').toUpperCase(),
        quantity: data.quantity,
        value: data.value,
        weight: data.weight
      })).sort((a, b) => b.quantity - a.quantity);
    } catch (error) {
      console.error('Error fetching material breakdown data:', error);
      return [];
    }
  }

  /**
   * Fallback trend data when historical queries fail
   * Intelligent fallback mechanism for UX continuity
   */
  generateFallbackTrendData() {
    const last7Days = [];
    const currentLots = this.currentInventory?.totalLots || 0;
    const currentValue = this.currentInventory?.totalValue || 0;
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      // Generate realistic variations based on current data (preserves original algorithm)
      const variation = Math.sin(i * 0.5) * 0.1 + 1; // ±10% variation with trend
      
      last7Days.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        inventory: Math.max(0, Math.floor(currentLots * variation)),
        value: Math.max(0, Math.floor(currentValue * variation))
      });
    }
    return last7Days;
  }

  /**
   * Format activity actions for display
   * UI formatting for FTZ activity monitoring
   */
  formatActivityAction(action, tableName) {
    const actionMap = {
      'INSERT': 'created',
      'UPDATE': 'updated', 
      'DELETE': 'deleted'
    };

    const tableMap = {
      'inventory_lots': 'inventory lot',
      'preadmissions': 'preadmission',
      'preshipments': 'preshipment',
      'parts': 'part',
      'customers': 'customer',
      'suppliers': 'supplier'
    };

    const formattedAction = actionMap[action] || action.toLowerCase();
    const formattedTable = tableMap[tableName] || tableName.replace(/_/g, ' ');

    return `${formattedAction} ${formattedTable}`;
  }
}

module.exports = new DashboardService();