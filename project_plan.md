# 🧠 BrainForge — AI Team Workspace

> AI collaborative workspace untuk developer dan mahasiswa untuk brainstorming, planning,
> dan membangun project — menggunakan AI key milik mereka sendiri (BYOK).
> **100% Free** — no paywall, no freemium.

---

# 🎯 Vision

BrainForge membantu tim kecil, developer, dan mahasiswa untuk:

* 💡 Brainstorm ide project dengan AI (multi-provider)
* 📋 Mengelola tasks dengan ClickUp-inspired UI (List/Board/Calendar/Timeline)
* 📅 Merencanakan sprint secara cerdas dengan AI
* 🎨 Visualisasi database & arsitektur (draw.io-like diagrams)
* 📅 Project calendar untuk track semua deadlines
* 👥 Berkolaborasi dalam satu workspace
* 🔑 Menggunakan AI key pribadi (no vendor lock)

---

# 🧑‍💻 Target Users

## Primary

* Developer team kecil
* Mahasiswa IT
* Indie hacker
* Junior–mid developer

## Secondary

* Startup early stage
* Bootcamp students
* Technical founder

---

# 💰 Monetization

**Free for all features** — semua fitur gratis.
BrainForge menggunakan model BYOK (Bring Your Own Key), sehingga biaya AI ditanggung
langsung oleh user melalui API key pribadi mereka.

---

# 🚀 Core Differentiators

* ✅ Bring Your Own AI Key (BYOK) — 6+ AI providers
* ✅ Team-first AI workspace
* ✅ ClickUp-inspired multi-view task management
* ✅ AI Brainstorm Modes (bukan chat biasa)
* ✅ Visual Flow Diagrams (draw.io-like, AI-generated)
* ✅ Smart Sprint Planner
* ✅ Project Calendar
* ✅ Lightweight but powerful

---

# 🧩 Features

## 1️⃣ Authentication & User

* Register / Login
* JWT dual-token auth (access 15m + refresh 7d)
* Profile management
* Secure session

---

## 2️⃣ Team Workspace

### Capabilities

* Create team
* Invite member (email invitation link)
* Role management: owner / admin / member
* Team switching
* Permission guard (RBAC)

---

## 3️⃣ 🔑 Bring Your Own AI Key (BYOK)

### Supported Providers

| Phase | Provider | Models |
|-------|------------|--------|
| MVP | **OpenAI** | gpt-4o, gpt-4o-mini |
| MVP | **Google Gemini** | gemini-2.0-flash, gemini-1.5-pro |
| MVP | **Anthropic Claude** | claude-3.5-sonnet, claude-3-haiku |
| Phase 2 | **Groq** | llama-3.1-70b, mixtral-8x7b |
| Phase 2 | **Mistral** | mistral-large, mistral-small |
| Phase 2 | **OpenRouter** | 100+ models |
| Phase 2 | **DeepSeek** | deepseek-chat, deepseek-coder |
| Phase 3 | **Ollama** | Local models (llama3, codellama) |

### Security

* AES-256-GCM encryption at rest
* Multiple keys per provider
* Active key selection
* Never exposed to frontend, never logged
* Key validation per provider

### AI Usage Tracking

* Token count per request
* Estimated cost (USD)
* Usage dashboard per user

---

## 4️⃣ 📋 Task Management (ClickUp-inspired)

### Multi-View System

| View | Description | Library |
|------|-------------|---------|
| 📋 **List** | Grouped table view (by status/priority/assignee) | Native |
| 📊 **Board** | Kanban drag-drop columns | @dnd-kit |
| 📅 **Calendar** | Tasks on calendar | FullCalendar |
| 📈 **Timeline** | Gantt-like horizontal bars | Custom/React |

### Task Features

* Title, description, status, priority
* Multiple assignees
* Labels/tags (color-coded)
* Due date & start date
* Time estimation & tracking
* Comments & activity log
* Task dependencies (for timeline view)
* Drag-drop reordering
* Filters, sorting, grouping
* Bulk operations

