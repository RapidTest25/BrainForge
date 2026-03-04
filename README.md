<p align="center">
  <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License" />
  <img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg" alt="PRs Welcome" />
  <img src="https://img.shields.io/badge/node-%3E%3D22-brightgreen.svg" alt="Node >= 22" />
  <img src="https://img.shields.io/badge/pnpm-%3E%3D9-orange.svg" alt="pnpm >= 9" />
  <img src="https://img.shields.io/badge/TypeScript-5.4-blue.svg" alt="TypeScript" />
</p>

<h1 align="center">🧠 BrainForge</h1>

<p align="center">
  <strong>AI-Powered Project Management Workspace</strong><br/>
  Open source · Self-hostable · BYOK (Bring Your Own Key)
</p>

<p align="center">
  <a href="#-features">Features</a> ·
  <a href="#-quick-start">Quick Start</a> ·
  <a href="#%EF%B8%8F-self-hosting">Self-Hosting</a> ·
  <a href="#-api-reference">API Reference</a> ·
  <a href="#-contributing">Contributing</a> ·
  <a href="#-license">License</a>
</p>

---

## What is BrainForge?

BrainForge is a **free, open-source, all-in-one project management platform** that combines tasks, AI brainstorming, diagrams, sprints, calendar, and notes into a single workspace. It's designed for developers, students, and small teams who want powerful project management **without vendor lock-in**.

**Key principles:**

- **BYOK (Bring Your Own Key)** — You supply your own AI API keys. No subscription needed. AI calls go directly from your server to providers.
- **Self-hostable** — Deploy on your own infrastructure. Your data stays yours.
- **MIT Licensed** — Use it for anything. No restrictions.
- **Privacy-first** — No analytics, no tracking, no telemetry.

---

## ✨ Features

### Core Modules

| Module | Description |
|--------|-------------|
| **📋 Tasks** | Kanban board & list view with drag-and-drop, priorities (Urgent/High/Medium/Low), statuses (Backlog/Todo/In Progress/Review/Done), assignments, labels, dependencies, comments, activity log, and time tracking |
| **💬 AI Brainstorm** | Interactive AI chat with 4 modes: Brainstorm, Debate, Analysis, and Freeform. Multi-provider support. Conversation history and file attachments |
| **🔀 Diagrams** | Visual diagram editor supporting 6 types: Flowcharts, ERDs, Mind Maps, Architecture Diagrams, Sequence Diagrams, and Component Diagrams. AI-powered generation from natural language prompts. Zoom/pan canvas, undo/redo history, and keyboard shortcuts |
| **⚡ Sprints** | Sprint planning with AI-generated tasks, milestones, team allocation, and deadline management |
| **📅 Calendar** | Unified calendar showing tasks, custom events, and sprint milestones in one view |
| **📝 Notes** | Rich text editor with AI-powered summarization, expansion, and full version history |
| **🎯 Goals** | High-level objective tracking with progress monitoring, linked to tasks |
| **💬 Discussions** | Team discussion threads with categories, pinning, and replies |
| **🤖 AI Chat** | Standalone AI conversations (separate from brainstorm sessions) |

### Platform Features

| Feature | Description |
|---------|-------------|
| **🔐 Authentication** | Email/password + Google OAuth. JWT access + refresh tokens with automatic rotation |
| **👥 Teams** | Create teams, invite members via email or shareable link. Role-based access (Owner/Admin/Member). Per-project team members — each project gets its own independent team |
| **📁 Projects** | Organize work into projects within teams. Custom colors and icons |
| **🔔 Notifications** | Real-time in-app notification system |
| **🌓 Dark Mode** | Full dark/light theme support |
| **🔑 BYOK AI** | Supports OpenRouter (10 free models included), OpenAI, Google Gemini, Anthropic Claude, Groq, GitHub Copilot. One OpenRouter key gives access to 100+ models |
| **⚙️ Admin Panel** | System settings, version management, user administration |
| **📤 File Uploads** | Attach files to brainstorm messages and other entities |

---

## 🏗️ Tech Stack

