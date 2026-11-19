'use strict';
const fs = require('node:fs');
const path = require('node:path');
const baseUrl = process.env.API_BASE_URL || 'http://127.0.0.1:3000';
const outputPath = path.join(__dirname, 'test-results.json');
const results = [];

function redactSecrets(value) {
  if (Array.isArray(value)) return value.map(redactSecrets);
  if (!value || typeof value !== 'object') return value;
  const safe = {};
  for (const [key, child] of Object.entries(value)) safe[key] = key.toLowerCase() === 'token' ? '[REDACTED - token tidak dicatat]' : redactSecrets(child);
  return safe;
}

async function request(name, method, endpoint, { token, body, expected } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${baseUrl}${endpoint}`, {
    method, headers, body: body === undefined ? undefined : JSON.stringify(body)
  });
  const text = await response.text();
  let data;
  try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
  const ok = response.status === expected;
  results.push({
    no: results.length + 1, name, method, endpoint,
    expectedStatus: expected, actualStatus: response.status,
    passed: ok, response: redactSecrets(data)
  });
  if (!ok) throw new Error(`${name}: diharapkan ${expected}, aktual ${response.status}: ${text}`);
  return { status: response.status, data };
}

(async () => {
  const login1 = await request('Login mahasiswa dengan kredensial benar', 'POST', '/api/auth/login', {
    body: { username: '240104040138', password: 'mhs12345' }, expected: 200
  });
  const studentToken = login1.data.data.token;
  await request('Login dengan password salah', 'POST', '/api/auth/login', {
    body: { username: '240104040138', password: 'salah123' }, expected: 401
  });
  await request('Akses endpoint terlindungi tanpa token', 'GET', '/api/pengaduan', { expected: 401 });
  await request('Akses menggunakan token tidak valid', 'GET', '/api/pengaduan', { token: 'token-tidak-valid', expected: 401 });
  const created = await request('Mahasiswa membuat pengaduan valid', 'POST', '/api/pengaduan', {
    token: studentToken, body: { judul: 'Wi-Fi ruang kelas terputus', kategori: 'TI', deskripsi: 'Koneksi Wi-Fi ruang kelas sering terputus saat kuliah.' }, expected: 201
  });
  const complaintId = created.data.data.id;
  await request('Mahasiswa membaca pengaduan sendiri', 'GET', `/api/pengaduan/${complaintId}`, { token: studentToken, expected: 200 });
  await request('Mahasiswa mencoba membaca pengaduan orang lain', 'GET', '/api/pengaduan/2', { token: studentToken, expected: 403 });
  await request('Mahasiswa mencoba mengubah status pengaduan', 'PATCH', `/api/pengaduan/${complaintId}/status`, {
    token: studentToken, body: { status: 'selesai' }, expected: 403
  });
  const adminLogin = await request('Admin login dengan kredensial benar', 'POST', '/api/auth/login', {
    body: { username: 'admin', password: 'admin12345' }, expected: 200
  });
  const adminToken = adminLogin.data.data.token;
  await request('Admin melihat seluruh pengaduan', 'GET', '/api/pengaduan', { token: adminToken, expected: 200 });
  await request('Admin memperbarui status pengaduan', 'PATCH', `/api/pengaduan/${complaintId}/status`, {
    token: adminToken, body: { status: 'diproses' }, expected: 200
  });
  const invalid = await request('Pengaduan dengan field wajib kosong ditolak', 'POST', '/api/pengaduan', {
    token: studentToken, body: { judul: ' ', kategori: 'TI', deskripsi: 'Deskripsi uji' }, expected: 400
  });
  const idMissing = await request('Mengakses ID pengaduan yang tidak ditemukan', 'GET', '/api/pengaduan/999999', { token: studentToken, expected: 404 });

  // Verifikasi tambahan: data yang ditolak tidak membuat baris baru atau mengubah status.
  const afterRejected = await request('Pemeriksaan integritas data setelah input ditolak', 'GET', '/api/pengaduan', { token: adminToken, expected: 200 });
  const unchangedStatus = await request('Pemeriksaan status tetap diproses setelah percobaan mahasiswa', 'GET', `/api/pengaduan/${complaintId}`, { token: adminToken, expected: 200 });
  results.push({
    no: results.length + 1,
    name: 'Integritas: input 400 tidak menambah record dan percobaan PATCH mahasiswa tidak mengubah status',
    method: 'ASSERT', endpoint: 'test assertions', expectedStatus: 'count=3; status=diproses',
    actualStatus: `count=${afterRejected.data.meta.total}; status=${unchangedStatus.data.data.status}`,
    passed: afterRejected.data.meta.total === 3 && unchangedStatus.data.data.status === 'diproses',
    response: { invalidInputWasRejected: invalid.status === 400, idNotFoundWasRejected: idMissing.status === 404 }
  });
  if (!results[results.length - 1].passed) throw new Error('Pemeriksaan integritas data gagal');

  const summary = {
    generatedAt: new Date().toISOString(), baseUrl,
    total: results.length, passed: results.filter((r) => r.passed).length,
    failed: results.filter((r) => !r.passed).length,
    note: 'Hasil berasal dari permintaan HTTP aktual ke adaptor smoke test Node.js yang memakai service dan repository yang sama dengan aplikasi Express. Jalankan kembali terhadap server Express setelah npm install.',
    results
  };
  fs.writeFileSync(outputPath, JSON.stringify(summary, null, 2));
  console.log(`\n${summary.passed}/${summary.total} pengujian lulus. Bukti: ${outputPath}`);
  for (const result of results) console.log(`${String(result.no).padStart(2, '0')}. ${result.passed ? 'PASS' : 'FAIL'} ${result.actualStatus} | ${result.name}`);
})().catch((error) => {
  fs.writeFileSync(outputPath, JSON.stringify({ generatedAt: new Date().toISOString(), failed: true, error: error.message, results }, null, 2));
  console.error(error);
  process.exitCode = 1;
});
