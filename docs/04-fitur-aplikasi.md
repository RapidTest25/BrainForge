# 4. Fitur-Fitur Aplikasi

[← Kembali ke Daftar Isi](./README.md)

---

## 4.1 Modul Inti

| No | Modul | Deskripsi |
|----|-------|-----------|
| 1 | **Manajemen Tugas (Tasks)** | Papan Kanban & tampilan daftar dengan drag-and-drop. Prioritas (Urgent/High/Medium/Low), status (TODO/In Progress/In Review/Done/Cancelled), penugasan anggota, label, dependensi antar tugas, komentar, log aktivitas, estimasi waktu, dan tracking waktu. |
| 2 | **AI Brainstorm** | Chat AI interaktif dengan 4 mode: Brainstorm, Debate, Analysis, dan Freeform. Dukungan multi-provider AI. Riwayat percakapan, pin pesan, whiteboard kolaboratif, flow canvas, dan lampiran file. |
| 3 | **Diagram** | Editor diagram visual mendukung 8 tipe: Flowchart, ERD, Mind Map, Architecture, Sequence, User Flow, Component, dan Freeform. Pembuatan diagram otomatis via AI dari deskripsi bahasa alami. |
| 4 | **Sprint Planning** | Perencanaan sprint dengan pembuatan task otomatis via AI, milestone, alokasi tim, dan manajemen deadline. Konversi task sprint menjadi task nyata. |
| 5 | **Kalender** | Kalender terpadu menampilkan tenggat tugas, event kustom, dan milestone sprint dalam satu tampilan. |
| 6 | **Catatan (Notes)** | Editor teks dengan bantuan AI (summarize, expand). Riwayat versi lengkap dengan kemampuan restore versi sebelumnya. |
| 7 | **Goal Tracking** | Pelacakan objektif tingkat tinggi dengan monitoring progress, terhubung dengan tugas-tugas. Pembuatan SMART goals via AI. |
| 8 | **Diskusi** | Thread diskusi tim dengan kategori, pinning, dan balasan. |
| 9 | **AI Chat** | Percakapan AI mandiri (terpisah dari sesi brainstorm) dengan persistensi riwayat. |

---

## 4.2 Fitur Platform

| No | Fitur | Deskripsi |
|----|-------|-----------|
| 1 | **Autentikasi** | Email/password + Google OAuth. JWT access token (15 menit) + refresh token (7 hari) dengan rotasi otomatis. |
| 2 | **Manajemen Tim** | Buat tim, undang anggota via email atau link. Role-based access control (Owner/Admin/Member). |
| 3 | **Manajemen Proyek** | Organisasi kerja ke dalam proyek-proyek di dalam tim. Warna dan ikon kustom. Anggota per-proyek independen. |
| 4 | **Notifikasi Real-time** | Sistem notifikasi in-app secara real-time. |
| 5 | **Dark Mode** | Dukungan tema gelap/terang penuh. |
| 6 | **BYOK AI** | Mendukung OpenRouter, OpenAI, Google Gemini, Anthropic Claude, Groq, GitHub Copilot. Satu kunci OpenRouter memberikan akses ke 400+ model. |
| 7 | **Admin Panel** | Pengaturan sistem, manajemen pengguna, ban/unban, statistik dan analitik penggunaan AI. |
| 8 | **File Upload** | Lampirkan file ke pesan brainstorm dan entitas lainnya. |
| 9 | **Drag & Drop** | Seret dan lepas tugas antar kolom di Kanban board, reorder tugas. |
| 10 | **Ekspor** | Ekspor sesi brainstorm ke format Markdown. |

---

[← Sebelumnya: Struktur Proyek](./03-struktur-proyek.md) | [Selanjutnya: API Endpoint →](./05-api-endpoint.md)