| Layer | Technology | Version |
|-------|------------|---------|
| **Frontend** | Next.js (App Router) | 15 |
| **UI** | React | 19 |
| **Styling** | Tailwind CSS | 4 |
| **UI Primitives** | Radix UI | Latest |
| **Animations** | Framer Motion | 12 |
| **Server State** | TanStack React Query | 5 |
| **Client State** | Zustand | 5 |
| **Backend** | Fastify | 5 |
| **ORM** | Prisma | 6 |
| **Database** | PostgreSQL | 15+ |
| **Cache** | Redis (optional) | 7+ |
| **Real-time** | Socket.IO | 4 |
| **Auth** | JWT (jose) + bcryptjs | — |
| **Validation** | Zod (shared schemas) | 3 |
| **AI SDKs** | openai, @google/generative-ai, @anthropic-ai/sdk, groq-sdk, OpenRouter API | Latest |
| **Monorepo** | Turborepo + pnpm workspaces | — |
| **Language** | TypeScript (end-to-end) | 5.4 |

---

## 📁 Project Structure

```
BrainForge/
├── apps/
│   ├── web/                        # Next.js 15 frontend (port 3000)
│   │   ├── src/
│   │   │   ├── app/                # App Router — pages & layouts
│   │   │   │   ├── (app)/          # Authenticated app routes
│   │   │   │   │   ├── dashboard/  # Main dashboard
│   │   │   │   │   ├── tasks/      # Task management (board + list)
│   │   │   │   │   ├── brainstorm/ # AI brainstorm sessions
│   │   │   │   │   ├── diagrams/   # Diagram editor
│   │   │   │   │   ├── sprints/    # Sprint planning
│   │   │   │   │   ├── calendar/   # Calendar view
│   │   │   │   │   ├── notes/      # Notes editor
│   │   │   │   │   ├── goals/      # Goals tracking
│   │   │   │   │   ├── discussions/# Team discussions
│   │   │   │   │   ├── ai-chat/    # Standalone AI chat
│   │   │   │   │   ├── settings/   # User settings
│   │   │   │   │   └── admin/      # Admin panel
│   │   │   │   ├── login/          # Auth pages
│   │   │   │   ├── register/
│   │   │   │   └── page.tsx        # Landing page
│   │   │   ├── components/
│   │   │   │   ├── ui/             # Base UI components (shadcn/ui)
│   │   │   │   ├── landing/        # Landing page components
│   │   │   │   └── ...             # Feature-specific components
│   │   │   ├── stores/             # Zustand state management
│   │   │   ├── hooks/              # Custom React hooks
│   │   │   └── lib/                # Utility functions
│   │   └── package.json
│   │
│   └── api/                        # Fastify backend (port 4000)
│       ├── src/
│       │   ├── modules/            # Feature modules
│       │   │   ├── auth/           # Authentication (register, login, OAuth)
│       │   │   ├── team/           # Team management & invitations
│       │   │   ├── task/           # Task CRUD, board operations
│       │   │   ├── brainstorm/     # AI brainstorm sessions
│       │   │   ├── diagram/        # Diagram CRUD + AI generation
│       │   │   ├── sprint/         # Sprint planning
│       │   │   ├── calendar/       # Calendar events
│       │   │   ├── note/           # Notes + version history
│       │   │   ├── goal/           # Goals management
│       │   │   ├── discussion/     # Discussion threads
│       │   │   ├── ai-chat/       # Standalone AI chats
│       │   │   ├── notification/   # Notification system
│       │   │   ├── project/        # Project management
│       │   │   ├── admin/          # Admin operations
│       │   │   └── settings/       # System settings
│       │   ├── middleware/         # Auth, validation middleware
│       │   ├── utils/              # Shared utilities
│       │   └── app.ts             # Entry point, route registrations
│       ├── prisma/
│       │   └── schema.prisma      # Database schema (29 models, 11 enums)
│       ├── .env.example           # Environment template
│       └── package.json
│
├── packages/
│   ├── types/                     # Shared TypeScript type definitions
│   └── validators/                # Shared Zod validation schemas
│
├── turbo.json                     # Turborepo task configuration
├── pnpm-workspace.yaml            # pnpm workspace definition
├── LICENSE                        # MIT License
├── CONTRIBUTING.md                # Contribution guidelines
├── SECURITY.md                    # Security policy
└── README.md                      # This file
```

