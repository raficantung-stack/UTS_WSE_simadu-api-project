'use strict';

// Password disimpan sebagai hash scrypt + salt, bukan plaintext.
const users = [
  {
    id: '240104040138',
    username: '240104040138',
    name: 'Achmad Mujahid Rafianoor',
    role: 'mahasiswa',
    passwordHash: 'scrypt$4ba17c6a3163766d444b7caa5499b298$208e4d4089f88f5e6623e8042098ebb2655116f04469e5665bd1739d2d651b8d56807d475bd66824008579db10bc35116f01678101fe0540fb4e8e7f053f09f9'
  },
  {
    id: '240104040139',
    username: '240104040139',
    name: 'Mahasiswa Uji Kedua',
    role: 'mahasiswa',
    passwordHash: 'scrypt$819200a03012174c92231706c4fe9cd1$20473b95d5f565b631b09ffb9c77c40cc7f5c9ec605f5ce72f178fd327732324eeddcabdb1e9e9870c3c51ade8fb6b0dd68d6b2559df412d6f1b303b209f43bb'
  },
  {
    id: 'admin-001',
    username: 'admin',
    name: 'Administrator SIMADU',
    role: 'admin',
    passwordHash: 'scrypt$27e112225c76c2a8c509ade2574aebaa$dcd29c4223827c5b98b0f117b0bf83b9f58fa0287cef2a3aaf92ef048495c6bd4a861680bce1a9ed67b3cd677ec1a3c1adfcb0ec04ced3fb25b435bf97222d91'
  }
];

function findByUsername(username) {
  return users.find((user) => user.username === username) || null;
}
function findById(id) {
  return users.find((user) => user.id === id) || null;
}
function publicUser(user) {
  if (!user) return null;
  return { id: user.id, username: user.username, name: user.name, role: user.role };
}

module.exports = { findByUsername, findById, publicUser };
