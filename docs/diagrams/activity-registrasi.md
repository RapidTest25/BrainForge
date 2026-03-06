# Activity Diagram — Registrasi

[← Kembali ke Daftar Diagram](../README.md#diagram-uml-file-terpisah)

---

```mermaid
flowchart TD
    A([Mulai]) --> B[Pengguna mengakses halaman Register]
    B --> C[Mengisi form: Nama, Email, Password]
    C --> D{Validasi input<br/>Zod schema}
    D -->|Tidak Valid| E[Tampilkan pesan error]
    E --> C
    D -->|Valid| F{Email sudah<br/>terdaftar?}
    F -->|Ya| G[Tampilkan error:<br/>Email sudah digunakan]
    G --> C
    F -->|Tidak| H[Hash password<br/>bcrypt - 12 rounds]
    H --> I[Simpan User ke database]
    I --> J[Generate JWT tokens<br/>Access: 15min, Refresh: 7d]
    J --> K[Simpan tokens di localStorage]
    K --> L[Redirect ke Dashboard]
    L --> M([Selesai])
```

---

### Penjelasan Alur

| Langkah | Deskripsi |
|---------|-----------|
| 1 | Pengguna membuka halaman `/register` |
| 2 | Mengisi formulir registrasi: nama lengkap, alamat email, dan password |
| 3 | Input divalidasi menggunakan Zod schema (shared validators) di client-side dan server-side |
| 4 | Jika validasi gagal, pesan error ditampilkan dan pengguna mengisi ulang |
| 5 | Server memeriksa apakah email sudah digunakan pengguna lain |
| 6 | Jika email duplikat, tampilkan pesan error |
| 7 | Password di-hash menggunakan bcrypt dengan 12 salt rounds |
| 8 | Data User baru disimpan ke database PostgreSQL |
| 9 | Server menggenerate JWT access token (15 menit) dan refresh token (7 hari) |
| 10 | Token disimpan di localStorage browser (`brainforge_tokens`) |
| 11 | Pengguna diarahkan ke halaman Dashboard |

---

[← Kembali ke Daftar Diagram](../README.md#diagram-uml-file-terpisah)
