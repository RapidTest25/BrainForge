# Contributing to BrainForge

Thank you for your interest in contributing to BrainForge! This document explains the guidelines, what you **can** and **cannot** do, and how to get started.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [What You CAN Do](#what-you-can-do)
- [What You CANNOT Do](#what-you-cannot-do)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Making Changes](#making-changes)
- [Coding Standards](#coding-standards)
- [Commit Convention](#commit-convention)
- [Pull Request Process](#pull-request-process)
- [Reporting Bugs](#reporting-bugs)
- [Requesting Features](#requesting-features)
- [Security Issues](#security-issues)

---

## Code of Conduct

By participating in this project, you agree to:

- Be **respectful** and constructive in all interactions
- Welcome newcomers and help them get started
- Focus on constructive feedback, not personal criticism
- Respect different viewpoints and experiences
- Accept responsibility and apologize for mistakes
- **Zero tolerance** for harassment, discrimination, or abusive behavior

---

## What You CAN Do

Under the [MIT License](LICENSE), you are free to:

### ✅ Use
- Use BrainForge for **any purpose** — personal, educational, or commercial
- Self-host on your own servers or cloud infrastructure
- Use it internally within your organization or company

### ✅ Modify
- Fork and modify the source code to fit your needs
- Create custom themes, plugins, or integrations
- Remove or replace features you don't need
- Add new features specific to your workflow

### ✅ Distribute
- Share the software with others
- Include BrainForge (or parts of it) in your own projects
- Create and sell products or services built on BrainForge
- Offer hosted versions of BrainForge as a service

### ✅ Contribute
- Submit bug reports and feature requests
- Open pull requests with code changes
- Improve documentation, translations, or examples
- Help other users in issues and discussions
- Write blog posts, tutorials, or videos about BrainForge

---

## What You CANNOT Do

### ❌ Remove License
- You **must** include the MIT License and copyright notice in all copies or substantial portions of the software

### ❌ Claim Sole Ownership
- You cannot claim you are the original/sole author of BrainForge if distributing a modified version
- Give proper attribution back to the original project

### ❌ Hold Contributors Liable
- The software is provided "AS IS" — contributors are not liable for any damages arising from use

### ❌ Use Trademarks Without Permission
- The "BrainForge" name and logo are identifiers of this project
- Do not use them in ways that imply endorsement of your product/service by the BrainForge project without permission

### ❌ Submit Malicious Code
- Do not submit code that intentionally introduces vulnerabilities, backdoors, data collection, or malware
- Do not submit code that sends user data to external services without explicit user consent

### ❌ Break User Privacy
- Do not add analytics, tracking, or telemetry without transparent opt-in
- AI API keys are user-owned (BYOK) — do not add code that shares, logs, or stores them insecurely

---

## Getting Started

### Prerequisites

| Tool       | Version  | Purpose                  |
|------------|----------|--------------------------|
| Node.js    | >= 22    | Runtime                  |
| pnpm       | >= 9     | Package manager          |
| PostgreSQL | >= 15    | Database                 |
| Git        | Latest   | Version control          |

### Fork & Clone

```bash
# 1. Fork the repo on GitHub (click the Fork button)

# 2. Clone your fork
git clone https://github.com/YOUR_USERNAME/BrainForge.git
cd BrainForge

# 3. Add upstream remote
git remote add upstream https://github.com/RapidTest25/BrainForge.git

# 4. Install dependencies
pnpm install
```

---

## Development Setup

### Environment Configuration

```bash
# Copy the example environment file
cp apps/api/.env.example apps/api/.env
```

Edit `apps/api/.env` with your local settings:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/brainforge"
JWT_SECRET="your-development-secret-min-32-chars!!"
JWT_REFRESH_SECRET="your-refresh-secret-min-32-chars!!"
```

### Database Setup

```bash
# Push the Prisma schema to your database
pnpm db:push

# Generate the Prisma client
cd apps/api && npx prisma generate && cd ../..

# (Optional) Seed with sample data
pnpm db:seed
```

### Start Development

```bash
# Start all services (web + api) concurrently
pnpm dev
```

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:4000
- **Prisma Studio**: Run `pnpm db:studio` for database GUI

---

## Project Structure

```
BrainForge/
├── apps/
│   ├── web/                    # Next.js 15 frontend
│   │   ├── src/
│   │   │   ├── app/            # App Router pages
│   │   │   ├── components/     # React components
│   │   │   ├── stores/         # Zustand stores
│   │   │   ├── hooks/          # Custom hooks
│   │   │   └── lib/            # Utilities
│   │   └── package.json
│   └── api/                    # Fastify backend
│       ├── src/
│       │   ├── modules/        # Feature modules (auth, tasks, etc.)
│       │   ├── middleware/      # Auth, validation middleware
│       │   ├── utils/           # Shared utilities
│       │   └── app.ts           # App entry, route registrations
│       ├── prisma/
│       │   └── schema.prisma   # Database schema
│       └── package.json
├── packages/
│   ├── types/                  # Shared TypeScript types
│   └── validators/             # Shared Zod schemas
├── turbo.json                  # Turborepo config
├── pnpm-workspace.yaml         # Workspace config
└── package.json                # Root scripts
```

---

## Making Changes

### Branch Naming

Create a branch from `main` with a descriptive name:

```bash
git checkout main
git pull upstream main
git checkout -b <type>/<short-description>
```

**Branch types:**
- `feat/` — New features (e.g., `feat/task-subtasks`)
- `fix/` — Bug fixes (e.g., `fix/calendar-timezone`)
- `docs/` — Documentation changes (e.g., `docs/api-endpoints`)
- `refactor/` — Code refactoring (e.g., `refactor/auth-middleware`)
- `test/` — Adding tests (e.g., `test/task-service`)
- `chore/` — Tooling/config (e.g., `chore/update-deps`)

---

## Coding Standards

### General

- **TypeScript** everywhere — no `any` unless absolutely necessary
- Use **Zod** for validation (shared schemas in `packages/validators`)
- Always handle errors properly — no silent catches
- Write code that is self-documenting; add comments for complex logic

### Frontend (Next.js)

- Use App Router conventions (page.tsx, layout.tsx)
- Components go in `src/components/` organized by feature
- State: **Zustand** stores for client state, **TanStack Query** for server state
- Styling: **Tailwind CSS** utility classes — no custom CSS unless necessary
- Use existing UI components from `src/components/ui/` (shadcn/ui based)

### Backend (Fastify)

- Each feature module lives in `src/modules/<feature>/`
  - `<feature>.routes.ts` — Route definitions
  - `<feature>.service.ts` — Business logic
  - `<feature>.schema.ts` — Zod request/response schemas
- Use the `authenticate` middleware for protected routes
- Use Prisma for all database operations — no raw SQL unless strictly needed
- Always pass `teamId` for team-scoped resources

### Database

- Schema changes go in `prisma/schema.prisma`
- Run `npx prisma db push` for development, `npx prisma migrate dev` for production
- Add indexes for frequently queried fields
- Use cascade deletes carefully

---

## Commit Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

[optional body]
[optional footer]
```

**Types:**

| Type       | Description                                  |
|------------|----------------------------------------------|
| `feat`     | New feature                                  |
| `fix`      | Bug fix                                      |
| `docs`     | Documentation only                           |
| `style`    | Formatting, no code change                   |
| `refactor` | Code restructuring, no feature/fix           |
| `perf`     | Performance improvement                      |
| `test`     | Adding or updating tests                     |
| `chore`    | Build, tooling, dependency updates           |

**Examples:**

```
feat(tasks): add subtask support
fix(calendar): correct timezone offset in event display
docs(readme): add self-hosting section
refactor(auth): simplify token refresh logic
```

---

## Pull Request Process

1. **Ensure your code works** — test locally before opening a PR
2. **Update documentation** if your change affects behavior, APIs, or setup
3. **Keep PRs focused** — one feature or fix per PR (avoid mega-PRs)
4. **Fill out the PR template** with:
   - What changed and why
   - How to test
   - Screenshots/videos for UI changes
5. **Respond to review comments** promptly
6. **Squash commits** if requested (we prefer clean histories)

### PR Checklist

- [ ] Code follows the project's coding standards
- [ ] No TypeScript errors (`pnpm build` passes)
- [ ] No new lint warnings
- [ ] Tested locally on both frontend and backend
- [ ] Documentation updated if applicable
- [ ] Commit messages follow conventional commits
- [ ] Branch is up-to-date with `main`

---

## Reporting Bugs

Open a [GitHub Issue](https://github.com/RapidTest25/BrainForge/issues/new) with:

1. **Title**: Short, descriptive summary
2. **Environment**: OS, browser, Node.js version
3. **Steps to Reproduce**: Numbered steps to trigger the bug
4. **Expected Behavior**: What should happen
5. **Actual Behavior**: What actually happens
6. **Screenshots/Logs**: If applicable

---

## Requesting Features

Open a [GitHub Issue](https://github.com/RapidTest25/BrainForge/issues/new) with label `enhancement`:

1. **Problem**: What problem does this solve?
2. **Proposed Solution**: How should it work?
3. **Alternatives**: Other approaches you considered
4. **Context**: Any additional information, mockups, or references

---

## Security Issues

**Do NOT open a public issue for security vulnerabilities.**

See [SECURITY.md](SECURITY.md) for responsible disclosure instructions.

---

## Recognition

All contributors are recognized in this project. Whether you submit a one-line typo fix or a major feature, your contribution matters and is appreciated.

---

Thank you for contributing to BrainForge! 🧠
