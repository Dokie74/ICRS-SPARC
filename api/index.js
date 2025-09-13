// api/index.js - Consolidated API router for Vercel (single serverless function)
const { setCorsHeaders, handleOptions } = require('./_utils/cors');

// Import all handlers
const adminHandler = require('./_handlers/admin');
const authLoginHandler = require('./_handlers/auth-login');
const authRefreshHandler = require('./_handlers/auth-refresh');
const customersHandler = require('./_handlers/customers');
const dashboardHandler = require('./_handlers/dashboard');
const healthHandler = require('./_handlers/health');
const htsHandler = require('./_handlers/hts');
const inventoryHandler = require('./_handlers/inventory');
const locationsHandler = require('./_handlers/locations');
const materialsHandler = require('./_handlers/materials');
const partsHandler = require('./_handlers/parts');
const suppliersHandler = require('./_handlers/suppliers');
const envCheckHandler = require('./_handlers/env-check');
const authTestHandler = require('./_handlers/auth-test');
const authDebugHandler = require('./_handlers/auth-debug');

async function handler(req, res) {
  // Handle CORS for all routes
  setCorsHeaders(res, req.headers.origin);
  if (handleOptions(req, res)) return;

  // Parse the URL path
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;
  
  // Remove /api prefix(es) - handle double /api/api/ from frontend + Vercel routing
  let path = pathname;
  while (path.startsWith('/api')) {
    path = path.substring(4);
  }
  // Ensure path starts with / for consistent routing
  if (!path.startsWith('/')) {
    path = '/' + path;
  }
  
  try {
    // Route to appropriate handler based on path
    if (path.startsWith('/admin/employees')) {
      return await adminHandler(req, res);
    } else if (path === '/auth/login') {
      return await authLoginHandler(req, res);
    } else if (path === '/auth/test') {
      return await authTestHandler(req, res);
    } else if (path === '/auth/debug') {
      return await authDebugHandler(req, res);
    } else if (path === '/auth/refresh') {
      return await authRefreshHandler(req, res);
    } else if (path.startsWith('/customers')) {
      return await customersHandler(req, res);
    } else if (path.startsWith('/dashboard')) {
      return await dashboardHandler(req, res);
    } else if (path === '/health') {
      return await healthHandler(req, res);
    } else if (path.startsWith('/hts')) {
      return await htsHandler(req, res);
    } else if (path.startsWith('/inventory')) {
      return await inventoryHandler(req, res);
    } else if (path.startsWith('/locations')) {
      return await locationsHandler(req, res);
    } else if (path.startsWith('/materials')) {
      return await materialsHandler(req, res);
    } else if (path.startsWith('/parts')) {
      return await partsHandler(req, res);
    } else if (path.startsWith('/suppliers')) {
      return await suppliersHandler(req, res);
    } else if (path === '/env-check') {
      return await envCheckHandler(req, res);
    } else if (path === '' || path === '/') {
      // API documentation endpoint
      res.json({
        success: true,
        data: {
          name: 'ICRS SPARC API',
          description: 'Foreign Trade Zone Operations API - Consolidated Router',
          version: '1.0.0',
          platform: 'vercel',
          serverlessFunctions: 1,
          endpoints: [
            '/api/admin/employees',
            '/api/auth/login',
            '/api/auth/test',
            '/api/auth/debug',
            '/api/auth/refresh', 
            '/api/customers',
            '/api/dashboard/stats',
            '/api/health',
            '/api/hts',
            '/api/inventory',
            '/api/locations',
            '/api/materials',
            '/api/parts',
            '/api/suppliers',
            '/api/env-check'
          ]
        }
      });
    } else {
      // 404 for unknown routes
      res.status(404).json({
        success: false,
        error: `API route not found: ${path}`
      });
    }
  } catch (error) {
    console.error('API Router error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}

module.exports = handler;