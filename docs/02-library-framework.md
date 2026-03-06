# 2. Library & Framework yang Digunakan

[← Kembali ke Daftar Isi](./README.md)

---

## 2.1 Backend (apps/api)

| Library | Versi | Fungsi |
|---------|-------|--------|
| `fastify` | ^5.0.0 | Web framework utama (server HTTP) |
| `@fastify/cors` | ^10.0.0 | Middleware Cross-Origin Resource Sharing |
| `@fastify/helmet` | ^12.0.0 | Middleware keamanan HTTP header |
| `@fastify/multipart` | ^9.0.0 | Penanganan file upload (multipart/form-data) |
| `@fastify/rate-limit` | ^10.0.0 | Pembatasan request (rate limiting) |
| `@fastify/websocket` | ^11.2.0 | Dukungan WebSocket di Fastify |
| `@prisma/client` | ^6.0.0 | Database client (ORM) |
| `prisma` | ^6.0.0 | CLI & engine Prisma ORM |
| `ioredis` | ^5.4.0 | Redis client untuk Node.js |
| `jose` | ^5.6.0 | Library JWT (JSON Web Token) |
| `bcryptjs` | ^2.4.3 | Hashing password (bcrypt) |
| `zod` | ^3.23.8 | Validasi schema data |
| `pino` | ^9.3.0 | High-performance logger |
| `pino-pretty` | ^11.2.0 | Formatter output log (development) |
| `socket.io` | ^4.8.3 | Server Socket.IO untuk real-time |
| `google-auth-library` | ^10.6.1 | Google OAuth authentication |
| `@anthropic-ai/sdk` | ^0.30.0 | SDK Anthropic Claude AI |
| `@google/generative-ai` | ^0.21.0 | SDK Google Gemini AI |
| `groq-sdk` | ^0.7.0 | SDK Groq AI (LPU inference) |
| `openai` | ^4.56.0 | SDK OpenAI (GPT) + digunakan untuk Copilot/Azure |
| `tsx` | ^4.17.0 | TypeScript executor (development) |
| `vitest` | ^2.0.0 | Testing framework |

---

## 2.2 Frontend (apps/web)

| Library | Versi | Fungsi |
|---------|-------|--------|
| `next` | ^15.0.0 | Framework React (App Router, SSR, routing) |
| `react` | ^19.0.0 | Library UI utama |
| `react-dom` | ^19.0.0 | React DOM renderer |
| `tailwindcss` | ^4.0.0 | Utility-first CSS framework |
| `@tailwindcss/postcss` | ^4.0.0 | PostCSS plugin untuk Tailwind |
| `@tanstack/react-query` | ^5.28.0 | Server state management & data fetching |
| `zustand` | ^5.0.0 | Client state management |
| `framer-motion` | ^12.34.3 | Library animasi |
| `@radix-ui/react-avatar` | ^1.1.0 | Komponen avatar (accessible) |
| `@radix-ui/react-dialog` | ^1.1.0 | Komponen modal dialog |
| `@radix-ui/react-dropdown-menu` | ^2.1.0 | Komponen dropdown menu |
| `@radix-ui/react-select` | ^2.1.0 | Komponen select/dropdown |
| `@radix-ui/react-slot` | ^1.1.0 | Komponen slot (composition pattern) |
| `@radix-ui/react-tabs` | ^1.1.0 | Komponen tab |
| `@react-oauth/google` | ^0.13.4 | Google OAuth untuk React |
| `@hello-pangea/dnd` | ^18.0.1 | Drag and drop library (fork react-beautiful-dnd) |
| `class-variance-authority` | ^0.7.0 | Utility untuk variant-based styling |
| `clsx` | ^2.1.0 | Utility untuk conditional CSS class |
| `tailwind-merge` | ^2.2.0 | Merge Tailwind CSS classes tanpa konflik |
| `date-fns` | ^3.6.0 | Utility untuk manipulasi tanggal |
| `lucide-react` | ^0.468.0 | Icon library |
| `react-icons` | ^5.5.0 | Icon library tambahan |
| `socket.io-client` | ^4.8.3 | Client Socket.IO |
| `sonner` | ^1.4.0 | Toast notification library |
| `next-themes` | ^0.4.6 | Dark/Light theme support untuk Next.js |

---

## 2.3 Shared Packages

| Package | Fungsi |
|---------|--------|
| `@brainforge/types` | Definisi tipe TypeScript yang digunakan bersama (frontend & backend) |
| `@brainforge/validators` | Schema validasi Zod yang digunakan bersama |

---

## 2.4 Development Tools

| Tool | Versi | Fungsi |
|------|-------|--------|
| `typescript` | ^5.4.5 | Compiler TypeScript |
| `turbo` (Turborepo) | ^2.3.0 | Monorepo build system |
| `pnpm` | 9.15.0 | Package manager (workspace support) |
| `prettier` | ^3.2.5 | Code formatter |
| `Docker Compose` | 3.9 | Container orchestration |

---

[← Sebelumnya: Gambaran Umum](./01-gambaran-umum.md) | [Selanjutnya: Struktur Proyek →](./03-struktur-proyek.md)
