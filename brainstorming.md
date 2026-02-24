# 🧠 BrainForge — Brainstorming Session v2

> Dokumen brainstorming v2 — diperluas dengan multi-provider AI, ClickUp-inspired UI,
> visual flow brainstorming (draw.io-like), project calendar, dan detail teknis yang lengkap.
> Semua fitur **100% free** — no paywall, no freemium tier.

---

## 📌 Keputusan & Perubahan dari v1

| Keputusan | Status |
|-----------|--------|
| Monetization: **Free for all features** | ✅ Confirmed |
| AI cost ditanggung user sendiri (BYOK) | ✅ Confirmed |
| AI Provider: diperluas ke 6+ provider | 🆕 New |
| UI: ClickUp-inspired (multi-view, rich task) | 🆕 New |
| Visual Flow Brainstorm (draw.io-like) | 🆕 New |
| Project Calendar view | 🆕 New |
| Tech stack & folder structure detail | 🆕 Revised |

---

# ═══════════════════════════════════════════
# PART 1: AI PROVIDER SYSTEM (BYOK Extended)
# ═══════════════════════════════════════════

## 1.1 Supported AI Providers

### MVP Providers (Phase 1)

| Provider | Models | Key Format | Validation Endpoint |
|----------|--------|------------|---------------------|
| **OpenAI** | gpt-4o, gpt-4o-mini, gpt-4-turbo, gpt-3.5-turbo | `sk-...` | `GET /v1/models` |
| **Google Gemini** | gemini-1.5-pro, gemini-1.5-flash, gemini-2.0-flash | `AI...` | `GET /v1beta/models` |
| **Anthropic (Claude)** | claude-3.5-sonnet, claude-3-haiku, claude-3-opus | `sk-ant-...` | `GET /v1/messages` (small test) |

### Phase 2 Providers

| Provider | Models | Key Format | Notes |
|----------|--------|------------|-------|
| **Groq** | llama-3.1-70b, mixtral-8x7b, gemma2-9b | `gsk_...` | Ultra-fast inference, free tier |
| **Mistral** | mistral-large, mistral-medium, mistral-small | API key | European provider |
| **OpenRouter** | 100+ models (meta-provider) | `sk-or-...` | Access semua model via 1 key |
| **Deepseek** | deepseek-chat, deepseek-coder | API key | Murah, bagus untuk coding |

### Phase 3 (Local/Self-hosted)

| Provider | Models | Notes |
|----------|--------|-------|
| **Ollama** | llama3, codellama, mistral, phi-3 | Local, no API key needed |
| **LM Studio** | Any GGUF model | Local REST API |

### Custom Provider (Future)
- User bisa input custom OpenAI-compatible endpoint
- Contoh: Azure OpenAI, AWS Bedrock, self-hosted vLLM

---

## 1.2 Provider Adapter Architecture

```
┌──────────────────────────────────────────────────────┐
│                   AI SERVICE LAYER                    │
├──────────────────────────────────────────────────────┤
│                                                       │
│  ┌─────────────┐                                     │
│  │ AIService   │──── resolveProvider(userId) ────┐   │
│  │             │                                  │   │
│  │  .chat()    │     ┌────────────────────────┐  │   │
│  │  .stream()  │     │   Provider Registry     │  │   │
│  │  .validate()│     │                        │  │   │
│  └─────────────┘     │  openai  ──▶ OpenAI    │  │   │
│                       │  gemini  ──▶ Gemini    │  │   │
│                       │  claude  ──▶ Claude    │  │   │
│                       │  groq    ──▶ Groq      │  │   │
│                       │  mistral ──▶ Mistral   │  │   │
│                       │  openrouter ──▶ OR     │  │   │
│                       │  ollama  ──▶ Ollama    │  │   │
│                       └────────────────────────┘  │   │
│                                                       │
└──────────────────────────────────────────────────────┘
```

### Unified Provider Interface

```typescript
// packages/types/src/ai.ts

export interface AIProvider {
  id: string;
  name: string;
  chat(params: ChatParams): Promise<ChatResponse>;
  stream(params: ChatParams): AsyncIterable<StreamChunk>;
  validate(apiKey: string): Promise<boolean>;
  listModels(apiKey: string): Promise<ModelInfo[]>;
}

export interface ChatParams {
  model: string;
  messages: Message[];
  temperature?: number;
  maxTokens?: number;
  responseFormat?: 'text' | 'json';
}

export interface StreamChunk {
  content: string;
  done: boolean;
  usage?: TokenUsage;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCost?: number; // in USD
}

export interface ModelInfo {
  id: string;
  name: string;
  maxTokens: number;
  supportsStreaming: boolean;
  supportsJson: boolean;
  costPer1kInput?: number;  // USD
  costPer1kOutput?: number; // USD
}
```

### Provider Implementation Example

```typescript
// apps/api/src/ai/providers/openai.provider.ts

import OpenAI from 'openai';
import type { AIProvider, ChatParams, StreamChunk } from '@brainforge/types';

export class OpenAIProvider implements AIProvider {
  id = 'openai';
  name = 'OpenAI';

  private createClient(apiKey: string) {
    return new OpenAI({ apiKey });
  }

  async validate(apiKey: string): Promise<boolean> {
    try {
      const client = this.createClient(apiKey);
      await client.models.list();
      return true;
    } catch {
      return false;
    }
  }

  async chat(params: ChatParams & { apiKey: string }) {
    const client = this.createClient(params.apiKey);
    const response = await client.chat.completions.create({
      model: params.model,
      messages: params.messages,
      temperature: params.temperature ?? 0.7,
      max_tokens: params.maxTokens,
      response_format: params.responseFormat === 'json' 
        ? { type: 'json_object' } 
        : undefined,
    });
    return {
      content: response.choices[0].message.content ?? '',
      usage: {
        promptTokens: response.usage?.prompt_tokens ?? 0,
        completionTokens: response.usage?.completion_tokens ?? 0,
        totalTokens: response.usage?.total_tokens ?? 0,
      },
    };
  }

  async *stream(params: ChatParams & { apiKey: string }): AsyncIterable<StreamChunk> {
    const client = this.createClient(params.apiKey);
    const stream = await client.chat.completions.create({
      model: params.model,
      messages: params.messages,
      temperature: params.temperature ?? 0.7,
      stream: true,
    });
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content ?? '';
      yield { content, done: chunk.choices[0]?.finish_reason === 'stop' };
    }
  }
}
```

### Provider untuk Claude (Anthropic)

```typescript
// apps/api/src/ai/providers/claude.provider.ts

import Anthropic from '@anthropic-ai/sdk';
import type { AIProvider, ChatParams, StreamChunk } from '@brainforge/types';

export class ClaudeProvider implements AIProvider {
  id = 'claude';
  name = 'Anthropic Claude';

  async validate(apiKey: string): Promise<boolean> {
    try {
      const client = new Anthropic({ apiKey });
      await client.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'hi' }],
      });
      return true;
    } catch {
      return false;
    }
  }

  async *stream(params: ChatParams & { apiKey: string }): AsyncIterable<StreamChunk> {
    const client = new Anthropic({ apiKey: params.apiKey });
    // Claude punya format messages berbeda — perlu adapt
    const systemMsg = params.messages.find(m => m.role === 'system');
    const chatMsgs = params.messages.filter(m => m.role !== 'system');

    const stream = client.messages.stream({
      model: params.model,
      max_tokens: params.maxTokens ?? 4096,
      system: systemMsg?.content,
      messages: chatMsgs.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        yield { content: event.delta.text, done: false };
      }
    }
    yield { content: '', done: true };
  }
}
```

### Model Registry dengan Cost Info

```typescript
// apps/api/src/ai/models.registry.ts

export const MODEL_REGISTRY = {
  // OpenAI
  'gpt-4o': {
    provider: 'openai', name: 'GPT-4o', maxTokens: 128000,
    costInput: 0.005, costOutput: 0.015, // per 1K tokens
    capabilities: ['chat', 'json', 'streaming', 'vision'],
  },
  'gpt-4o-mini': {
    provider: 'openai', name: 'GPT-4o Mini', maxTokens: 128000,
    costInput: 0.00015, costOutput: 0.0006,
    capabilities: ['chat', 'json', 'streaming', 'vision'],
  },

  // Claude
  'claude-3.5-sonnet': {
    provider: 'claude', name: 'Claude 3.5 Sonnet', maxTokens: 200000,
    costInput: 0.003, costOutput: 0.015,
    capabilities: ['chat', 'json', 'streaming'],
  },
  'claude-3-haiku': {
    provider: 'claude', name: 'Claude 3 Haiku', maxTokens: 200000,
    costInput: 0.00025, costOutput: 0.00125,
    capabilities: ['chat', 'json', 'streaming'],
  },

  // Gemini
  'gemini-2.0-flash': {
    provider: 'gemini', name: 'Gemini 2.0 Flash', maxTokens: 1048576,
    costInput: 0.0, costOutput: 0.0, // free tier available
    capabilities: ['chat', 'json', 'streaming'],
  },
  'gemini-1.5-pro': {
    provider: 'gemini', name: 'Gemini 1.5 Pro', maxTokens: 2097152,
    costInput: 0.00125, costOutput: 0.005,
    capabilities: ['chat', 'json', 'streaming'],
  },

  // Groq (fast inference)
  'llama-3.1-70b-versatile': {
    provider: 'groq', name: 'Llama 3.1 70B', maxTokens: 131072,
    costInput: 0.00059, costOutput: 0.00079,
    capabilities: ['chat', 'json', 'streaming'],
  },

  // DeepSeek
  'deepseek-chat': {
    provider: 'deepseek', name: 'DeepSeek Chat', maxTokens: 64000,
    costInput: 0.00014, costOutput: 0.00028,
    capabilities: ['chat', 'json', 'streaming'],
  },
} as const;
```

---

## 1.3 BYOK Security (Enhanced)

### Encryption: AES-256-GCM

```typescript
// apps/api/src/lib/encryption.ts

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex'); // 32 bytes

export function encrypt(text: string): string {
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, KEY, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag().toString('hex');
  // Format: iv:tag:encrypted (semua dalam 1 string)
  return `${iv.toString('hex')}:${tag}:${encrypted}`;
}

export function decrypt(encryptedData: string): string {
  const [ivHex, tagHex, encrypted] = encryptedData.split(':');
  const decipher = createDecipheriv(ALGORITHM, KEY, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
```

### Key Management Enhanced

```
User bisa punya MULTIPLE keys per provider:
- "My Personal OpenAI" → sk-abc...
- "Work OpenAI Key"    → sk-xyz...
- "Gemini Free Tier"   → AI...
- "Claude Sonnet Key"  → sk-ant-...

User pilih "active key" per provider.
Fallback: jika active key gagal, coba key lain dari provider yang sama.
```

### AI Usage Tracking (untuk user sendiri, bukan billing)

