# 3. Struktur Proyek (Project Structure)

[← Kembali ke Daftar Isi](./README.md)

---

```
BrainForge/                          # Root monorepo
├── apps/
│   ├── api/                         # Backend (Fastify API Server)
│   │   ├── prisma/
│   │   │   ├── schema.prisma        # Database schema (26 model)
│   │   │   └── seed.ts              # Database seeder
│   │   └── src/
│   │       ├── app.ts               # Setup Fastify app & registrasi routes
│   │       ├── server.ts            # Entry point server (listen port)
│   │       ├── socket.ts            # Setup Socket.IO server
│   │       ├── ai/
│   │       │   ├── ai.service.ts    # AI service utama (orchestrator)
│   │       │   └── providers/       # Implementasi tiap AI provider
│   │       │       ├── base.ts      # Abstract base class AI provider
│   │       │       ├── openai.ts    # Provider OpenAI (GPT)
│   │       │       ├── claude.ts    # Provider Anthropic Claude
│   │       │       ├── gemini.ts    # Provider Google Gemini
│   │       │       ├── groq.ts      # Provider Groq
│   │       │       ├── openrouter.ts# Provider OpenRouter (multi-model)
│   │       │       └── copilot.ts   # Provider GitHub Copilot
│   │       ├── lib/
│   │       │   ├── encryption.ts    # Enkripsi AES-256-GCM untuk API key
│   │       │   ├── errors.ts        # Custom error classes
│   │       │   ├── jwt.ts           # JWT generation & verification
│   │       │   ├── prisma.ts        # Prisma client singleton
│   │       │   └── redis.ts         # Redis client untuk token blacklist
│   │       ├── middleware/
│   │       │   ├── auth.middleware.ts  # JWT authentication guard
│   │       │   ├── team.middleware.ts  # Team membership & role guard
│   │       │   └── admin.middleware.ts # Admin access guard
│   │       └── modules/             # Modul-modul bisnis (routes + services)
│   │           ├── auth/            # Autentikasi & profil pengguna
│   │           ├── team/            # Manajemen tim
│   │           ├── project/         # Manajemen proyek
│   │           ├── task/            # Manajemen tugas (Kanban)
│   │           ├── brainstorm/      # Brainstorming AI
│   │           ├── diagram/         # Diagram editor
│   │           ├── sprint/          # Sprint planning
│   │           ├── note/            # Catatan (notes)
│   │           ├── calendar/        # Kalender
│   │           ├── goal/            # Goal tracking
│   │           ├── discussion/      # Forum diskusi
│   │           ├── ai-chat/         # AI chat assistant
│   │           ├── ai-key/          # Manajemen API key AI
│   │           ├── ai-generate/     # Bulk AI generation
│   │           ├── notification/    # Notifikasi
│   │           └── admin/           # Admin panel & settings
│   │
│   └── web/                         # Frontend (Next.js Web App)
│       └── src/
│           ├── app/
│           │   ├── layout.tsx       # Root layout (providers, font, metadata)
│           │   ├── page.tsx         # Landing page
│           │   ├── globals.css      # Global styles (Tailwind)
│           │   ├── (auth)/          # Halaman autentikasi (login, register, dll.)
│           │   ├── (app)/           # Halaman aplikasi utama (dengan sidebar)
│           │   └── join/            # Halaman join team via invite
│           ├── components/
│           │   ├── ui/              # Komponen UI dasar (shadcn/ui)
│           │   ├── layout/          # Komponen layout (sidebar, header)
│           │   ├── shared/          # Komponen reusable
│           │   ├── landing/         # Komponen landing page
│           │   └── icons/           # Custom icons
│           ├── hooks/               # Custom React hooks
│           ├── stores/              # Zustand state stores
│           └── lib/                 # Utility functions & API client
│
├── packages/
│   ├── types/                       # Shared TypeScript type definitions
│   │   └── src/
│   │       ├── index.ts             # Re-export semua tipe
│   │       ├── user.ts, team.ts, task.ts, ai.ts, brainstorm.ts,
│   │       │   diagram.ts, calendar.ts, note.ts, sprint.ts, api.ts
│   │
│   └── validators/                  # Shared Zod validation schemas
│       └── src/
│           ├── index.ts             # Re-export semua validator
│           ├── auth.ts, team.ts, task.ts, ai-key.ts, brainstorm.ts,
│           │   diagram.ts, calendar.ts, sprint.ts, note.ts, discussion.ts
│
├── docker-compose.yml               # PostgreSQL 16 + Redis 7
├── turbo.json                       # Turborepo pipeline config
├── pnpm-workspace.yaml              # pnpm workspace config
└── package.json                     # Root package.json
```

---

### Penjelasan Layer

| Layer | Direktori | Deskripsi |
|-------|-----------|-----------|
| **Backend** | `apps/api/` | Server Fastify yang menangani semua API REST, autentikasi, bisnis logic, dan integrasi AI |
| **Frontend** | `apps/web/` | Aplikasi Next.js (App Router) yang menampilkan UI dan berinteraksi dengan API |
| **Shared Types** | `packages/types/` | Definisi tipe TypeScript yang digunakan di frontend dan backend |
| **Shared Validators** | `packages/validators/` | Schema validasi Zod untuk input data di frontend dan backend |
| **Infrastructure** | `docker-compose.yml` | Konfigurasi container PostgreSQL dan Redis |

---

[← Sebelumnya: Library & Framework](./02-library-framework.md) | [Selanjutnya: Fitur Aplikasi →](./04-fitur-aplikasi.md)
