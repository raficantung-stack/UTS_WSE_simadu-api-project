'use strict';

const express = require('express');
const swaggerUi = require('swagger-ui-express');
const openapi = require('./docs/openapi.json');
const authRoutes = require('./src/routes/authRoutes.cjs');
const complaintRoutes = require('./src/routes/complaintRoutes.cjs');
const { notFound, errorHandler } = require('./src/middleware/errorHandler.cjs');
const { loadConfig } = require('./src/appFactory.cjs');

function createApp(config = loadConfig()) {
  const app = express();
  app.locals.config = config;
  app.disable('x-powered-by');
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    next();
  });
  app.use(express.json({ limit: '100kb', strict: true }));
  app.get('/health', (req, res) => res.status(200).json({ success: true, service: 'SIMADU API', status: 'ok' }));
  app.use('/api/auth', authRoutes);
  app.use('/api/pengaduan', complaintRoutes);
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(openapi, { explorer: true }));
  app.get('/openapi.json', (req, res) => res.json(openapi));
  app.use(notFound);
  app.use(errorHandler);
  return app;
}

module.exports = { createApp };