```prisma
model AIUsageLog {
  id              String   @id @default(cuid())
  userId          String
  provider        String
  model           String
  promptTokens    Int
  completionTokens Int
  estimatedCost   Float    // USD estimate
  feature         String   // 'brainstorm' | 'sprint' | 'notes' | 'diagram'
  createdAt       DateTime @default(now())

  user User @relation(fields: [userId], references: [id])
}
```

User bisa lihat dashboard: "Bulan ini kamu sudah pakai ~$2.50 di OpenAI, $0.80 di Claude"

---

# ═══════════════════════════════════════════
# PART 2: CLICKUP-INSPIRED UI SYSTEM
# ═══════════════════════════════════════════

## 2.1 UI Philosophy

Terinspirasi ClickUp tetapi konteksnya **AI-powered project workspace**:

```
ClickUp = Project Management Tool
BrainForge = AI-Powered Project THINKING & Planning Tool

Kita ambil yang terbaik dari ClickUp:
✅ Multi-view system (List, Board, Calendar, Timeline)
✅ Rich sidebar navigation (Spaces)
✅ Task metadata (assignee, priority, status, due date, labels)
✅ Customizable views
✅ Clean, modern UI

Yang kita TAMBAHKAN (unique BrainForge):
🧠 AI Brainstorm Rooms (ClickUp tidak punya)
🎨 Visual Flow Diagrams (AI-assisted draw.io)
🤖 AI generates tasks, bukan manual input
📊 AI Cost Dashboard (BYOK)
```

---

## 2.2 Layout & Navigation

### App Shell Layout

```
┌────────────────────────────────────────────────────────────────────┐
│  🧠 BrainForge          🔍 Search       [👤 Profile] [⚙️ Settings]│
├────────┬───────────────────────────────────────────────────────────┤
│        │                                                           │
│ SIDE   │                    MAIN CONTENT AREA                     │
│ BAR    │                                                           │
│        │  ┌─ View Tabs ──────────────────────────────────────┐    │
│ ┌────┐ │  │ 📋 List │ 📊 Board │ 📅 Calendar │ 📈 Timeline │    │
│ │Home│ │  └──────────────────────────────────────────────────┘    │
│ │    │ │                                                           │
│ │🔔  │ │  ┌─ Toolbar ───────────────────────────────────────┐    │
│ │Noti│ │  │ 🔍 Filter │ 👥 Group By │ ↕️ Sort │ + Add Task │    │
│ │    │ │  └──────────────────────────────────────────────────┘    │
│ │⚡  │ │                                                           │
│ │AI  │ │  ┌─ Content ───────────────────────────────────────┐    │
│ │Keys│ │  │                                                  │    │
│ │    │ │  │              (View-specific content)             │    │
│ ├────┤ │  │                                                  │    │
│ │    │ │  │                                                  │    │
│ │SPAC│ │  └──────────────────────────────────────────────────┘    │
│ │ES  │ │                                                           │
│ │    │ │                                                           │
│ │ 📁 │ │                                                           │
│ │Team│ │                                                           │
│ │ A  │ │                                                           │
│ │  📋│ │                                                           │
│ │  Sp│ │                                                           │
│ │  🧠│ │                                                           │
│ │  Br│ │                                                           │
│ │  📅│ │                                                           │
│ │  Ca│ │                                                           │
│ │  🎨│ │                                                           │
│ │  Di│ │                                                           │
│ │  📝│ │                                                           │
│ │  No│ │                                                           │
│ │    │ │                                                           │
│ │ 📁 │ │                                                           │
│ │Team│ │                                                           │
│ │ B  │ │                                                           │
│ └────┘ │                                                           │
└────────┴───────────────────────────────────────────────────────────┘
```

### Sidebar Navigation Structure

```
🏠 Home (Dashboard)
🔔 Notifications
⚡ AI Keys Management

── SPACES ─────────────
📁 Team Alpha            ← Team = Space (ClickUp concept)
  ├── 📋 Tasks           ← Sprint tasks (List/Board/Calendar/Timeline view)
  ├── 🧠 Brainstorm      ← AI Brainstorm rooms
  ├── 📅 Calendar        ← Project calendar
  ├── 🎨 Diagrams        ← Visual flow brainstorm (draw.io-like)
  ├── 📝 Notes           ← Collaborative notes
  └── ⚙️ Settings        ← Team settings

📁 Team Beta
  ├── 📋 Tasks
  ├── 🧠 Brainstorm
  ├── 📅 Calendar
  ├── 🎨 Diagrams
  └── 📝 Notes

── PERSONAL ─────────────
📋 My Tasks              ← Tasks assigned to me across all teams
📊 AI Usage              ← Personal AI usage dashboard
⚙️ Settings
```

---

## 2.3 Multi-View System (ClickUp-Style)

### 📋 List View

Seperti ClickUp — grouped by status:

```
┌────────────────────────────────────────────────────────────────┐
│  📋 List │ 📊 Board │ 📅 Calendar │ 📈 Timeline  │ + Add View │
├────────────────────────────────────────────────────────────────┤
│ 🔍 Filter  👥 Group: Status  ↕️ Sort: Priority  ⚙️ Customize  │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│ ▼ 🔴 TO DO (5)                                                │
│ ┌──────────────────────────────────────────────────────────┐  │
│ │ ☐  Setup database schema    👤 Rizky  📅 Mar 1  🔴 High │  │
│ │ ☐  Design auth flow         👤 Andi   📅 Mar 3  🟡 Med  │  │
│ │ ☐  Create API endpoints     👤 —      📅 Mar 5  🟡 Med  │  │
│ └──────────────────────────────────────────────────────────┘  │
│                                                                │
│ ▼ 🔵 IN PROGRESS (3)                                         │
│ ┌──────────────────────────────────────────────────────────┐  │
│ │ ◐  Frontend landing page    👤 Budi   📅 Feb 28 🔴 High │  │
│ │ ◐  Setup CI/CD pipeline     👤 Rizky  📅 Mar 1  🟢 Low  │  │
│ └──────────────────────────────────────────────────────────┘  │
│                                                                │
│ ▼ ✅ DONE (8)                                                 │
│ ┌──────────────────────────────────────────────────────────┐  │
│ │ ✅  Project setup             👤 Rizky  📅 Feb 20        │  │
│ │ ✅  Design system setup       👤 Budi   📅 Feb 22        │  │
│ └──────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────┘
```

### Columns yang bisa di-show/hide:
- Task name (always)
- Assignee(s) — avatar
- Due date
- Priority (Critical/High/Medium/Low)
- Status (To Do / In Progress / Review / Done)
- Labels/Tags
- Estimation (hours)
- Created by
- Sprint

### Group By Options:
- Status (default)
- Priority
- Assignee
- Sprint
- Label
- Due date (week)

---

### 📊 Board View (Kanban)

Cards dalam columns:

```
┌─────────────────────────────────────────────────────────────────┐
│  📋 List │ 📊 Board │ 📅 Calendar │ 📈 Timeline  │ + Add View  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  TO DO (3)          IN PROGRESS (2)     REVIEW (1)    DONE (5)  │
│  ┌───────────┐     ┌───────────┐     ┌───────────┐             │
│  │ Setup DB  │     │ Landing   │     │ Auth API  │             │
│  │ ────────  │     │ Page      │     │ ────────  │             │
│  │ 🔴 High   │     │ ────────  │     │ 🟡 Med    │             │
│  │ 👤 Rizky  │     │ 🔴 High   │     │ 👤 Andi   │             │
│  │ 📅 Mar 1  │     │ 👤 Budi   │     │ 📅 Mar 2  │             │
│  │ ⏱️ 8h     │     │ 📅 Feb 28 │     │ ⏱️ 4h     │             │
│  │ 🏷️ Backend│     │ ⏱️ 12h    │     └───────────┘             │
│  └───────────┘     │ 🏷️ FE    │                                │
│  ┌───────────┐     └───────────┘                                │
│  │ Design    │     ┌───────────┐                                │
│  │ Auth Flow │     │ CI/CD     │                                │
│  │ ────────  │     │ Pipeline  │                                │
│  │ 🟡 Med    │     │ ────────  │                                │
│  │ 👤 Andi   │     │ 🟢 Low    │                                │
│  │ 📅 Mar 3  │     │ 👤 Rizky  │                                │
│  └───────────┘     └───────────┘                                │
│                                                                  │
│  [+ Add Task]      [+ Add Task]                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Fitur Board View:**
- Drag & drop antar columns (status change)
- Drag & drop reorder dalam column
- Inline edit task
- Quick add task per column
- Swimlanes (group by assignee/priority)

---

### 📅 Calendar View

```
┌─────────────────────────────────────────────────────────────────┐
│  📋 List │ 📊 Board │ 📅 Calendar │ 📈 Timeline  │ + Add View  │
├─────────────────────────────────────────────────────────────────┤
│  ◀ February 2026 ▶                              [Month|Week|Day]│
├──────┬──────┬──────┬──────┬──────┬──────┬──────┐               │
│ Mon  │ Tue  │ Wed  │ Thu  │ Fri  │ Sat  │ Sun  │               │
├──────┼──────┼──────┼──────┼──────┼──────┼──────┤               │
│      │      │      │      │      │      │  1   │               │
│  23  │  24  │  25  │  26  │  27  │  28  │      │               │
│      │🔴Set │      │      │🟡Des│✅Lan │      │               │
│      │up DB │      │      │ign  │ding  │      │               │
│      │      │      │      │Auth │Page  │      │               │
├──────┼──────┼──────┼──────┼──────┼──────┼──────┤               │
│   2  │   3  │   4  │   5  │   6  │   7  │   8  │               │
│🟡Auth│🟡API │      │🔴Spr│      │      │      │               │
│ API  │Endpt │      │int  │      │      │      │               │
│      │      │      │Plan │      │      │      │               │
└──────┴──────┴──────┴──────┴──────┴──────┴──────┘               │
└─────────────────────────────────────────────────────────────────┘
```

**Fitur Calendar View:**
- Month / Week / Day toggle
- Drag task ke tanggal lain (update due date)
- Click tanggal → quick add task
- Color-coded by priority atau status
- Lihat deadlines brainstorm sessions & sprint plans juga
- Integrasi event: sprint start/end, brainstorm scheduled

---

### 📈 Timeline View (Gantt-like)

Horizontal timeline:

```
┌─────────────────────────────────────────────────────────────────┐
│  📋 List │ 📊 Board │ 📅 Calendar │ 📈 Timeline  │ + Add View  │
├─────────────────────────────────────────────────────────────────┤
│                    │ Feb 24 │ Mar 3  │ Mar 10 │ Mar 17 │       │
│ Task Name          │        │        │        │        │       │
├────────────────────┼────────┼────────┼────────┼────────┤       │
│ Setup DB Schema    │ ██████ │        │        │        │       │
│ 👤 Rizky           │        │        │        │        │       │
├────────────────────┼────────┼────────┼────────┼────────┤       │
│ Auth System        │   ████ │████    │        │        │       │
│ 👤 Andi            │        │        │        │        │       │
├────────────────────┼────────┼────────┼────────┼────────┤       │
│ Landing Page       │ ██████ │██████  │███     │        │       │
│ 👤 Budi            │        │        │        │        │       │
├────────────────────┼────────┼────────┼────────┼────────┤       │
│ API Endpoints      │        │  ████  │████████│        │       │
│ 👤 Rizky           │        │        │        │        │       │
├────────────────────┼────────┼────────┼────────┼────────┤       │
│ Brainstorm Room    │        │        │  ██████│████████│       │
│ 👤 Budi, Andi      │        │        │        │        │       │
├────────────────────┼────────┼────────┼────────┼────────┤       │
│ ▷ Dependencies shown as arrows between bars            │       │
└─────────────────────────────────────────────────────────────────┘
```

**Fitur Timeline View:**
- Horizontal bar chart per task
- Drag bar edges → adjust start/end date
- Dependencies (arrows between tasks)
- Zoom: Day / Week / Month
- Color by assignee, priority, or status
- Milestone markers

---

## 2.4 Task Data Model (Enhanced untuk Multi-View)

```prisma
model Task {
  id            String       @id @default(cuid())
  teamId        String
  sprintId      String?      // optional: bisa standalone atau dalam sprint
  
  // Core
  title         String
  description   String?      @db.Text
  
  // Status & Priority
  status        TaskStatus   @default(TODO)
  priority      TaskPriority @default(MEDIUM)
  
  // Dates
  startDate     DateTime?
  dueDate       DateTime?
  completedAt   DateTime?
  
  // Assignment
  createdBy     String
  
  // Estimation
  estimation    Int?         // hours
  timeSpent     Int?         // hours tracked
  
  // Organization
  orderIndex    Int          @default(0)
  labels        TaskLabel[]
  
  // Metadata
  createdAt     DateTime     @default(now())
  updatedAt     DateTime     @updatedAt
  
  // Relations
  team          Team         @relation(fields: [teamId], references: [id], onDelete: Cascade)
  sprint        SprintPlan?  @relation(fields: [sprintId], references: [id])
  creator       User         @relation("taskCreator", fields: [createdBy], references: [id])
  assignees     TaskAssignee[]
  comments      TaskComment[]
  dependencies  TaskDependency[] @relation("dependentTask")
  dependents    TaskDependency[] @relation("dependencyTask")
  activities    TaskActivity[]
}

