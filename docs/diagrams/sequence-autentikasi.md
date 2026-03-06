# Sequence Diagram — Autentikasi

[← Kembali ke Daftar Diagram](../README.md#diagram-uml-file-terpisah)

---

```mermaid
sequenceDiagram
    actor User as Pengguna
    participant Web as Next.js Frontend
    participant Store as Zustand Store
    participant API as Fastify API
    participant DB as PostgreSQL
    participant Redis as Redis

    Note over User,Redis: REGISTRASI
    User->>Web: Isi form registrasi
    Web->>Web: Validasi client-side (Zod)
    Web->>API: POST /api/auth/register
    API->>API: Validasi server-side (Zod)
    API->>DB: Cek email duplikat
    DB-->>API: Tidak ada duplikat
    API->>API: Hash password (bcrypt)
    API->>DB: INSERT User
    DB-->>API: User created
    API->>API: Generate JWT (access 15m + refresh 7d)
    API-->>Web: { user, tokens }
    Web->>Store: setAuth(user, tokens)
    Store->>Store: Simpan ke localStorage
    Web-->>User: Redirect ke /dashboard
```

---

```mermaid
sequenceDiagram
    actor User as Pengguna
    participant Web as Next.js Frontend
    participant Store as Zustand Store
    participant API as Fastify API
    participant DB as PostgreSQL
    participant Redis as Redis

    Note over User,Redis: LOGIN
    User->>Web: Isi email dan password
    Web->>API: POST /api/auth/login
    API->>DB: SELECT user WHERE email
    DB-->>API: User found
    API->>API: bcrypt.compare(password, hash)
    API->>API: Cek user.isBanned
    API->>API: Generate JWT tokens
    API-->>Web: { user, tokens }
    Web->>Store: setAuth(user, tokens)
    Web-->>User: Redirect ke /dashboard
```

---

```mermaid
sequenceDiagram
    participant Web as Next.js Frontend
    participant Store as Zustand Store
    participant API as Fastify API

    Note over Web,API: TOKEN REFRESH
    Web->>API: GET /api/... (expired token)
    API-->>Web: 401 Unauthorized
    Web->>API: POST /api/auth/refresh (refresh token)
    API->>API: Verify refresh token
    API->>API: Generate new access token
    API-->>Web: { accessToken }
    Web->>Store: Update token
    Web->>API: Retry original request
```

---

```mermaid
sequenceDiagram
    actor User as Pengguna
    participant Web as Next.js Frontend
    participant Store as Zustand Store
    participant API as Fastify API
    participant Redis as Redis

    Note over User,Redis: LOGOUT
    User->>Web: Klik Logout
    Web->>API: POST /api/auth/logout
    API->>Redis: SET blacklist:token (TTL)
    API-->>Web: Success
    Web->>Store: clearAuth()
    Store->>Store: Hapus localStorage
    Web-->>User: Redirect ke /login
```

---

### Penjelasan

| Alur | Deskripsi |
|------|-----------|
| **Registrasi** | Pengguna mengisi form → validasi ganda (client & server) → cek duplikat email → hash password → simpan user → generate JWT → simpan di client → redirect ke dashboard |
| **Login** | Isi kredensial → cari user di DB → verifikasi password → cek ban status → generate JWT → simpan di client → redirect |
| **Token Refresh** | Request gagal 401 → client kirim refresh token → server verifikasi → generate access token baru → retry original request |
| **Logout** | Klik logout → blacklist token di Redis → hapus data client → redirect ke login |

---

[← Kembali ke Daftar Diagram](../README.md#diagram-uml-file-terpisah)
