# Activity Diagram — Login

[← Kembali ke Daftar Diagram](../README.md#diagram-uml-file-terpisah)

---

```mermaid
flowchart TD
    A([Mulai]) --> B[Pengguna mengakses halaman Login]
    B --> C{Metode Login}
    
    C -->|Email/Password| D[Mengisi Email dan Password]
    D --> E{Validasi input}
    E -->|Tidak Valid| F[Tampilkan error]
    F --> D
    E -->|Valid| G[Cari user berdasarkan email]
    G --> H{User ditemukan?}
    H -->|Tidak| I[Tampilkan error:<br/>Kredensial tidak valid]
    I --> D
    H -->|Ya| J{User di-ban?}
    J -->|Ya| K[Tampilkan error:<br/>Akun diblokir]
    J -->|Tidak| L[Verifikasi password<br/>bcrypt compare]
    L --> M{Password cocok?}
    M -->|Tidak| I
    M -->|Ya| N[Generate JWT tokens]
    
    C -->|Google OAuth| O[Klik Login with Google]
    O --> P[Google mengembalikan credential]
    P --> Q[Verifikasi credential<br/>via Google API]
    Q --> R{Credential valid?}
    R -->|Tidak| S[Tampilkan error Google]
    R -->|Ya| T{User dengan Google ID<br/>sudah ada?}
    T -->|Ya| U{User di-ban?}
    U -->|Ya| K
    U -->|Tidak| N
    T -->|Tidak| V[Buat user baru<br/>dari data Google]
    V --> N
    
    N --> W[Simpan tokens dan user<br/>di localStorage]
    W --> X[Update Zustand store]
    X --> Y[Redirect ke Dashboard]
    Y --> Z([Selesai])
```

---

### Penjelasan Alur

#### Login via Email/Password
| Langkah | Deskripsi |
|---------|-----------|
| 1 | Pengguna memilih login via email/password |
| 2 | Mengisi email dan password di form |
| 3 | Validasi client-side dan server-side via Zod |
| 4 | Server mencari user berdasarkan email di database |
| 5 | Jika tidak ditemukan, tampilkan error |
| 6 | Cek status ban pengguna |
| 7 | Verifikasi password menggunakan bcrypt compare |
| 8 | Jika cocok, generate JWT tokens |

#### Login via Google OAuth
| Langkah | Deskripsi |
|---------|-----------|
| 1 | Pengguna klik tombol "Login with Google" |
| 2 | Google menampilkan popup dan mengembalikan credential |
| 3 | Backend memverifikasi credential via Google Auth Library |
| 4 | Cek apakah user sudah terdaftar (via Google ID) |
| 5 | Jika belum, buat user baru dari data Google |
| 6 | Cek status ban, lalu generate JWT tokens |

---

[← Kembali ke Daftar Diagram](../README.md#diagram-uml-file-terpisah)