// Multiple assignees per task
model TaskAssignee {
  id       String @id @default(cuid())
  taskId   String
  userId   String
  
  task     Task   @relation(fields: [taskId], references: [id], onDelete: Cascade)
  user     User   @relation(fields: [userId], references: [id])
  
  @@unique([taskId, userId])
}

// Labels/Tags
model Label {
  id       String     @id @default(cuid())
  teamId   String
  name     String
  color    String     // hex color
  
  team     Team       @relation(fields: [teamId], references: [id], onDelete: Cascade)
  tasks    TaskLabel[]
  
  @@unique([teamId, name])
}

model TaskLabel {
  taskId   String
  labelId  String
  
  task     Task   @relation(fields: [taskId], references: [id], onDelete: Cascade)
  label    Label  @relation(fields: [labelId], references: [id], onDelete: Cascade)
  
  @@id([taskId, labelId])
}

// Task dependencies (for Timeline/Gantt)
model TaskDependency {
  id              String @id @default(cuid())
  dependentTaskId String // task yang bergantung
  dependencyTaskId String // task yang harus selesai duluan
  
  dependentTask   Task @relation("dependentTask", fields: [dependentTaskId], references: [id], onDelete: Cascade)
  dependencyTask  Task @relation("dependencyTask", fields: [dependencyTaskId], references: [id], onDelete: Cascade)
  
  @@unique([dependentTaskId, dependencyTaskId])
}

// Task comments
model TaskComment {
  id        String   @id @default(cuid())
  taskId    String
  userId    String
  content   String   @db.Text
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  task      Task     @relation(fields: [taskId], references: [id], onDelete: Cascade)
  user      User     @relation(fields: [userId], references: [id])
}

// Activity log
model TaskActivity {
  id        String   @id @default(cuid())
  taskId    String
  userId    String
  action    String   // 'status_changed', 'assigned', 'comment_added', etc.
  oldValue  String?
  newValue  String?
  createdAt DateTime @default(now())
  
  task      Task     @relation(fields: [taskId], references: [id], onDelete: Cascade)
}
```

---

# ═══════════════════════════════════════════
# PART 3: VISUAL FLOW BRAINSTORM (DIAGRAMS)
# ═══════════════════════════════════════════

## 3.1 Concept

Fitur **draw.io/Excalidraw-like** yang terintegrasi dengan AI untuk:
- Database schema brainstorming (ERD)
- Flow chart / sequence diagram
- System architecture diagram
- User flow / wireframe
- Mind map
- AI bisa **generate diagram** dari deskripsi text

---

## 3.2 Tech Choice: React Flow + Excalidraw

```
┌──────────────────────────────────────────────────────┐
│              DIAGRAM TOOL OPTIONS                     │
├──────────────┬───────────────┬────────────────────────┤
│ Option       │ Pros          │ Cons                   │
├──────────────┼───────────────┼────────────────────────┤
│ Excalidraw   │ Beautiful,    │ Heavy bundle (~1MB)    │
│              │ hand-drawn    │ Limited node types     │
│              │ Open source   │                        │
├──────────────┼───────────────┼────────────────────────┤
│ React Flow   │ Lightweight,  │ Need custom styling    │
│              │ node-based,   │ Less "artistic"        │
│              │ extensible    │                        │
├──────────────┼───────────────┼────────────────────────┤
│ tldraw       │ Full canvas,  │ Newer, less ecosystem  │
│              │ flexible      │                        │
├──────────────┴───────────────┴────────────────────────┤
│                                                        │
│ DECISION: React Flow untuk structured diagrams         │
│           (ERD, flowcharts, architecture)               │
│         + Excalidraw untuk freeform sketching           │
│           (wireframes, mind maps)                       │
│                                                        │
│ Alasan: React Flow cocok untuk node-edge diagrams      │
│         yang bisa di-generate AI (structured JSON).     │
│         Excalidraw untuk creative freeform drawing.     │
└────────────────────────────────────────────────────────┘
```

---

## 3.3 Diagram Types & AI Integration

### 🗃️ Database ERD Brainstorm

```
┌─────────────────────────────────────────────────────────────┐
│  🎨 Diagram: "E-Commerce DB"     [💾 Save] [📤 Export]     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ Sidebar:                  Canvas:                            │
│ ┌────────────┐                                              │
│ │ 🤖 AI      │    ┌──────────┐      ┌──────────┐           │
│ │ Generate   │    │  User    │      │  Order   │           │
│ │            │    │──────────│      │──────────│           │
│ │ "Generate  │    │ id       │─────▶│ id       │           │
│ │  ERD for   │    │ email    │      │ userId   │           │
│ │  e-commerce│    │ name     │      │ total    │           │
│ │  with      │    │ password │      │ status   │           │
│ │  users,    │    └──────────┘      │ createdAt│           │
│ │  products, │                       └──────────┘           │
│ │  orders"   │                            │                  │
│ │            │                            ▼                  │
│ │ [Generate] │               ┌────────────────┐             │
│ │            │               │  OrderItem     │             │
│ │────────────│               │────────────────│             │
│ │ 📦 Nodes   │               │ id             │             │
│ │  + Table   │               │ orderId        │             │
│ │  + Enum    │      ┌───────▶│ productId      │             │
│ │  + Note    │      │        │ quantity        │             │
│ │            │      │        │ price           │             │
│ │ 🔗 Edges   │      │        └────────────────┘             │
│ │  + 1:1     │ ┌────┴─────┐                                │
│ │  + 1:N     │ │ Product  │                                │
│ │  + N:M     │ │──────────│                                │
│ │            │ │ id       │                                │
│ └────────────┘ │ name     │                                │
│                │ price    │                                │
│                │ stock    │                                │
│                └──────────┘                                │
│                                                              │
│ [🤖 "Add payment system to this diagram"]                   │
└─────────────────────────────────────────────────────────────┘
```

### AI → Diagram Generation Flow

```
User: "Buatkan ERD untuk e-commerce dengan users, products, orders"
                          │
                          ▼
            ┌─────────────────────────┐
            │   AI generates JSON     │
            │   structured output     │
            └─────────────────────────┘
                          │
                          ▼
{
  "nodes": [
    {
      "id": "user",
      "type": "table",
      "data": {
        "name": "User",
        "columns": [
          { "name": "id", "type": "cuid", "pk": true },
          { "name": "email", "type": "String", "unique": true },
          { "name": "name", "type": "String" },
          { "name": "passwordHash", "type": "String" }
        ]
      },
      "position": { "x": 100, "y": 100 }
    },
    {
      "id": "order",
      "type": "table",
      "data": {
        "name": "Order",
        "columns": [
          { "name": "id", "type": "cuid", "pk": true },
          { "name": "userId", "type": "String", "fk": "User.id" },
          { "name": "total", "type": "Float" },
          { "name": "status", "type": "OrderStatus" }
        ]
      },
      "position": { "x": 400, "y": 100 }
    }
  ],
  "edges": [
    {
      "source": "user",
      "target": "order",
      "type": "one-to-many",
      "label": "has many"
    }
  ]
}
                          │
                          ▼
            ┌─────────────────────────┐
            │  React Flow renders     │
            │  interactive diagram    │
            └─────────────────────────┘
```

### Diagram Data Model

```prisma
model Diagram {
  id          String       @id @default(cuid())
  teamId      String
  createdBy   String
  title       String
  type        DiagramType
  data        Json         // React Flow nodes + edges JSON
  thumbnail   String?      // auto-generated preview image
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt

  team    Team @relation(fields: [teamId], references: [id], onDelete: Cascade)
  creator User @relation(fields: [createdBy], references: [id])
}

