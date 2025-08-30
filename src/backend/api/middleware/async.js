// src/backend/api/middleware/async.js
// Async error handling middleware wrapper

/**
 * Wraps async route handlers to catch and forward errors to error middleware
 * @param {Function} fn - Async route handler function
 * @returns {Function} - Express middleware function
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = {
  asyncHandler
};