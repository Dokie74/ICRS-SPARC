// src/backend/services/ServiceInitializer.js
// Service initialization and dependency injection setup for enhanced ICRS_SPARC backend
// Orchestrates all services, monitoring, and real-time capabilities

const ServiceRegistry = require('./registry/ServiceRegistry');
const MonitoringService = require('../monitoring/MonitoringService');
const WebSocketManager = require('../realtime/WebSocketManager');

// Enhanced services
const EnhancedBaseService = require('./enhanced/EnhancedBaseService');

// Core services (updated imports)
const AuthService = require('./auth/AuthService');
const UserService = require('./auth/UserService');
const PermissionService = require('./auth/PermissionService');
const InventoryService = require('./inventory/InventoryService');
const PartService = require('./inventory/PartService');
const CustomerService = require('./core/CustomerService');
const PreadmissionService = require('./business/PreadmissionService');
const PreshipmentService = require('./business/PreshipmentService');
const EntrySummaryService = require('./business/EntrySummaryService');
const DashboardService = require('./analytics/DashboardService');

// API Controllers
const EnhancedInventoryController = require('../api/controllers/EnhancedInventoryController');

/**
 * Service Initializer for ICRS_SPARC Enhanced Backend
 * Sets up dependency injection, service registry, and orchestrates all backend services
 */
class ServiceInitializer {
  constructor() {
    this.serviceRegistry = new ServiceRegistry();
    this.monitoring = new MonitoringService();
    this.webSocketManager = null;
    this.isInitialized = false;
    this.services = {};
    this.controllers = {};
  }

