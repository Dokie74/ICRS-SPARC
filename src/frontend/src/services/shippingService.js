// src/frontend/services/shippingService.js
// Shipping service API client for ICRS SPARC frontend
// Handles all shipping-related API operations and workflow management

import apiClient from './api-client';

class ShippingService {
  constructor() {
    this.baseUrl = '/api/shipping';
  }

  // Get all shipping records with optional filters
  async getAll(params = {}) {
    try {
      const queryParams = new URLSearchParams();
      
      // Handle view-based filtering
      if (params.view) {
        queryParams.append('view', params.view);
      }
      
      // Handle status filtering
      if (params.status) {
        queryParams.append('status', params.status);
      }
      
      // Handle search parameters
      if (params.search) {
        queryParams.append('search', params.search);
      }
      
      // Handle customer filtering
      if (params.customer) {
        queryParams.append('customer', params.customer);
      }
      
      // Handle priority filtering
      if (params.priority) {
        queryParams.append('priority', params.priority);
      }
      
      // Handle pagination
      if (params.page) {
        queryParams.append('page', params.page);
      }
      
      if (params.limit) {
        queryParams.append('limit', params.limit);
      }

      const url = queryParams.toString() ? `${this.baseUrl}?${queryParams.toString()}` : this.baseUrl;
      const response = await apiClient.get(url);
      
      return {
        success: true,
        preshipments: response.preshipments || response.data || [],
        total: response.total || response.preshipments?.length || 0,
        page: response.page || 1,
        totalPages: response.totalPages || 1
      };
    } catch (error) {
      console.error('Error fetching shipping data:', error);
      throw new Error(error.message || 'Failed to fetch shipping data');
    }
  }

  // Get shipping record by ID
  async getById(id) {
    try {
      const response = await apiClient.get(`${this.baseUrl}/${id}`);
      return {
        success: true,
        preshipment: response.preshipment || response.data
      };
    } catch (error) {
      console.error('Error fetching shipping record:', error);
      throw new Error(error.message || 'Failed to fetch shipping record');
    }
  }

  // Create new shipping record
  async create(shipmentData) {
    try {
      const response = await apiClient.post(this.baseUrl, shipmentData);
      return {
        success: true,
        preshipment: response.preshipment || response.data,
        message: 'Shipment created successfully'
      };
    } catch (error) {
      console.error('Error creating shipment:', error);
      throw new Error(error.message || 'Failed to create shipment');
    }
  }

  // Update shipping record
  async update(id, shipmentData) {
    try {
      const response = await apiClient.put(`${this.baseUrl}/${id}`, shipmentData);
      return {
        success: true,
        preshipment: response.preshipment || response.data,
        message: 'Shipment updated successfully'
      };
    } catch (error) {
      console.error('Error updating shipment:', error);
      throw new Error(error.message || 'Failed to update shipment');
    }
  }

  // Delete shipping record
  async delete(id) {
    try {
      await apiClient.delete(`${this.baseUrl}/${id}`);
      return {
        success: true,
        message: 'Shipment deleted successfully'
      };
    } catch (error) {
      console.error('Error deleting shipment:', error);
      throw new Error(error.message || 'Failed to delete shipment');
    }
  }

  // Update shipment status (workflow management)
  async updateStatus(id, status, notes = '') {
    try {
      const response = await apiClient.patch(`${this.baseUrl}/${id}/status`, {
        status,
        notes,
        updated_at: new Date().toISOString()
      });
      
      return {
        success: true,
        preshipment: response.preshipment || response.data,
        message: `Shipment status updated to ${status}`
      };
    } catch (error) {
      console.error('Error updating shipment status:', error);
      throw new Error(error.message || 'Failed to update shipment status');
    }
  }

  // Generate shipping labels
  async generateLabels(id, labelData) {
    try {
      const response = await apiClient.post(`${this.baseUrl}/${id}/labels`, labelData);
      
      return {
        success: true,
        labels: response.labels || [],
        tracking_numbers: response.tracking_numbers || [],
        estimated_cost: response.estimated_cost,
        message: 'Labels generated successfully'
      };
    } catch (error) {
      console.error('Error generating labels:', error);
      throw new Error(error.message || 'Failed to generate shipping labels');
    }
  }

  // Complete driver signoff
  async completeDriverSignoff(id, signoffData) {
    try {
      const response = await apiClient.post(`${this.baseUrl}/${id}/signoff`, signoffData);
      
      return {
        success: true,
        preshipment: response.preshipment || response.data,
        signoff_record: response.signoff_record,
        message: 'Driver signoff completed successfully'
      };
    } catch (error) {
      console.error('Error completing driver signoff:', error);
      throw new Error(error.message || 'Failed to complete driver signoff');
    }
  }

  // File with CBP (Customs and Border Protection)
  async fileWithCBP(id) {
    try {
      const response = await apiClient.post(`${this.baseUrl}/${id}/cbp-filing`);
      
      return {
        success: true,
        filing_reference: response.filing_reference,
        filing_status: response.filing_status,
        estimated_clearance: response.estimated_clearance,
        message: 'CBP filing initiated successfully'
      };
    } catch (error) {
      console.error('Error filing with CBP:', error);
      throw new Error(error.message || 'Failed to file with CBP');
    }
  }