enum DiagramType {
  ERD              // Entity Relationship Diagram
  FLOWCHART        // Flow chart
  ARCHITECTURE     // System architecture
  SEQUENCE         // Sequence diagram
  MINDMAP          // Mind map
  USERFLOW         // User flow / wireframe
  FREEFORM         // Excalidraw freeform
}
```

### Supported Diagram Types

| Type | Tool | AI Can Generate? | Description |
|------|------|:---:|-------------|
| ERD | React Flow | ✅ | Database entity relationship |
| Flowchart | React Flow | ✅ | Process flow with decisions |
| Architecture | React Flow | ✅ | System component diagram |
| Sequence | React Flow | ✅ | API/service interaction flow |
| Mind Map | React Flow | ✅ | Hierarchical idea mapping |
| User Flow | React Flow | ✅ | UI navigation flow |
| Freeform | Excalidraw | ❌ | Hand-drawn sketches |

### AI Diagram Actions

```
🤖 AI Actions di Diagram:
├── "Generate dari deskripsi" → Text → Diagram JSON → Render
├── "Tambah entity/node"      → Extend existing diagram
├── "Suggest relasi"          → AI analyze nodes, suggest edges
├── "Optimize layout"         → Auto-arrange nodes
├── "Export ke Prisma schema" → ERD → .prisma file
├── "Export ke SQL"           → ERD → CREATE TABLE statements
└── "Explain diagram"        → AI describe what the diagram shows
```

---

# ═══════════════════════════════════════════
# PART 4: PROJECT CALENDAR
# ═══════════════════════════════════════════

## 4.1 Calendar Features

### Data Sources (apa yang muncul di calendar)

```
Calendar menampilkan:
├── 📋 Tasks (due dates, start-end dates)
├── 🏃 Sprint milestones (start/end dates)
├── 🧠 Brainstorm scheduled sessions
├── 📅 Custom events (meetings, deadlines)
└── 🎯 Project milestones
```

### Calendar Events Model

```prisma
model CalendarEvent {
  id          String        @id @default(cuid())
  teamId      String
  createdBy   String
  title       String
  description String?
  type        EventType
  startDate   DateTime
  endDate     DateTime?
  allDay      Boolean       @default(false)
  color       String?       // custom color
  
  // Link to other entities (optional)
  taskId      String?       // link to task
  sprintId    String?       // link to sprint
  sessionId   String?       // link to brainstorm session
  
  // Recurrence (future)
  recurring   Boolean       @default(false)
  
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt

  team    Team @relation(fields: [teamId], references: [id], onDelete: Cascade)
  creator User @relation(fields: [createdBy], references: [id])
}

enum EventType {
  TASK_DEADLINE
  SPRINT_MILESTONE
  BRAINSTORM_SESSION
  CUSTOM_EVENT
  MEETING
}
```

### Calendar Tech

```
Library: @fullcalendar/react
- Month / Week / Day views
- Drag & drop events
- Resize events (change duration)
- Click to create
- Color coding by type/priority
- Integration dengan Task due dates (auto-sync)
```

---

# ═══════════════════════════════════════════
# PART 5: DETAILED TECH STACK
# ═══════════════════════════════════════════

## 5.1 Complete Tech Stack dengan Versi & Alasan

### Frontend

| Technology | Version | Purpose | Alasan Dipilih |
|-----------|---------|---------|----------------|
| **Next.js** | 15+ | Framework | App Router, RSC, Server Actions, Image optimization |
| **React** | 19+ | UI Library | Concurrent features, Suspense, Transitions |
| **TypeScript** | 5.4+ | Language | Type safety, better DX, shared types |
| **Tailwind CSS** | 4+ | Styling | Utility-first, JIT, small bundle, rapid development |
| **shadcn/ui** | latest | Component library | Accessible, customizable, copy-paste (bukan dependency) |
| **Zustand** | 5+ | Global state | Lightweight (1KB), no boilerplate, devtools |
| **TanStack Query** | 5+ | Server state | Caching, background refetch, optimistic updates, infinite scroll |
| **React Flow** | 12+ | Diagrams | Node-based diagrams, extensible, TypeScript native |
| **Excalidraw** | latest | Freeform draw | Hand-drawn style whiteboard, collaborative |
| **FullCalendar** | 6+ | Calendar view | Feature-rich, multiple views, drag-drop |
| **Tiptap** | 2+ | Rich text editor | ProseMirror-based, extensible, collaborative-ready |
| **Socket.io-client** | 4+ | Realtime | Auto-reconnect, rooms, namespaces |
| **@dnd-kit** | 6+ | Drag & drop | Accessible, performant, sortable lists & kanban |
| **date-fns** | 3+ | Date utils | Tree-shakeable, immutable, comprehensive |
| **Recharts** | 2+ | Charts | AI usage dashboard, sprint analytics |
| **Sonner** | 1+ | Toast notifications | Beautiful, stackable, accessible |
| **nuqs** | 2+ | URL state | Type-safe URL search params, SSR-compatible |

### Backend

| Technology | Version | Purpose | Alasan Dipilih |
|-----------|---------|---------|----------------|
| **Node.js** | 22 LTS | Runtime | Native fetch, ESM, performance, ecosystem |
| **Fastify** | 5+ | HTTP Framework | 2x faster than Express, plugin system, JSON schema validation |
| **TypeScript** | 5.4+ | Language | Shared types with frontend |
| **Prisma** | 6+ | ORM | Type-safe queries, migrations, studio, relation handling |
| **PostgreSQL** | 16+ | Database | ACID, JSON support, full-text search, mature |
| **Redis** | 7+ | Cache/Session | Token blacklist, rate limiting, pub/sub, caching |
| **Socket.io** | 4+ | WebSocket | Rooms, namespaces, auto-reconnect, Redis adapter |
| **Zod** | 3+ | Validation | Runtime validation + TypeScript inference |
| **jose** | 5+ | JWT | Edge-compatible, no native deps, standards-compliant |
| **bcryptjs** | 2+ | Password hash | Pure JS bcrypt, no native compilation needed |
| **pino** | 9+ | Logger | Fastest Node.js logger, JSON output, Fastify native |
| **@fastify/rate-limit** | 9+ | Rate limiting | Per-route, Redis-backed, customizable |
| **@fastify/cors** | 9+ | CORS | Strict origin control |
| **@fastify/helmet** | 11+ | Security headers | CSP, HSTS, XSS protection headers |
| **@fastify/multipart** | 8+ | File upload | Avatar upload, attachment support |

### AI SDKs

| SDK | Purpose |
|-----|---------|
| **openai** | OpenAI API (GPT models) |
| **@anthropic-ai/sdk** | Claude API |
| **@google/generative-ai** | Gemini API |
| **groq-sdk** | Groq API (fast inference) |
| **@mistralai/mistralai** | Mistral API |

### DevOps & Tooling

| Technology | Purpose |
|-----------|---------|
| **pnpm** | Package manager (fast, disk-efficient, strict) |
| **Turborepo** | Monorepo build system (caching, parallel tasks) |
| **Docker** | Containerization |
| **Docker Compose** | Local development (PostgreSQL + Redis) |
| **ESLint** | Linting (flat config) |
| **Prettier** | Code formatting |
| **Husky** | Git hooks (pre-commit lint, pre-push test) |
| **lint-staged** | Run linters on staged files only |
| **Vitest** | Unit & integration testing |
| **Playwright** | E2E testing (future) |
| **GitHub Actions** | CI/CD pipeline |

---

## 5.2 System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                          CLIENTS                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                          │
│  │ Desktop  │  │ Tablet   │  │ Mobile   │  (Responsive Web App)    │
│  │ Browser  │  │ Browser  │  │ Browser  │                          │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘                          │
│       └──────────────┼──────────────┘                                │
└──────────────────────┼──────────────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────────────┐
│                        NGINX (Reverse Proxy)                         │
│                  SSL termination + static files                      │
└─────────────┬─────────────────────────┬──────────────────────────────┘
              │                         │
              ▼                         ▼
┌─────────────────────┐   ┌─────────────────────────┐
│   Next.js Frontend  │   │   Fastify Backend API   │
│   (Port 3000)       │   │   (Port 4000)           │
│                     │   │                         │
│ • Server Components │   │ • REST API              │
│ • Client Components │   │ • SSE (AI streaming)    │
│ • Server Actions    │   │ • WebSocket (Socket.io) │
│ • React Flow        │   │ • Auth (JWT)            │
│ • Excalidraw        │   │ • File uploads          │
│ • FullCalendar      │   │                         │
└─────────────────────┘   └──────┬──────┬───────────┘
                                  │      │
                    ┌─────────────┘      └──────────────┐
                    ▼                                    ▼
         ┌──────────────────┐                 ┌──────────────────┐
         │   PostgreSQL 16  │                 │    Redis 7       │
         │                  │                 │                  │
         │ • Users          │                 │ • Session cache  │
         │ • Teams          │                 │ • Rate limiting  │
         │ • Tasks          │                 │ • Token blacklist│
         │ • Brainstorms    │                 │ • Socket.io      │
         │ • Diagrams       │                 │   adapter        │
         │ • Calendar events│                 │ • AI response    │
         │ • Notes          │                 │   cache          │
         └──────────────────┘                 └──────────────────┘
                                                       │
                    ┌──────────────────────────────────┘
                    ▼
         ┌──────────────────────────────────────────────┐
         │            AI PROVIDER LAYER                  │
         │                                               │
         │  ┌──────┐ ┌──────┐ ┌───────┐ ┌──────┐       │
         │  │OpenAI│ │Claude│ │Gemini │ │ Groq │  ...  │
         │  └──────┘ └──────┘ └───────┘ └──────┘       │
         │                                               │
         │  User's own API keys (BYOK)                  │
         │  Encrypted at rest, decrypted only in-memory │
         └──────────────────────────────────────────────┘
```

---

# ═══════════════════════════════════════════
# PART 6: COMPLETE FOLDER STRUCTURE
# ═══════════════════════════════════════════

## 6.1 Root Monorepo

```
brainforge/
│
├── apps/
│   ├── web/                          # Next.js Frontend
│   └── api/                          # Fastify Backend
│
├── packages/
│   ├── ui/                           # Shared UI components
│   ├── types/                        # Shared TypeScript types
│   ├── validators/                   # Shared Zod schemas
│   └── config/                       # Shared configs
│
├── infra/
│   ├── docker/
│   │   ├── Dockerfile.web
│   │   ├── Dockerfile.api
│   │   ├── Dockerfile.nginx
│   │   └── docker-compose.yml
│   └── nginx/
│       └── nginx.conf
│
├── docs/
│   ├── project-plan.md
│   ├── brainstorming.md
│   ├── api-reference.md
│   └── setup-guide.md
│
├── .github/
│   └── workflows/
│       ├── ci.yml                    # Lint + Test on PR
│       └── deploy.yml                # Deploy on merge to main
│
├── .env.example
├── .gitignore
├── .prettierrc
├── eslint.config.mjs
├── turbo.json
├── pnpm-workspace.yaml
├── package.json
└── README.md
```

---

## 6.2 Frontend Structure (apps/web) — DETAILED

