# SIMADU API — UTS Web Service Engineering

REST API latihan untuk Sistem Layanan Informasi dan Pengaduan Mahasiswa (SIMADU). Proyek menggunakan **Node.js, Express 5, JSON, REST API berlapis, JWT Bearer Token, validasi input, OpenAPI 3.0.3, dan Swagger UI**.

> **Catatan data latihan:** repository saat ini memakai array in-memory agar mudah didemonstrasikan. Data akan kembali ke data awal ketika server dimulai ulang. Ini bukan konfigurasi untuk produksi.

## 1. Prasyarat

- Node.js 20 atau lebih baru.
- npm.
- Postman / Insomnia / HTTP Client (opsional; dokumentasi dapat dicoba melalui Swagger UI).

Periksa versi:

```bash
node --version
npm --version
```

## 2. Instalasi

Buka terminal pada folder `simadu-api`, kemudian jalankan:

```bash
npm install
```

Salin `.env.example` menjadi `.env` (Windows PowerShell):

```powershell
Copy-Item .env.example .env
```

Linux/macOS:

```bash
cp .env.example .env
```

Ganti `JWT_SECRET` pada `.env` dengan nilai acak minimal 32 karakter. Buat secret baru dengan:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Contoh konfigurasi:

```env
PORT=3000
JWT_SECRET=isi-dengan-secret-acak-hasil-perintah-di-atas
JWT_EXPIRES_IN=15m
NODE_ENV=development
```

Jangan mengunggah `.env` ke GitHub. File tersebut sudah masuk `.gitignore`.

## 3. Menjalankan server

```bash
npm start
```

Alamat lokal:

- Health check: `http://localhost:3000/health`
- Swagger UI: `http://localhost:3000/docs`
- OpenAPI JSON: `http://localhost:3000/openapi.json`

Hentikan server dengan `Ctrl + C`.

## 4. Akun demonstrasi

| Role | Username | Password | Kegunaan |
|---|---|---|---|
| Mahasiswa 1 | `240104040138` | `mhs12345` | Pemilik pengaduan awal ID 1 |
| Mahasiswa 2 | `240104040139` | `mhs12345` | Pemilik pengaduan awal ID 2 |
| Admin | `admin` | `admin12345` | Melihat seluruh data dan mengubah status |

Akun ini hanya untuk pengujian UTS lokal. Password tidak ditulis sebagai plaintext di repository: file seed menyimpan hash scrypt dengan salt. Ganti akun, password, dan secret untuk penerapan nyata.

## 5. Ringkasan endpoint

| Metode | Endpoint | Akses | Fungsi |
|---|---|---|---|
| POST | `/api/auth/login` | Publik | Login dan menerima JWT |
| GET | `/api/pengaduan` | Bearer | Mahasiswa melihat miliknya; admin melihat seluruhnya |
| GET | `/api/pengaduan/:id` | Bearer | Detail pengaduan; mahasiswa dibatasi kepemilikan |
| POST | `/api/pengaduan` | Mahasiswa | Membuat pengaduan |
| PUT | `/api/pengaduan/:id` | Pemilik mahasiswa | Mengubah judul, kategori, deskripsi saat status `diajukan` |
| PATCH | `/api/pengaduan/:id/status` | Admin | Memperbarui status |
| DELETE | `/api/pengaduan/:id` | Pemilik mahasiswa | Menghapus pengaduan saat status `diajukan` |

Kategori yang diterima: `Fasilitas`, `Akademik`, `TI`. Status: `diajukan`, `diproses`, `selesai`.

## 6. Contoh penggunaan

### Login mahasiswa

```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "240104040138",
  "password": "mhs12345"
}
```

Respons sukses berisi `data.token`, `data.tokenType` (`Bearer`), `data.expiresIn`, dan informasi pengguna. Token berbeda untuk setiap sesi login, mempunyai waktu kedaluwarsa, subject pengguna, role, dan JWT ID acak.

### Membuat pengaduan

```http
POST /api/pengaduan
Authorization: Bearer <TOKEN_HASIL_LOGIN>
Content-Type: application/json

{
  "judul": "Lampu ruang kelas tidak berfungsi",
  "kategori": "Fasilitas",
  "deskripsi": "Lampu ruang kelas TI-2B mati sejak pagi."
}
```

