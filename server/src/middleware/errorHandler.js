'use strict';

const logger = require('../utils/logger');

// 404 handler — must be registered after all routes
function notFoundHandler(req, res) {
  res.status(404).json({ error: 'Not found' });
}

// Global error handler — must have 4 parameters for Express to recognise it
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const status = err.status || err.statusCode || 500;

  logger.error({
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  const body = {
    error: (status >= 500 && process.env.NODE_ENV === 'production') ? 'Internal server error' : err.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  };

  res.status(status).json(body);
}

module.exports = { notFoundHandler, errorHandler };