  // Get shipping statistics and dashboard data
  async getStats(params = {}) {
    try {
      const queryParams = new URLSearchParams();
      
      if (params.period) {
        queryParams.append('period', params.period);
      }
      
      if (params.start_date) {
        queryParams.append('start_date', params.start_date);
      }
      
      if (params.end_date) {
        queryParams.append('end_date', params.end_date);
      }

      const url = queryParams.toString() ? 
        `${this.baseUrl}/stats?${queryParams.toString()}` : 
        `${this.baseUrl}/stats`;
        
      const response = await apiClient.get(url);
      
      return {
        success: true,
        stats: response.stats || response.data
      };
    } catch (error) {
      console.error('Error fetching shipping stats:', error);
      throw new Error(error.message || 'Failed to fetch shipping statistics');
    }
  }

  // Validate shipping data
  async validateShipment(shipmentData) {
    try {
      const response = await apiClient.post(`${this.baseUrl}/validate`, shipmentData);
      
      return {
        success: true,
        is_valid: response.is_valid,
        validation_errors: response.validation_errors || [],
        warnings: response.warnings || [],
        estimated_cost: response.estimated_cost,
        estimated_delivery: response.estimated_delivery
      };
    } catch (error) {
      console.error('Error validating shipment:', error);
      throw new Error(error.message || 'Failed to validate shipment data');
    }
  }

  // Get carrier rates for comparison
  async getCarrierRates(shipmentData) {
    try {
      const response = await apiClient.post(`${this.baseUrl}/rates`, shipmentData);
      
      return {
        success: true,
        rates: response.rates || [],
        cheapest: response.cheapest,
        fastest: response.fastest
      };
    } catch (error) {
      console.error('Error fetching carrier rates:', error);
      throw new Error(error.message || 'Failed to fetch carrier rates');
    }
  }

  // Track shipment
  async trackShipment(trackingNumber, carrier = null) {
    try {
      const params = new URLSearchParams({ tracking_number: trackingNumber });
      if (carrier) {
        params.append('carrier', carrier);
      }
      
      const response = await apiClient.get(`${this.baseUrl}/track?${params.toString()}`);
      
      return {
        success: true,
        tracking_info: response.tracking_info,
        status: response.status,
        events: response.events || [],
        estimated_delivery: response.estimated_delivery
      };
    } catch (error) {
      console.error('Error tracking shipment:', error);
      throw new Error(error.message || 'Failed to track shipment');
    }
  }

  // Bulk operations
  async bulkUpdateStatus(shipmentIds, status, notes = '') {
    try {
      const response = await apiClient.patch(`${this.baseUrl}/bulk/status`, {
        shipment_ids: shipmentIds,
        status,
        notes
      });
      
      return {
        success: true,
        updated_count: response.updated_count,
        message: `Updated ${response.updated_count} shipments to ${status}`
      };
    } catch (error) {
      console.error('Error bulk updating status:', error);
      throw new Error(error.message || 'Failed to bulk update shipment status');
    }
  }

  // Export shipment data
  async exportData(params = {}) {
    try {
      const queryParams = new URLSearchParams();
      
      if (params.format) {
        queryParams.append('format', params.format); // csv, xlsx, pdf
      }
      
      if (params.start_date) {
        queryParams.append('start_date', params.start_date);
      }
      
      if (params.end_date) {
        queryParams.append('end_date', params.end_date);
      }
      
      if (params.status) {
        queryParams.append('status', params.status);
      }

      const url = `${this.baseUrl}/export?${queryParams.toString()}`;
      
      // Handle file download
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${apiClient.token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Export failed');
      }
      
      const blob = await response.blob();
      const filename = response.headers.get('content-disposition')
        ?.split('filename=')[1]
        ?.replace(/"/g, '') || 'shipments.csv';
      
      return {
        success: true,
        blob,
        filename,
        message: 'Data exported successfully'
      };
    } catch (error) {
      console.error('Error exporting data:', error);
      throw new Error(error.message || 'Failed to export shipping data');
    }
  }

  // Get workflow configuration
  async getWorkflowConfig() {
    try {
      const response = await apiClient.get(`${this.baseUrl}/workflow/config`);
      
      return {
        success: true,
        workflow_stages: response.workflow_stages || [],
        status_transitions: response.status_transitions || {},
        automation_rules: response.automation_rules || []
      };
    } catch (error) {
      console.error('Error fetching workflow config:', error);
      throw new Error(error.message || 'Failed to fetch workflow configuration');
    }
  }

  // Archive completed shipments
  async archiveShipment(id) {
    try {
      const response = await apiClient.patch(`${this.baseUrl}/${id}/archive`);
      
      return {
        success: true,
        message: 'Shipment archived successfully'
      };
    } catch (error) {
      console.error('Error archiving shipment:', error);
      throw new Error(error.message || 'Failed to archive shipment');
    }
  }

  // Restore archived shipment
  async restoreShipment(id) {
    try {
      const response = await apiClient.patch(`${this.baseUrl}/${id}/restore`);
      
      return {
        success: true,
        preshipment: response.preshipment || response.data,
        message: 'Shipment restored successfully'
      };
    } catch (error) {
      console.error('Error restoring shipment:', error);
      throw new Error(error.message || 'Failed to restore shipment');
    }
  }
}

// Create and export singleton instance
export const shippingService = new ShippingService();
export default shippingService;