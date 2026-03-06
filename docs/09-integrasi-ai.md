# 9. Integrasi AI (Artificial Intelligence)

[← Kembali ke Daftar Isi](./README.md)

---

## 9.1 Provider yang Didukung

| Provider | SDK | Model yang Tersedia |
|----------|-----|---------------------|
| **OpenAI** | `openai` SDK | GPT-4.1, GPT-4.1-Mini, GPT-4.1-Nano, GPT-4o, GPT-4o-Mini, O3, O3-Mini, O4-Mini |
| **Anthropic Claude** | `@anthropic-ai/sdk` | Claude Sonnet 4, Opus 4, 3.5 Haiku, 3.5 Sonnet, 3 Opus |
| **Google Gemini** | `@google/generative-ai` | Gemini 2.5 Flash, 2.5 Pro, 2.0 Flash |
| **Groq** | `groq-sdk` | Llama 3.3 70B, 3.1 8B, 4 Scout, 4 Maverick, DeepSeek R1, Mixtral 8x7B, Gemma 2 9B |
| **OpenRouter** | Raw `fetch` (OpenAI-compatible API) | 10 free models + 5 paid models (statis) + katalog dinamis (400+ model, cache 10 menit) |
| **GitHub Copilot** | `openai` SDK (Azure endpoint) | GPT-4.1, GPT-4o, GPT-5.x series, O3/O4, Claude Sonnet/Opus 4.x, Gemini 2.5/3.x, Grok |

---

## 9.2 Arsitektur Provider (BYOK)

- Semua provider mengimplementasikan interface dasar: `chat()`, `stream()`, `validateKey()`, `listModels()`
- Opsional: `getBalance()` (OpenAI, OpenRouter, Copilot)
- API key disimpan terenkripsi (AES-256-GCM) di database
- Key didekripsi hanya saat digunakan untuk API call

---

## 9.3 Fitur AI di Setiap Modul

| Modul | Fitur AI |
|-------|----------|
| **Brainstorm** | AI merespons pesan pengguna di sesi brainstorm |
| **Diagram** | Generate diagram (ERD, flowchart, arsitektur, sequence, mindmap, user flow, component) dari deskripsi bahasa alami |
| **Sprint** | Generate rencana sprint + task otomatis, konversi ke task nyata |
| **Notes** | AI writing assist (expand, summarize, rewrite) |
| **Goals** | Generate SMART goals berdasarkan konteks proyek |
| **AI Generate** | Bulk generation: tasks + brainstorm + notes + goals dari satu prompt |
| **AI Chat** | Assistant chat mandiri dengan persistensi riwayat percakapan |

---

[← Sebelumnya: Autentikasi & Keamanan](./08-autentikasi-keamanan.md) | [Selanjutnya: Real-time Socket →](./10-realtime-socket.md)