---

## 5️⃣ 🧠 AI Brainstorm Room (FLAGSHIP)

### Modes

* 💡 Idea Generator
* 🧱 Feature Breakdown
* 🗺️ Project Roadmap
* 🏗️ Architecture Lite

### Capabilities

* Context-aware system prompts per mode
* Multi-provider AI support
* SSE streaming responses
* Pin important messages
* Export to markdown
* Fork sessions
* Team presence (Socket.io)

---

## 6️⃣ 🎨 Visual Flow Diagrams (draw.io-like)

### Diagram Types

| Type | Tool | AI Generatable |
|------|------|:-:|
| ERD (Entity Relationship) | React Flow | ✅ |
| Flowchart | React Flow | ✅ |
| System Architecture | React Flow | ✅ |
| Sequence Diagram | React Flow | ✅ |
| Mind Map | React Flow | ✅ |
| User Flow | React Flow | ✅ |
| Freeform Sketch | Excalidraw | ❌ |

### AI Diagram Actions

* Generate diagram from text description
* Extend existing diagram
* Suggest relations
* Auto-layout optimization
* Export to Prisma schema, SQL, PNG, SVG, JSON

---

## 7️⃣ 📅 Project Calendar

* FullCalendar integration (Month/Week/Day)
* Shows: task due dates, sprint milestones, brainstorm sessions, custom events
* Drag to reschedule
* Click to create event
* Color-coded by type/priority

---

## 8️⃣ 📋 AI Smart Sprint Planner

### Input

* Project goal
* Deadline
* Team size

### Output

* Task breakdown (auto-creates tasks)
* Time estimation
* Suggested assignment
* Priority ordering
* Regenerate with feedback

---

## 9️⃣ ✍️ Collaborative Notes

* Tiptap rich text editor
* AI assist inline (improve, summarize, expand)
* Version history
* Per-team notes

---

# 🏗️ Tech Stack

## Frontend

| Technology | Version | Purpose |
|-----------|---------|---------|
| Next.js | 15+ | Framework (App Router, RSC) |
| React | 19+ | UI |
| TypeScript | 5.4+ | Language |
| Tailwind CSS | 4+ | Styling |
| shadcn/ui | latest | Component library |
| Zustand | 5+ | Global state |
| TanStack Query | 5+ | Data fetching & caching |
| React Flow | 12+ | Node-based diagrams |
| Excalidraw | latest | Freeform drawing |
| FullCalendar | 6+ | Calendar views |
| Tiptap | 2+ | Rich text editor |
| @dnd-kit | 6+ | Drag & drop (kanban) |
| Socket.io-client | 4+ | Realtime |
| Recharts | 2+ | Charts (AI usage dashboard) |

---

## Backend

| Technology | Version | Purpose |
|-----------|---------|---------|
| Node.js | 22 LTS | Runtime |
| Fastify | 5+ | HTTP Framework |
| TypeScript | 5.4+ | Language |
| Prisma | 6+ | ORM |
| PostgreSQL | 16+ | Database |
| Redis | 7+ | Cache, sessions, rate-limit |
| Socket.io | 4+ | WebSocket |
| Zod | 3+ | Validation |
| jose | 5+ | JWT |
| Pino | 9+ | Logger |

---

## AI SDKs

| SDK | Provider |
|-----|----------|
| openai | OpenAI |
| @anthropic-ai/sdk | Claude |
| @google/generative-ai | Gemini |
| groq-sdk | Groq |
| @mistralai/mistralai | Mistral |

---

## DevOps

* pnpm 9 + Turborepo (monorepo)
* Docker + Docker Compose
* ESLint + Prettier
* Husky + lint-staged
* GitHub Actions CI/CD
* Vitest (testing)

---

