# Sequence Diagram — AI Chat

[← Kembali ke Daftar Diagram](../README.md#diagram-uml-file-terpisah)

---

```mermaid
sequenceDiagram
    actor User as Pengguna
    participant Web as Next.js Frontend
    participant API as Fastify API
    participant DB as PostgreSQL
    participant AIService as AI Service
    participant Provider as AI Provider<br/>(OpenAI/Claude/Gemini/dll)

    User->>Web: Buka AI Chat dan tulis pesan
    Web->>API: POST /api/teams/:teamId/ai-chat/:chatId/messages<br/>{content, provider, model}
    
    API->>DB: Simpan pesan user (role: USER)
    DB-->>API: Message saved
    
    API->>DB: Ambil riwayat pesan chat
    DB-->>API: Chat messages history
    
    API->>DB: Ambil API key user (terenkripsi)
    DB-->>API: Encrypted API key
    
    API->>API: Dekripsi API key (AES-256-GCM)
    
    API->>AIService: chat(messages, provider, model, key)
    AIService->>AIService: Pilih provider berdasarkan enum
    AIService->>Provider: Kirim request ke AI API
    Provider-->>AIService: AI Response
    AIService-->>API: Complete response
    
    API->>DB: Simpan response AI (role: ASSISTANT)
    DB-->>API: Message saved
    
    API->>DB: Log penggunaan AI<br/>(tokens, cost, provider)
    
    API-->>Web: { userMessage, aiMessage }
    Web-->>User: Tampilkan response AI
```

---

### Penjelasan Alur

| Langkah | Deskripsi |
|---------|-----------|
| 1 | Pengguna menulis pesan di interface AI Chat |
| 2 | Frontend mengirim pesan ke API beserta info provider dan model yang dipilih |
| 3 | API menyimpan pesan user ke database dengan role `USER` |
| 4 | API mengambil riwayat pesan sebelumnya untuk konteks percakapan |
| 5 | API mengambil API key milik pengguna (terenkripsi) dari database |
| 6 | API key didekripsi menggunakan AES-256-GCM |
| 7 | AI Service memilih provider yang sesuai dan mengirim request |
| 8 | Provider AI (OpenAI/Claude/Gemini/dll) memproses dan mengembalikan respons |
| 9 | Respons AI disimpan ke database dengan role `ASSISTANT` |
| 10 | Penggunaan AI di-log (jumlah token, estimasi biaya, provider, model) |
| 11 | Respons dikembalikan ke frontend dan ditampilkan ke pengguna |

---

[← Kembali ke Daftar Diagram](../README.md#diagram-uml-file-terpisah)
