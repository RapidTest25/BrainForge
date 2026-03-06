# Activity Diagram — Manajemen Task

[← Kembali ke Daftar Diagram](../README.md#diagram-uml-file-terpisah)

---

```mermaid
flowchart TD
    A([Mulai]) --> B[Buka halaman Tasks]
    B --> C[Tampilkan Kanban Board<br/>atau List View]
    
    C --> D{Aksi pengguna?}
    
    D -->|Buat Task| E[Klik New Task]
    E --> F[Isi: Judul, Deskripsi,<br/>Status, Prioritas,<br/>Assignee, Label, Tanggal]
    F --> G[Validasi input via Zod]
    G -->|Valid| H[Simpan task ke database]
    H --> I[Tampilkan task di board]
    I --> C
    G -->|Tidak Valid| J[Tampilkan error]
    J --> F
    
    D -->|Drag and Drop| K[Seret task ke kolom lain]
    K --> L[Update status dan orderIndex<br/>via API]
    L --> C
    
    D -->|Edit Task| M[Buka detail panel]
    M --> N[Edit field yang diinginkan]
    N --> O[Simpan perubahan]
    O --> P[Log perubahan di TaskActivity]
    P --> C
    
    D -->|Komentar| Q[Tulis komentar pada task]
    Q --> R[Simpan komentar ke DB]
    R --> C
    
    D -->|Assign| S[Pilih anggota untuk ditugaskan]
    S --> T[Update TaskAssignee]
    T --> C
    
    D -->|Label| U[Tambah/hapus label pada task]
    U --> V[Update TaskLabel]
    V --> C
    
    D -->|Hapus Task| W[Konfirmasi penghapusan]
    W --> X[Hapus task dari database]
    X --> C
    
    D -->|Selesai| Y([Selesai])
```

---

### Penjelasan Alur

| Aksi | Deskripsi |
|------|-----------|
| **Buat Task** | Pengguna mengklik tombol "New Task", mengisi form (judul, deskripsi, status, prioritas, assignee, label, tanggal), validasi via Zod, dan simpan ke database. |
| **Drag & Drop** | Pengguna menyeret task antar kolom di Kanban board. Status dan urutan (orderIndex) diupdate via API. |
| **Edit Task** | Membuka panel detail task, mengedit field yang diinginkan. Setiap perubahan dicatat di TaskActivity. |
| **Komentar** | Menulis komentar pada task, disimpan sebagai TaskComment. |
| **Assign** | Menugaskan satu atau lebih anggota tim ke task via TaskAssignee. |
| **Label** | Menambahkan atau menghapus label warna pada task melalui relasi TaskLabel. |
| **Hapus** | Menghapus task setelah konfirmasi. |

---

[← Kembali ke Daftar Diagram](../README.md#diagram-uml-file-terpisah)