```
apps/web/
├── public/
│   ├── favicon.ico
│   ├── logo.svg
│   └── og-image.png
│
├── src/
│   ├── app/                                    # Next.js App Router
│   │   ├── (auth)/                             # Auth layout group
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   ├── register/
│   │   │   │   └── page.tsx
│   │   │   └── layout.tsx                      # Minimal layout (no sidebar)
│   │   │
│   │   ├── (dashboard)/                        # Dashboard layout group
│   │   │   ├── layout.tsx                      # App shell: sidebar + header
│   │   │   ├── page.tsx                        # Home / team overview
│   │   │   │
│   │   │   ├── teams/
│   │   │   │   ├── [teamId]/
│   │   │   │   │   ├── layout.tsx              # Team-scoped layout
│   │   │   │   │   ├── page.tsx                # Team dashboard
│   │   │   │   │   │
│   │   │   │   │   ├── tasks/
│   │   │   │   │   │   ├── page.tsx            # Task list (default: List view)
│   │   │   │   │   │   └── [taskId]/
│   │   │   │   │   │       └── page.tsx        # Task detail modal/page
│   │   │   │   │   │
│   │   │   │   │   ├── brainstorm/
│   │   │   │   │   │   ├── page.tsx            # Sessions list
│   │   │   │   │   │   ├── new/
│   │   │   │   │   │   │   └── page.tsx        # Create session
│   │   │   │   │   │   └── [sessionId]/
│   │   │   │   │   │       └── page.tsx        # Active brainstorm room
│   │   │   │   │   │
│   │   │   │   │   ├── calendar/
│   │   │   │   │   │   └── page.tsx            # Calendar view
│   │   │   │   │   │
│   │   │   │   │   ├── diagrams/
│   │   │   │   │   │   ├── page.tsx            # Diagrams list
│   │   │   │   │   │   ├── new/
│   │   │   │   │   │   │   └── page.tsx        # Create diagram (choose type)
│   │   │   │   │   │   └── [diagramId]/
│   │   │   │   │   │       └── page.tsx        # Diagram editor (React Flow/Excalidraw)
│   │   │   │   │   │
│   │   │   │   │   ├── notes/
│   │   │   │   │   │   ├── page.tsx            # Notes list
│   │   │   │   │   │   └── [noteId]/
│   │   │   │   │   │       └── page.tsx        # Note editor (Tiptap)
│   │   │   │   │   │
│   │   │   │   │   ├── sprints/
│   │   │   │   │   │   ├── page.tsx            # Sprint plans list
│   │   │   │   │   │   ├── new/
│   │   │   │   │   │   │   └── page.tsx        # AI generate sprint
│   │   │   │   │   │   └── [sprintId]/
│   │   │   │   │   │       └── page.tsx        # Sprint detail + kanban
│   │   │   │   │   │
│   │   │   │   │   └── settings/
│   │   │   │   │       └── page.tsx            # Team settings
│   │   │   │   │
│   │   │   │   └── new/
│   │   │   │       └── page.tsx                # Create team
│   │   │   │
│   │   │   ├── settings/
│   │   │   │   ├── page.tsx                    # General settings
│   │   │   │   ├── profile/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── ai-keys/
│   │   │   │       └── page.tsx                # Manage AI keys
│   │   │   │
│   │   │   ├── my-tasks/
│   │   │   │   └── page.tsx                    # Tasks across all teams
│   │   │   │
│   │   │   └── ai-usage/
│   │   │       └── page.tsx                    # AI usage dashboard
│   │   │
│   │   ├── invite/
│   │   │   └── [token]/
│   │   │       └── page.tsx                    # Accept invitation
│   │   │
│   │   ├── layout.tsx                          # Root layout
│   │   ├── page.tsx                            # Landing page
│   │   ├── not-found.tsx
│   │   └── globals.css
│   │
│   ├── components/
│   │   ├── ui/                                 # shadcn/ui components
│   │   │   ├── button.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── dropdown-menu.tsx
│   │   │   ├── input.tsx
│   │   │   ├── select.tsx
│   │   │   ├── table.tsx
│   │   │   ├── tabs.tsx
│   │   │   ├── toast.tsx
│   │   │   ├── avatar.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── card.tsx
│   │   │   ├── command.tsx                     # Command palette (Cmd+K)
│   │   │   ├── calendar.tsx                    # Date picker calendar
│   │   │   ├── popover.tsx
│   │   │   ├── sheet.tsx                       # Side panel
│   │   │   ├── skeleton.tsx
│   │   │   └── tooltip.tsx
│   │   │
│   │   ├── layout/
│   │   │   ├── app-shell.tsx                   # Main layout wrapper
│   │   │   ├── sidebar.tsx                     # Collapsible sidebar
│   │   │   ├── sidebar-nav.tsx                 # Nav items
│   │   │   ├── sidebar-team-list.tsx           # Team/space switcher
│   │   │   ├── header.tsx                      # Top bar
│   │   │   ├── header-search.tsx               # Global search (Cmd+K)
│   │   │   ├── header-user-menu.tsx            # User dropdown
│   │   │   ├── header-notifications.tsx        # Notification bell
│   │   │   └── breadcrumb.tsx
│   │   │
│   │   ├── tasks/
│   │   │   ├── task-list-view.tsx              # List view (table-like)
│   │   │   ├── task-board-view.tsx             # Kanban board
│   │   │   ├── task-calendar-view.tsx          # Calendar integration
│   │   │   ├── task-timeline-view.tsx          # Gantt chart
│   │   │   ├── task-view-switcher.tsx          # View tabs component
│   │   │   ├── task-card.tsx                   # Card for board view
│   │   │   ├── task-row.tsx                    # Row for list view
│   │   │   ├── task-detail-panel.tsx           # Side panel detail
│   │   │   ├── task-create-dialog.tsx          # Quick create
│   │   │   ├── task-filters.tsx                # Filter toolbar
│   │   │   ├── task-group-header.tsx           # Group by header
│   │   │   ├── task-priority-badge.tsx
│   │   │   ├── task-status-badge.tsx
│   │   │   ├── task-assignee-avatar.tsx
│   │   │   └── task-comment-list.tsx
│   │   │
│   │   ├── brainstorm/
│   │   │   ├── brainstorm-room.tsx             # Main chat-like room
│   │   │   ├── brainstorm-message.tsx          # Single message
│   │   │   ├── brainstorm-input.tsx            # Message input + mode
│   │   │   ├── brainstorm-mode-selector.tsx    # Switch mode
│   │   │   ├── brainstorm-pinned.tsx           # Pinned messages panel
│   │   │   ├── brainstorm-session-card.tsx     # Session list card
│   │   │   ├── brainstorm-presence.tsx         # Who's online
│   │   │   └── brainstorm-export.tsx           # Export dialog
│   │   │
│   │   ├── diagrams/
│   │   │   ├── diagram-editor.tsx              # Main editor wrapper
│   │   │   ├── diagram-react-flow.tsx          # React Flow canvas
│   │   │   ├── diagram-excalidraw.tsx          # Excalidraw canvas
│   │   │   ├── diagram-toolbar.tsx             # Tools sidebar
│   │   │   ├── diagram-ai-panel.tsx            # AI generation panel
│   │   │   ├── diagram-node-table.tsx          # ERD table node
│   │   │   ├── diagram-node-process.tsx        # Flowchart process node
│   │   │   ├── diagram-node-decision.tsx       # Flowchart decision node
│   │   │   ├── diagram-node-service.tsx        # Architecture service node
│   │   │   ├── diagram-minimap.tsx             # Overview minimap
│   │   │   └── diagram-export.tsx              # Export (PNG/SVG/JSON/Prisma)
│   │   │
│   │   ├── calendar/
│   │   │   ├── project-calendar.tsx            # FullCalendar wrapper
│   │   │   ├── calendar-event.tsx              # Custom event render
│   │   │   ├── calendar-sidebar.tsx            # Event type filter
│   │   │   ├── calendar-create-event.tsx       # Create event dialog
│   │   │   └── calendar-toolbar.tsx            # Month/Week/Day toggle
│   │   │
│   │   ├── notes/
│   │   │   ├── note-editor.tsx                 # Tiptap editor wrapper
│   │   │   ├── note-toolbar.tsx                # Formatting toolbar
│   │   │   ├── note-ai-assist.tsx              # AI actions on selection
│   │   │   ├── note-version-history.tsx        # History sidebar
│   │   │   └── note-card.tsx                   # Note list card
│   │   │
│   │   ├── sprint/
│   │   │   ├── sprint-create-form.tsx          # AI generation form
│   │   │   ├── sprint-task-board.tsx           # Kanban for sprint
│   │   │   ├── sprint-progress.tsx             # Progress bar/charts
│   │   │   └── sprint-export.tsx
│   │   │
│   │   ├── team/
│   │   │   ├── team-create-form.tsx
│   │   │   ├── team-member-list.tsx
│   │   │   ├── team-invite-dialog.tsx
│   │   │   ├── team-role-badge.tsx
│   │   │   └── team-switcher.tsx               # Dropdown team selector
│   │   │
│   │   ├── ai/
│   │   │   ├── ai-key-form.tsx                 # Add/edit AI key
│   │   │   ├── ai-key-list.tsx                 # Manage keys
│   │   │   ├── ai-provider-selector.tsx        # Choose provider
│   │   │   ├── ai-model-selector.tsx           # Choose model
│   │   │   ├── ai-usage-chart.tsx              # Usage chart
│   │   │   ├── ai-cost-estimator.tsx           # Before-run cost estimate
│   │   │   └── ai-streaming-text.tsx           # Streaming text renderer
│   │   │
│   │   └── shared/
│   │       ├── empty-state.tsx                 # No data illustration
│   │       ├── loading-skeleton.tsx
│   │       ├── error-boundary.tsx
│   │       ├── confirm-dialog.tsx
│   │       ├── page-header.tsx
│   │       ├── data-table.tsx                  # Reusable data table
│   │       ├── color-picker.tsx
│   │       └── markdown-renderer.tsx
│   │
│   ├── hooks/
│   │   ├── use-auth.ts                         # Auth state & actions
│   │   ├── use-team.ts                         # Current team context
│   │   ├── use-tasks.ts                        # Task CRUD hooks
│   │   ├── use-brainstorm.ts                   # Brainstorm hooks
│   │   ├── use-diagrams.ts                     # Diagram hooks
│   │   ├── use-calendar.ts                     # Calendar hooks
│   │   ├── use-notes.ts                        # Notes hooks
│   │   ├── use-ai-stream.ts                    # SSE stream hook
│   │   ├── use-socket.ts                       # Socket.io hook
│   │   ├── use-debounce.ts
│   │   ├── use-local-storage.ts
│   │   ├── use-media-query.ts                  # Responsive
│   │   └── use-keyboard-shortcut.ts            # Cmd+K, etc
│   │
│   ├── lib/
│   │   ├── api.ts                              # Fetch wrapper (base URL, auth headers)
│   │   ├── socket.ts                           # Socket.io client instance
│   │   ├── utils.ts                            # cn(), formatDate(), etc
│   │   ├── constants.ts                        # App-wide constants
│   │   └── query-keys.ts                       # TanStack Query key factory
│   │
│   ├── store/
│   │   ├── auth.store.ts                       # Auth state (Zustand)
│   │   ├── team.store.ts                       # Active team
│   │   ├── sidebar.store.ts                    # Sidebar collapse state
│   │   ├── task-view.store.ts                  # Active view per team
│   │   └── notification.store.ts               # Notification state
│   │
│   └── types/
│       └── index.ts                            # Re-export from @brainforge/types
│
├── tailwind.config.ts
├── next.config.mjs
├── tsconfig.json
├── components.json                             # shadcn/ui config
└── package.json
```

