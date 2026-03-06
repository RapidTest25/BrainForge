# Component Diagram

[← Kembali ke Daftar Diagram](../README.md#diagram-uml-file-terpisah)

---

```mermaid
graph TB
    subgraph "Client Layer - Browser"
        subgraph "Next.js Frontend - Port 3000"
            Pages["Pages<br/>App Router"]
            Components["Components<br/>UI, Layout, Shared"]
            Stores["Zustand Stores<br/>Auth, Team, Project"]
            Hooks["Custom Hooks<br/>useBrainstormSocket"]
            APIClient["API Client<br/>fetch + auto refresh"]
            ReactQuery["React Query<br/>Server State Cache"]
            SocketClient["Socket.IO Client"]
        end
    end

    subgraph "Server Layer"
        subgraph "Fastify API Server - Port 3001"
            Routes["Routes<br/>15 Module Routes"]
            Middleware["Middleware<br/>Auth, Team, Admin"]
            Services["Services<br/>Business Logic"]
            AIServiceComp["AI Service<br/>Provider Factory"]
            SocketServer["Socket.IO Server<br/>/brainstorm namespace"]
            Lib["Lib<br/>JWT, Encryption,<br/>Errors, Prisma, Redis"]
        end
    end

    subgraph "AI Providers - External"
        OpenAI["OpenAI API"]
        Claude["Anthropic API"]
        Gemini["Google Gemini API"]
        Groq["Groq API"]
        OpenRouter["OpenRouter API"]
        Copilot["GitHub Copilot<br/>Azure"]
    end

    subgraph "Data Layer"
        PostgreSQL["PostgreSQL 16<br/>26 Tables"]
        Redis["Redis 7<br/>Token Blacklist"]
        FileStorage["File Storage<br/>uploads/"]
    end

    subgraph "Shared Packages"
        Types["@brainforge/types<br/>TypeScript Definitions"]
        Validators["@brainforge/validators<br/>Zod Schemas"]
    end

    Pages --> Components
    Pages --> Hooks
    Components --> Stores
    Components --> ReactQuery
    Hooks --> SocketClient
    ReactQuery --> APIClient

    APIClient --> Routes
    SocketClient --> SocketServer
    
    Routes --> Middleware
    Middleware --> Services
    Services --> AIServiceComp
    Services --> Lib
    
    AIServiceComp --> OpenAI
    AIServiceComp --> Claude
    AIServiceComp --> Gemini
    AIServiceComp --> Groq
    AIServiceComp --> OpenRouter
    AIServiceComp --> Copilot

    Lib --> PostgreSQL
    Lib --> Redis
    Services --> FileStorage

    Types -.-> Pages
    Types -.-> Routes
    Validators -.-> Pages
    Validators -.-> Routes
```

---

### Penjelasan Komponen

| Layer | Komponen | Deskripsi |
|-------|----------|-----------|
| **Client** | Pages | Halaman-halaman Next.js (App Router) |
| **Client** | Components | Komponen React (UI primitives, layout, shared) |
| **Client** | Zustand Stores | State management client-side (Auth, Team, Project) |
| **Client** | React Query | Server state cache dan data fetching |
| **Client** | API Client | HTTP client dengan fitur auto token refresh |
| **Client** | Socket.IO Client | Client untuk komunikasi real-time |
| **Server** | Routes | 15 modul route (auth, task, brainstorm, dll.) |
| **Server** | Middleware | Auth guard, team guard, admin guard |
| **Server** | Services | Business logic per modul |
| **Server** | AI Service | Factory pattern untuk memilih AI provider |
| **Server** | Lib | Utility: JWT, encryption, Prisma, Redis, errors |
| **Data** | PostgreSQL | Database relasional utama (26 tabel) |
| **Data** | Redis | Cache untuk token blacklist |
| **Data** | File Storage | Penyimpanan file upload lokal |
| **Shared** | Types | Definisi tipe TypeScript bersama |
| **Shared** | Validators | Schema validasi Zod bersama |

---

[← Kembali ke Daftar Diagram](../README.md#diagram-uml-file-terpisah)
