# 5. Daftar API Endpoint

[← Kembali ke Daftar Isi](./README.md)

---

## 5.1 Autentikasi (`/api/auth`)

| Method | Endpoint | Auth | Deskripsi |
|--------|----------|------|-----------|
| POST | `/register` | Tidak | Registrasi akun baru (email/password) |
| POST | `/login` | Tidak | Login (email/password) |
| POST | `/google` | Tidak | Login via Google OAuth |
| POST | `/refresh` | Tidak | Refresh access token |
| POST | `/logout` | Ya | Logout (blacklist token di Redis) |
| GET | `/me` | Ya | Ambil profil pengguna saat ini |
| PATCH | `/me` | Ya | Update profil (nama, avatar) |
| PATCH | `/me/password` | Ya | Ganti password |
| POST | `/me/set-password` | Ya | Set password untuk akun Google-only |
| POST | `/forgot-password` | Tidak | Request reset password |
| POST | `/reset-password` | Tidak | Reset password dengan token |
| POST | `/me/link-google` | Ya | Hubungkan akun Google |
| DELETE | `/me/link-google` | Ya | Lepas akun Google |

---

## 5.2 Tim (`/api/teams`)

| Method | Endpoint | Auth | Role | Deskripsi |
|--------|----------|------|------|-----------|
| POST | `/` | Ya | — | Buat tim baru |
| GET | `/` | Ya | — | Daftar tim pengguna |
| GET | `/:teamId` | Ya | Member | Detail tim |
| PATCH | `/:teamId` | Ya | Owner/Admin | Update tim |
| DELETE | `/:teamId` | Ya | Owner | Hapus tim |
| POST | `/:teamId/invitations` | Ya | Owner/Admin | Kirim undangan |
| POST | `/:teamId/invite-link` | Ya | Owner/Admin | Buat link undangan |
| GET | `/invite/:token` | Ya | — | Info undangan |
| POST | `/join/:token` | Ya | — | Terima undangan |
| GET | `/:teamId/members` | Ya | Member | Daftar anggota |
| PATCH | `/:teamId/members/:userId` | Ya | Owner/Admin | Update role anggota |
| DELETE | `/:teamId/members/:userId` | Ya | Owner/Admin | Hapus anggota |

---

## 5.3 Proyek (`/api/teams/:teamId/projects`)

| Method | Endpoint | Auth | Deskripsi |
|--------|----------|------|-----------|
| GET | `/` | Ya | Daftar proyek |
| POST | `/` | Ya | Buat proyek |
| GET | `/:projectId` | Ya | Detail proyek |
| PATCH | `/:projectId` | Ya | Update proyek |
| DELETE | `/:projectId` | Ya | Hapus proyek |
| GET | `/:projectId/members` | Ya | Daftar anggota proyek |
| GET | `/:projectId/available-members` | Ya | Anggota tim yang belum di proyek |
| POST | `/:projectId/members` | Admin | Tambah anggota ke proyek |
| PATCH | `/:projectId/members/:userId` | Admin | Update role anggota |
| DELETE | `/:projectId/members/:userId` | Admin | Hapus anggota dari proyek |

---

## 5.4 Tugas / Tasks (`/api/teams/:teamId/tasks`)

| Method | Endpoint | Auth | Deskripsi |
|--------|----------|------|-----------|
| POST | `/` | Ya | Buat tugas |
| GET | `/` | Ya | Daftar tugas (dengan filter) |
| GET | `/:taskId` | Ya | Detail tugas |
| PATCH | `/:taskId` | Ya | Update tugas |
| DELETE | `/:taskId` | Ya | Hapus tugas |
| PATCH | `/:taskId/assignees` | Ya | Update penugasan |
| POST | `/:taskId/comments` | Ya | Tambah komentar |
| GET | `/:taskId/comments` | Ya | Daftar komentar |
| GET | `/:taskId/activities` | Ya | Log aktivitas |
| PATCH | `/reorder` | Ya | Urutkan ulang tugas (drag & drop) |
| POST | `/labels` | Ya | Buat label |
| GET | `/labels` | Ya | Daftar label |

---

## 5.5 Brainstorm (`/api/teams/:teamId/brainstorm`)

