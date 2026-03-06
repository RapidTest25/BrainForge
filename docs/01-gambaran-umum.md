# 1. Gambaran Umum Sistem

[← Kembali ke Daftar Isi](./README.md)

---

## 1.1 Tentang BrainForge

**BrainForge** adalah platform manajemen proyek all-in-one yang terintegrasi dengan kecerdasan buatan (AI). Aplikasi ini menggabungkan berbagai modul seperti manajemen tugas (tasks), brainstorming AI, diagram, sprint planning, kalender, catatan (notes), diskusi, goal tracking, dan chat AI ke dalam satu workspace kolaboratif.

### Prinsip Utama:
- **BYOK (Bring Your Own Key)** — Pengguna menyediakan API key AI mereka sendiri. Tidak ada biaya langganan untuk fitur AI.
- **Self-hostable** — Dapat di-deploy pada infrastruktur sendiri. Data pengguna tetap privat.
- **Open Source (MIT)** — Bebas digunakan untuk keperluan apapun.
- **Privacy-first** — Tanpa analytics, tracking, atau telemetry.

---

## 1.2 Bahasa Pemrograman

| Bahasa | Versi | Penggunaan |
|--------|-------|------------|
| **TypeScript** | 5.4 | Bahasa utama untuk seluruh kode (frontend, backend, shared packages). TypeScript adalah superset dari JavaScript yang menambahkan sistem tipe statis. |
| **SQL** | PostgreSQL 16 | Bahasa query database (diakses melalui Prisma ORM) |
| **CSS** | Tailwind CSS 4 | Styling menggunakan utility-first CSS framework |
| **HTML** | JSX/TSX | Markup melalui React JSX (embedded di TypeScript) |

> **Catatan:** Seluruh kode ditulis dalam TypeScript secara end-to-end, mulai dari frontend (React/Next.js), backend (Fastify), hingga shared packages (types & validators).

---

## 1.3 Technology Stack (Tumpukan Teknologi)

| Layer | Teknologi | Versi | Keterangan |
|-------|-----------|-------|------------|
| **Frontend Framework** | Next.js (App Router) | 15 | Framework React untuk production dengan SSR & routing |
| **UI Library** | React | 19 | Pustaka JavaScript untuk membangun antarmuka pengguna |
| **Styling** | Tailwind CSS | 4 | Utility-first CSS framework |
| **UI Primitives** | Radix UI | Latest | Komponen UI headless yang dapat diakses (accessible) |
| **Animations** | Framer Motion | 12 | Library animasi untuk React |
| **Server State** | TanStack React Query | 5 | Data fetching & caching library |
| **Client State** | Zustand | 5 | Lightweight state management |
| **Backend Framework** | Fastify | 5 | Web framework Node.js berperforma tinggi |
| **ORM** | Prisma | 6 | Object-Relational Mapping untuk database |
| **Database** | PostgreSQL | 16 | Relational database management system |
| **Cache / Session** | Redis | 7 | In-memory data store untuk token blacklisting |
| **Real-time** | Socket.IO | 4 | Library untuk komunikasi real-time bidirectional |
| **Authentication** | JWT (jose) + bcryptjs | - | JSON Web Token untuk autentikasi stateless |
| **Validation** | Zod | 3 | Schema validation library untuk TypeScript |
| **Monorepo Tool** | Turborepo + pnpm | 2.3 / 9 | Build system & package manager |
| **Containerization** | Docker Compose | 3.9 | Orkestrasi container untuk PostgreSQL & Redis |
| **AI SDKs** | OpenAI, Anthropic, Gemini, Groq | Latest | SDK resmi untuk integrasi provider AI |
| **Logging** | Pino | 9 | High-performance JSON logger untuk Node.js |

---

[Selanjutnya: Library & Framework →](./02-library-framework.md)
