# BrainForge 🧠

**AI-Powered Project Management Workspace**

BrainForge is an all-in-one, open-source project management platform that combines tasks, AI brainstorming, diagrams, sprints, calendar, and notes into a single workspace. Bring your own API keys (BYOK) for AI features.

---

## ✨ Features

- **Tasks** — Kanban board & list view with priorities, statuses, assignments, and 3-dot action menus
- **AI Brainstorm** — Interactive AI chat sessions with modes: Brainstorm, Debate, Analysis, Freeform
- **Diagrams** — Create flowcharts, ERDs, architecture diagrams, mind maps manually or with AI generation
- **Sprints** — Plan sprints manually or with AI-generated tasks and milestones
- **Calendar** — Unified calendar view for tasks, events, and sprint milestones
- **Notes** — Rich text editor with AI summarization and expansion
- **Goals** — Track high-level objectives and link them to tasks
- **Team Collaboration** — Invite members via email or shareable invite link
- **Notifications** — Real-time notification dropdown in navbar
- **BYOK AI** — Supports OpenAI, Google Gemini, Anthropic, and more
- **Documentation** — Built-in docs page for feature reference

## 🏗️ Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 15, React 19, TailwindCSS, Radix UI, TanStack Query |
| Backend | Fastify, Prisma ORM, PostgreSQL |
| AI | Multi-provider (OpenAI, Gemini, Anthropic) via BYOK |
| Monorepo | pnpm workspaces, Turborepo |
| Auth | JWT (access + refresh tokens), bcrypt |
| Validation | Zod (shared validators) |

## 📁 Project Structure

```
BrainForge/
├── apps/
│   ├── web/          # Next.js frontend (port 3000)
│   └── api/          # Fastify backend (port 4000)
├── packages/
│   ├── types/        # Shared TypeScript types
│   └── validators/   # Shared Zod validation schemas
├── project_plan.md
└── README.md
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- pnpm 8+
- PostgreSQL 15+

### Installation

```bash
# Clone the repository
git clone https://github.com/RapidTest25/BrainForge.git
cd BrainForge

# Install dependencies
pnpm install

# Set up environment variables
cp apps/api/.env.example apps/api/.env
# Edit .env with your database URL and JWT secrets

# Push database schema
cd apps/api
npx prisma db push
npx prisma generate
cd ../..

# Start development servers
pnpm dev
```

### Environment Variables

Create `apps/api/.env` with:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/brainforge"
JWT_SECRET="your-jwt-secret"
JWT_REFRESH_SECRET="your-refresh-secret"
```

## 🔧 Development

```bash
# Run all apps in dev mode
pnpm dev

# Run only frontend
pnpm --filter web dev

# Run only backend
pnpm --filter api dev

# Build all
pnpm build
```

## 📝 API Overview

All API routes are prefixed with `/api`.

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register a new user |
| POST | `/api/auth/login` | Login |
| GET | `/api/teams` | Get user's teams |
| POST | `/api/teams/:teamId/tasks` | Create task |
| POST | `/api/teams/:teamId/brainstorm` | Create brainstorm session |
| POST | `/api/teams/:teamId/diagrams` | Create diagram |
| POST | `/api/teams/:teamId/diagrams/ai-generate` | AI generate diagram |
| POST | `/api/teams/:teamId/sprints` | Create sprint |
| POST | `/api/teams/:teamId/invite-link` | Generate invite link |
| POST | `/api/teams/join/:token` | Accept invite |

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing`)
5. Open a Pull Request

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

**Built with ❤️ by the BrainForge team**