  /**
   * Initialize all services with dependency injection
   */
  async initialize(httpServer = null) {
    if (this.isInitialized) {
      console.warn('ServiceInitializer already initialized');
      return;
    }

    try {
      console.log('Initializing ICRS_SPARC Enhanced Backend Services...');
      
      // Step 1: Initialize monitoring service
      await this.initializeMonitoring();
      
      // Step 2: Set up service registry with monitoring
      this.serviceRegistry.setMonitoring(this.monitoring);
      
      // Step 3: Register core services with dependencies
      await this.registerServices();
      
      // Step 4: Initialize service registry (resolves dependencies)
      await this.serviceRegistry.initialize();
      
      // Step 5: Set up real-time capabilities
      if (httpServer) {
        await this.initializeWebSocket(httpServer);
      }
      
      // Step 6: Initialize API controllers
      await this.initializeControllers();
      
      // Step 7: Set up cross-service event handlers
      await this.setupEventHandlers();
      
      this.isInitialized = true;
      console.log('ICRS_SPARC Enhanced Backend Services initialized successfully');
      
      // Log initialization metrics
      this.monitoring.recordMetric('service_initialization_completed', 1, {
        service_count: this.serviceRegistry.getAll().length,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Failed to initialize backend services:', error);
      throw error;
    }
  }

  /**
   * Initialize monitoring service
   */
  async initializeMonitoring() {
    await this.monitoring.initialize();
    console.log('Monitoring service initialized');
  }

  /**
   * Register all services with the service registry
   */
  async registerServices() {
    console.log('Registering backend services...');
    
    // Register services in dependency order
    
    // Core authentication services (no dependencies)
    this.services.authService = this.serviceRegistry.register(
      'AuthService', 
      AuthService.constructor, 
      []
    );
    
    this.services.userService = this.serviceRegistry.register(
      'UserService', 
      UserService.constructor || UserService, 
      ['AuthService']
    );
    
    this.services.permissionService = this.serviceRegistry.register(
      'PermissionService', 
      PermissionService.constructor || PermissionService, 
      ['AuthService']
    );
    
    // Core business services
    this.services.customerService = this.serviceRegistry.register(
      'CustomerService', 
      CustomerService.constructor || CustomerService, 
      ['AuthService']
    );
    
    this.services.partService = this.serviceRegistry.register(
      'PartService', 
      PartService.constructor || PartService, 
      ['AuthService']
    );
    
    // Inventory services (depend on customer and part services)
    this.services.inventoryService = this.serviceRegistry.register(
      'InventoryService', 
      InventoryService.constructor || InventoryService, 
      ['AuthService', 'CustomerService', 'PartService']
    );
    
    // Business workflow services
    this.services.preadmissionService = this.serviceRegistry.register(
      'PreadmissionService', 
      PreadmissionService.constructor || PreadmissionService, 
      ['AuthService', 'CustomerService', 'PartService', 'InventoryService']
    );
    
    this.services.preshipmentService = this.serviceRegistry.register(
      'PreshipmentService', 
      PreshipmentService.constructor || PreshipmentService, 
      ['AuthService', 'CustomerService', 'InventoryService']
    );
    
    this.services.entrySummaryService = this.serviceRegistry.register(
      'EntrySummaryService', 
      EntrySummaryService.constructor || EntrySummaryService, 
      ['AuthService', 'CustomerService', 'InventoryService']
    );
    
    // Analytics and dashboard services (depend on all business services)
    this.services.dashboardService = this.serviceRegistry.register(
      'DashboardService', 
      DashboardService.constructor || DashboardService, 
      ['AuthService', 'InventoryService', 'CustomerService', 'PartService']
    );
    
    console.log(`Registered ${Object.keys(this.services).length} services`);
  }

  /**
   * Initialize WebSocket manager for real-time capabilities
   */
  async initializeWebSocket(httpServer) {
    console.log('Initializing WebSocket manager...');
    
    this.webSocketManager = new WebSocketManager(
      httpServer, 
      this.services.authService, 
      this.monitoring
    );
    
    await this.webSocketManager.initialize();
    console.log('WebSocket manager initialized');
  }

  /**
   * Initialize API controllers
   */
  async initializeControllers() {
    console.log('Initializing API controllers...');
    
    // Enhanced inventory controller with comprehensive features
    this.controllers.inventoryController = new EnhancedInventoryController(
      this.services.inventoryService,
      this.services.authService,
      this.monitoring
    );
    
    // TODO: Add other enhanced controllers as needed
    // this.controllers.authController = new EnhancedAuthController(...);
    // this.controllers.customerController = new EnhancedCustomerController(...);
    // this.controllers.dashboardController = new EnhancedDashboardController(...);
    
    console.log(`Initialized ${Object.keys(this.controllers).length} controllers`);
  }

  /**
   * Set up cross-service event handlers for real-time updates
   */
  async setupEventHandlers() {
    console.log('Setting up cross-service event handlers...');
    
    if (!this.webSocketManager) {
      console.log('WebSocket manager not available, skipping real-time event setup');
      return;
    }
    
    // Inventory change events -> Real-time updates
    this.services.inventoryService.subscribeToEvent('inventory.lot.created', (event) => {
      this.webSocketManager.broadcast('inventory.changes', {
        type: 'lot.created',
        data: event
      });
    });
    
    this.services.inventoryService.subscribeToEvent('inventory.lot.updated', (event) => {
      this.webSocketManager.broadcast('inventory.changes', {
        type: 'lot.updated',
        data: event
      });
    });
    
    this.services.inventoryService.subscribeToEvent('inventory.low_stock_alert', (event) => {
      this.webSocketManager.broadcast('system.notifications', {
        type: 'low_stock_alert',
        priority: 'medium',
        data: event
      });
    });
    
    // Authentication events -> Session management
    this.services.authService.subscribeToEvent('user.logged_in', (event) => {
      this.webSocketManager.broadcast('user.sessions', {
        type: 'user.logged_in',
        data: event
      });
    });
    
    this.services.authService.subscribeToEvent('token.refreshed', (event) => {
      this.webSocketManager.broadcast('user.sessions', {
        type: 'token.refreshed',
        data: event
      });
    });
    
    // Service error events -> System notifications
    this.serviceRegistry.on('service.error', (event) => {
      if (event.error.severity === 'high' || event.error.severity === 'critical') {
        this.webSocketManager.broadcast('system.notifications', {
          type: 'service.error',
          priority: event.error.severity,
          data: event
        });
      }
    });
    
    console.log('Cross-service event handlers configured');
  }

  /**
   * Get service instance
   */
  getService(serviceName) {
    return this.serviceRegistry.get(serviceName);
  }

  /**
   * Get controller instance
   */
  getController(controllerName) {
    return this.controllers[controllerName];
  }

  /**
   * Get WebSocket manager
   */
  getWebSocketManager() {
    return this.webSocketManager;
  }

  /**
   * Get monitoring service
   */
  getMonitoring() {
    return this.monitoring;
  }

  /**
   * Get service registry
   */
  getServiceRegistry() {
    return this.serviceRegistry;
  }

  /**
   * Health check for all services
   */
  async getHealthStatus() {
    const healthStatus = {
      overall: 'healthy',
      services: {},
      websocket: null,
      monitoring: null,
      timestamp: new Date().toISOString()
    };
    
    try {
      // Check service registry health
      const serviceRegistryHealth = await this.serviceRegistry.getHealthStatus();
      healthStatus.services = serviceRegistryHealth;
      
      if (serviceRegistryHealth.unhealthy > 0) {
        healthStatus.overall = 'degraded';
      }
      
      // Check WebSocket manager health
      if (this.webSocketManager) {
        healthStatus.websocket = await this.webSocketManager.healthCheck();
      }
      
      // Check monitoring service health
      healthStatus.monitoring = await this.monitoring.healthCheck();
      if (healthStatus.monitoring.status !== 'healthy') {
        healthStatus.overall = 'degraded';
      }
      
    } catch (error) {
      healthStatus.overall = 'unhealthy';
      healthStatus.error = error.message;
    }
    
    return healthStatus;
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    console.log('Shutting down ICRS_SPARC Enhanced Backend Services...');
    
    try {
      // Shutdown WebSocket manager
      if (this.webSocketManager) {
        await this.webSocketManager.shutdown();
      }
      
      // Shutdown service registry
      await this.serviceRegistry.shutdown();
      
      // Shutdown monitoring
      await this.monitoring.shutdown();
      
      this.isInitialized = false;
      console.log('Backend services shutdown complete');
      
    } catch (error) {
      console.error('Error during services shutdown:', error);
      throw error;
    }
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics() {
    const services = Object.keys(this.services);
    const metrics = {};
    
    services.forEach(serviceName => {
      const serviceMetrics = this.monitoring.getServicePerformanceSummary(serviceName);
      if (serviceMetrics.totalOperations > 0) {
        metrics[serviceName] = serviceMetrics;
      }
    });
    
    return {
      services: metrics,
      system: this.monitoring.getSystemMetrics(),
      websocket: this.webSocketManager ? this.webSocketManager.getConnectionStats() : null
    };
  }
}

// Export singleton instance
module.exports = new ServiceInitializer();