# Activity Diagram — BYOK (Bring Your Own Key) Management

[← Kembali ke Daftar Diagram](../README.md#diagram-uml-file-terpisah)

---

> BYOK (Bring Your Own Key) adalah model di mana pengguna menyediakan API key AI mereka sendiri. Key disimpan terenkripsi menggunakan **AES-256-GCM** dan tidak pernah dikirim kembali ke frontend.

```mermaid
flowchart TD
    A([Mulai]) --> B[Pengguna buka<br/>Settings > AI Keys]
    B --> C[Tampilkan daftar API keys<br/>tanpa menampilkan key asli]
    
    C --> D{Aksi pengguna?}
    
    D -->|Tambah Key Baru| E[Klik Add New Key]
    E --> F[Pilih Provider:<br/>OpenAI / Claude / Gemini /<br/>Groq / OpenRouter / Copilot]
    F --> G[Masukkan API Key<br/>dan Label opsional]
    G --> H[Klik Validate Key]
    
    H --> I["POST /api/ai/keys/validate<br/>{provider, apiKey}"]
    I --> J[Server mengirim test request<br/>ke API provider]
    J --> K{Key valid?}
    K -->|Tidak| L[Tampilkan error:<br/>Key tidak valid]
    L --> G
    
    K -->|Ya| M[Klik Save Key]
    M --> N["POST /api/ai/keys<br/>{provider, apiKey, label}"]
    N --> O{Provider sudah ada?}
    O -->|Ya| P[Error 409 Conflict:<br/>Key untuk provider ini<br/>sudah ada]
    P --> G
    O -->|Tidak| Q[Enkripsi API Key<br/>AES-256-GCM]
    Q --> R["Generate IV random 16 bytes"]
    R --> S["Encrypt: IV + AuthTag + CipherText"]
    S --> T["Simpan ke database<br/>(UserAIKey model)<br/>Format: iv:tag:encrypted"]
    T --> U[Tampilkan key baru<br/>di daftar - status: Active]
    U --> C
    
    D -->|Cek Validitas Key| V[Klik Check pada key]
    V --> W["POST /api/ai/keys/:keyId/check"]
    W --> X[Server ambil key dari DB<br/>dan dekripsi]
    X --> Y[Test request ke provider]
    Y --> Z{Masih valid?}
    Z -->|Ya| AA[Coba ambil info balance/credit]
    AA --> AB[Update status: Active<br/>Tampilkan sisa saldo jika tersedia]
    AB --> C
    Z -->|Tidak| AC[Update status: Inactive<br/>markKeyInvalid]
    AC --> C
    
    D -->|Update Key| AD[Klik Edit pada key]
    AD --> AE[Masukkan API Key baru<br/>dan/atau Label baru]
    AE --> AF["PATCH /api/ai/keys/:keyId"]
    AF --> AG[Enkripsi key baru<br/>Reset status ke Active]
    AG --> C
    
    D -->|Hapus Key| AH[Klik Delete pada key]
    AH --> AI[Konfirmasi penghapusan]
    AI --> AJ["DELETE /api/ai/keys/:keyId"]
    AJ --> AK[Hapus key dari database]
    AK --> C
    
    D -->|Lihat Usage Stats| AL[Buka tab Usage]
    AL --> AM["GET /api/ai/usage?days=30"]
    AM --> AN[Tampilkan statistik:<br/>Total requests, tokens,<br/>cost per provider]
    AN --> C
    
    D -->|Selesai| AO([Selesai])
```

---

### Penjelasan Alur

#### Tambah Key Baru
| Langkah | Deskripsi |
|---------|-----------|
| 1 | Pengguna membuka halaman `/settings/ai-keys` |
| 2 | Memilih provider AI (6 pilihan tersedia) |
| 3 | Memasukkan API key dan label opsional |
| 4 | Sebelum menyimpan, key divalidasi dengan mengirim test request ke API provider |
| 5 | Jika valid, key dienkripsi dengan AES-256-GCM dan disimpan ke database |
| 6 | Satu user hanya boleh punya satu key per provider (conflict jika duplikat) |

#### Cek Validitas Key (Check)
| Langkah | Deskripsi |
|---------|-----------|
| 1 | Server mengambil key yang tersimpan dan mendekripsinya |
| 2 | Mengirim test request ke provider untuk validasi |
| 3 | Jika provider mendukung, mengambil info balance/credit |
| 4 | Status key diupdate (Active/Inactive) berdasarkan hasil |

#### Alur Enkripsi API Key

```mermaid
flowchart LR
    A["API Key<br/>(plaintext)"] --> B["Generate<br/>Random IV<br/>(16 bytes)"]
    B --> C["AES-256-GCM<br/>Encrypt"]
    C --> D["Output:<br/>iv:authTag:ciphertext<br/>(hex format)"]
    D --> E["Simpan ke DB<br/>kolom encryptedKey"]
    
    E --> F["Baca dari DB<br/>encryptedKey"]
    F --> G["Split oleh ':'<br/>→ iv, tag, data"]
    G --> H["AES-256-GCM<br/>Decrypt"]
    H --> I["API Key<br/>(plaintext)"]
```

---

### Detail Keamanan BYOK

| Aspek | Implementasi |
|-------|-------------|
| **Algoritma Enkripsi** | AES-256-GCM (Authenticated Encryption) |
| **Key Size** | 256-bit (32 bytes dari hex string 64 karakter) |
| **IV (Initialization Vector)** | Random 16 bytes, di-generate untuk setiap enkripsi |
| **Authentication Tag** | GCM auth tag untuk memastikan integritas data |
| **Format Penyimpanan** | `iv:authTag:ciphertext` (hex-encoded, dipisah colon) |
| **Encryption Key** | Disimpan di environment variable `ENCRYPTION_KEY` |
| **Key Tidak Pernah Dikirim ke Client** | API hanya mengembalikan `id`, `provider`, `label`, `isActive`, `lastUsedAt` |
| **Auto-Invalidation** | Key otomatis ditandai inactive jika request ke provider gagal |
| **One Key Per Provider** | Satu user hanya boleh menyimpan satu key per provider |

### API Endpoints BYOK

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| `GET` | `/api/ai/keys` | Daftar semua key user (tanpa key asli) |
| `POST` | `/api/ai/keys` | Tambah key baru (enkripsi + simpan) |
| `PATCH` | `/api/ai/keys/:keyId` | Update key atau label |
| `DELETE` | `/api/ai/keys/:keyId` | Hapus key |
| `POST` | `/api/ai/keys/validate` | Validasi key sebelum menyimpan |
| `POST` | `/api/ai/keys/:keyId/check` | Cek validitas key tersimpan + balance |
| `GET` | `/api/ai/usage?days=30` | Statistik penggunaan AI |

### Provider yang Didukung

| Provider | SDK | Balance Check | Deskripsi |
|----------|-----|:-------------:|-----------|
| **OpenAI** | `openai` | ✅ | GPT-4.1, GPT-4o, GPT-4o-mini, dll. |
| **Anthropic Claude** | `@anthropic-ai/sdk` | ❌ | Claude Sonnet 4, Opus 4, Haiku, dll. |
| **Google Gemini** | `@google/generative-ai` | ❌ | Gemini 2.5 Flash, 2.5 Pro, dll. |
| **Groq** | `groq-sdk` | ❌ | Llama 3, Mixtral (inferensi cepat) |
| **OpenRouter** | `fetch` (API compatible) | ✅ | 400+ model dari berbagai provider |
| **GitHub Copilot** | `openai` (Azure endpoint) | ✅ | Via Azure OpenAI endpoint |

---

[← Kembali ke Daftar Diagram](../README.md#diagram-uml-file-terpisah)