Server menentukan sendiri `id`, `mahasiswaId`, `status`, dan `createdAt`. Client tidak boleh mengirim atau menimpa field tersebut.

### Admin memperbarui status

```http
PATCH /api/pengaduan/3/status
Authorization: Bearer <TOKEN_ADMIN>
Content-Type: application/json

{
  "status": "diproses"
}
```

## 7. Matriks hak akses

| Operasi | Mahasiswa | Admin |
|---|:---:|:---:|
| Melihat pengaduan sendiri | Ya | Ya |
| Melihat semua pengaduan | Tidak | Ya |
| Membuat pengaduan | Ya | Tidak |
| Mengubah pengaduan sendiri | Ya, jika status `diajukan` | Tidak |
| Menghapus pengaduan sendiri | Ya, jika status `diajukan` | Tidak |
| Mengubah status pengaduan | Tidak | Ya |

## 8. Bentuk respons dan error

Respons berhasil konsisten menggunakan `success: true` dan `data`. Respons gagal menggunakan `success: false` dan objek `error` yang memiliki `code` serta `message`.

| HTTP | Makna pada API |
|---|---|
| 200 | Permintaan berhasil |
| 201 | Pengaduan berhasil dibuat |
| 400 | JSON/body atau input tidak valid |
| 401 | Token tidak ada/tidak sah/kedaluwarsa atau kredensial salah |
| 403 | Identitas terautentikasi tetapi role/kepemilikan tidak berhak |
| 404 | Resource atau endpoint tidak ditemukan |
| 413 | Body melebihi batas 100 KB |
| 500 | Kesalahan internal dengan pesan generik |

## 9. Pengujian otomatis

Pastikan server berjalan pada port yang sesuai, lalu buka terminal kedua:

```bash
npm test
```

Tes memakai HTTP `fetch` dan memeriksa login benar/salah, token hilang/tidak valid, pembuatan data, kepemilikan, pembatasan role, validasi, 404, serta integritas data sesudah request ditolak. Hasil disimpan di `tests/test-results.json`.

Untuk alamat server berbeda:

```bash
API_BASE_URL=http://127.0.0.1:3001 npm test
```

## 10. Struktur dan tanggung jawab lapisan

```text
simadu-api/
├── src/
│   ├── controllers/   # Mengubah request menjadi pemanggilan service dan response HTTP
│   ├── services/      # Aturan bisnis, validasi, role, kepemilikan, status
│   ├── repositories/  # Penyimpanan dan pencarian user/pengaduan
│   ├── routes/        # Pemetaan method/path ke middleware dan controller
│   ├── middleware/    # Autentikasi, validasi body, not-found, error handler
│   └── utils/         # AppError dan fungsi password/JWT
├── docs/openapi.json  # Kontrak OpenAPI 3.0.3
├── tests/             # HTTP test runner dan hasil uji
├── app.cjs            # Komposisi aplikasi Express 5
├── server.cjs         # Entry point server
├── package.json
├── .env.example
├── .gitignore
└── README.md
```

**Router** menerima method dan path; **middleware** melakukan pemeriksaan awal; **controller** menangani bentuk request/response; **service** memutuskan aturan bisnis; **repository** mengakses data. Pemisahan ini memudahkan pengujian dan pemeliharaan.

## 11. Batasan dan pengembangan produksi

- Data belum persisten; gunakan PostgreSQL/MySQL dan transaksi untuk produksi.
- Secret dan akun demo harus diganti, lalu dikelola melalui secret manager.
- Tambahkan HTTPS/TLS, rate limiting login, audit log yang tidak mencatat password/token, backup, monitoring, kebijakan retensi, pagination, dan CI/CD.
- Terapkan rotasi/revokasi token, refresh-token yang aman, serta pengujian keamanan otomatis.
- Tambahkan validasi skema OpenAPI pada pipeline dan pengujian integrasi terhadap database.

## 12. Catatan demo ketika dependency npm tidak tersedia

`dev-native-server.cjs` adalah adaptor HTTP native sementara untuk mengetes service dan repository yang sama pada lingkungan tanpa paket npm. Adaptor ini **bukan pengganti Express 5**. Untuk demonstrasi akhir sesuai UTS, jalankan `npm install`, `npm start`, buka Swagger UI, lalu jalankan `npm test` terhadap server Express.