---

## 🚀 Quick Start

### Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| **Node.js** | >= 22 | [nodejs.org](https://nodejs.org/) |
| **pnpm** | >= 9 | `npm install -g pnpm` |
| **PostgreSQL** | >= 15 | [postgresql.org](https://www.postgresql.org/download/) |
| **Git** | Latest | [git-scm.com](https://git-scm.com/) |

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/RapidTest25/BrainForge.git
cd BrainForge

# 2. Install all dependencies
pnpm install

# 3. Configure environment
cp apps/api/.env.example apps/api/.env
```

Edit `apps/api/.env` with your settings:

```env
# Required
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/brainforge"
JWT_SECRET="your-strong-random-secret-at-least-32-characters"
JWT_REFRESH_SECRET="another-strong-random-secret-at-least-32-characters"

# Optional
GOOGLE_CLIENT_ID=""          # For Google OAuth
FRONTEND_URL="http://localhost:3000"
REDIS_URL=""                 # For rate limiting
```

```bash
# 4. Create PostgreSQL database
createdb brainforge

# 5. Push database schema
pnpm db:push

# 6. Generate Prisma client
cd apps/api && npx prisma generate && cd ../..

# 7. Start development servers
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) — the app is ready!

---

## 🏠 Self-Hosting

### Option 1: Bare Metal / VPS

```bash
# Build for production
pnpm build

# Start the API (production)
cd apps/api && node dist/server.js

# Start the frontend (production)
cd apps/web && pnpm start
```

Use a reverse proxy (nginx / Caddy) to route:
- `yourdomain.com` → `localhost:3000` (frontend)
- `yourdomain.com/api` → `localhost:4000` (API)

### Option 2: Docker (Recommended)

```bash
# Coming soon — Docker Compose setup
# docker-compose up -d
```

### Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | ✅ | — | PostgreSQL connection string |
| `JWT_SECRET` | ✅ | — | JWT signing secret (min 32 chars) |
| `JWT_REFRESH_SECRET` | ✅ | — | Refresh token secret (min 32 chars) |
| `JWT_EXPIRES_IN` | ❌ | `15m` | Access token TTL |
| `JWT_REFRESH_EXPIRES_IN` | ❌ | `7d` | Refresh token TTL |
| `PORT` | ❌ | `4000` | API server port |
| `FRONTEND_URL` | ❌ | `http://localhost:3000` | Frontend URL (CORS) |
| `GOOGLE_CLIENT_ID` | ❌ | — | Google OAuth client ID |
| `REDIS_URL` | ❌ | — | Redis connection (rate limiting) |
| `UPLOAD_DIR` | ❌ | `./uploads` | File upload directory |
| `MAX_FILE_SIZE` | ❌ | `10485760` | Max file size (bytes) |

---

## 🔧 Development

### Available Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start all services in development mode |
| `pnpm build` | Build all packages and apps |
| `pnpm lint` | Run linting across all packages |
| `pnpm format` | Format code with Prettier |
| `pnpm test` | Run tests |
| `pnpm db:push` | Push Prisma schema to database |
| `pnpm db:migrate` | Run database migrations |
| `pnpm db:studio` | Open Prisma Studio (database GUI) |
| `pnpm db:seed` | Seed the database |
| `pnpm --filter web dev` | Start only the frontend |
| `pnpm --filter api dev` | Start only the backend |

### Database Operations

```bash
# View/edit data in browser GUI
pnpm db:studio

# Reset database (⚠️ destroys all data)
cd apps/api && npx prisma db push --force-reset

# Create a migration (for production)
cd apps/api && npx prisma migrate dev --name your_migration_name
```

---

## 📡 API Reference

All API routes are prefixed with `/api`. Protected routes require a `Bearer` token in the `Authorization` header.

### Authentication

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/auth/register` | ❌ | Register with email/password |
| `POST` | `/api/auth/login` | ❌ | Login, returns access + refresh tokens |
| `POST` | `/api/auth/refresh` | ❌ | Refresh access token |
| `POST` | `/api/auth/google` | ❌ | Google OAuth login |
| `GET` | `/api/auth/me` | ✅ | Get current user profile |

### Teams

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/teams` | ✅ | List user's teams |
| `POST` | `/api/teams` | ✅ | Create a team |
| `GET` | `/api/teams/:teamId` | ✅ | Get team details |
| `PUT` | `/api/teams/:teamId` | ✅ | Update team |
| `DELETE` | `/api/teams/:teamId` | ✅ | Delete team (owner only) |
| `GET` | `/api/teams/:teamId/members` | ✅ | List team members |
| `POST` | `/api/teams/:teamId/invite` | ✅ | Invite member by email |
| `POST` | `/api/teams/:teamId/invite-link` | ✅ | Generate shareable invite link |
| `POST` | `/api/teams/join/:token` | ✅ | Join team via invite link |

### Tasks

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/teams/:teamId/tasks` | ✅ | List tasks (with filters) |
| `POST` | `/api/teams/:teamId/tasks` | ✅ | Create a task |
| `GET` | `/api/teams/:teamId/tasks/:taskId` | ✅ | Get task details |
| `PUT` | `/api/teams/:teamId/tasks/:taskId` | ✅ | Update task |
| `DELETE` | `/api/teams/:teamId/tasks/:taskId` | ✅ | Delete task |
| `GET` | `/api/users/my-tasks` | ✅ | Get tasks assigned to current user |

### AI Brainstorm

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/teams/:teamId/brainstorm` | ✅ | List brainstorm sessions |
| `POST` | `/api/teams/:teamId/brainstorm` | ✅ | Create session |
| `POST` | `/api/teams/:teamId/brainstorm/:id/messages` | ✅ | Send message (triggers AI response) |

### Diagrams

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/teams/:teamId/diagrams` | ✅ | List diagrams |
| `POST` | `/api/teams/:teamId/diagrams` | ✅ | Create diagram |
| `PUT` | `/api/teams/:teamId/diagrams/:id` | ✅ | Update diagram |
| `DELETE` | `/api/teams/:teamId/diagrams/:id` | ✅ | Delete diagram |
| `POST` | `/api/teams/:teamId/diagrams/ai-generate` | ✅ | AI-generate diagram from prompt |

### Other Endpoints

| Module | Prefix | Operations |
|--------|--------|------------|
| **Sprints** | `/api/teams/:teamId/sprints` | CRUD + AI generation |
| **Calendar** | `/api/teams/:teamId/calendar` | CRUD events |
| **Notes** | `/api/teams/:teamId/notes` | CRUD + version history |
| **Goals** | `/api/teams/:teamId/goals` | CRUD + progress |
| **Discussions** | `/api/teams/:teamId/discussions` | CRUD + replies |
| **AI Chat** | `/api/teams/:teamId/ai-chats` | CRUD + messages |
| **Notifications** | `/api/teams/:teamId/notifications` | List + mark read |
| **Projects** | `/api/teams/:teamId/projects` | CRUD + per-project member management |
| **AI Keys** | `/api/ai/keys` | CRUD user API keys |

### Public Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Health check |
| `GET` | `/api/ai/models` | List available AI models |
| `GET` | `/api/app/version` | Get app version |

---

## 🔐 AI Provider Setup (BYOK)

BrainForge does **not** require server-side AI keys. Each user configures their own keys in **Settings → AI Keys**.

### Supported Providers

| Provider | Models | Get API Key |
|----------|--------|-------------|
| **OpenRouter** ⭐ | 10 free models + GPT-4, Claude, Gemini, 100+ models — one key for all | [openrouter.ai](https://openrouter.ai/keys) |
| **GitHub Copilot** ⭐ | GPT-4o, Claude Sonnet — free with GitHub account | [github.com/settings/copilot](https://github.com/settings/copilot) |
| **OpenAI** | GPT-4o, GPT-4.1, GPT-3.5 Turbo | [platform.openai.com](https://platform.openai.com/api-keys) |
| **Google Gemini** | Gemini 2.5 Pro, Gemini 2.5 Flash | [aistudio.google.com](https://aistudio.google.com/app/apikey) |
| **Anthropic** | Claude Opus 4, Claude Sonnet 4 | [console.anthropic.com](https://console.anthropic.com/) |
| **Groq** | Llama 4, Mixtral | [console.groq.com](https://console.groq.com/) |

### How it works

1. User adds their API key in Settings
2. Keys are **encrypted** before storing in the database
3. When an AI feature is used, the key is decrypted server-side and used for that single request
6. **OpenRouter users** get 10 free AI models (Gemini Flash, Llama 4, DeepSeek V3/R1, Qwen3, and more) at no cost
4. Keys are **never** logged, cached, or shared between users
5. User can delete/rotate keys at any time

---

## 🗄️ Database Schema

The database has **29 models** and **11 enums**. Key models:

| Model | Description |
|-------|-------------|
| `User` | Users with auth credentials, admin flag |
| `Team` | Organizational units owned by users |
| `TeamMember` | User ↔ Team with roles (Owner/Admin/Member) |
| `Project` | Workspace projects within teams |
| `ProjectMember` | User ↔ Project with roles (Owner/Admin/Member) |
| `Task` | Tasks with status, priority, ordering, time tracking |
| `BrainstormSession` | AI brainstorm sessions with mode + messages |
| `Diagram` | Diagrams stored as JSON nodes + edges |
| `SprintPlan` | Sprint plans with AI-generated data |
| `CalendarEvent` | Events linked to tasks/sprints |
| `Note` | Rich text notes with version history |
| `Goal` | Objectives with progress tracking |
| `Discussion` | Team discussion threads |
| `AiChat` | Standalone AI conversations |
| `UserAIKey` | Encrypted BYOK API keys |
| `SystemSetting` | Key-value system configuration |
| `AIUsageLog` | Token + cost tracking per AI call |

View the full schema: [`apps/api/prisma/schema.prisma`](apps/api/prisma/schema.prisma)

---

## 🤝 Contributing

We welcome contributions of all kinds! Please read our comprehensive [Contributing Guide](CONTRIBUTING.md) before getting started.

### Quick summary

```bash
# Fork → Clone → Branch → Code → Test → PR
git checkout -b feat/your-feature
# Make your changes...
git commit -m "feat(scope): description"
git push origin feat/your-feature
# Open a Pull Request on GitHub
```

### What you can do
- ✅ Use, modify, and distribute freely (MIT License)
- ✅ Submit bug reports and feature requests
- ✅ Open PRs with code, docs, or translations
- ✅ Build commercial products on top of BrainForge

### What you cannot do
- ❌ Remove the MIT license notice
- ❌ Submit malicious code or backdoors
- ❌ Add tracking/telemetry without transparent opt-in
- ❌ Use the "BrainForge" name to imply endorsement

See [CONTRIBUTING.md](CONTRIBUTING.md) for full details.

---

## 🔒 Security

For security vulnerabilities, **do NOT open a public issue**. Please follow our [Security Policy](SECURITY.md) for responsible disclosure.

Key security features:
- Passwords hashed with bcrypt
- JWT with short-lived access tokens + refresh rotation
- AI API keys encrypted at rest
- Built-in rate limiting
- CORS protection
- Helmet security headers

---

## 📄 License

BrainForge is **open source** under the [MIT License](LICENSE).

```
MIT License — Copyright (c) 2025-2026 BrainForge Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files...
```

You are free to use, modify, and distribute this software for any purpose, including commercial use. See the full [LICENSE](LICENSE) file.

---

## 🙏 Acknowledgments

Built with amazing open-source tools:

- [Next.js](https://nextjs.org/) — React framework
- [Fastify](https://fastify.dev/) — Fast Node.js web framework
- [Prisma](https://www.prisma.io/) — Next-gen ORM
- [Tailwind CSS](https://tailwindcss.com/) — Utility-first CSS
- [Radix UI](https://www.radix-ui.com/) — Headless UI components
- [Framer Motion](https://www.framer.com/motion/) — Animation library
- [Turborepo](https://turbo.build/) — Monorepo build system
- [Zod](https://zod.dev/) — TypeScript validation

---

<p align="center">
  <strong>Built with ❤️ by the BrainForge community</strong><br/>
  <a href="https://github.com/RapidTest25/BrainForge">GitHub</a> ·
  <a href="https://github.com/RapidTest25/BrainForge/issues">Issues</a> ·
  <a href="https://github.com/RapidTest25/BrainForge/blob/main/CONTRIBUTING.md">Contributing</a>
</p>