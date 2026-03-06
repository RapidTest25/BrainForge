# Deployment Diagram

[← Kembali ke Daftar Diagram](../README.md#diagram-uml-file-terpisah)

---

```mermaid
graph TB
    subgraph "User Device"
        Browser["Web Browser<br/>Chrome, Firefox, Safari"]
    end

    subgraph "Application Server"
        subgraph "Docker Host / VPS"
            subgraph "Node.js Runtime v22+"
                NextJS["Next.js App<br/>Port 3000<br/>Frontend"]
                Fastify["Fastify Server<br/>Port 3001<br/>Backend API + Socket.IO"]
            end
            
            subgraph "Docker Compose"
                Postgres["PostgreSQL 16<br/>Port 5433:5432<br/>postgres_data volume"]
                RedisContainer["Redis 7<br/>Port 6380:6379<br/>redis_data volume"]
            end

            Uploads["uploads/<br/>File Storage"]
        end
    end

    subgraph "External Services"
        Google["Google OAuth<br/>Authentication"]
        AIAPIs["AI Provider APIs<br/>OpenAI, Claude, Gemini,<br/>Groq, OpenRouter, Copilot"]
    end

    Browser -->|"HTTP/HTTPS<br/>Port 3000"| NextJS
    Browser -->|"HTTP/REST<br/>Port 3001"| Fastify
    Browser -->|"WebSocket<br/>Port 3001"| Fastify
    
    NextJS -.->|"SSR requests"| Fastify
    Fastify -->|"Prisma Client<br/>TCP 5432"| Postgres
    Fastify -->|"ioredis<br/>TCP 6379"| RedisContainer
    Fastify -->|"fs read/write"| Uploads
    
    Fastify -->|"HTTPS"| AIAPIs
    Fastify -->|"HTTPS"| Google
    Browser -->|"OAuth flow"| Google
```

---

### Penjelasan Node

| Node | Teknologi | Port | Deskripsi |
|------|-----------|------|-----------|
| **Browser** | Chrome/Firefox/Safari | - | Client-side rendering + REST API calls + WebSocket |
| **Next.js App** | Next.js 15 | 3000 | Frontend application dengan SSR capability |
| **Fastify Server** | Fastify 5 + Socket.IO 4 | 3001 | Backend API server + real-time WebSocket server |
| **PostgreSQL** | PostgreSQL 16 Alpine | 5433 (host) → 5432 (container) | Database utama, data persisten via Docker volume |
| **Redis** | Redis 7 Alpine | 6380 (host) → 6379 (container) | Token blacklist, data persisten via Docker volume |
| **File Storage** | Local filesystem | - | Folder `uploads/` untuk file yang diunggah |
| **Google OAuth** | Google API | - | Layanan autentikasi Google |
| **AI Provider APIs** | OpenAI, Anthropic, Google, Groq, OpenRouter | - | Layanan AI eksternal (BYOK) |

---

### Komunikasi Antar Node

| Dari | Ke | Protokol | Deskripsi |
|------|----|----------|-----------|
| Browser | Next.js | HTTP/HTTPS | Memuat halaman web |
| Browser | Fastify | HTTP/REST | API request (CRUD data) |
| Browser | Fastify | WebSocket | Real-time (brainstorm collaboration) |
| Browser | Google | HTTPS | OAuth flow (popup login) |
| Fastify | PostgreSQL | TCP | Query database via Prisma Client |
| Fastify | Redis | TCP | Token blacklist check/set via ioredis |
| Fastify | AI APIs | HTTPS | Request ke AI provider (BYOK keys) |
| Fastify | Google | HTTPS | Verifikasi Google credential |
| Fastify | File Storage | Filesystem | Baca/tulis file upload |

---

[← Kembali ke Daftar Diagram](../README.md#diagram-uml-file-terpisah)
