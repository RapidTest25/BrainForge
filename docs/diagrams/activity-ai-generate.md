# Activity Diagram — AI Generate (Bulk Generation)

[← Kembali ke Daftar Diagram](../README.md#diagram-uml-file-terpisah)

---

> Fitur AI Generate memungkinkan pengguna membuat **Tasks, Brainstorm Session, Notes, dan Goals** sekaligus dari satu prompt menggunakan AI.

```mermaid
flowchart TD
    A([Mulai]) --> B[Pengguna klik tombol<br/>AI Generate di Header]
    B --> C[Dialog AI Generate terbuka]
    C --> D[Isi prompt deskripsi proyek/kebutuhan]
    
    D --> E[Pilih AI Provider<br/>OpenAI / Claude / Gemini /<br/>Groq / OpenRouter / Copilot]
    E --> F[Pilih Model AI<br/>contoh: gpt-4o, claude-sonnet-4]
    F --> G[Centang tipe yang ingin di-generate]
    
    G --> H{Tipe yang dipilih?}
    H -->|Tasks| H1["☑ Tasks<br/>(3-8 task)"]
    H -->|Brainstorm| H2["☑ Brainstorm<br/>(1 sesi + pesan awal)"]
    H -->|Notes| H3["☑ Notes<br/>(1-3 catatan)"]
    H -->|Goals| H4["☑ Goals<br/>(3-6 SMART goals)"]
    
    H1 --> I[Klik Generate]
    H2 --> I
    H3 --> I
    H4 --> I
    
    I --> J["POST /api/teams/:teamId/ai-generate"]
    J --> K{Validasi input}
    K -->|Tidak Valid| L[Tampilkan error:<br/>prompt, provider, model wajib diisi]
    L --> D
    
    K -->|Valid| M[Bangun System Prompt<br/>berdasarkan tipe yang dipilih]
    M --> N[Ambil API Key user<br/>dari database lalu dekripsi<br/>AES-256-GCM]
    N --> O{API Key valid?}
    O -->|Tidak| P[Error: No valid API key<br/>found for provider]
    P --> Q[Arahkan ke Settings > AI Keys]
    
    O -->|Ya| R[Kirim request ke AI Provider<br/>System Prompt + User Prompt]
    R --> S[AI menghasilkan response<br/>dalam format JSON]
    
    S --> T{Parse JSON berhasil?}
    T -->|Tidak| U[Repair Attempt:<br/>Minta AI memperbaiki<br/>JSON yang rusak]
    U --> V{Repair berhasil?}
    V -->|Tidak| W[Error 422:<br/>AI returned invalid JSON]
    V -->|Ya| X[JSON berhasil di-parse]
    T -->|Ya| X
    
    X --> Y{Proses setiap tipe}
    
    Y -->|Tasks| Y1[Validasi enum:<br/>Priority dan Status]
    Y1 --> Y2[Simpan tasks ke database<br/>dengan projectId opsional]
    
    Y -->|Brainstorm| Y3[Validasi mode:<br/>BRAINSTORM/DEBATE/etc]
    Y3 --> Y4[Buat BrainstormSession +<br/>pesan awal ASSISTANT]
    
    Y -->|Notes| Y5[Simpan notes<br/>ke database]
    
    Y -->|Goals| Y6[Validasi status + progress]
    Y6 --> Y7[Simpan goals dengan<br/>dueDate dari AI]
    
    Y2 --> Z[Log penggunaan AI<br/>tokens, cost, provider]
    Y4 --> Z
    Y5 --> Z
    Y7 --> Z
    
    Z --> AA[Kembalikan response:<br/>generated data + summary]
    AA --> AB[Frontend menampilkan<br/>hasil generate + invalidate cache]
    AB --> AC[Dialog ditutup,<br/>data muncul di halaman]
    AC --> AD([Selesai])
```

---

### Penjelasan Alur

| Langkah | Deskripsi |
|---------|-----------|
| 1 | Pengguna membuka dialog AI Generate melalui tombol di header aplikasi |
| 2 | Mengisi prompt yang mendeskripsikan apa yang ingin di-generate |
| 3 | Memilih AI provider (6 pilihan) dan model spesifik |
| 4 | Mencentang tipe konten yang ingin di-generate (bisa multiple): Tasks, Brainstorm, Notes, Goals |
| 5 | Frontend mengirim request ke endpoint `POST /api/teams/:teamId/ai-generate` |
| 6 | Server memvalidasi input dan membangun system prompt yang strict berdasarkan tipe yang dipilih |
| 7 | Server mengambil dan mendekripsi API key pengguna (BYOK — AES-256-GCM) |
| 8 | Request dikirim ke AI provider yang dipilih |
| 9 | AI menghasilkan response dalam format JSON strict |
| 10 | Jika JSON gagal di-parse, dilakukan **repair attempt** (minta AI memperbaiki output-nya sendiri) |
| 11 | JSON yang berhasil di-parse diproses per tipe: setiap item divalidasi enum-nya lalu disimpan ke database |
| 12 | Penggunaan AI di-log (token count, estimated cost) |
| 13 | Response berisi data yang di-generate + summary jumlah item yang berhasil dibuat |

### Detail Tipe Generate

| Tipe | Output AI | Validasi | Disimpan Sebagai |
|------|-----------|----------|-----------------|
| **Tasks** | 3-8 task dengan title, description, priority, status | Priority: URGENT/HIGH/MEDIUM/LOW, Status: default TODO | `Task` model di database |
| **Brainstorm** | 1 sesi dengan title, mode, dan initialMessage | Mode: BRAINSTORM/DEBATE/ANALYSIS/FREEFORM | `BrainstormSession` + `BrainstormMessage` awal |
| **Notes** | 1-3 catatan dengan title dan content terstruktur | Validasi title max 200 chars | `Note` model di database |
| **Goals** | 3-6 SMART goals dengan title, description, status, progress, dueDate | Status: NOT_STARTED, Progress: 0-100, DueDate: ISO 8601 | `Goal` model di database |

### Fitur Khusus

- **System Prompt Dinamis:** System prompt dibangun secara dinamis berdasarkan tipe yang dipilih, hanya menyertakan schema yang relevan
- **JSON Repair:** Jika AI menghasilkan JSON yang rusak, sistem otomatis meminta AI memperbaikinya (repair attempt)
- **Markdown Fence Stripping:** Parser otomatis menghapus code fences (` ```json `) dari output AI
- **Enum Safety:** Setiap nilai enum dari AI divalidasi terhadap set yang valid, dengan fallback ke default value

---

[← Kembali ke Daftar Diagram](../README.md#diagram-uml-file-terpisah)
