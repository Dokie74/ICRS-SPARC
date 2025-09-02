// src/frontend/services/receivingService.js
// Receiving service API client for ICRS SPARC frontend
// Handles all receiving-related API operations and FTZ compliance workflow

import apiClient from './api-client';

class ReceivingService {
  constructor() {
    this.baseUrl = '/api/receiving';
  }

  // Get all receiving records with optional filters
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
      
      // Handle container filtering
      if (params.container) {
        queryParams.append('container', params.container);
      }
      
      // Handle FTZ status filtering
      if (params.ftz_status) {
        queryParams.append('ftz_status', params.ftz_status);
      }
      
      // Handle urgency filtering
      if (params.ftz_urgency) {
        queryParams.append('ftz_urgency', params.ftz_urgency);
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
        preadmissions: response.preadmissions || response.data || [],
        total: response.total || response.preadmissions?.length || 0,
        page: response.page || 1,
        totalPages: response.totalPages || 1
      };
    } catch (error) {
      console.error('Error fetching receiving data:', error);
      throw new Error(error.message || 'Failed to fetch receiving data');
    }
  }

  // Get receiving record by ID
  async getById(id) {
    try {
      const response = await apiClient.get(`${this.baseUrl}/${id}`);
      return {
        success: true,
        preadmission: response.preadmission || response.data
      };
    } catch (error) {
      console.error('Error fetching receiving record:', error);
      throw new Error(error.message || 'Failed to fetch receiving record');
    }
  }

  // Create new receiving entry (dock arrival)
  async create(receivingData) {
    try {
      const response = await apiClient.post(this.baseUrl, receivingData);
      return {
        success: true,
        preadmission: response.preadmission || response.data,
        message: 'Receiving entry created successfully'
      };
    } catch (error) {
      console.error('Error creating receiving entry:', error);
      throw new Error(error.message || 'Failed to create receiving entry');
    }
  }

  // Update receiving record
  async update(id, receivingData) {
    try {
      const response = await apiClient.put(`${this.baseUrl}/${id}`, receivingData);
      return {
        success: true,
        preadmission: response.preadmission || response.data,
        message: 'Receiving record updated successfully'
      };
    } catch (error) {
      console.error('Error updating receiving record:', error);
      throw new Error(error.message || 'Failed to update receiving record');
    }
  }

  // Update receiving status (workflow management)
  async updateStatus(id, status, notes = '') {
    try {
      const response = await apiClient.patch(`${this.baseUrl}/${id}/status`, {
        status,
        notes,
        updated_at: new Date().toISOString()
      });
      
      return {
        success: true,
        preadmission: response.preadmission || response.data,
        message: `Receiving status updated to ${status}`
      };
    } catch (error) {
      console.error('Error updating receiving status:', error);
      throw new Error(error.message || 'Failed to update receiving status');
    }
  }

  // Complete dock audit inspection
  async completeDockAudit(id, auditData) {
    try {
      // Handle FormData submission for photo uploads
      let requestData;
      let contentType = 'application/json';
      
      if (auditData instanceof FormData) {
        requestData = auditData;
        contentType = 'multipart/form-data';
      } else {
        requestData = auditData;
      }

      const response = await apiClient.request(`${this.baseUrl}/${id}/dock-audit`, {
        method: 'POST',
        headers: contentType === 'application/json' ? 
          { 'Content-Type': 'application/json' } : {},
        body: contentType === 'application/json' ? 
          JSON.stringify(requestData) : requestData
      });
      
      return {
        success: true,
        preadmission: response.preadmission || response.data,
        audit_record: response.audit_record,
        message: 'Dock audit completed successfully'
      };
    } catch (error) {
      console.error('Error completing dock audit:', error);
      throw new Error(error.message || 'Failed to complete dock audit');
    }
  }

  // Start container inspection
  async startInspection(id, inspectorData) {
    try {
      const response = await apiClient.post(`${this.baseUrl}/${id}/inspection/start`, inspectorData);
      
      return {
        success: true,
        preadmission: response.preadmission || response.data,
        inspection_id: response.inspection_id,
        message: 'Container inspection started'
      };
    } catch (error) {
      console.error('Error starting inspection:', error);
      throw new Error(error.message || 'Failed to start container inspection');
    }
  }

  // Record container arrival at dock
  async recordArrival(id, arrivalData) {
    try {
      const response = await apiClient.post(`${this.baseUrl}/${id}/arrival`, {
        ...arrivalData,
        arrived_at: arrivalData.arrived_at || new Date().toISOString()
      });
      
      return {
        success: true,
        preadmission: response.preadmission || response.data,
        message: 'Container arrival recorded successfully'
      };
    } catch (error) {
      console.error('Error recording arrival:', error);
      throw new Error(error.message || 'Failed to record container arrival');
    }
  }

  // Validate FTZ compliance
  async validateFTZCompliance(id, complianceData) {
    try {
      const response = await apiClient.post(`${this.baseUrl}/${id}/ftz-validation`, complianceData);
      
      return {
        success: true,
        compliance_status: response.compliance_status,
        violations: response.violations || [],
        recommendations: response.recommendations || [],
        estimated_clearance: response.estimated_clearance,
        message: 'FTZ compliance validation completed'
      };
    } catch (error) {
      console.error('Error validating FTZ compliance:', error);
      throw new Error(error.message || 'Failed to validate FTZ compliance');
    }
  }

  // Get dock schedule and capacity
  async getDockSchedule(date = null) {
    try {
      const params = new URLSearchParams();
      if (date) {
        params.append('date', date);
      }
      
      const url = params.toString() ? 
        `${this.baseUrl}/dock/schedule?${params.toString()}` : 
        `${this.baseUrl}/dock/schedule`;
        
      const response = await apiClient.get(url);
      
      return {
        success: true,
        schedule: response.schedule || [],
        capacity: response.capacity,
        available_slots: response.available_slots || [],
        current_occupancy: response.current_occupancy
      };
    } catch (error) {
      console.error('Error fetching dock schedule:', error);
      throw new Error(error.message || 'Failed to fetch dock schedule');
    }
  }

  // Schedule dock appointment
  async scheduleDockAppointment(id, appointmentData) {
    try {
      const response = await apiClient.post(`${this.baseUrl}/${id}/appointment`, appointmentData);
      
      return {
        success: true,
        appointment: response.appointment,
        confirmation_number: response.confirmation_number,
        message: 'Dock appointment scheduled successfully'
      };
    } catch (error) {
      console.error('Error scheduling appointment:', error);
      throw new Error(error.message || 'Failed to schedule dock appointment');
    }
  }

  // Get receiving statistics and dashboard data
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
      console.error('Error fetching receiving stats:', error);
      throw new Error(error.message || 'Failed to fetch receiving statistics');
    }
  }

  // Generate receiving report
  async generateReport(id, reportType = 'inspection') {
    try {
      const response = await apiClient.post(`${this.baseUrl}/${id}/report/${reportType}`);
      
      return {
        success: true,
        report_url: response.report_url,
        report_id: response.report_id,
        message: 'Report generated successfully'
      };
    } catch (error) {
      console.error('Error generating report:', error);
      throw new Error(error.message || 'Failed to generate receiving report');
    }
  }

  // Upload supporting documents
  async uploadDocuments(id, files) {
    try {
      const formData = new FormData();
      
      if (Array.isArray(files)) {
        files.forEach((file, index) => {
          formData.append(`documents[${index}]`, file);
        });
      } else {
        formData.append('document', files);
      }
      
      const response = await apiClient.request(`${this.baseUrl}/${id}/documents`, {
        method: 'POST',
        body: formData
      });
      
      return {
        success: true,
        uploaded_files: response.uploaded_files || [],
        message: 'Documents uploaded successfully'
      };
    } catch (error) {
      console.error('Error uploading documents:', error);
      throw new Error(error.message || 'Failed to upload documents');
    }
  }

  // Get document list for receiving record
  async getDocuments(id) {
    try {
      const response = await apiClient.get(`${this.baseUrl}/${id}/documents`);
      
      return {
        success: true,
        documents: response.documents || []
      };
    } catch (error) {
      console.error('Error fetching documents:', error);
      throw new Error(error.message || 'Failed to fetch documents');
    }
  }

  // Delete document
  async deleteDocument(id, documentId) {
    try {
      await apiClient.delete(`${this.baseUrl}/${id}/documents/${documentId}`);
      
      return {
        success: true,
        message: 'Document deleted successfully'
      };
    } catch (error) {
      console.error('Error deleting document:', error);
      throw new Error(error.message || 'Failed to delete document');
    }
  }

  // Bulk operations
  async bulkUpdateStatus(receivingIds, status, notes = '') {
    try {
      const response = await apiClient.patch(`${this.baseUrl}/bulk/status`, {
        receiving_ids: receivingIds,
        status,
        notes
      });
      
      return {
        success: true,
        updated_count: response.updated_count,
        message: `Updated ${response.updated_count} receiving records to ${status}`
      };
    } catch (error) {
      console.error('Error bulk updating status:', error);
      throw new Error(error.message || 'Failed to bulk update receiving status');
    }
  }

  // Export receiving data
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
        ?.replace(/"/g, '') || 'receiving.csv';
      
      return {
        success: true,
        blob,
        filename,
        message: 'Data exported successfully'
      };
    } catch (error) {
      console.error('Error exporting data:', error);
      throw new Error(error.message || 'Failed to export receiving data');
    }
  }

  // Get FTZ workflow configuration
  async getFTZWorkflowConfig() {
    try {
      const response = await apiClient.get(`${this.baseUrl}/ftz/workflow`);
      
      return {
        success: true,
        ftz_zones: response.ftz_zones || [],
        compliance_rules: response.compliance_rules || [],
        inspection_requirements: response.inspection_requirements || [],
        documentation_requirements: response.documentation_requirements || []
      };
    } catch (error) {
      console.error('Error fetching FTZ workflow config:', error);
      throw new Error(error.message || 'Failed to fetch FTZ workflow configuration');
    }
  }

  // Validate container seal
  async validateSeal(id, sealData) {
    try {
      const response = await apiClient.post(`${this.baseUrl}/${id}/seal/validate`, sealData);
      
      return {
        success: true,
        seal_valid: response.seal_valid,
        seal_history: response.seal_history || [],
        discrepancies: response.discrepancies || [],
        message: response.seal_valid ? 'Seal validated successfully' : 'Seal validation failed'
      };
    } catch (error) {
      console.error('Error validating seal:', error);
      throw new Error(error.message || 'Failed to validate container seal');
    }
  }

  // Get audit trail
  async getAuditTrail(id) {
    try {
      const response = await apiClient.get(`${this.baseUrl}/${id}/audit-trail`);
      
      return {
        success: true,
        audit_trail: response.audit_trail || [],
        total_events: response.total_events
      };
    } catch (error) {
      console.error('Error fetching audit trail:', error);
      throw new Error(error.message || 'Failed to fetch audit trail');
    }
  }

  // Archive completed receiving record
  async archiveReceiving(id) {
    try {
      const response = await apiClient.patch(`${this.baseUrl}/${id}/archive`);
      
      return {
        success: true,
        message: 'Receiving record archived successfully'
      };
    } catch (error) {
      console.error('Error archiving receiving record:', error);
      throw new Error(error.message || 'Failed to archive receiving record');
    }
  }

  // Restore archived receiving record
  async restoreReceiving(id) {
    try {
      const response = await apiClient.patch(`${this.baseUrl}/${id}/restore`);
      
      return {
        success: true,
        preadmission: response.preadmission || response.data,
        message: 'Receiving record restored successfully'
      };
    } catch (error) {
      console.error('Error restoring receiving record:', error);
      throw new Error(error.message || 'Failed to restore receiving record');
    }
  }
}

// Create and export singleton instance
export const receivingService = new ReceivingService();
export default receivingService;