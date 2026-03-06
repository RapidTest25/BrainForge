# Class Diagram — AI Provider

[← Kembali ke Daftar Diagram](../README.md#diagram-uml-file-terpisah)

---

```mermaid
classDiagram
    class BaseAIProvider {
        <<abstract>>
        #String apiKey
        #String? baseUrl
        +chat(messages, model, systemPrompt?)* ChatResponse
        +stream(messages, model, systemPrompt?)* AsyncGenerator
        +validateKey()* Boolean
        +listModels()* AIModel[]
        +getBalance()? BalanceInfo
    }

    class OpenAIProvider {
        -OpenAI client
        +chat(messages, model, systemPrompt?) ChatResponse
        +stream(messages, model, systemPrompt?) AsyncGenerator
        +validateKey() Boolean
        +listModels() AIModel[]
        +getBalance() BalanceInfo
    }

    class ClaudeProvider {
        -Anthropic client
        +chat(messages, model, systemPrompt?) ChatResponse
        +stream(messages, model, systemPrompt?) AsyncGenerator
        +validateKey() Boolean
        +listModels() AIModel[]
    }

    class GeminiProvider {
        -GoogleGenerativeAI client
        +chat(messages, model, systemPrompt?) ChatResponse
        +stream(messages, model, systemPrompt?) AsyncGenerator
        +validateKey() Boolean
        +listModels() AIModel[]
    }

    class GroqProvider {
        -Groq client
        +chat(messages, model, systemPrompt?) ChatResponse
        +stream(messages, model, systemPrompt?) AsyncGenerator
        +validateKey() Boolean
        +listModels() AIModel[]
    }

    class OpenRouterProvider {
        -fetch client
        +chat(messages, model, systemPrompt?) ChatResponse
        +stream(messages, model, systemPrompt?) AsyncGenerator
        +validateKey() Boolean
        +listModels() AIModel[]
        +getBalance() BalanceInfo
    }

    class CopilotProvider {
        -OpenAI client (Azure endpoint)
        +chat(messages, model, systemPrompt?) ChatResponse
        +stream(messages, model, systemPrompt?) AsyncGenerator
        +validateKey() Boolean
        +listModels() AIModel[]
        +getBalance() BalanceInfo
    }

    class AIService {
        +getProvider(provider, apiKey) BaseAIProvider
        +chat(provider, model, messages, key) ChatResponse
        +stream(provider, model, messages, key) AsyncGenerator
        +validateKey(provider, key) Boolean
        +listModels(provider, key?) AIModel[]
    }

    BaseAIProvider <|-- OpenAIProvider
    BaseAIProvider <|-- ClaudeProvider
    BaseAIProvider <|-- GeminiProvider
    BaseAIProvider <|-- GroqProvider
    BaseAIProvider <|-- OpenRouterProvider
    BaseAIProvider <|-- CopilotProvider
    AIService --> BaseAIProvider : uses
```

---

### Penjelasan

| Class | Deskripsi |
|-------|-----------|
| **BaseAIProvider** | Abstract base class yang mendefinisikan interface untuk semua AI provider. Setiap provider harus mengimplementasikan `chat()`, `stream()`, `validateKey()`, dan `listModels()`. |
| **OpenAIProvider** | Implementasi untuk OpenAI (GPT-4.1, GPT-4o, dll). Menggunakan SDK `openai`. |
| **ClaudeProvider** | Implementasi untuk Anthropic Claude (Sonnet 4, Opus 4, dll). Menggunakan SDK `@anthropic-ai/sdk`. |
| **GeminiProvider** | Implementasi untuk Google Gemini (2.5 Flash, 2.5 Pro, dll). Menggunakan SDK `@google/generative-ai`. |
| **GroqProvider** | Implementasi untuk Groq (Llama 3, Mixtral, dll). Menggunakan SDK `groq-sdk`. |
| **OpenRouterProvider** | Implementasi untuk OpenRouter (400+ model). Menggunakan raw `fetch` dengan API OpenAI-compatible. |
| **CopilotProvider** | Implementasi untuk GitHub Copilot (Azure endpoint). Menggunakan SDK `openai` dengan base URL Azure. |
| **AIService** | Orchestrator yang memilih provider berdasarkan enum dan meneruskan request. Factory pattern. |

---

[← Kembali ke Daftar Diagram](../README.md#diagram-uml-file-terpisah)
