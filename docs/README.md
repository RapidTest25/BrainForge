# 📘 Dokumentasi Teknis BrainForge

## Untuk Keperluan Skripsi / Penulisan Ilmiah

**Nama Aplikasi:** BrainForge  
**Jenis Aplikasi:** AI-Powered Project Management Workspace (Aplikasi Web Manajemen Proyek Berbasis Kecerdasan Buatan)  
**Lisensi:** MIT (Open Source)  
**Arsitektur:** Monorepo (Fullstack TypeScript)

---

## 📂 Daftar Dokumen

Dokumentasi ini dipecah menjadi beberapa file agar lebih mudah dibaca dan diagram Mermaid dapat ter-render dengan baik.

### Dokumen Utama

| No | File | Isi |
|----|------|-----|
| 1 | [01-gambaran-umum.md](./01-gambaran-umum.md) | Gambaran umum sistem, bahasa pemrograman, technology stack |
| 2 | [02-library-framework.md](./02-library-framework.md) | Library & framework yang digunakan (backend, frontend, shared) |
| 3 | [03-struktur-proyek.md](./03-struktur-proyek.md) | Struktur proyek (project structure) monorepo |
| 4 | [04-fitur-aplikasi.md](./04-fitur-aplikasi.md) | Fitur-fitur aplikasi (modul inti & platform) |
| 5 | [05-api-endpoint.md](./05-api-endpoint.md) | Daftar lengkap ~120+ API endpoint |
| 6 | [06-halaman-web.md](./06-halaman-web.md) | Halaman web (web routes) — publik, app, admin |
| 7 | [07-database-schema.md](./07-database-schema.md) | Database schema (26 model, 11 enum) |
| 8 | [08-autentikasi-keamanan.md](./08-autentikasi-keamanan.md) | Alur autentikasi, middleware, & keamanan |
| 9 | [09-integrasi-ai.md](./09-integrasi-ai.md) | Integrasi AI (provider, BYOK, fitur per modul) |
| 10 | [10-realtime-socket.md](./10-realtime-socket.md) | Real-time communication (Socket.IO events) |
| 11 | [11-state-management.md](./11-state-management.md) | State management (Zustand + React Query) |
| 12 | [12-infrastruktur-deployment.md](./12-infrastruktur-deployment.md) | Infrastruktur, deployment, & konfigurasi |

### Diagram UML (File Terpisah)

| No | File | Jenis Diagram |
|----|------|---------------|
| 1 | [diagrams/use-case-diagram.md](./diagrams/use-case-diagram.md) | Use Case Diagram |
| 2 | [diagrams/activity-registrasi.md](./diagrams/activity-registrasi.md) | Activity Diagram — Registrasi |
| 3 | [diagrams/activity-login.md](./diagrams/activity-login.md) | Activity Diagram — Login |
| 4 | [diagrams/activity-brainstorm.md](./diagrams/activity-brainstorm.md) | Activity Diagram — Brainstorm AI |
| 5 | [diagrams/activity-task.md](./diagrams/activity-task.md) | Activity Diagram — Manajemen Task |
| 6 | [diagrams/activity-ai-generate.md](./diagrams/activity-ai-generate.md) | Activity Diagram — AI Generate (Bulk Generation) |
| 7 | [diagrams/activity-byok.md](./diagrams/activity-byok.md) | Activity Diagram — BYOK (Bring Your Own Key) |
| 8 | [diagrams/activity-ai-analytics.md](./diagrams/activity-ai-analytics.md) | Activity Diagram — AI Usage Analytics (Admin) |
| 9 | [diagrams/sequence-autentikasi.md](./diagrams/sequence-autentikasi.md) | Sequence Diagram — Autentikasi |
| 10 | [diagrams/sequence-ai-chat.md](./diagrams/sequence-ai-chat.md) | Sequence Diagram — AI Chat |
| 11 | [diagrams/class-diagram-entity.md](./diagrams/class-diagram-entity.md) | Class Diagram — Database Entity |
| 12 | [diagrams/class-diagram-ai-provider.md](./diagrams/class-diagram-ai-provider.md) | Class Diagram — AI Provider |
| 13 | [diagrams/component-diagram.md](./diagrams/component-diagram.md) | Component Diagram |
| 14 | [diagrams/deployment-diagram.md](./diagrams/deployment-diagram.md) | Deployment Diagram |
| 15 | [diagrams/navigation-diagram.md](./diagrams/navigation-diagram.md) | Navigation Diagram (Sitemap) |
| 16 | [diagrams/erd-diagram.md](./diagrams/erd-diagram.md) | Entity Relationship Diagram (ERD) |

---

### Ringkasan Kuantitatif

| Metrik | Jumlah |
|--------|--------|
| Total model database | 26 |
| Total enum database | 11 |
| Total modul API | 15 |
| Total API endpoint | ~120+ |
| Total halaman web | ~30+ |
| Total AI provider | 6 |
| Total Zustand store | 3 |
| Total middleware | 3 |
| Total shared packages | 2 |
| Backend dependencies | 20+ |
| Frontend dependencies | 25+ |

---

> **Dokumen ini dibuat untuk keperluan skripsi/penulisan ilmiah. Semua informasi diambil langsung dari source code proyek BrainForge.**