---

## 6.3 Backend Structure (apps/api) — DETAILED

```
apps/api/
├── src/
│   ├── modules/                                # Feature modules (Fastify plugins)
│   │   │
│   │   ├── auth/
│   │   │   ├── auth.controller.ts              # Route handlers
│   │   │   ├── auth.service.ts                 # Business logic
│   │   │   ├── auth.schema.ts                  # Zod request/response schemas
│   │   │   ├── auth.routes.ts                  # Fastify route registration
│   │   │   └── auth.test.ts                    # Unit tests
│   │   │
│   │   ├── user/
│   │   │   ├── user.controller.ts
│   │   │   ├── user.service.ts
│   │   │   ├── user.schema.ts
│   │   │   ├── user.routes.ts
│   │   │   └── user.test.ts
│   │   │
│   │   ├── team/
│   │   │   ├── team.controller.ts
│   │   │   ├── team.service.ts
│   │   │   ├── team.schema.ts
│   │   │   ├── team.routes.ts
│   │   │   ├── invitation.service.ts           # Invitation logic
│   │   │   └── team.test.ts
│   │   │
│   │   ├── task/
│   │   │   ├── task.controller.ts
│   │   │   ├── task.service.ts
│   │   │   ├── task.schema.ts
│   │   │   ├── task.routes.ts
│   │   │   └── task.test.ts
│   │   │
│   │   ├── brainstorm/
│   │   │   ├── brainstorm.controller.ts
│   │   │   ├── brainstorm.service.ts
│   │   │   ├── brainstorm.schema.ts
│   │   │   ├── brainstorm.routes.ts
│   │   │   ├── brainstorm.prompts.ts           # System prompts per mode
│   │   │   └── brainstorm.test.ts
│   │   │
│   │   ├── diagram/
│   │   │   ├── diagram.controller.ts
│   │   │   ├── diagram.service.ts
│   │   │   ├── diagram.schema.ts
│   │   │   ├── diagram.routes.ts
│   │   │   ├── diagram.prompts.ts              # AI diagram generation prompts
│   │   │   └── diagram.test.ts
│   │   │
│   │   ├── calendar/
│   │   │   ├── calendar.controller.ts
│   │   │   ├── calendar.service.ts
│   │   │   ├── calendar.schema.ts
│   │   │   ├── calendar.routes.ts
│   │   │   └── calendar.test.ts
│   │   │
│   │   ├── sprint/
│   │   │   ├── sprint.controller.ts
│   │   │   ├── sprint.service.ts
│   │   │   ├── sprint.schema.ts
│   │   │   ├── sprint.routes.ts
│   │   │   ├── sprint.prompts.ts
│   │   │   └── sprint.test.ts
│   │   │
│   │   ├── note/
│   │   │   ├── note.controller.ts
│   │   │   ├── note.service.ts
│   │   │   ├── note.schema.ts
│   │   │   ├── note.routes.ts
│   │   │   └── note.test.ts
│   │   │
│   │   └── ai-key/
│   │       ├── ai-key.controller.ts
│   │       ├── ai-key.service.ts
│   │       ├── ai-key.schema.ts
│   │       ├── ai-key.routes.ts
│   │       └── ai-key.test.ts
│   │
│   ├── ai/                                     # AI Provider Layer
│   │   ├── providers/
│   │   │   ├── base.provider.ts                # Abstract base class
│   │   │   ├── openai.provider.ts
│   │   │   ├── claude.provider.ts
│   │   │   ├── gemini.provider.ts
│   │   │   ├── groq.provider.ts
│   │   │   ├── mistral.provider.ts
│   │   │   ├── deepseek.provider.ts
│   │   │   ├── openrouter.provider.ts
│   │   │   └── ollama.provider.ts              # Local provider
│   │   │
│   │   ├── prompts/
│   │   │   ├── brainstorm/
│   │   │   │   ├── idea-generator.prompt.ts
│   │   │   │   ├── feature-breakdown.prompt.ts
│   │   │   │   ├── project-roadmap.prompt.ts
│   │   │   │   └── architecture.prompt.ts
│   │   │   │
│   │   │   ├── diagram/
│   │   │   │   ├── erd-generator.prompt.ts
│   │   │   │   ├── flowchart-generator.prompt.ts
│   │   │   │   ├── architecture-diagram.prompt.ts
│   │   │   │   └── mindmap-generator.prompt.ts
│   │   │   │
│   │   │   ├── sprint/
│   │   │   │   └── sprint-planner.prompt.ts
│   │   │   │
│   │   │   └── notes/
│   │   │       └── note-assist.prompt.ts
│   │   │
│   │   ├── ai.service.ts                       # Main AI service (provider resolution)
│   │   ├── ai.registry.ts                      # Provider & model registry
│   │   └── ai.types.ts                         # AI-specific types
│   │
│   ├── lib/
│   │   ├── prisma.ts                           # Prisma client singleton
│   │   ├── redis.ts                            # Redis client
│   │   ├── encryption.ts                       # AES-256-GCM encrypt/decrypt
│   │   ├── logger.ts                           # Pino logger config
│   │   ├── errors.ts                           # Custom error classes
│   │   └── utils.ts                            # Utility functions
│   │
│   ├── plugins/
│   │   ├── auth.plugin.ts                      # JWT verification decorator
│   │   ├── rbac.plugin.ts                      # Role-based access control
│   │   ├── rate-limit.plugin.ts                # Rate limiting config
│   │   ├── cors.plugin.ts                      # CORS config
│   │   ├── helmet.plugin.ts                    # Security headers
│   │   ├── socket.plugin.ts                    # Socket.io setup
│   │   ├── swagger.plugin.ts                   # API documentation
│   │   └── error-handler.plugin.ts             # Global error handler
│   │
│   ├── middleware/
│   │   ├── auth.middleware.ts                   # Verify JWT, attach user
│   │   ├── team.middleware.ts                   # Verify team membership
│   │   └── log-filter.middleware.ts             # Filter sensitive data from logs
│   │
│   ├── socket/
│   │   ├── socket.handler.ts                   # Socket event handlers
│   │   ├── brainstorm.socket.ts                # Brainstorm room realtime
│   │   ├── diagram.socket.ts                   # Diagram collaboration
│   │   └── notification.socket.ts              # Push notifications
│   │
│   ├── app.ts                                  # Fastify app factory
│   └── server.ts                               # Entry point (start server)
│
├── prisma/
│   ├── schema.prisma                           # Database schema
│   ├── migrations/                             # Auto-generated migrations
│   └── seed.ts                                 # Seed data for development
│
├── tests/
│   ├── setup.ts                                # Test setup (test DB, etc)
│   ├── helpers.ts                              # Test utilities
│   └── integration/                            # Integration tests
│       ├── auth.test.ts
│       ├── team.test.ts
│       └── task.test.ts
│
├── tsconfig.json
├── vitest.config.ts
└── package.json
```

---

## 6.4 Shared Packages — DETAILED

### packages/types

```
packages/types/
├── src/
│   ├── index.ts                # Re-export semua
│   ├── user.ts                 # User, UserProfile
│   ├── team.ts                 # Team, TeamMember, TeamRole
│   ├── task.ts                 # Task, TaskStatus, TaskPriority
│   ├── brainstorm.ts           # BrainstormSession, BrainstormMessage
│   ├── diagram.ts              # Diagram, DiagramNode, DiagramEdge
│   ├── calendar.ts             # CalendarEvent, EventType
│   ├── sprint.ts               # SprintPlan, SprintTask
│   ├── note.ts                 # Note, NoteHistory
│   ├── ai.ts                   # AIProvider, ChatParams, StreamChunk, ModelInfo
│   └── api.ts                  # ApiResponse<T>, PaginatedResponse<T>, ApiError
├── tsconfig.json
└── package.json
```

### packages/validators

```
packages/validators/
├── src/
│   ├── index.ts
│   ├── auth.ts                 # loginSchema, registerSchema
│   ├── team.ts                 # createTeamSchema, inviteSchema
│   ├── task.ts                 # createTaskSchema, updateTaskSchema
│   ├── brainstorm.ts           # createSessionSchema, sendMessageSchema
│   ├── diagram.ts              # createDiagramSchema, updateDiagramSchema
│   ├── calendar.ts             # createEventSchema
│   ├── sprint.ts               # createSprintSchema
│   ├── note.ts                 # createNoteSchema
│   └── ai-key.ts               # addAIKeySchema
├── tsconfig.json
└── package.json
```

### packages/ui

```
packages/ui/
├── src/
│   ├── index.ts
│   ├── logo.tsx                # BrainForge logo
│   ├── theme-toggle.tsx        # Dark/light mode
│   ├── brand-colors.ts         # Brand color constants
│   └── icons.tsx               # Custom icon set
├── tsconfig.json
└── package.json
```

### packages/config

```
packages/config/
├── eslint/
│   └── index.mjs               # Shared ESLint flat config
├── typescript/
│   ├── base.json                # Base tsconfig
│   ├── nextjs.json              # Next.js tsconfig
│   └── node.json                # Node.js tsconfig
├── prettier/
│   └── index.mjs               # Shared Prettier config
└── package.json
```

---

# ═══════════════════════════════════════════
# PART 7: COMPLETE API ENDPOINTS
# ═══════════════════════════════════════════

## 7.1 Auth

```
POST   /api/auth/register              # Register user baru
POST   /api/auth/login                 # Login → access + refresh token
POST   /api/auth/refresh               # Refresh access token
POST   /api/auth/logout                # Blacklist refresh token
GET    /api/auth/me                    # Current user profile
```

## 7.2 User

```
PATCH  /api/users/profile              # Update name, avatar
PATCH  /api/users/password             # Change password
DELETE /api/users/account              # Delete account
```

## 7.3 Team

```
POST   /api/teams                      # Create team
GET    /api/teams                      # List my teams
GET    /api/teams/:id                  # Team detail + members
PATCH  /api/teams/:id                  # Update team (owner/admin)
DELETE /api/teams/:id                  # Delete team (owner)

POST   /api/teams/:id/invitations      # Send invite
GET    /api/teams/:id/invitations      # List pending invites
DELETE /api/teams/:id/invitations/:iid # Revoke invite
POST   /api/teams/join/:token          # Accept invite

GET    /api/teams/:id/members          # List members
PATCH  /api/teams/:id/members/:uid     # Change role
DELETE /api/teams/:id/members/:uid     # Remove member
```

## 7.4 Tasks (ClickUp-like)

