// examples/enhanced-backend-integration.js
// Comprehensive example of enhanced ICRS_SPARC backend integration
// Demonstrates service initialization, real-time capabilities, and monitoring

const express = require('express');
const http = require('http');
const ServiceInitializer = require('../src/backend/services/ServiceInitializer');

/**
 * Enhanced ICRS_SPARC Backend Integration Example
 * 
 * This example demonstrates:
 * 1. Service initialization with dependency injection
 * 2. API endpoint setup with enhanced controllers
 * 3. Real-time WebSocket communication
 * 4. Monitoring and health checks
 * 5. Graceful shutdown handling
 */
class EnhancedBackendExample {
  constructor() {
    this.app = express();
    this.server = null;
    this.serviceInitializer = ServiceInitializer;
  }

  /**
   * Initialize the enhanced backend
   */
  async initialize() {
    try {
      console.log('Starting Enhanced ICRS_SPARC Backend...');
      
      // 1. Set up Express middleware
      this.setupExpressMiddleware();
      
      // 2. Create HTTP server
      this.server = http.createServer(this.app);
      
      // 3. Initialize all backend services
      await this.serviceInitializer.initialize(this.server);
      
      // 4. Set up API routes
      this.setupAPIRoutes();
      
      // 5. Set up health and monitoring endpoints
      this.setupMonitoringEndpoints();
      
      // 6. Set up error handling
      this.setupErrorHandling();
      
      // 7. Set up graceful shutdown
      this.setupGracefulShutdown();
      
      console.log('Enhanced ICRS_SPARC Backend initialized successfully');
      
    } catch (error) {
      console.error('Failed to initialize enhanced backend:', error);
      throw error;
    }
  }

