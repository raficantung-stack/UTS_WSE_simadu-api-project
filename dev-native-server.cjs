'use strict';
// Adaptor HTTP native khusus smoke test lokal ketika dependency Express belum tersedia.
// Seluruh aturan bisnis, validasi, password hash, dan token memakai service yang sama
// dengan aplikasi Express pada app.cjs. Jalankan hanya dengan: node dev-native-server.cjs
const http = require('node:http');
const { loadConfig } = require('./src/appFactory.cjs');
const authService = require('./src/services/authService.cjs');
const complaintService = require('./src/services/complaintService.cjs');
const users = require('./src/repositories/userRepository.cjs');
const { verifyAccessToken } = require('./src/utils/security.cjs');
const { AppError } = require('./src/utils/errors.cjs');

const config = loadConfig();
function send(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(payload), 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY' });
  res.end(payload);
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 100 * 1024) reject(new AppError(413, 'Ukuran body melebihi batas', 'PAYLOAD_TOO_LARGE'));
    });
    req.on('end', () => {
      if (!raw) return resolve({});
      try { resolve(JSON.parse(raw)); }
      catch { reject(new AppError(400, 'Format JSON tidak valid', 'INVALID_JSON')); }
    });
    req.on('error', reject);
  });
}
function currentUser(req) {
  const match = /^Bearer\s+(.+)$/i.exec(req.headers.authorization || '');
  if (!match) throw new AppError(401, 'Bearer Token wajib disertakan', 'UNAUTHORIZED');
  const claims = verifyAccessToken(match[1], config.jwtSecret);
  const user = users.findById(claims.sub);
  if (!user || user.role !== claims.role) throw new AppError(401, 'Token tidak valid atau telah kedaluwarsa', 'UNAUTHORIZED');
  return users.publicUser(user);
}
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    if (req.method === 'GET' && url.pathname === '/health') return send(res, 200, { success: true, service: 'SIMADU API native smoke adapter', status: 'ok' });
    if (req.method === 'POST' && url.pathname === '/api/auth/login') {
      const body = await readBody(req);
      const result = authService.login(body, config);
      return send(res, 200, { success: true, data: result });
    }
    const user = currentUser(req);
    if (url.pathname === '/api/pengaduan' && req.method === 'GET') {
      const data = complaintService.list(user);
      return send(res, 200, { success: true, data, meta: { total: data.length } });
    }
    if (url.pathname === '/api/pengaduan' && req.method === 'POST') {
      const data = complaintService.create(await readBody(req), user);
      return send(res, 201, { success: true, message: 'Pengaduan berhasil dibuat', data });
    }
    const statusMatch = /^\/api\/pengaduan\/(\d+)\/status$/.exec(url.pathname);
    if (statusMatch && req.method === 'PATCH') {
      const data = complaintService.updateStatus(statusMatch[1], await readBody(req), user);
      return send(res, 200, { success: true, message: 'Status pengaduan berhasil diperbarui', data });
    }
    const detailMatch = /^\/api\/pengaduan\/([^/]+)$/.exec(url.pathname);
    if (detailMatch && req.method === 'GET') return send(res, 200, { success: true, data: complaintService.getById(detailMatch[1], user) });
    if (detailMatch && req.method === 'PUT') {
      const data = complaintService.update(detailMatch[1], await readBody(req), user);
      return send(res, 200, { success: true, message: 'Pengaduan berhasil diperbarui', data });
    }
    if (detailMatch && req.method === 'DELETE') return send(res, 200, { success: true, data: complaintService.remove(detailMatch[1], user) });
    return send(res, 404, { success: false, error: { code: 'ROUTE_NOT_FOUND', message: 'Endpoint tidak ditemukan' } });
  } catch (error) {
    const status = Number.isInteger(error.status) ? error.status : 500;
    return send(res, status, { success: false, error: { code: error.code || 'INTERNAL_ERROR', message: status >= 500 ? 'Terjadi kesalahan internal pada server' : error.message } });
  }
});
server.listen(config.port, () => console.log(`SIMADU native smoke adapter berjalan pada http://localhost:${config.port}`));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(() => process.exit(0)));
