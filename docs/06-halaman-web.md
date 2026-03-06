# 6. Halaman Web (Web Routes)

[← Kembali ke Daftar Isi](./README.md)

---

## 6.1 Halaman Publik

| Route | Deskripsi |
|-------|-----------|
| `/` | Landing page (redirect ke `/dashboard` jika sudah login) |
| `/login` | Halaman login |
| `/register` | Halaman registrasi |
| `/forgot-password` | Halaman lupa password |
| `/reset-password` | Halaman reset password |
| `/join/[token]` | Halaman terima undangan tim |

---

## 6.2 Halaman Aplikasi (Authenticated — dengan Sidebar)

| Route | Deskripsi |
|-------|-----------|
| `/dashboard` | Dashboard utama |
| `/tasks` | Manajemen tugas (Kanban/list view) |
| `/brainstorm` | Daftar sesi brainstorm |
| `/brainstorm/[sessionId]` | Sesi brainstorm (chat + whiteboard + flow) |
| `/diagrams` | Daftar diagram |
| `/sprints` | Sprint planning |
| `/notes` | Editor catatan |
| `/calendar` | Tampilan kalender |
| `/goals` | Goal tracking |
| `/ai-chat` | AI chat assistant |
| `/projects` | Manajemen proyek |
| `/notifications` | Pusat notifikasi |
| `/docs` | Dokumentasi |
| `/settings` | Pengaturan umum |
| `/settings/ai-keys` | Manajemen API key AI |
| `/settings/team` | Pengaturan tim |

---

## 6.3 Halaman Admin (Memerlukan hak Admin)

| Route | Deskripsi |
|-------|-----------|
| `/admin` | Dashboard admin |
| `/admin/users` | Manajemen pengguna |
| `/admin/teams` | Manajemen tim |
| `/admin/activity` | Log aktivitas |
| `/admin/ai-usage` | Analitik penggunaan AI |
| `/admin/api-keys` | Ringkasan API key |
| `/admin/settings` | Pengaturan sistem |
| `/admin/system` | Informasi sistem |

---

[← Sebelumnya: API Endpoint](./05-api-endpoint.md) | [Selanjutnya: Database Schema →](./07-database-schema.md)