```
POST   /api/teams/:id/tasks                    # Create task
GET    /api/teams/:id/tasks                    # List tasks (filter, sort, group)
GET    /api/teams/:id/tasks/:taskId            # Task detail
PATCH  /api/teams/:id/tasks/:taskId            # Update task
DELETE /api/teams/:id/tasks/:taskId            # Delete task

PATCH  /api/teams/:id/tasks/:taskId/status     # Quick status change
PATCH  /api/teams/:id/tasks/:taskId/assignees  # Update assignees
POST   /api/teams/:id/tasks/:taskId/comments   # Add comment
GET    /api/teams/:id/tasks/:taskId/comments   # List comments
GET    /api/teams/:id/tasks/:taskId/activity   # Activity log

PATCH  /api/teams/:id/tasks/reorder            # Bulk reorder (drag-drop)

GET    /api/users/my-tasks                     # My tasks across all teams
```

## 7.5 AI Keys

```
POST   /api/ai/keys                    # Add AI key
GET    /api/ai/keys                    # List keys (masked)
PATCH  /api/ai/keys/:id               # Update label, set active
DELETE /api/ai/keys/:id               # Remove key
POST   /api/ai/keys/:id/validate      # Test key validity
GET    /api/ai/providers              # List supported providers + models
GET    /api/ai/usage                  # My AI usage stats
```

## 7.6 Brainstorm

```
POST   /api/teams/:id/brainstorm/sessions              # Create session
GET    /api/teams/:id/brainstorm/sessions              # List sessions
GET    /api/teams/:id/brainstorm/sessions/:sid          # Session + messages
DELETE /api/teams/:id/brainstorm/sessions/:sid          # Delete session
POST   /api/teams/:id/brainstorm/sessions/:sid/messages # Send message → AI
GET    /api/teams/:id/brainstorm/sessions/:sid/stream   # SSE stream
POST   /api/teams/:id/brainstorm/sessions/:sid/pin/:mid # Pin/unpin
POST   /api/teams/:id/brainstorm/sessions/:sid/export   # Export markdown
POST   /api/teams/:id/brainstorm/sessions/:sid/fork     # Fork session
```

## 7.7 Diagrams

```
POST   /api/teams/:id/diagrams                # Create diagram
GET    /api/teams/:id/diagrams                # List diagrams
GET    /api/teams/:id/diagrams/:did            # Get diagram data
PATCH  /api/teams/:id/diagrams/:did            # Save diagram (nodes+edges)
DELETE /api/teams/:id/diagrams/:did            # Delete diagram

POST   /api/teams/:id/diagrams/:did/ai-generate    # AI generate diagram from text
POST   /api/teams/:id/diagrams/:did/ai-extend      # AI add nodes to existing
POST   /api/teams/:id/diagrams/:did/export          # Export (PNG/SVG/JSON/Prisma/SQL)
```

## 7.8 Calendar

```
POST   /api/teams/:id/calendar/events          # Create event
GET    /api/teams/:id/calendar/events          # List events (date range)
PATCH  /api/teams/:id/calendar/events/:eid     # Update event
DELETE /api/teams/:id/calendar/events/:eid     # Delete event

GET    /api/teams/:id/calendar/feed            # Aggregated feed (tasks + events + milestones)
```

## 7.9 Sprint

```
POST   /api/teams/:id/sprints                  # AI generate sprint
GET    /api/teams/:id/sprints                  # List sprints
GET    /api/teams/:id/sprints/:sid              # Sprint + tasks
PATCH  /api/teams/:id/sprints/:sid              # Update sprint
DELETE /api/teams/:id/sprints/:sid              # Delete sprint
POST   /api/teams/:id/sprints/:sid/regenerate   # Regenerate with feedback
POST   /api/teams/:id/sprints/:sid/export       # Export
```

## 7.10 Notes

```
POST   /api/teams/:id/notes                    # Create note
GET    /api/teams/:id/notes                    # List notes
GET    /api/teams/:id/notes/:nid               # Get note
PATCH  /api/teams/:id/notes/:nid               # Update note
DELETE /api/teams/:id/notes/:nid               # Delete note
GET    /api/teams/:id/notes/:nid/history       # Version history
POST   /api/teams/:id/notes/:nid/ai-assist     # AI action on text
```

---

# ═══════════════════════════════════════════
# PART 8: FRONTEND ROUTES (COMPLETE)
# ═══════════════════════════════════════════

```
ROUTE                                           PAGE
──────────────────────────────────────────────── ──────────────────────
/                                                Landing page
/login                                           Login
/register                                        Register
/invite/:token                                   Accept team invitation

/dashboard                                       Home / team overview
/dashboard/my-tasks                              My tasks (all teams)
/dashboard/ai-usage                              AI usage dashboard

/teams/new                                       Create team
/teams/:teamId                                   Team dashboard
/teams/:teamId/tasks                             Tasks (List/Board/Calendar/Timeline)
/teams/:teamId/tasks/:taskId                     Task detail (modal or page)
/teams/:teamId/brainstorm                        Brainstorm sessions list
/teams/:teamId/brainstorm/new                    Create brainstorm session
/teams/:teamId/brainstorm/:sessionId             Active brainstorm room
/teams/:teamId/calendar                          Project calendar
/teams/:teamId/diagrams                          Diagrams list
/teams/:teamId/diagrams/new                      Create diagram
/teams/:teamId/diagrams/:diagramId               Diagram editor
/teams/:teamId/sprints                           Sprint plans list
/teams/:teamId/sprints/new                       Create sprint (AI)
/teams/:teamId/sprints/:sprintId                 Sprint detail + board
/teams/:teamId/notes                             Notes list
/teams/:teamId/notes/:noteId                     Note editor
/teams/:teamId/settings                          Team settings & members

/settings                                        User settings
/settings/profile                                Profile
/settings/ai-keys                                AI key management
```

---

# ═══════════════════════════════════════════
# PART 9: COMPLETE DATABASE SCHEMA (Prisma)
# ═══════════════════════════════════════════

```prisma
// ==========================================
// ENUMS
// ==========================================

enum TeamRole {
  OWNER
  ADMIN
  MEMBER
}

enum InvitationStatus {
  PENDING
  ACCEPTED
  EXPIRED
  REVOKED
}

enum AIProvider {
  OPENAI
  CLAUDE
  GEMINI
  GROQ
  MISTRAL
  DEEPSEEK
  OPENROUTER
  OLLAMA
  CUSTOM
}

enum BrainstormMode {
  IDEA_GENERATOR
  FEATURE_BREAKDOWN
  PROJECT_ROADMAP
  ARCHITECTURE_LITE
}

enum MessageRole {
  USER
  ASSISTANT
  SYSTEM
}

enum TaskStatus {
  TODO
  IN_PROGRESS
  REVIEW
  DONE
  CANCELLED
}

enum TaskPriority {
  CRITICAL
  HIGH
  MEDIUM
  LOW
}

enum SprintStatus {
  DRAFT
  ACTIVE
  COMPLETED
  ARCHIVED
}

enum DiagramType {
  ERD
  FLOWCHART
  ARCHITECTURE
  SEQUENCE
  MINDMAP
  USERFLOW
  FREEFORM
}

enum EventType {
  TASK_DEADLINE
  SPRINT_MILESTONE
  BRAINSTORM_SESSION
  CUSTOM_EVENT
  MEETING
}

// ==========================================
// USER & AUTH
// ==========================================

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  passwordHash  String
  name          String
  avatarUrl     String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  ownedTeams         Team[]
  teamMemberships    TeamMember[]
  aiKeys             UserAIKey[]
  brainstormSessions BrainstormSession[]
  sentInvitations    TeamInvitation[]   @relation("inviter")
  createdTasks       Task[]             @relation("taskCreator")
  taskAssignments    TaskAssignee[]
  taskComments       TaskComment[]
  notes              Note[]
  diagrams           Diagram[]
  calendarEvents     CalendarEvent[]
  aiUsageLogs        AIUsageLog[]
}

// ==========================================
// TEAM
// ==========================================

model Team {
  id          String   @id @default(cuid())
  name        String
  description String?
  ownerId     String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  owner              User               @relation(fields: [ownerId], references: [id])
  members            TeamMember[]
  invitations        TeamInvitation[]
  tasks              Task[]
  brainstormSessions BrainstormSession[]
  sprintPlans        SprintPlan[]
  notes              Note[]
  diagrams           Diagram[]
  calendarEvents     CalendarEvent[]
  labels             Label[]
}

model TeamMember {
  id       String   @id @default(cuid())
  teamId   String
  userId   String
  role     TeamRole @default(MEMBER)
  joinedAt DateTime @default(now())

  team Team @relation(fields: [teamId], references: [id], onDelete: Cascade)
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([teamId, userId])
}

model TeamInvitation {
  id        String           @id @default(cuid())
  teamId    String
  email     String
  invitedBy String
  role      TeamRole         @default(MEMBER)
  status    InvitationStatus @default(PENDING)
  token     String           @unique
  expiresAt DateTime
  createdAt DateTime         @default(now())

  team    Team @relation(fields: [teamId], references: [id], onDelete: Cascade)
  inviter User @relation("inviter", fields: [invitedBy], references: [id])
}

// ==========================================
// AI KEY (BYOK)
// ==========================================

model UserAIKey {
  id           String     @id @default(cuid())
  userId       String
  provider     AIProvider
  encryptedKey String
  label        String?
  isActive     Boolean    @default(true)
  lastUsedAt   DateTime?
  createdAt    DateTime   @default(now())
  updatedAt    DateTime   @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}

// ==========================================
// TASKS (ClickUp-inspired)
// ==========================================

model Task {
  id          String       @id @default(cuid())
  teamId      String
  sprintId    String?
  title       String
  description String?      @db.Text
  status      TaskStatus   @default(TODO)
  priority    TaskPriority @default(MEDIUM)
  startDate   DateTime?
  dueDate     DateTime?
  completedAt DateTime?
  createdBy   String
  estimation  Int?
  timeSpent   Int?
  orderIndex  Int          @default(0)
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt

  team         Team             @relation(fields: [teamId], references: [id], onDelete: Cascade)
  sprint       SprintPlan?      @relation(fields: [sprintId], references: [id])
  creator      User             @relation("taskCreator", fields: [createdBy], references: [id])
  assignees    TaskAssignee[]
  labels       TaskLabel[]
  comments     TaskComment[]
  dependencies TaskDependency[] @relation("dependentTask")
  dependents   TaskDependency[] @relation("dependencyTask")
  activities   TaskActivity[]
}

model TaskAssignee {
  id     String @id @default(cuid())
  taskId String
  userId String

  task Task @relation(fields: [taskId], references: [id], onDelete: Cascade)
  user User @relation(fields: [userId], references: [id])

  @@unique([taskId, userId])
}

model Label {
  id     String @id @default(cuid())
  teamId String
  name   String
  color  String

  team  Team        @relation(fields: [teamId], references: [id], onDelete: Cascade)
  tasks TaskLabel[]

  @@unique([teamId, name])
}

model TaskLabel {
  taskId  String
  labelId String

  task  Task  @relation(fields: [taskId], references: [id], onDelete: Cascade)
  label Label @relation(fields: [labelId], references: [id], onDelete: Cascade)

  @@id([taskId, labelId])
}

model TaskDependency {
  id               String @id @default(cuid())
  dependentTaskId  String
  dependencyTaskId String

  dependentTask  Task @relation("dependentTask", fields: [dependentTaskId], references: [id], onDelete: Cascade)
  dependencyTask Task @relation("dependencyTask", fields: [dependencyTaskId], references: [id], onDelete: Cascade)

  @@unique([dependentTaskId, dependencyTaskId])
}

model TaskComment {
  id        String   @id @default(cuid())
  taskId    String
  userId    String
  content   String   @db.Text
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  task Task @relation(fields: [taskId], references: [id], onDelete: Cascade)
  user User @relation(fields: [userId], references: [id])
}

model TaskActivity {
  id        String   @id @default(cuid())
  taskId    String
  userId    String
  action    String
  oldValue  String?
  newValue  String?
  createdAt DateTime @default(now())

  task Task @relation(fields: [taskId], references: [id], onDelete: Cascade)
}

// ==========================================
// BRAINSTORM
// ==========================================

model BrainstormSession {
  id        String         @id @default(cuid())
  teamId    String
  createdBy String
  title     String
  mode      BrainstormMode
  context   String?        @db.Text
  isActive  Boolean        @default(true)
  createdAt DateTime       @default(now())
  updatedAt DateTime       @updatedAt

  team     Team              @relation(fields: [teamId], references: [id], onDelete: Cascade)
  creator  User              @relation(fields: [createdBy], references: [id])
  messages BrainstormMessage[]
}

model BrainstormMessage {
  id        String      @id @default(cuid())
  sessionId String
  role      MessageRole
  content   String      @db.Text
  isPinned  Boolean     @default(false)
  createdAt DateTime    @default(now())

  session BrainstormSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
}

// ==========================================
// SPRINT
// ==========================================

model SprintPlan {
  id        String       @id @default(cuid())
  teamId    String
  createdBy String
  title     String
  goal      String       @db.Text
  deadline  DateTime
  teamSize  Int
  status    SprintStatus @default(DRAFT)
  createdAt DateTime     @default(now())
  updatedAt DateTime     @updatedAt

  team  Team   @relation(fields: [teamId], references: [id], onDelete: Cascade)
  tasks Task[]
}

// ==========================================
// DIAGRAMS (draw.io-like)
// ==========================================

model Diagram {
  id        String      @id @default(cuid())
  teamId    String
  createdBy String
  title     String
  type      DiagramType
  data      Json
  thumbnail String?
  createdAt DateTime    @default(now())
  updatedAt DateTime    @updatedAt

  team    Team @relation(fields: [teamId], references: [id], onDelete: Cascade)
  creator User @relation(fields: [createdBy], references: [id])
}

// ==========================================
// CALENDAR
// ==========================================

model CalendarEvent {
  id          String    @id @default(cuid())
  teamId      String
  createdBy   String
  title       String
  description String?
  type        EventType
  startDate   DateTime
  endDate     DateTime?
  allDay      Boolean   @default(false)
  color       String?
  taskId      String?
  sprintId    String?
  sessionId   String?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  team    Team @relation(fields: [teamId], references: [id], onDelete: Cascade)
  creator User @relation(fields: [createdBy], references: [id])
}

// ==========================================
// NOTES
// ==========================================

model Note {
  id        String   @id @default(cuid())
  teamId    String
  createdBy String
  title     String
  content   String   @db.Text
  version   Int      @default(1)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  team    Team          @relation(fields: [teamId], references: [id], onDelete: Cascade)
  creator User          @relation(fields: [createdBy], references: [id])
  history NoteHistory[]
}

model NoteHistory {
  id        String   @id @default(cuid())
  noteId    String
  content   String   @db.Text
  version   Int
  editedBy  String
  createdAt DateTime @default(now())

  note Note @relation(fields: [noteId], references: [id], onDelete: Cascade)
}

// ==========================================
// AI USAGE TRACKING
// ==========================================

model AIUsageLog {
  id               String   @id @default(cuid())
  userId           String
  provider         String
  model            String
  promptTokens     Int
  completionTokens Int
  estimatedCost    Float
  feature          String
  createdAt        DateTime @default(now())

  user User @relation(fields: [userId], references: [id])
}
```

