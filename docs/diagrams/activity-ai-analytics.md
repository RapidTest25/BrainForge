# Activity Diagram — AI Usage Analytics (Admin)

[← Kembali ke Daftar Diagram](../README.md#diagram-uml-file-terpisah)

---

> Fitur AI Usage Analytics hanya dapat diakses oleh **Admin**. Menampilkan statistik lengkap penggunaan AI di seluruh platform: per provider, per model, per fitur, top users, dan tren harian.

```mermaid
flowchart TD
    A([Mulai]) --> B["Admin buka halaman
    /admin/ai-usage"]
    B --> C{"Admin middleware
    isAdmin?"}
    C -->|Tidak| D["Redirect ke Dashboard
    403 Forbidden"]
    C -->|Ya| E["Fetch data secara paralel"]
    
    E --> F["GET /admin/stats"]
    E --> G["GET /admin/ai-usage"]
    
    F --> H["Query aggregat dari DB:
    totalAiKeys, totalBrainstorms,
    totalAiChats, aiUsage 30 hari"]
    G --> I["Query analitik dari DB
    5 groupBy queries"]
    
    I --> I1["groupBy provider
    → byProvider"]
    I --> I2["groupBy provider+model
    → byModel - top 20"]
    I --> I3["groupBy feature
    → byFeature"]
    I --> I4["groupBy userId
    → topUsers - top 10"]
    I --> I5["Raw SQL: daily aggregate
    → dailyUsage - 30 hari"]
    
    I1 --> J["Gabungkan semua data"]
    I2 --> J
    I3 --> J
    I4 --> J
    I5 --> J
    H --> J
    
    J --> K["Tampilkan halaman Analytics"]
    
    K --> L{"Tab yang dipilih?"}
    
    L -->|Overview| M["Tampilkan:
    4 Metric Cards
    Total Requests, Total Tokens,
    Estimated Cost, Active API Keys"]
    M --> M1["Token Distribution Bar
    Input vs Output ratio"]
    M1 --> M2["Usage Summary:
    Avg Tokens per Request,
    Avg Cost per Request,
    Brainstorm + AI Chat Sessions"]
    M2 --> M3["Daily Requests Chart
    Bar chart 30 hari
    dengan tooltip"]
    M3 --> M4["Usage by Feature
    Progress bar per fitur:
    chat, brainstorm, dll"]
    
    L -->|By Provider| N["Tampilkan card per provider:
    Nama, warna, jumlah requests,
    Input dan Output tokens,
    Estimated cost"]
    
    L -->|By Model| O["Tampilkan tabel:
    Provider - Model - Requests
    Input - Output - Cost
    Sorted by usage"]
    
    L -->|Top Users| P["Tampilkan tabel:
    Rank - User avatar+name+email
    Requests - Input - Output - Cost
    Top 10 users"]
    
    M4 --> Q{"Aksi lain?"}
    N --> Q
    O --> Q
    P --> Q
    
    Q -->|Refresh| R["Klik tombol Refresh"]
    R --> E
    
    Q -->|Ganti Tab| L
    
    Q -->|Selesai| S([Selesai])
```

---

### Penjelasan Alur

| Langkah | Deskripsi |
|---------|-----------|
| 1 | Admin membuka halaman `/admin/ai-usage` |
| 2 | Admin middleware memverifikasi bahwa user memiliki `isAdmin: true` |
| 3 | Frontend melakukan 2 API call paralel: `/admin/stats` dan `/admin/ai-usage` |
| 4 | Backend menjalankan 5 `groupBy` query + 1 raw SQL query ke tabel `AIUsageLog` (30 hari terakhir) |
| 5 | Data ditampilkan dalam 4 tab: Overview, By Provider, By Model, dan Top Users |
| 6 | Admin dapat refresh data atau berpindah antar tab |

### Detail Data Analytics

#### Metric Cards (Overview)
| Metrik | Sumber | Deskripsi |
|--------|--------|-----------|
| **Total Requests** | `AIUsageLog` count | Jumlah total request AI dalam 30 hari |
| **Total Tokens** | `promptTokens + completionTokens` | Total token yang digunakan (input + output) |
| **Estimated Cost** | `estimatedCost` sum | Estimasi biaya total AI |
| **Active API Keys** | `UserAIKey` count | Jumlah API key aktif di platform |

#### By Provider Breakdown
| Field | Deskripsi |
|-------|-----------|
| **Provider** | Nama provider (OpenAI, Claude, Gemini, Groq, OpenRouter, Copilot) |
| **Requests** | Jumlah request per provider |
| **Input Tokens** | Total prompt tokens per provider |
| **Output Tokens** | Total completion tokens per provider |
| **Cost** | Estimasi biaya per provider |

#### By Model Breakdown (Top 20)
| Field | Deskripsi |
|-------|-----------|
| **Provider** | Provider yang menyediakan model |
| **Model** | Nama model spesifik (gpt-4o, claude-sonnet-4, gemini-2.5-flash, dll.) |
| **Requests** | Jumlah request per model |
| **Input/Output** | Token usage per model |
| **Cost** | Estimasi biaya per model |

#### By Feature Breakdown
| Feature | Deskripsi |
|---------|-----------|
| `chat` | AI Chat mandiri dan brainstorm chat |
| `brainstorm` | Sesi brainstorm AI |
| `generate` | AI Generate (bulk generation) |
| `diagram` | AI diagram generation |
| `sprint` | AI sprint planning |
| `note` | AI note assistance |
| `goal` | AI goal generation |

#### Top Users (Top 10)
| Field | Deskripsi |
|-------|-----------|
| **User** | Avatar, nama, dan email pengguna |
| **Requests** | Jumlah request yang dilakukan |
| **Input/Output** | Total token yang digunakan |
| **Cost** | Estimasi biaya yang dihasilkan |

#### Daily Usage (30 Hari)
| Field | Deskripsi |
|-------|-----------|
| **Date** | Tanggal (per hari) |
| **Requests** | Jumlah request pada hari tersebut |
| **Tokens** | Total token pada hari tersebut |
| **Cost** | Estimasi biaya pada hari tersebut |

### Query Database

```
┌────────────────────────────────────────┐
│         AIUsageLog Table               │
│ (Sumber utama semua analytics)         │
├────────────────────────────────────────┤
│ id, provider, model, feature,          │
│ promptTokens, completionTokens,        │
│ estimatedCost, userId, createdAt       │
├────────────────────────────────────────┤
│ Query 1: groupBy(provider)             │
│ Query 2: groupBy(provider, model)      │
│ Query 3: groupBy(feature)              │
│ Query 4: groupBy(userId) + JOIN User   │
│ Query 5: Raw SQL DATE() aggregate      │
└────────────────────────────────────────┘
```

---

[← Kembali ke Daftar Diagram](../README.md#diagram-uml-file-terpisah)