| Method | Endpoint | Auth | Deskripsi |
|--------|----------|------|-----------|
| GET | `/` | Ya | Daftar sesi brainstorm |
| POST | `/` | Ya | Buat sesi baru |
| GET | `/:sessionId` | Ya | Detail sesi + pesan |
| POST | `/:sessionId/messages` | Ya | Kirim pesan (memicu respons AI) |
| PATCH | `/messages/:messageId` | Ya | Edit pesan |
| DELETE | `/messages/:messageId` | Ya | Hapus pesan |
| PATCH | `/messages/:messageId/pin` | Ya | Pin pesan |
| PATCH | `/messages/:messageId/unpin` | Ya | Unpin pesan |
| GET | `/:sessionId/pinned` | Ya | Daftar pesan yang di-pin |
| GET | `/:sessionId/export` | Ya | Ekspor sesi ke Markdown |
| DELETE | `/:sessionId` | Ya | Hapus sesi |
| PATCH | `/:sessionId` | Ya | Update judul sesi |
| PATCH | `/:sessionId/canvas` | Ya | Simpan data whiteboard/flow |
| POST | `/:sessionId/upload` | Ya | Upload file ke sesi |

---

## 5.6 Diagram (`/api/teams/:teamId/diagrams`)

| Method | Endpoint | Auth | Deskripsi |
|--------|----------|------|-----------|
| GET | `/` | Ya | Daftar diagram |
| POST | `/` | Ya | Buat diagram |
| GET | `/:diagramId` | Ya | Detail diagram |
| PATCH | `/:diagramId` | Ya | Update diagram |
| DELETE | `/:diagramId` | Ya | Hapus diagram |
| POST | `/ai-generate` | Ya | Generate diagram via AI |

---

## 5.7 Sprint (`/api/teams/:teamId/sprints`)

| Method | Endpoint | Auth | Deskripsi |
|--------|----------|------|-----------|
| GET | `/` | Ya | Daftar sprint |
| POST | `/` | Ya | Buat sprint |
| GET | `/:sprintId` | Ya | Detail sprint |
| PATCH | `/:sprintId` | Ya | Update sprint |
| DELETE | `/:sprintId` | Ya | Hapus sprint |
| POST | `/ai-generate` | Ya | Generate rencana sprint via AI |
| POST | `/:sprintId/convert` | Ya | Konversi task sprint ke task nyata |

---

## 5.8 Catatan / Notes (`/api/teams/:teamId/notes`)

| Method | Endpoint | Auth | Deskripsi |
|--------|----------|------|-----------|
| GET | `/` | Ya | Daftar catatan |
| POST | `/` | Ya | Buat catatan |
| GET | `/:noteId` | Ya | Detail catatan |
| PATCH | `/:noteId` | Ya | Update catatan |
| DELETE | `/:noteId` | Ya | Hapus catatan |
| GET | `/:noteId/history` | Ya | Riwayat versi |
| POST | `/:noteId/restore/:historyId` | Ya | Kembalikan versi sebelumnya |
| POST | `/ai-assist` | Ya | Bantuan penulisan AI |

---

## 5.9 Kalender (`/api/teams/:teamId/calendar`)

| Method | Endpoint | Auth | Deskripsi |
|--------|----------|------|-----------|
| GET | `/` | Ya | Daftar event (rentang tanggal) |
| GET | `/feed` | Ya | Feed gabungan (tasks + sprint + event) |
| POST | `/` | Ya | Buat event |
| GET | `/:eventId` | Ya | Detail event |
| PATCH | `/:eventId` | Ya | Update event |
| DELETE | `/:eventId` | Ya | Hapus event |

---

## 5.10 Goals (`/api/teams/:teamId/goals`)

| Method | Endpoint | Auth | Deskripsi |
|--------|----------|------|-----------|
| GET | `/` | Ya | Daftar goals |
| POST | `/` | Ya | Buat goal |
| GET | `/:goalId` | Ya | Detail goal |
| PATCH | `/:goalId` | Ya | Update goal |
| DELETE | `/:goalId` | Ya | Hapus goal |
| POST | `/ai-generate` | Ya | Generate SMART goals via AI |

---

## 5.11 Diskusi (`/api/teams/:teamId/discussions`)

