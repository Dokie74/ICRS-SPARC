// tests/fixtures/mock-api-responses.js
// Mock API responses for testing

const testData = require('./test-data');

module.exports = {
  // Authentication responses
  auth: {
    loginSuccess: {
      success: true,
      data: {
        user: testData.users.admin,
        token: 'mock-jwt-token-admin',
        refreshToken: 'mock-refresh-token-admin',
        expiresIn: 3600
      }
    },
    loginInvalid: {
      success: false,
      error: 'Invalid credentials'
    },
    tokenExpired: {
      success: false,
      error: 'Token expired',
      code: 'TOKEN_EXPIRED'
    }
  },

  // Receiving API responses
  receiving: {
    getPreadmissions: {
      success: true,
      data: Object.values(testData.preadmissions),
      pagination: {
        total: 3,
        page: 1,
        limit: 10,
        totalPages: 1
      }
    },
    getPreadmissionById: {
      success: true,
      data: testData.preadmissions.pending
    },
    createPreadmission: {
      success: true,
      data: {
        ...testData.preadmissions.pending,
        id: 'preadmit-new-001',
        created_at: new Date().toISOString()
      }
    },
    updatePreadmissionStatus: {
      success: true,
      data: {
        ...testData.preadmissions.pending,
        status: 'Arrived',
        actual_arrival: new Date().toISOString()
      }
    },
    completeDockAudit: {
      success: true,
      data: {
        ...testData.dockAudits.accepted,
        id: 'audit-new-001',
        audit_timestamp: new Date().toISOString()
      }
    },
    verifyFTZCompliance: {
      success: true,
      data: {
        ...testData.ftzCompliance.verified,
        id: 'ftz-new-001',
        verified_at: new Date().toISOString()
      }
    },
    getAuditPhotos: {
      success: true,
      data: {
        photos: [
          {
            id: 'photo-001',
            filename: 'audit-photo-1.jpg',
            url: '/api/photos/audit-photo-1.jpg',
            thumbnail_url: '/api/photos/thumbs/audit-photo-1.jpg',
            uploaded_at: '2024-01-20T09:00:00Z'
          },
          {
            id: 'photo-002',
            filename: 'audit-photo-2.jpg',
            url: '/api/photos/audit-photo-2.jpg',
            thumbnail_url: '/api/photos/thumbs/audit-photo-2.jpg',
            uploaded_at: '2024-01-20T09:01:00Z'
          }
        ]
      }
    },
    receivingStats: {
      success: true,
      data: {
        total_preadmissions: 15,
        pending: 5,
        arrived: 3,
        inspecting: 2,
        accepted: 4,
        rejected: 1,
        avg_processing_time: 2.5, // hours
        ftz_compliance_rate: 0.95
      }
    }
  },

  // Shipping API responses
  shipping: {
    getPreshipments: {
      success: true,
      data: Object.values(testData.preshipments),
      pagination: {
        total: 4,
        page: 1,
        limit: 10,
        totalPages: 1
      }
    },
    getPreshipmentById: {
      success: true,
      data: testData.preshipments.draft
    },
    createPreshipment: {
      success: true,
      data: {
        ...testData.preshipments.draft,
        id: 'ship-new-001',
        shipment_id: 'SHIP-NEW-001',
        created_at: new Date().toISOString()
      }
    },
    updatePreshipmentStatus: {
      success: true,
      data: {
        ...testData.preshipments.draft,
        status: 'Pending Pick',
        updated_at: new Date().toISOString()
      }
    },
    generateLabels: {
      success: true,
      data: {
        labels: [
          {
            ...testData.shippingLabels.ups_ground,
            id: 'label-new-001',
            tracking_number: `1Z999AA${Date.now()}`,
            created_at: new Date().toISOString()
          }
        ],
        tracking_numbers: [`1Z999AA${Date.now()}`]
      }
    },
    completeDriverSignoff: {
      success: true,
      data: {
        ...testData.driverSignoffs.standard,
        id: 'signoff-new-001',
        created_at: new Date().toISOString()
      }
    },
    updateStatus: {
      success: true,
      data: {
        ...testData.preshipments.draft,
        status: 'Shipped',
        shipped_at: new Date().toISOString()
      }
    },
    fileWithCBP: {
      success: true,
      data: {
        ...testData.cbpFilings.export,
        id: 'cbp-new-001',
        filed_at: new Date().toISOString()
      }
    },
    getPreshipmentStats: {
      success: true,
      data: {
        total_shipments: 25,
        draft: 5,
        pending_pick: 3,
        pulled: 2,
        ready_pickup: 4,
        shipped: 11,
        avg_processing_time: 4.2, // hours
        on_time_delivery_rate: 0.92
      }
    },
    consolidateShipments: {
      success: true,
      data: {
        consolidated_shipment: {
          id: 'ship-consolidated-001',
          shipment_id: 'SHIP-CONSOLIDATED-001',
          original_shipments: ['ship-001', 'ship-002', 'ship-003'],
          total_items: 150,
          total_weight: '45.5',
          savings: '125.50'
        }
      }
    }
  },

  // Inventory API responses
  inventory: {
    getInventoryItems: {
      success: true,
      data: testData.inventory.available,
      pagination: {
        total: 4,
        page: 1,
        limit: 10,
        totalPages: 1
      }
    },
    getInventoryItem: {
      success: true,
      data: testData.inventory.available[0]
    },
    reserveInventory: {
      success: true,
      data: {
        ...testData.inventory.available[0],
        quantity_reserved: 150,
        quantity_available: 850
      }
    }
  },

  // Customer API responses
  customers: {
    getCustomers: {
      success: true,
      data: testData.customers
    },
    getCustomer: {
      success: true,
      data: testData.customers[0]
    }
  },

  // Error responses
  errors: {
    validation: {
      success: false,
      error: 'Validation failed',
      validationErrors: [
        'Container number is required',
        'BOL number is required',
        'Customer name is required'
      ]
    },
    unauthorized: {
      success: false,
      error: 'Unauthorized access',
      code: 'UNAUTHORIZED'
    },
    forbidden: {
      success: false,
      error: 'Insufficient permissions',
      code: 'FORBIDDEN'
    },
    notFound: {
      success: false,
      error: 'Resource not found',
      code: 'NOT_FOUND'
    },
    serverError: {
      success: false,
      error: 'Internal server error',
      code: 'SERVER_ERROR'
    },
    networkError: {
      success: false,
      error: 'Network request failed',
      code: 'NETWORK_ERROR'
    },
    labelServiceError: {
      success: false,
      error: 'Label service temporarily unavailable',
      code: 'LABEL_SERVICE_ERROR'
    }
  },

  // Report responses
  reports: {
    shippingSummary: {
      success: true,
      data: {
        report_id: 'report-001',
        type: 'shipping-summary',
        date_range: {
          start: '2024-01-01',
          end: '2024-01-31'
        },
        download_url: '/api/reports/shipping-summary-2024-01.pdf',
        generated_at: new Date().toISOString(),
        data: {
          total_shipments: 245,
          total_value: '125750.00',
          carrier_breakdown: {
            UPS: 125,
            FedEx: 95,
            USPS: 25
          },
          status_breakdown: {
            shipped: 220,
            pending: 15,
            cancelled: 10
          }
        }
      }
    },
    carrierPerformance: {
      success: true,
      data: {
        report_id: 'report-002',
        type: 'carrier-performance',
        carrier: 'UPS',
        metrics: {
          on_time_delivery: 0.94,
          damage_rate: 0.02,
          avg_transit_time: 2.3,
          customer_satisfaction: 4.2
        }
      }
    }
  },

  // Tracking responses
  tracking: {
    trackingInfo: {
      success: true,
      data: {
        tracking_number: '1Z999AA1234567890',
        status: 'In Transit',
        estimated_delivery: '2024-01-25T17:00:00Z',
        events: [
          {
            date: '2024-01-21T10:00:00Z',
            location: 'Origin Facility',
            description: 'Package picked up',
            status: 'Picked Up'
          },
          {
            date: '2024-01-21T15:30:00Z',
            location: 'Sort Facility',
            description: 'Package processed at sort facility',
            status: 'In Transit'
          },
          {
            date: '2024-01-22T08:00:00Z',
            location: 'Transport Hub',
            description: 'Package in transit to destination',
            status: 'In Transit'
          }
        ]
      }
    },
    trackingException: {
      success: true,
      data: {
        tracking_number: '1Z999AA1234567890',
        status: 'Exception',
        exception_type: 'Weather Delay',
        exception_description: 'Package delayed due to severe weather conditions',
        estimated_delivery: '2024-01-26T17:00:00Z',
        updated_at: '2024-01-23T14:30:00Z'
      }
    }
  },

  // Bulk operation responses
  bulk: {
    statusUpdate: {
      success: true,
      data: {
        processed: 5,
        successful: 5,
        failed: 0,
        results: [
          { id: 'ship-001', status: 'success' },
          { id: 'ship-002', status: 'success' },
          { id: 'ship-003', status: 'success' },
          { id: 'ship-004', status: 'success' },
          { id: 'ship-005', status: 'success' }
        ]
      }
    },
    labelGeneration: {
      success: true,
      data: {
        processed: 5,
        successful: 5,
        failed: 0,
        labels_generated: 5,
        tracking_numbers: [
          '1Z999AA1234567890',
          '1Z999AA1234567891',
          '1Z999AA1234567892',
          '1Z999AA1234567893',
          '1Z999AA1234567894'
        ]
      }
    }
  }
};