---

# ═══════════════════════════════════════════
# PART 10: DEVELOPMENT PHASES (REVISED)
# ═══════════════════════════════════════════

### Phase 1 — Foundation & Infrastructure (Week 1-2)
- [ ] Monorepo setup (pnpm + Turborepo + shared packages)
- [ ] Docker Compose (PostgreSQL 16 + Redis 7)
- [ ] Fastify app scaffold + core plugins (CORS, Helmet, Rate Limit)
- [ ] Prisma schema + initial migration
- [ ] Auth module (register, login, JWT access+refresh)
- [ ] Next.js setup + Tailwind + shadcn/ui
- [ ] Auth pages (login, register)
- [ ] App shell layout (sidebar, header)

### Phase 2 — Teams & BYOK (Week 3-4)
- [ ] Team CRUD + invitation system
- [ ] Role-based access control (RBAC middleware)
- [ ] Team UI (create, manage, switch, invite)
- [ ] BYOK: multi-provider key management
- [ ] AI key validation per provider
- [ ] AI key management UI
- [ ] Provider adapter architecture

### Phase 3 — Task Management / ClickUp-style (Week 5-7)
- [ ] Task CRUD API
- [ ] Task List view (grouped, sortable, filterable)
- [ ] Task Board view (Kanban with drag-drop)
- [ ] Task detail panel / page
- [ ] Assignees, labels, comments, activity log
- [ ] Task dependencies
- [ ] Bulk operations (reorder, status change)

### Phase 4 — AI Brainstorm Room (Week 8-10)
- [ ] Brainstorm session CRUD
- [ ] System prompts per mode (4 modes)
- [ ] Multi-provider AI integration + streaming
- [ ] SSE endpoint for streaming
- [ ] Brainstorm room UI (chat-like)
- [ ] Pin, export, fork functionality
- [ ] Socket.io presence (who's in room)

### Phase 5 — Visual Diagrams (Week 11-13)
- [ ] Diagram CRUD API
- [ ] React Flow integration (ERD, flowchart, architecture)
- [ ] Custom node types (table, process, service)
- [ ] AI diagram generation from text
- [ ] AI extend existing diagram
- [ ] Export (PNG, SVG, JSON, Prisma schema, SQL)
- [ ] Excalidraw integration (freeform)

### Phase 6 — Calendar & Sprint (Week 14-15)
- [ ] Calendar event CRUD
- [ ] FullCalendar integration (Month/Week/Day)
- [ ] Task due dates on calendar
- [ ] Sprint milestone calendar integration
- [ ] Timeline/Gantt view for tasks
- [ ] AI Sprint planner (generate tasks from goal)

### Phase 7 — Notes & AI Assist (Week 16-17)
- [ ] Notes CRUD
- [ ] Tiptap rich text editor
- [ ] AI assist inline (improve, summarize, expand)
- [ ] Version history
- [ ] AI usage dashboard (Recharts)

### Phase 8 — Polish & Launch (Week 18-20)
- [ ] Responsive design (mobile/tablet)
- [ ] Dark mode
- [ ] Command palette (Cmd+K search)
- [ ] Keyboard shortcuts
- [ ] Notification system
- [ ] Unit tests + integration tests
- [ ] Bug fixes
- [ ] Documentation
- [ ] Deploy

---

# ═══════════════════════════════════════════
# PART 11: KEY TECHNICAL DECISIONS (UPDATED)
# ═══════════════════════════════════════════

| Decision | Choice | Reasoning |
|----------|--------|-----------|
| Runtime | Node.js 22 LTS | Native fetch, ESM, performance |
| Backend Framework | Fastify 5 | 2x faster than Express, plugin system |
| Frontend Framework | Next.js 15 App Router | RSC, layouts, server actions |
| ORM | Prisma 6 | Type-safe, migrations, studio |
| Database | PostgreSQL 16 | ACID, JSON, full-text search |
| Cache | Redis 7 | Sessions, rate-limit, pub/sub |
| State Management | Zustand 5 | 1KB, no boilerplate |
| Data Fetching | TanStack Query 5 | Cache, revalidation, optimistic |
| Validation | Zod 3 | Runtime + types, shareable |
| Styling | Tailwind 4 + shadcn/ui | Utility-first, accessible components |
| Rich Text | Tiptap 2 | ProseMirror-based, extensible |
| Diagrams | React Flow 12 | Node-based, extensible, TS native |
| Freeform | Excalidraw | Hand-drawn style, collaborative |
| Calendar | FullCalendar 6 | Feature-rich, drag-drop |
| Drag & Drop | @dnd-kit 6 | Accessible, kanban/sortable |
| Charts | Recharts 2 | Usage dashboard, analytics |
| Auth | JWT (jose) | Edge-compatible, standards |
| Encryption | AES-256-GCM (Node crypto) | Built-in, no extra deps |
| Streaming | SSE (AI) + Socket.io (realtime) | Simple + bidirectional |
| Logger | Pino 9 | Fastest Node logger, JSON |
| Testing | Vitest | Fast, ESM native |
| Monorepo | pnpm + Turborepo | Fast, smart caching |
| Package Manager | pnpm 9 | Strict, disk-efficient |
| E2E (future) | Playwright | Multi-browser, reliable |

---

# ═══════════════════════════════════════════
# PART 12: OPEN QUESTIONS
# ═══════════════════════════════════════════

| # | Question | Options | Decision |
|---|----------|---------|----------|
| 1 | Database ID format? | cuid() vs uuid() | cuid() (shorter, URL-friendly) |
| 2 | Auth token strategy? | Single vs Dual JWT | Dual (access 15m + refresh 7d) |
| 3 | Default AI model? | gpt-4o-mini vs gemini-flash | User chooses per action |
| 4 | Max brainstorm messages? | 100 vs 200 vs unlimited | 200 per session |
| 5 | Max team size (MVP)? | 10 vs 20 | 20 members |
| 6 | Diagram max nodes? | 50 vs 100 | 100 nodes per diagram |
| 7 | Deploy target? | Vercel+Railway vs VPS+Docker | TBD |
| 8 | Freeform tool? | Excalidraw vs tldraw | Excalidraw (more mature) |
| 9 | Calendar library? | FullCalendar vs roll own | FullCalendar (battle-tested) |
| 10 | Kanban library? | @dnd-kit vs react-beautiful-dnd | @dnd-kit (maintained, accessible) |

---

**BrainForge v2 — Think. Plan. Build. Visualize.**
