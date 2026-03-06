# 8. Autentikasi & Keamanan

[← Kembali ke Daftar Isi](./README.md)

---

## 8.1 Alur Autentikasi

### Registrasi
1. Pengguna mengisi form registrasi (nama, email, password)
2. Validasi input dengan Zod schema
3. Cek apakah email sudah terdaftar
4. Hash password menggunakan bcrypt (salt rounds: 12)
5. Simpan data User ke database
6. Generate JWT access token (masa berlaku: 15 menit) dan refresh token (masa berlaku: 7 hari)
7. Kembalikan data user + tokens ke client

### Login (Email/Password)
1. Pengguna mengisi email dan password
2. Cari user berdasarkan email di database
3. Verifikasi password menggunakan bcrypt compare
4. Cek apakah user tidak dalam status banned
5. Generate JWT tokens (access + refresh)
6. Kembalikan data user + tokens

### Login (Google OAuth)
1. Pengguna klik tombol "Login with Google"
2. Google mengembalikan credential (ID token)
3. Backend memverifikasi credential via Google Auth Library
4. Cari user berdasarkan Google ID atau email
5. Jika belum ada, buat user baru
6. Generate JWT tokens
7. Kembalikan data user + tokens

### Token Refresh
1. Client mendeteksi access token expired (401 response)
2. Client mengirim refresh token ke `/api/auth/refresh`
3. Backend memverifikasi refresh token
4. Generate access token baru
5. Client mengupdate token di localStorage dan Zustand store

### Logout
1. Client mengirim request logout
2. Backend memasukkan access token ke Redis blacklist
3. Client membersihkan localStorage dan reset Zustand store
4. Redirect ke halaman login

---

## 8.2 Middleware Chain

| Middleware | Deskripsi | Letak |
|------------|-----------|-------|
| **`authGuard`** | Memvalidasi Bearer JWT token, mengecek blacklist di Redis, memverifikasi user ada dan tidak di-ban. Menambahkan `request.user`. | Semua route yang memerlukan autentikasi |
| **`teamGuard(requiredRoles?)`** | Memverifikasi user adalah anggota tim dari `teamId` di URL params. Opsional memeriksa role (OWNER/ADMIN/MEMBER). Menambahkan `request.teamMember`. | Route yang terkait tim |
| **`adminGuard`** | Memverifikasi `user.isAdmin === true` dari database. | Route admin |

### Contoh Penggunaan Middleware

| Tipe Route | Middleware Chain |
|------------|-----------------|
| Route publik | Tidak ada middleware |
| Route autentikasi saja | `authGuard` |
| Route tim | `authGuard` → `teamGuard()` |
| Route admin | `authGuard` → `adminGuard` |
| Route dengan role tertentu | `authGuard` → `teamGuard(['OWNER', 'ADMIN'])` |

---

## 8.3 Fitur Keamanan

| Fitur | Implementasi |
|-------|-------------|
| **Enkripsi Password** | bcrypt dengan 12 salt rounds |
| **JWT Token** | HS256 via library `jose`, access token 15 menit, refresh token 7 hari |
| **Token Blacklisting** | Redis menyimpan token yang sudah di-logout |
| **Enkripsi API Key** | AES-256-GCM menggunakan `ENCRYPTION_KEY` dari environment variable |
| **CORS** | Dikonfigurasi via `@fastify/cors` |
| **HTTP Security Headers** | Via `@fastify/helmet` |
| **Rate Limiting** | Via `@fastify/rate-limit` |
| **Input Validation** | Zod schema di server-side dan client-side |
| **Ban System** | Admin dapat ban user, `authGuard` menolak user yang di-ban dengan 403 |

---

[← Sebelumnya: Database Schema](./07-database-schema.md) | [Selanjutnya: Integrasi AI →](./09-integrasi-ai.md)