# 📁 Monorepo Structure

```
brainforge/
├── apps/
│   ├── web/                    # Next.js Frontend
│   └── api/                    # Fastify Backend (SEPARATE from web)
│
├── packages/
│   ├── ui/                     # Shared UI components
│   ├── types/                  # Shared TypeScript types
│   ├── validators/             # Shared Zod schemas
│   └── config/                 # Shared ESLint/TS/Prettier config
│
├── infra/
│   ├── docker/
│   └── nginx/
│
├── docs/
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

> **Note:** `apps/api` is a SIBLING to `apps/web`, not nested inside it.

---

# 🗄️ Database Schema

20+ models — see [brainstorming.md](brainstorming.md#part-9-complete-database-schema-prisma) for full Prisma schema.

### Core Models

| Model | Purpose |
|-------|---------|
| User | Account & profile |
| Team | Workspace container |
| TeamMember | User ↔ Team (with role) |
| TeamInvitation | Invite links |
| UserAIKey | Encrypted AI provider keys |
| Task | ClickUp-style task with metadata |
| TaskAssignee | Multiple assignees per task |
| Label / TaskLabel | Color-coded tags |
| TaskDependency | For timeline/gantt view |
| TaskComment | Discussions on tasks |
| TaskActivity | Audit log |
| BrainstormSession | AI brainstorm sessions |
| BrainstormMessage | Chat messages in session |
| SprintPlan | AI-generated sprint plans |
| Diagram | React Flow / Excalidraw data |
| CalendarEvent | Calendar entries |
| Note | Rich text notes |
| NoteHistory | Version history |
| AIUsageLog | Token/cost tracking |

---

# 🔐 Security Requirements

* AES-256-GCM encryption for AI keys
* Rate limiting (per-route, Redis-backed)
* Input validation (Zod schemas)
* Helmet security headers
* CORS strict origin
* No AI key in logs or client responses
* JWT dual-token (access + refresh)
* Token blacklist (Redis)
* RBAC per team

---

# 📊 API Endpoints

60+ endpoints across 10 modules — see [brainstorming.md](brainstorming.md#part-7-complete-api-endpoints) for complete list.

| Module | Endpoints |
|--------|-----------|
| Auth | 5 |
| User | 3 |
| Team | 12 |
| Tasks | 11 |
| AI Keys | 6 |
| Brainstorm | 8 |
| Diagrams | 6 |
| Calendar | 4 |
| Sprint | 5 |
| Notes | 6 |

---

# 🛣️ Development Phases

| Phase | Focus | Timeline |
|-------|-------|----------|
| 1 | Foundation & Infrastructure | Week 1-2 |
| 2 | Teams & BYOK | Week 3-4 |
| 3 | Task Management (ClickUp-style) | Week 5-7 |
| 4 | AI Brainstorm Room | Week 8-10 |
| 5 | Visual Diagrams | Week 11-13 |
| 6 | Calendar & Sprint | Week 14-15 |
| 7 | Notes & AI Assist | Week 16-17 |
| 8 | Polish & Launch | Week 18-20 |

Total: ~20 weeks

---

# 🔮 Future Expansion

* GitHub integration
* AI standup generator
* Workload prediction
* Vector memory per team
* Plugin system
* Multi-model routing
* Custom OpenAI-compatible endpoints
* Local AI (Ollama/LM Studio)
* Mobile app (React Native)

---

# 🧪 Testing Strategy

* Unit test (Vitest)
* Integration test (API routes)
* E2E (Playwright — future)

---

# 📈 Success Metrics

* Teams created
* Brainstorm sessions completed
* AI usage per user
* Sprint plans generated
* Diagrams created
* Tasks managed
* 7-day retention

---

# ❤️ Philosophy

> Not another AI chat.
> Built for builders.
> Context over gimmicks.
> Power without bloat.

---

**BrainForge — Think. Plan. Build. Visualize.**
