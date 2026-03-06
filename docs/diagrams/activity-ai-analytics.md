# Activity Diagram — AI Chat Project Analysis

[← Kembali ke Daftar Diagram](../README.md#diagram-uml-file-terpisah)

---

> Fitur **AI Chat** adalah asisten AI yang **menganalisis project** secara real-time. AI membaca konteks project (tasks, goals, brainstorm sessions, sprints) lalu membantu user untuk mengembangkan dan menambahkan task baru, notes, goals, dan lainnya langsung dari percakapan AI.

```mermaid
flowchart TD
    A([Mulai]) --> B["User buka halaman /ai-chat"]
    B --> C["Fetch daftar chat sebelumnya
    GET /teams/:teamId/ai-chat"]
    C --> D{"Pilih chat atau
    buat baru?"}
    
    D -->|Buat Baru| E["Klik tombol New Chat
    POST /teams/:teamId/ai-chat"]
    E --> F["Chat baru dibuat
    dengan judul default"]
    F --> G["Tampilkan Quick Actions"]
    
    D -->|Pilih Existing| H["Klik chat dari sidebar"]
    H --> I["Fetch chat + messages
    GET /teams/:teamId/ai-chat/:chatId"]
    I --> J["Tampilkan riwayat pesan"]
    
    G --> K{"User memilih aksi?"}
    J --> K
    
    K -->|Quick Action| L{"Pilih Quick Action"}
    L -->|Summarize Project| L1["Prompt: ringkasan status
    project, progress task, goals,
    brainstorm sessions"]
    L -->|Suggest Next Goals| L2["Prompt: saran 3-5 goals
    berdasarkan state project"]
    L -->|Analyze Blockers| L3["Prompt: identifikasi resiko,
    task overdue, goals terhenti"]
    L -->|Sprint Planning| L4["Prompt: rencana sprint
    berdasarkan task belum selesai"]
    
    L1 --> M["Kirim pesan ke AI"]
    L2 --> M
    L3 --> M
    L4 --> M
    
    K -->|Ketik Manual| M
    
    M --> N["Pilih AI Provider dan Model"]
    N --> O{"Tipe Provider?"}
    
    O -->|Cloud Provider| P["POST /ai-chat/:chatId/messages
    content, provider, model"]
    O -->|Browser Local| Q["Inferensi via WebGPU
    di browser user"]
    
    P --> R["Backend: Simpan pesan user
    ke AiChatMessage"]
    R --> S["Backend: Ambil Project Context"]
    
    S --> S1["Query 30 task terbaru
    status, priority, dueDate"]
    S --> S2["Query 15 goals terbaru
    status, progress"]
    S --> S3["Query 10 brainstorm sessions
    title, mode, context"]
    S --> S4["Query 5 sprints terbaru
    title, goal, status, deadline"]
    
    S1 --> T["Bangun System Prompt
    dengan project context"]
    S2 --> T
    S3 --> T
    S4 --> T
    
    T --> U["Kirim ke AI Provider
    system prompt + chat history"]
    U --> V["AI menganalisis dan
    memberikan respons"]
    
    Q --> V2["Simpan pesan user + AI
    POST /ai-chat/:chatId/messages
    provider: BROWSER, localReply"]
    V2 --> W
    
    V --> V1["Simpan respons AI
    ke AiChatMessage"]
    V1 --> W["Tampilkan respons AI
    di chat interface"]
    
    W --> X{"Respons mengandung
    brainforge-updates?"}
    
    X -->|Ya| Y["Parse JSON block:
    suggestions array dengan
    type, title, description"]
    Y --> Z["Tampilkan tombol
    Apply to Project"]
    
    Z --> AA{"User klik Apply?"}
    AA -->|Ya| AB["POST /ai-chat/apply-updates
    suggestions + projectId"]
    
    AB --> AC{"Proses setiap suggestion"}
    AC -->|type: task| AD["Buat Task baru via
    prisma.task.create
    title, description, priority"]
    AC -->|type: goal| AE["Buat Goal baru via
    prisma.goal.create
    title, description, progress: 0"]
    AC -->|type: note| AF["Buat Note baru via
    prisma.note.create
    title, content"]
    
    AD --> AG["Return hasil:
    success count + fail count"]
    AE --> AG
    AF --> AG
    
    AG --> AH["Tampilkan toast notifikasi
    N updates applied"]
    AH --> AI["Invalidate queries:
    tasks, goals, notes, project"]
    AI --> K
    
    AA -->|Tidak| K
    X -->|Tidak| K
    
    K -->|Selesai| AJ([Selesai])
```

---

### Penjelasan Alur

| Langkah | Deskripsi |
|---------|-----------|
| 1 | User membuka halaman `/ai-chat` dan melihat daftar chat sebelumnya di sidebar |
| 2 | User bisa membuat chat baru atau melanjutkan chat yang sudah ada |
| 3 | Saat chat baru, ditampilkan **4 Quick Actions**: Summarize Project, Suggest Next Goals, Analyze Blockers, Sprint Planning |
| 4 | User mengirim pesan (via Quick Action atau manual) beserta pilihan AI Provider dan Model |
| 5 | Backend menyimpan pesan user, lalu mengambil **Project Context** dari database |
| 6 | Project Context berisi: 30 task terbaru, 15 goals, 10 brainstorm sessions, 5 sprints |
| 7 | AI menerima system prompt + project context + chat history, lalu menganalisis dan merespons |
| 8 | Jika AI menyarankan perubahan konkret, respons berisi blok `brainforge-updates` JSON |
| 9 | User dapat menekan **Apply to Project** untuk langsung membuat task, goal, atau note baru |
| 10 | Sistem memproses setiap suggestion dan membuat entitas baru di database |

### System Prompt AI

AI menerima system prompt khusus yang berisi:

```
You are BrainForge AI Assistant — a smart project management helper.
You have access to the current project/workspace context below.

=== PROJECT CONTEXT ===
TASKS (30 recent): status summary + detail per task
GOALS (15): status, progress %, description
BRAINSTORM SESSIONS (10 recent): title, mode, context
SPRINTS (5): status, title, goal, deadline
=== END CONTEXT ===

Guidelines:
- Be concise and actionable
- Highlight key progress, blockers, and upcoming work
- Suggest goals based on task statuses and team activity
- Analyze incomplete tasks, goals, and recent brainstorm sessions
```

### Format Project Updates (brainforge-updates)

Ketika AI mengidentifikasi item yang bisa ditindaklanjuti, AI menyertakan blok JSON:

```json
{
  "suggestions": [
    {
      "type": "task",
      "title": "Implementasi fitur notifikasi",
      "description": "Buat sistem notifikasi real-time",
      "priority": "HIGH",
      "status": "TODO"
    },
    {
      "type": "goal",
      "title": "Tingkatkan test coverage ke 80%",
      "description": "Tulis unit test untuk semua service"
    },
    {
      "type": "note",
      "title": "Catatan arsitektur microservice",
      "content": "Pertimbangkan untuk memisahkan AI service..."
    }
  ],
  "summary": "3 suggestions berdasarkan analisis task yang overdue"
}
```

### Quick Actions

| Quick Action | Deskripsi | Ikon |
|-------------|-----------|------|
| **Summarize Project** | Ringkasan komprehensif status project: progress task, goals, brainstorm | BarChart3 |
| **Suggest Next Goals** | Saran 3-5 goals prioritas berdasarkan state project saat ini | Target |
| **Analyze Blockers** | Identifikasi resiko, task overdue, goals terhenti, dan solusinya | Sparkles |
| **Sprint Planning** | Rencana sprint berikutnya berdasarkan task belum selesai dan prioritas | Clock |

### Apply Updates Flow

| Tipe | Aksi | Data yang Dibuat |
|------|------|-----------------|
| **task** | `prisma.task.create()` | title, description, priority, status, projectId, teamId |
| **goal** | `prisma.goal.create()` | title, description, status: NOT_STARTED, progress: 0, projectId |
| **note** | `prisma.note.create()` | title, content, projectId, teamId |

### Fitur Tambahan

| Fitur | Deskripsi |
|-------|-----------|
| **Multi-Provider** | Mendukung semua 6 provider cloud + Browser local (WebGPU) |
| **Model Selection** | Kategori otomatis: GPT, Claude, Gemini, Reasoning, Meta, DeepSeek, Mistral, Qwen |
| **Browser Inference** | Inferensi lokal via WebGPU tanpa API key, model di-download ke browser |
| **Chat History** | Riwayat semua percakapan tersimpan per team, bisa di-rename dan dihapus |
| **Project Context** | AI membaca data project secara real-time setiap kali user mengirim pesan |
| **Auto-create Chat** | Chat otomatis dibuat jika user mengirim pesan tanpa chat aktif |

---

[← Kembali ke Daftar Diagram](../README.md#diagram-uml-file-terpisah)
