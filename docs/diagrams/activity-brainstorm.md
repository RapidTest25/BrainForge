# Activity Diagram — Brainstorm AI

[← Kembali ke Daftar Diagram](../README.md#diagram-uml-file-terpisah)

---

```mermaid
flowchart TD
    A([Mulai]) --> B[Buka halaman Brainstorm]
    B --> C{Buat sesi baru<br/>atau buka yang ada?}
    
    C -->|Buat Baru| D[Isi judul dan pilih mode<br/>Brainstorm/Debate/<br/>Analysis/Freeform]
    D --> E[Simpan sesi ke database]
    E --> F[Masuk ke halaman sesi]
    
    C -->|Buka Existing| F
    
    F --> G[Join Socket.IO room<br/>brainstorm session]
    G --> H[Tampilkan chat + whiteboard/flow]
    
    H --> I{Aksi pengguna?}
    
    I -->|Kirim Pesan| J[Tulis pesan di chat]
    J --> K[Simpan pesan user ke DB]
    K --> L[Kirim pesan + context<br/>ke AI Provider]
    L --> M[AI memproses<br/>dan streaming response]
    M --> N[Simpan response AI ke DB]
    N --> O[Tampilkan response di chat]
    O --> H
    
    I -->|Gambar Whiteboard| P[Menggambar di canvas]
    P --> Q[Broadcast via Socket.IO<br/>ke anggota lain]
    Q --> H
    
    I -->|Edit Flow| R[Tambah/edit node dan edge]
    R --> S[Broadcast perubahan<br/>via Socket.IO]
    S --> H
    
    I -->|Upload File| T[Pilih file]
    T --> U[Upload ke server]
    U --> V[Simpan URL di pesan]
    V --> H
    
    I -->|Pin Pesan| W[Pin/Unpin pesan penting]
    W --> H
    
    I -->|Ekspor| X[Ekspor sesi ke Markdown]
    X --> H
    
    I -->|Selesai| Y[Leave Socket.IO room]
    Y --> Z([Selesai])
```

---

### Penjelasan Alur

| Langkah | Deskripsi |
|---------|-----------|
| 1 | Pengguna membuka halaman `/brainstorm` |
| 2 | Memilih untuk membuat sesi baru atau membuka sesi yang sudah ada |
| 3 | Untuk sesi baru: isi judul dan pilih mode (Brainstorm, Debate, Analysis, Freeform) |
| 4 | Saat masuk ke sesi, client bergabung ke Socket.IO room untuk kolaborasi real-time |
| 5 | Pengguna dapat melakukan berbagai aksi: mengirim pesan, menggambar whiteboard, mengedit flow, upload file, pin pesan, atau ekspor |
| 6 | Saat mengirim pesan, AI memproses dan menghasilkan respons yang disimpan ke database |
| 7 | Aksi whiteboard dan flow di-broadcast ke anggota lain via Socket.IO |
| 8 | Saat selesai, client keluar dari Socket.IO room |

---

[← Kembali ke Daftar Diagram](../README.md#diagram-uml-file-terpisah)
