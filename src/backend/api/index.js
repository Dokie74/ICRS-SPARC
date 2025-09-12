// src/backend/api/index.js
// Main Express.js API entry point for ICRS SPARC migration
// Preserves standardized response patterns and RLS integration from original ICRS

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Import middleware
const { authMiddleware } = require('./middleware/auth');
const { errorHandler } = require('./middleware/error-handler');
const { requestLogger } = require('./middleware/request-logger');

// Import routes
const inventoryRoutes = require('./routes/inventory');
const partsRoutes = require('./routes/parts');
const customersRoutes = require('./routes/customers');
const preadmissionRoutes = require('./routes/preadmission');
const preshipmentsRoutes = require('./routes/preshipments');
const shippingRoutes = require('./routes/shipping');
const receivingRoutes = require('./routes/receiving');
const dashboardRoutes = require('./routes/dashboard');
const authRoutes = require('./routes/auth');
const materialsRoutes = require('./routes/materials');
const locationsRoutes = require('./routes/locations');
const adminRoutes = require('./routes/admin');
// const demoRoutes = require('./routes/demo'); // Removed as per Fix Plan
const htsRoutes = require('./routes/hts');
const materialPricingRoutes = require('./routes/material-pricing');
const tariffRoutes = require('./routes/tariff');

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: ["'self'", "*.supabase.co", "*.supabase.com"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "*.supabase.co"]
    }
  }
}));

// CORS configuration - must come BEFORE rate limiting for OPTIONS preflight
const corsOptions = {
  origin: process.env.NODE_ENV === 'development' 
    ? '*'  // Allow all origins in development (like the example app)
    : function (origin, callback) {
        // Production: Use specific allowed origins
        if (!origin) return callback(null, true);
        
        const allowedOrigins = [
          'http://localhost:3000',
          'http://localhost:3001',
          'http://localhost:3002',
          'https://localhost:3000',
          process.env.FRONTEND_URL
        ].filter(Boolean);
        
        if (allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));

// Rate limiting - comes AFTER CORS to allow OPTIONS preflight
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 2000, // Increased limit for demo mode
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting for OPTIONS preflight requests
  skip: (req) => req.method === 'OPTIONS'
});
app.use('/api/', limiter);
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use(requestLogger);

// Enhanced health check endpoint
app.get(['/health', '/api/health'], async (req, res) => {
  const healthCheck = {
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: Math.floor(process.uptime()),
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
      }
    }
  };

  // Check database connectivity
  try {
    const { createClient } = require('@supabase/supabase-js');
    if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
      const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
      await supabase.from('customers').select('count(*)', { count: 'exact', head: true });
      healthCheck.data.database = { status: 'connected' };
    } else {
      healthCheck.data.database = { status: 'not_configured' };
    }
  } catch (error) {
    healthCheck.data.database = { 
      status: 'error', 
      message: error.message 
    };
    healthCheck.success = false;
    healthCheck.data.status = 'unhealthy';
  }

  const statusCode = healthCheck.success ? 200 : 503;
  res.status(statusCode).json(healthCheck);
});

// Metrics endpoint for Prometheus
app.get('/api/metrics', (req, res) => {
  const metrics = [];
  const memUsage = process.memoryUsage();
  const uptime = process.uptime();
  
  // Process metrics
  metrics.push(`# HELP nodejs_memory_usage_bytes Memory usage in bytes`);
  metrics.push(`# TYPE nodejs_memory_usage_bytes gauge`);
  metrics.push(`nodejs_memory_usage_bytes{type="heap_used"} ${memUsage.heapUsed}`);
  metrics.push(`nodejs_memory_usage_bytes{type="heap_total"} ${memUsage.heapTotal}`);
  metrics.push(`nodejs_memory_usage_bytes{type="external"} ${memUsage.external}`);
  metrics.push(`nodejs_memory_usage_bytes{type="rss"} ${memUsage.rss}`);
  
  metrics.push(`# HELP nodejs_process_uptime_seconds Process uptime in seconds`);
  metrics.push(`# TYPE nodejs_process_uptime_seconds gauge`);
  metrics.push(`nodejs_process_uptime_seconds ${uptime}`);
  
  // Application metrics
  metrics.push(`# HELP sparc_build_info Application build information`);
  metrics.push(`# TYPE sparc_build_info gauge`);
  metrics.push(`sparc_build_info{version="${process.env.npm_package_version || '1.0.0'}",environment="${process.env.NODE_ENV || 'development'}"} 1`);
  
  res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
  res.send(metrics.join('\\n') + '\\n');
});

// API documentation endpoint
app.get('/api', (req, res) => {
  res.json({
    success: true,
    data: {
      name: 'ICRS SPARC API',
      description: 'Foreign Trade Zone Operations API - Migrated from original ICRS',
      version: process.env.npm_package_version || '1.0.0',
      endpoints: {
        auth: '/api/auth/*',
        inventory: '/api/inventory/*',
        parts: '/api/parts/*',
        customers: '/api/customers/*',
        preadmission: '/api/preadmission/*',
        preshipments: '/api/preshipments/*',
        shipping: '/api/shipping/*',
        receiving: '/api/receiving/*',
        dashboard: '/api/dashboard/*',
        admin: '/api/admin/*',
        hts: '/api/hts/*',
        materialPricing: '/api/material-pricing/*',
        tariff: '/api/tariff/*'
      },
      features: [
        'Row Level Security (RLS) integration',
        'Real-time subscriptions',
        'Foreign Trade Zone compliance',
        'Standardized response patterns'
      ]
    }
  });
});

// API Routes
app.use('/api/auth', authRoutes);
// app.use('/api/demo', demoRoutes); // Removed as per Fix Plan
app.use('/api/inventory', authMiddleware, inventoryRoutes);
app.use('/api/parts', authMiddleware, partsRoutes);
app.use('/api/customers', authMiddleware, customersRoutes);
app.use('/api/preadmission', authMiddleware, preadmissionRoutes);
app.use('/api/preshipments', authMiddleware, preshipmentsRoutes);
app.use('/api/shipping', authMiddleware, shippingRoutes);
app.use('/api/receiving', authMiddleware, receivingRoutes);
app.use('/api/dashboard', authMiddleware, dashboardRoutes);
app.use('/api/admin', authMiddleware, adminRoutes);
app.use('/api/materials', authMiddleware, materialsRoutes);
app.use('/api/locations', authMiddleware, locationsRoutes);
app.use('/api/hts', authMiddleware, htsRoutes);
app.use('/api/material-pricing', authMiddleware, materialPricingRoutes);
app.use('/api/tariff', authMiddleware, tariffRoutes);

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    error: `API endpoint not found: ${req.method} ${req.path}`
  });
});

// Global error handler
app.use(errorHandler);

// Start server
const server = app.listen(PORT, () => {
  console.log(`🚀 ICRS SPARC API Server running on port ${PORT}`);
  console.log(`📋 Health check: http://localhost:${PORT}/health`);
  console.log(`📖 API docs: http://localhost:${PORT}/api`);
  console.log(`🔒 RLS integration: ${process.env.SUPABASE_URL ? 'Enabled' : 'Disabled'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('💤 Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('💤 Process terminated');
    process.exit(0);
  });
});

module.exports = app;