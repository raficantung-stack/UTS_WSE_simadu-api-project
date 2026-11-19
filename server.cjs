'use strict';
require('dotenv').config();
const { createApp } = require('./app.cjs');
const { loadConfig } = require('./src/appFactory.cjs');

const config = loadConfig();
const app = createApp(config);
const server = app.listen(config.port, () => {
  console.log(`SIMADU API berjalan pada http://localhost:${config.port}`);
  console.log(`Swagger UI: http://localhost:${config.port}/docs`);
  console.log(`Health check: http://localhost:${config.port}/health`);
});

function shutdown(signal) {
  console.log(`${signal} diterima, server dihentikan dengan aman...`);
  server.close(() => process.exit(0));
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
