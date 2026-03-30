'use strict';

// Load environment variables before anything else
require('./config/env');

const app = require('./app');
const logger = require('./utils/logger');

const PORT = parseInt(process.env.PORT, 10) || 3001;

const server = app.listen(PORT, async () => {
  logger.info({ message: `Daily Dharma server running on port ${PORT}`, env: process.env.NODE_ENV });

  // Start BullMQ workers after the HTTP server is accepting requests
  // Skip in test environment to avoid open handles
  if (process.env.NODE_ENV !== 'test') {
    try {
      const { startWorkers } = require('./jobs/index');
      await startWorkers();
    } catch (err) {
      logger.error({ message: 'Failed to start BullMQ workers — server running without scheduler', error: err.message });
    }
  }
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info({ message: 'SIGTERM received — shutting down gracefully' });
  try {
    const { stopWorkers } = require('./jobs/index');
    await stopWorkers();
  } catch (_err) {
    // Workers may not have started (e.g. test env); safe to ignore
  }
  server.close(() => {
    logger.info({ message: 'Server closed' });
    process.exit(0);
  });
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error({ message: 'Unhandled promise rejection', reason, promise });
});

module.exports = server;
