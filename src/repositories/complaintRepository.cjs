'use strict';

let nextId = 3;
let complaints = [
  {
    id: 1,
    mahasiswaId: '240104040138',
    judul: 'Lampu ruang kelas tidak berfungsi',
    kategori: 'Fasilitas',
    deskripsi: 'Lampu pada ruang kelas TI-2B mati sejak perkuliahan pagi.',
    status: 'diajukan',
    createdAt: '2026-11-18T08:30:00.000Z'
  },
  {
    id: 2,
    mahasiswaId: '240104040139',
    judul: 'Perbaikan akses portal akademik',
    kategori: 'Akademik',
    deskripsi: 'Portal akademik sulit dibuka ketika pengisian KRS.',
    status: 'diajukan',
    createdAt: '2026-11-18T09:00:00.000Z'
  }
];

function findAll() { return complaints.map((item) => ({ ...item })); }
function findById(id) {
  const item = complaints.find((complaint) => complaint.id === Number(id));
  return item ? { ...item } : null;
}
function create(data) {
  const record = { id: nextId++, ...data };
  complaints.push(record);
  return { ...record };
}
function update(id, changes) {
  const index = complaints.findIndex((item) => item.id === Number(id));
  if (index < 0) return null;
  complaints[index] = { ...complaints[index], ...changes };
  return { ...complaints[index] };
}
function remove(id) {
  const index = complaints.findIndex((item) => item.id === Number(id));
  if (index < 0) return false;
  complaints.splice(index, 1);
  return true;
}

module.exports = { findAll, findById, create, update, remove };
