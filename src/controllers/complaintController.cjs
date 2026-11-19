'use strict';
const service = require('../services/complaintService.cjs');

function list(req, res) {
  res.status(200).json({ success: true, data: service.list(req.user), meta: { total: service.list(req.user).length } });
}
function getById(req, res) {
  res.status(200).json({ success: true, data: service.getById(req.params.id, req.user) });
}
function create(req, res) {
  res.status(201).json({ success: true, message: 'Pengaduan berhasil dibuat', data: service.create(req.body, req.user) });
}
function update(req, res) {
  res.status(200).json({ success: true, message: 'Pengaduan berhasil diperbarui', data: service.update(req.params.id, req.body, req.user) });
}
function updateStatus(req, res) {
  res.status(200).json({ success: true, message: 'Status pengaduan berhasil diperbarui', data: service.updateStatus(req.params.id, req.body, req.user) });
}
function remove(req, res) {
  res.status(200).json({ success: true, data: service.remove(req.params.id, req.user) });
}
module.exports = { list, getById, create, update, updateStatus, remove };
