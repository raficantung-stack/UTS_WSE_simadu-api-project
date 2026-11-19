'use strict';

const repo = require('../repositories/complaintRepository.cjs');
const { AppError } = require('../utils/errors.cjs');

const CATEGORIES = ['Fasilitas', 'Akademik', 'TI'];
const STATUSES = ['diajukan', 'diproses', 'selesai'];
const CREATE_FIELDS = ['judul', 'kategori', 'deskripsi'];

function assertObject(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new AppError(400, 'Body harus berupa objek JSON', 'VALIDATION_ERROR');
}
function rejectUnknownFields(body, allowed) {
  const unknown = Object.keys(body).filter((key) => !allowed.includes(key));
  if (unknown.length) throw new AppError(400, `Field tidak diperbolehkan: ${unknown.join(', ')}`, 'VALIDATION_ERROR');
}
function validateComplaintFields(body, required = true) {
  assertObject(body);
  rejectUnknownFields(body, CREATE_FIELDS);
  for (const key of CREATE_FIELDS) {
    if (required && (typeof body[key] !== 'string' || !body[key].trim())) {
      throw new AppError(400, `Field ${key} wajib diisi`, 'VALIDATION_ERROR');
    }
    if (!required && body[key] !== undefined && (typeof body[key] !== 'string' || !body[key].trim())) {
      throw new AppError(400, `Field ${key} harus berupa teks dan tidak boleh kosong`, 'VALIDATION_ERROR');
    }
  }
  if (body.kategori !== undefined && !CATEGORIES.includes(body.kategori)) {
    throw new AppError(400, 'Kategori harus Fasilitas, Akademik, atau TI', 'VALIDATION_ERROR');
  }
  for (const key of ['judul', 'deskripsi']) {
    if (typeof body[key] === 'string' && body[key].length > (key === 'judul' ? 120 : 2000)) {
      throw new AppError(400, `Field ${key} melebihi batas panjang`, 'VALIDATION_ERROR');
    }
  }
}
function assertRole(user, roles) {
  if (!roles.includes(user.role)) throw new AppError(403, 'Anda tidak memiliki hak untuk operasi ini', 'FORBIDDEN');
}
function findOr404(id) {
  if (!/^\d+$/.test(String(id))) throw new AppError(400, 'ID pengaduan harus berupa bilangan bulat', 'VALIDATION_ERROR');
  const complaint = repo.findById(id);
  if (!complaint) throw new AppError(404, 'Pengaduan tidak ditemukan', 'NOT_FOUND');
  return complaint;
}
function assertOwner(user, complaint) {
  if (user.role !== 'admin' && complaint.mahasiswaId !== user.id) {
    throw new AppError(403, 'Anda tidak berhak mengakses pengaduan milik pengguna lain', 'FORBIDDEN');
  }
}
function list(user) {
  if (user.role === 'admin') return repo.findAll();
  return repo.findAll().filter((item) => item.mahasiswaId === user.id);
}
function getById(id, user) {
  const complaint = findOr404(id);
  assertOwner(user, complaint);
  return complaint;
}
function create(body, user) {
  assertRole(user, ['mahasiswa']);
  validateComplaintFields(body, true);
  const now = new Date().toISOString();
  return repo.create({
    mahasiswaId: user.id,
    judul: body.judul.trim(),
    kategori: body.kategori,
    deskripsi: body.deskripsi.trim(),
    status: 'diajukan',
    createdAt: now
  });
}
function update(id, body, user) {
  assertRole(user, ['mahasiswa']);
  const current = findOr404(id);
  assertOwner(user, current);
  if (current.status !== 'diajukan') throw new AppError(403, 'Pengaduan hanya dapat diubah saat berstatus diajukan', 'FORBIDDEN');
  validateComplaintFields(body, true);
  return repo.update(id, {
    judul: body.judul.trim(), kategori: body.kategori, deskripsi: body.deskripsi.trim()
  });
}
function updateStatus(id, body, user) {
  assertRole(user, ['admin']);
  assertObject(body);
  rejectUnknownFields(body, ['status']);
  if (typeof body.status !== 'string' || !STATUSES.includes(body.status)) {
    throw new AppError(400, 'Status harus diajukan, diproses, atau selesai', 'VALIDATION_ERROR');
  }
  findOr404(id);
  return repo.update(id, { status: body.status });
}
function remove(id, user) {
  assertRole(user, ['mahasiswa']);
  const current = findOr404(id);
  assertOwner(user, current);
  if (current.status !== 'diajukan') throw new AppError(403, 'Pengaduan hanya dapat dihapus saat berstatus diajukan', 'FORBIDDEN');
  repo.remove(id);
  return { message: 'Pengaduan berhasil dihapus' };
}

module.exports = { list, getById, create, update, updateStatus, remove, CATEGORIES, STATUSES };