| Method | Endpoint | Auth | Deskripsi |
|--------|----------|------|-----------|
| GET | `/` | Ya | Daftar diskusi |
| POST | `/` | Ya | Buat diskusi |
| GET | `/:discussionId` | Ya | Detail diskusi + balasan |
| PATCH | `/:discussionId` | Ya | Update diskusi |
| DELETE | `/:discussionId` | Ya | Hapus diskusi |
| POST | `/:discussionId/replies` | Ya | Tambah balasan |
| PATCH | `/:discussionId/replies/:replyId` | Ya | Edit balasan |
| DELETE | `/:discussionId/replies/:replyId` | Ya | Hapus balasan |

---

## 5.12 AI Chat (`/api/teams/:teamId/ai-chat`)

| Method | Endpoint | Auth | Deskripsi |
|--------|----------|------|-----------|
| GET | `/` | Ya | Daftar chat |
| POST | `/` | Ya | Buat chat baru |
| GET | `/:chatId` | Ya | Detail chat + pesan |
| DELETE | `/:chatId` | Ya | Hapus chat |
| PATCH | `/:chatId` | Ya | Update judul chat |
| POST | `/:chatId/messages` | Ya | Kirim pesan & dapatkan respons AI |

---

## 5.13 AI Key Management (`/api/ai`)

| Method | Endpoint | Auth | Deskripsi |
|--------|----------|------|-----------|
| GET | `/keys` | Ya | Daftar API key pengguna |
| POST | `/keys` | Ya | Tambah API key |
| PATCH | `/keys/:keyId` | Ya | Update key |
| DELETE | `/keys/:keyId` | Ya | Hapus key |
| GET | `/usage` | Ya | Statistik penggunaan AI |
| POST | `/keys/validate` | Ya | Validasi key sebelum disimpan |
| POST | `/keys/:keyId/check` | Ya | Periksa validitas key & saldo |

---

## 5.14 AI Generate (`/api/teams/:teamId/ai-generate`)

| Method | Endpoint | Auth | Deskripsi |
|--------|----------|------|-----------|
| POST | `/` | Ya | Bulk AI generation (tasks + brainstorm + notes + goals dari satu prompt) |

---

## 5.15 Notifikasi (`/api/teams/:teamId/notifications`)

| Method | Endpoint | Auth | Deskripsi |
|--------|----------|------|-----------|
| GET | `/` | Ya | Daftar notifikasi |
| PATCH | `/mark-all-read` | Ya | Tandai semua telah dibaca |
| PATCH | `/:notificationId` | Ya | Tandai satu telah dibaca |
| DELETE | `/:notificationId` | Ya | Hapus notifikasi |

---

## 5.16 Admin (`/api/admin`) — Memerlukan hak Admin

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/stats` | Statistik dashboard |
| GET | `/activity` | Aktivitas terbaru |
| GET | `/users` | Daftar pengguna (paginasi, pencarian) |
| GET | `/users/:userId` | Detail pengguna |
| PATCH | `/users/:userId/admin` | Toggle status admin |
| DELETE | `/users/:userId` | Hapus pengguna |
| PATCH | `/users/:userId/ban` | Ban/Unban pengguna |
| POST | `/users/:userId/reset-password` | Reset password pengguna |
| GET | `/teams` | Daftar semua tim |
| GET | `/teams/:teamId` | Detail tim |
| GET | `/ai-usage` | Analitik penggunaan AI |
| GET | `/ai-usage/logs` | Log penggunaan AI (paginasi) |
| GET | `/api-keys` | Daftar semua API key (masked) |
| GET | `/growth` | Analitik pertumbuhan |

---

## 5.17 Admin Settings (`/api/admin/settings`)

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/version` | Informasi versi/runtime |
| GET | `/` | Semua settings per kategori |
| GET | `/:category` | Settings untuk kategori tertentu |
| PATCH | `/:category/:key` | Update satu setting |
| POST | `/bulk` | Bulk update settings |
| POST | `/:category/reset` | Reset kategori ke default |

---

## 5.18 Endpoint Publik (Tanpa Autentikasi)

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/api/health` | Health check server |
| GET | `/api/ai/models` | Daftar semua model AI yang tersedia |
| GET | `/api/ai/openrouter/models` | Katalog lengkap model OpenRouter |
| GET | `/api/app/version` | Informasi versi aplikasi |
| GET | `/uploads/:filename` | Serve file yang diupload |

---

[← Sebelumnya: Fitur Aplikasi](./04-fitur-aplikasi.md) | [Selanjutnya: Halaman Web →](./06-halaman-web.md)
