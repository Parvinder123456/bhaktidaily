/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  },

  // Prevent Next.js output file tracing from crawling into the server workspace.
  // This stops Vercel from bundling server/src/config/db.js (which imports @prisma/client).
  outputFileTracingExcludes: {
    '*': [
      path.join(__dirname, '..', 'server', '**'),
      path.join(__dirname, '..', 'scripts', '**'),
      path.join(__dirname, '..', 'data', '**'),
      '**/prisma/**',
      '**/@prisma/**',
    ],
  },

  // Ensure @prisma/client is never bundled into client or server chunks
  // even if it ends up in node_modules via workspace hoisting.
  serverExternalPackages: ['@prisma/client', 'prisma'],

  webpack: (config, { isServer }) => {
    // Belt-and-suspenders: tell webpack to ignore @prisma/client entirely
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        '@prisma/client': false,
      };
    }
    return config;
  },
};

module.exports = nextConfig;