  /**
   * Set up Express middleware
   */
  setupExpressMiddleware() {
    // CORS
    this.app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      if (req.method === 'OPTIONS') {
        res.sendStatus(200);
      } else {
        next();
      }
    });

    // JSON parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));

    // Request logging with monitoring
    this.app.use((req, res, next) => {
      const startTime = Date.now();
      const originalSend = res.send;
      
      res.send = function(data) {
        const duration = Date.now() - startTime;
        
        // Log request to monitoring service
        const monitoring = ServiceInitializer.getMonitoring();
        monitoring?.log({
          level: 'info',
          message: `${req.method} ${req.path}`,
          service: 'ExpressServer',
          context: {
            method: req.method,
            path: req.path,
            status: res.statusCode,
            duration,
            userAgent: req.headers['user-agent']
          }
        });
        
        // Record API metrics
        monitoring?.recordMetric('http_request_completed', 1, {
          method: req.method,
          path: req.path,
          status: res.statusCode,
          duration
        });
        
        return originalSend.call(this, data);
      };
      
      next();
    });

    // Authentication middleware
    this.app.use('/api', async (req, res, next) => {
      // Skip auth for public endpoints
      if (req.path === '/health' || req.path === '/status') {
        return next();
      }

      try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
          return res.status(401).json({
            success: false,
            error: 'Authentication token required',
            code: 'MISSING_TOKEN'
          });
        }

        const authService = this.serviceInitializer.getService('AuthService');
        const validationResult = await authService.validateToken(token);
        
        if (!validationResult.success) {
          return res.status(401).json({
            success: false,
            error: 'Invalid authentication token',
            code: 'INVALID_TOKEN'
          });
        }

        req.user = validationResult.data.user;
        req.permissions = validationResult.data.permissions;
        next();
        
      } catch (error) {
        console.error('Authentication middleware error:', error);
        res.status(500).json({
          success: false,
          error: 'Authentication service error',
          code: 'AUTH_SERVICE_ERROR'
        });
      }
    });
  }

  /**
   * Set up API routes with enhanced controllers
   */
  setupAPIRoutes() {
    const inventoryController = this.serviceInitializer.getController('inventoryController');
    
    // Enhanced Inventory API routes
    if (inventoryController) {
      this.app.get('/api/inventory/lots', inventoryController.getAllLots.bind(inventoryController));
      this.app.get('/api/inventory/lots/:lotId', inventoryController.getLotById.bind(inventoryController));
      this.app.post('/api/inventory/lots', inventoryController.createLot.bind(inventoryController));
      this.app.put('/api/inventory/lots/:lotId/quantity', inventoryController.updateLotQuantity.bind(inventoryController));
      this.app.get('/api/inventory/summary', inventoryController.getInventorySummary.bind(inventoryController));
    }

    // Authentication routes
    this.app.post('/api/auth/login', async (req, res) => {
      try {
        const { email, password } = req.body;
        const authService = this.serviceInitializer.getService('AuthService');
        const result = await authService.login(email, password);
        
        if (result.success) {
          res.json(result);
        } else {
          res.status(401).json(result);
        }
      } catch (error) {
        res.status(500).json({
          success: false,
          error: 'Login service error',
          code: 'LOGIN_ERROR'
        });
      }
    });

    this.app.post('/api/auth/logout', async (req, res) => {
      try {
        const authService = this.serviceInitializer.getService('AuthService');
        const result = await authService.logout();
        res.json(result);
      } catch (error) {
        res.status(500).json({
          success: false,
          error: 'Logout service error',
          code: 'LOGOUT_ERROR'
        });
      }
    });

    // Token refresh endpoint
    this.app.post('/api/auth/refresh', async (req, res) => {
      try {
        const { refreshToken } = req.body;
        const authService = this.serviceInitializer.getService('AuthService');
        const result = await authService.refreshToken(refreshToken);
        
        if (result.success) {
          res.json(result);
        } else {
          res.status(401).json(result);
        }
      } catch (error) {
        res.status(500).json({
          success: false,
          error: 'Token refresh error',
          code: 'TOKEN_REFRESH_ERROR'
        });
      }
    });

    // User permissions endpoint
    this.app.get('/api/auth/permissions', async (req, res) => {
      try {
        const authService = this.serviceInitializer.getService('AuthService');
        const result = await authService.getUserPermissions(req.user?.id);
        res.json(result);
      } catch (error) {
        res.status(500).json({
          success: false,
          error: 'Permissions service error',
          code: 'PERMISSIONS_ERROR'
        });
      }
    });
  }

  /**
   * Set up monitoring and health endpoints
   */
  setupMonitoringEndpoints() {
    // Health check endpoint
    this.app.get('/api/health', async (req, res) => {
      try {
        const healthStatus = await this.serviceInitializer.getHealthStatus();
        const statusCode = healthStatus.overall === 'healthy' ? 200 : 
                          healthStatus.overall === 'degraded' ? 200 : 503;
        
        res.status(statusCode).json(healthStatus);
      } catch (error) {
        res.status(503).json({
          overall: 'unhealthy',
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    });

    // Performance metrics endpoint
    this.app.get('/api/metrics', async (req, res) => {
      try {
        const metrics = this.serviceInitializer.getPerformanceMetrics();
        res.json({
          success: true,
          data: metrics,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: 'Failed to retrieve metrics',
          timestamp: new Date().toISOString()
        });
      }
    });

    // System status endpoint
    this.app.get('/api/status', async (req, res) => {
      const monitoring = this.serviceInitializer.getMonitoring();
      const webSocketManager = this.serviceInitializer.getWebSocketManager();
      
      const status = {
        server: {
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          version: process.version
        },
        services: Object.keys(this.serviceInitializer.getServiceRegistry().getAll()),
        websocket: webSocketManager ? webSocketManager.getConnectionStats() : null,
        monitoring: monitoring ? await monitoring.healthCheck() : null,
        timestamp: new Date().toISOString()
      };
      
      res.json({
        success: true,
        data: status
      });
    });

    // Service logs endpoint (for debugging)
    this.app.get('/api/logs', async (req, res) => {
      try {
        const { service, level, limit = 100 } = req.query;
        const monitoring = this.serviceInitializer.getMonitoring();
        
        const logs = monitoring.getLogs(service, level, null).slice(-limit);
        
        res.json({
          success: true,
          data: logs,
          count: logs.length,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: 'Failed to retrieve logs'
        });
      }
    });
  }

  /**
   * Set up error handling
   */
  setupErrorHandling() {
    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        success: false,
        error: 'Endpoint not found',
        code: 'NOT_FOUND',
        path: req.originalUrl,
        timestamp: new Date().toISOString()
      });
    });

    // Global error handler
    this.app.use((error, req, res, next) => {
      console.error('Unhandled error:', error);
      
      const monitoring = this.serviceInitializer.getMonitoring();
      monitoring?.log({
        level: 'error',
        message: 'Unhandled Express error',
        service: 'ExpressServer',
        context: {
          error: error.message,
          stack: error.stack,
          path: req.path,
          method: req.method
        }
      });
      
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
        timestamp: new Date().toISOString()
      });
    });
  }

  /**
   * Set up graceful shutdown
   */
  setupGracefulShutdown() {
    const shutdown = async (signal) => {
      console.log(`Received ${signal}, starting graceful shutdown...`);
      
      try {
        // Stop accepting new connections
        if (this.server) {
          this.server.close();
        }
        
        // Shutdown all services
        await this.serviceInitializer.shutdown();
        
        console.log('Graceful shutdown completed');
        process.exit(0);
      } catch (error) {
        console.error('Error during graceful shutdown:', error);
        process.exit(1);
      }
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    
    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('Uncaught Exception:', error);
      const monitoring = this.serviceInitializer.getMonitoring();
      monitoring?.log({
        level: 'fatal',
        message: 'Uncaught exception',
        service: 'ProcessMonitor',
        context: { error: error.message, stack: error.stack }
      });
      
      shutdown('UNCAUGHT_EXCEPTION');
    });
    
    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled Rejection at:', promise, 'reason:', reason);
      const monitoring = this.serviceInitializer.getMonitoring();
      monitoring?.log({
        level: 'error',
        message: 'Unhandled promise rejection',
        service: 'ProcessMonitor',
        context: { reason: reason?.toString(), promise: promise?.toString() }
      });
    });
  }

  /**
   * Start the server
   */
  async start(port = 3001) {
    try {
      await this.initialize();
      
      this.server.listen(port, () => {
        console.log(`Enhanced ICRS_SPARC Backend running on port ${port}`);
        console.log(`Health check: http://localhost:${port}/api/health`);
        console.log(`Status: http://localhost:${port}/api/status`);
        console.log(`Metrics: http://localhost:${port}/api/metrics`);
        console.log(`WebSocket: ws://localhost:${port}/realtime`);
        
        // Log startup metrics
        const monitoring = this.serviceInitializer.getMonitoring();
        monitoring?.recordMetric('server_startup', 1, {
          port,
          node_version: process.version,
          timestamp: new Date().toISOString()
        });
      });
      
    } catch (error) {
      console.error('Failed to start enhanced backend:', error);
      process.exit(1);
    }
  }
}

