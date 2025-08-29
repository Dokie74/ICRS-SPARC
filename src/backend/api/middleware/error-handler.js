// src/backend/api/middleware/error-handler.js
// Global error handler for ICRS SPARC API
// Maintains standardized response format

/**
 * Global error handler middleware
 * Catches all unhandled errors and returns standardized response format
 */
function errorHandler(err, req, res, next) {
  console.error('Global error handler:', {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  // Default error response
  let statusCode = 500;
  let errorMessage = 'Internal server error';
  let errorDetails = null;

  // Handle specific error types
  if (err.name === 'ValidationError') {
    statusCode = 400;
    errorMessage = 'Validation error';
    errorDetails = err.message;
  } else if (err.name === 'CastError') {
    statusCode = 400;
    errorMessage = 'Invalid data format';
    errorDetails = err.message;
  } else if (err.code === 'LIMIT_FILE_SIZE') {
    statusCode = 413;
    errorMessage = 'File too large';
    errorDetails = 'Uploaded file exceeds size limit';
  } else if (err.name === 'MulterError') {
    statusCode = 400;
    errorMessage = 'File upload error';
    errorDetails = err.message;
  } else if (err.message && err.message.includes('JWT')) {
    statusCode = 401;
    errorMessage = 'Authentication error';
    errorDetails = 'Invalid or expired token';
  } else if (err.message && err.message.includes('CORS')) {
    statusCode = 403;
    errorMessage = 'CORS policy violation';
    errorDetails = err.message;
  } else if (err.status) {
    statusCode = err.status;
    errorMessage = err.message || errorMessage;
  }

  // Don't expose internal errors in production
  if (process.env.NODE_ENV === 'production' && statusCode === 500) {
    errorMessage = 'An unexpected error occurred';
    errorDetails = null;
  } else if (err.message && statusCode !== 500) {
    errorMessage = err.message;
  }

  // Send standardized error response
  const errorResponse = {
    success: false,
    error: errorMessage
  };

  // Include error details in development or for client errors (4xx)
  if (errorDetails && (process.env.NODE_ENV !== 'production' || statusCode < 500)) {
    errorResponse.details = errorDetails;
  }

  // Include timestamp for debugging
  if (process.env.NODE_ENV !== 'production') {
    errorResponse.timestamp = new Date().toISOString();
    errorResponse.path = req.originalUrl;
    errorResponse.method = req.method;
  }

  res.status(statusCode).json(errorResponse);
}

/**
 * 404 handler for unmatched routes
 */
function notFoundHandler(req, res, next) {
  const error = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
  error.status = 404;
  next(error);
}

/**
 * Async error wrapper for route handlers
 * Catches async errors and passes them to error handler
 * 
 * Usage: router.get('/route', asyncHandler(async (req, res) => { ... }));
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = {
  errorHandler,
  notFoundHandler,
  asyncHandler
};