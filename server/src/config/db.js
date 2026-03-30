'use strict';

const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');

// Singleton pattern — reuse one client across the app
let prisma;

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient();
} else {
  // Prevent multiple instances during hot-reload in development
  if (!global.__prisma) {
    global.__prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    });
  }
  prisma = global.__prisma;
}

prisma.$connect().then(() => {
  logger.info({ message: 'Database connected' });
}).catch(err => {
  logger.error({ message: 'Database connection failed', error: err.message });
});

module.exports = prisma;