// Example usage
if (require.main === module) {
  const backend = new EnhancedBackendExample();
  const port = process.env.PORT || 3001;
  
  backend.start(port).catch((error) => {
    console.error('Failed to start backend:', error);
    process.exit(1);
  });
}

// Export for use as module
module.exports = EnhancedBackendExample;

/**
 * Real-time WebSocket Client Example
 * 
 * This demonstrates how to connect to the WebSocket server from the frontend:
 * 
 * ```javascript
 * const ws = new WebSocket('ws://localhost:3001/realtime?token=YOUR_JWT_TOKEN');
 * 
 * ws.onopen = () => {
 *   console.log('Connected to ICRS_SPARC real-time server');
 *   
 *   // Subscribe to inventory changes
 *   ws.send(JSON.stringify({
 *     type: 'subscribe',
 *     channel: 'inventory.changes',
 *     filters: { customer_id: 'customer-123' }
 *   }));
 * };
 * 
 * ws.onmessage = (event) => {
 *   const message = JSON.parse(event.data);
 *   
 *   if (message.type === 'event' && message.channel === 'inventory.changes') {
 *     // Handle real-time inventory updates
 *     console.log('Inventory update:', message.data);
 *     
 *     // Update UI with new data
 *     updateInventoryUI(message.data);
 *   }
 * };
 * 
 * // Heartbeat to keep connection alive
 * setInterval(() => {
 *   if (ws.readyState === WebSocket.OPEN) {
 *     ws.send(JSON.stringify({ type: 'ping' }));
 *   }
 * }, 30000);
 * ```
 */