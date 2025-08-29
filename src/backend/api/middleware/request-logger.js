// src/backend/api/middleware/request-logger.js
// Request logging middleware for ICRS SPARC API

/**
 * Request logging middleware
 * Logs HTTP requests with timing information
 */
function requestLogger(req, res, next) {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();
  
  // Log incoming request
  console.log(`📝 ${timestamp} [${req.method}] ${req.originalUrl}`, {
    userAgent: req.get('User-Agent'),
    ip: req.ip || req.connection.remoteAddress,
    contentLength: req.get('Content-Length') || 0
  });

  // Override res.json to log response
  const originalJson = res.json;
  res.json = function(body) {
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // Log response
    console.log(`✅ ${new Date().toISOString()} [${req.method}] ${req.originalUrl} - ${res.statusCode} (${duration}ms)`, {
      success: body?.success !== undefined ? body.success : 'unknown',
      dataSize: body?.data ? JSON.stringify(body.data).length : 0
    });
    
    return originalJson.call(this, body);
  };

  // Override res.send to log non-JSON responses
  const originalSend = res.send;
  res.send = function(body) {
    if (!res.headersSent) {
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      console.log(`📤 ${new Date().toISOString()} [${req.method}] ${req.originalUrl} - ${res.statusCode} (${duration}ms)`, {
        bodySize: body ? body.length : 0
      });
    }
    
    return originalSend.call(this, body);
  };

  next();
}

/**
 * Enhanced request logger with more detailed information
 * Use for debugging or development environments
 */
function detailedRequestLogger(req, res, next) {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();
  
  // Log detailed request information
  console.log(`🔍 ${timestamp} [${req.method}] ${req.originalUrl}`, {
    headers: {
      authorization: req.headers.authorization ? 'Bearer [REDACTED]' : undefined,
      contentType: req.headers['content-type'],
      userAgent: req.headers['user-agent'],
      origin: req.headers.origin
    },
    query: req.query,
    params: req.params,
    body: req.method !== 'GET' ? sanitizeRequestBody(req.body) : undefined,
    ip: req.ip || req.connection.remoteAddress
  });

  // Override res.json for detailed response logging
  const originalJson = res.json;
  res.json = function(body) {
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log(`📊 ${new Date().toISOString()} [${req.method}] ${req.originalUrl} - ${res.statusCode} (${duration}ms)`, {
      success: body?.success,
      error: body?.error,
      dataCount: Array.isArray(body?.data) ? body.data.length : (body?.data ? 1 : 0),
      responseSize: JSON.stringify(body).length
    });
    
    return originalJson.call(this, body);
  };

  next();
}

/**
 * Sanitize request body for logging (remove sensitive data)
 */
function sanitizeRequestBody(body) {
  if (!body || typeof body !== 'object') {
    return body;
  }

  const sensitiveFields = [
    'password', 'token', 'secret', 'key', 'auth', 'authorization',
    'ssn', 'social_security', 'credit_card', 'cvv', 'pin'
  ];

  const sanitized = { ...body };
  
  Object.keys(sanitized).forEach(key => {
    const lowerKey = key.toLowerCase();
    if (sensitiveFields.some(field => lowerKey.includes(field))) {
      sanitized[key] = '[REDACTED]';
    }
  });

  return sanitized;
}

module.exports = {
  requestLogger,
  detailedRequestLogger
};