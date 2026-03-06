# 12. Infrastruktur & Deployment

[← Kembali ke Daftar Isi](./README.md)

---

## 12.1 Persyaratan Sistem

| Komponen | Minimum | Direkomendasikan |
|----------|---------|-----------------|
| **Node.js** | ≥ 22.0.0 | Latest LTS |
| **pnpm** | ≥ 9.0.0 | 9.15.0 |
| **PostgreSQL** | 15+ | 16 |
| **Redis** | 7+ | 7-alpine |
| **RAM** | 2 GB | 4 GB |
| **Disk** | 10 GB | 20 GB |

---

## 12.2 Environment Variables

| Variable | Deskripsi |
|----------|-----------|
| `DATABASE_URL` | Connection string PostgreSQL |
| `REDIS_URL` | Connection string Redis |
| `JWT_SECRET` | Secret key untuk JWT signing |
| `ENCRYPTION_KEY` | Key untuk enkripsi AES-256-GCM (API keys) |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID |
| `CORS_ORIGIN` | Allowed CORS origins |

---

## 12.3 Docker Compose

```yaml
services:
  postgres:
    image: postgres:16-alpine
    ports: ['5433:5432']
    volumes: [postgres_data:/var/lib/postgresql/data]

  redis:
    image: redis:7-alpine
    ports: ['6380:6379']
    volumes: [redis_data:/data]
```

---

## 12.4 Monorepo Build Pipeline (Turborepo)

| Command | Fungsi |
|---------|--------|
| `pnpm dev` | Menjalankan semua app dalam mode development |
| `pnpm build` | Build semua packages dan apps |
| `pnpm lint` | Linting semua packages |
| `pnpm db:migrate` | Menjalankan database migration (Prisma) |
| `pnpm db:push` | Push schema ke database |
| `pnpm db:studio` | Membuka Prisma Studio (GUI database) |
| `pnpm db:seed` | Menjalankan database seeder |

---

## 12.5 File Konfigurasi Penting

| File | Deskripsi |
|------|-----------|
| `package.json` (root) | Konfigurasi monorepo & scripts |
| `pnpm-workspace.yaml` | Definisi workspace pnpm |
| `turbo.json` | Pipeline build Turborepo |
| `docker-compose.yml` | Orkestrasi container PostgreSQL & Redis |
| `apps/api/prisma/schema.prisma` | Schema database lengkap (26 model) |
| `apps/api/tsconfig.json` | Konfigurasi TypeScript backend |
| `apps/web/tsconfig.json` | Konfigurasi TypeScript frontend |
| `apps/web/next.config.mjs` | Konfigurasi Next.js |
| `apps/web/postcss.config.mjs` | Konfigurasi PostCSS + Tailwind |

---

[← Sebelumnya: State Management](./11-state-management.md) | [Lihat Diagram UML →](./diagrams/)
