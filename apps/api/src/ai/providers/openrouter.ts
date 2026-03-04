import type { AIProviderInterface, ChatMsg, ChatOptions, ChatResult, ModelDef, BalanceInfo } from './base.js';

// Cache OpenRouter models for 10 minutes
let cachedModels: ModelDef[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

// OpenRouter uses OpenAI-compatible API
export class OpenRouterProvider implements AIProviderInterface {
  private baseUrl = 'https://openrouter.ai/api/v1';

  async chat(apiKey: string, model: string, messages: ChatMsg[], options?: ChatOptions): Promise<ChatResult> {
    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'HTTP-Referer': 'https://brainforge.app' },
      body: JSON.stringify({
        model,
        messages,
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens ?? 4096,
      }),
    });
    const data = await res.json();
    return {
      content: data.choices?.[0]?.message?.content || '',
      inputTokens: data.usage?.prompt_tokens || 0,
      outputTokens: data.usage?.completion_tokens || 0,
      model: data.model,
    };
  }

  async *stream(apiKey: string, model: string, messages: ChatMsg[], options?: ChatOptions): AsyncGenerator<string> {
    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'HTTP-Referer': 'https://brainforge.app' },
      body: JSON.stringify({ model, messages, temperature: options?.temperature ?? 0.7, max_tokens: options?.maxTokens ?? 4096, stream: true }),
    });
    const reader = res.body?.getReader();
    if (!reader) return;
    const decoder = new TextDecoder();
    let buffer = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        if (line.startsWith('data: ') && line !== 'data: [DONE]') {
          try {
            const json = JSON.parse(line.slice(6));
            const content = json.choices?.[0]?.delta?.content;
            if (content) yield content;
          } catch {}
        }
      }
    }
  }

  async validateKey(apiKey: string): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/models`, { headers: { 'Authorization': `Bearer ${apiKey}` } });
      return res.ok;
    } catch { return false; }
  }

  listModels(): ModelDef[] {
    return [
      // ── Free models ──
      { id: 'google/gemini-2.5-flash-preview-05-20', name: 'Gemini 2.5 Flash', contextWindow: 1048576, costPer1kInput: 0, costPer1kOutput: 0, description: 'Free · Fast & capable' },
      { id: 'google/gemini-2.5-pro-preview-03-25', name: 'Gemini 2.5 Pro', contextWindow: 1048576, costPer1kInput: 0, costPer1kOutput: 0, description: 'Free · Best free model' },
      { id: 'meta-llama/llama-4-maverick:free', name: 'Llama 4 Maverick', contextWindow: 256000, costPer1kInput: 0, costPer1kOutput: 0, description: 'Free · Meta latest' },
      { id: 'meta-llama/llama-4-scout:free', name: 'Llama 4 Scout', contextWindow: 512000, costPer1kInput: 0, costPer1kOutput: 0, description: 'Free · 512K context' },
      { id: 'deepseek/deepseek-chat-v3-0324:free', name: 'DeepSeek V3', contextWindow: 163840, costPer1kInput: 0, costPer1kOutput: 0, description: 'Free · Strong coder' },
      { id: 'deepseek/deepseek-r1:free', name: 'DeepSeek R1', contextWindow: 163840, costPer1kInput: 0, costPer1kOutput: 0, description: 'Free · Reasoning' },
      { id: 'qwen/qwen3-235b-a22b:free', name: 'Qwen3 235B', contextWindow: 131072, costPer1kInput: 0, costPer1kOutput: 0, description: 'Free · Qwen flagship' },
      { id: 'qwen/qwen3-30b-a3b:free', name: 'Qwen3 30B', contextWindow: 131072, costPer1kInput: 0, costPer1kOutput: 0, description: 'Free · Fast Qwen' },
      { id: 'microsoft/mai-ds-r1:free', name: 'MAI DS R1', contextWindow: 131072, costPer1kInput: 0, costPer1kOutput: 0, description: 'Free · Microsoft reasoning' },
      { id: 'google/gemma-3-27b-it:free', name: 'Gemma 3 27B', contextWindow: 131072, costPer1kInput: 0, costPer1kOutput: 0, description: 'Free · Google open' },
      // ── Paid models (affordable) ──
      { id: 'openai/gpt-4.1', name: 'GPT-4.1', contextWindow: 1047576, costPer1kInput: 0.002, costPer1kOutput: 0.008, description: 'OpenAI latest' },
      { id: 'openai/gpt-4.1-mini', name: 'GPT-4.1 Mini', contextWindow: 1047576, costPer1kInput: 0.0004, costPer1kOutput: 0.0016, description: 'Fast & cheap' },
      { id: 'openai/gpt-4o', name: 'GPT-4o', contextWindow: 128000, costPer1kInput: 0.0025, costPer1kOutput: 0.01 },
      { id: 'anthropic/claude-sonnet-4', name: 'Claude Sonnet 4', contextWindow: 200000, costPer1kInput: 0.003, costPer1kOutput: 0.015 },
      { id: 'anthropic/claude-opus-4', name: 'Claude Opus 4', contextWindow: 200000, costPer1kInput: 0.015, costPer1kOutput: 0.075, description: 'Most capable' },
    ];
  }

  async getBalance(apiKey: string): Promise<BalanceInfo> {
    try {
      const res = await fetch('https://openrouter.ai/api/v1/auth/key', {
        headers: { 'Authorization': `Bearer ${apiKey}` },
      });
      if (res.ok) {
        const data = await res.json();
        const info = data?.data;
        if (info) {
          const limit = info.limit ?? null;
          const used = info.usage ?? 0;
          if (limit !== null) {
            return {
              hasBalance: true,
              remaining: Math.max(0, limit - used),
              total: limit,
              currency: 'USD',
              message: `$${(limit - used).toFixed(2)} remaining of $${limit.toFixed(2)}`,
            };
          }
          return { hasBalance: true, message: `$${used.toFixed(4)} used — unlimited` };
        }
      }
      return { hasBalance: true, message: 'Connected' };
    } catch {
      return { hasBalance: false, message: 'Unable to check balance' };
    }
  }

  /**
   * Fetch ALL models from OpenRouter's public API with caching.
   * Returns a full list of ModelDef[] that users can search through.
   */
  async fetchAllModels(): Promise<ModelDef[]> {
    // Return cache if fresh
    if (cachedModels && Date.now() - cacheTimestamp < CACHE_TTL) {
      return cachedModels;
    }

    try {
      const res = await fetch('https://openrouter.ai/api/v1/models');
      if (!res.ok) return this.listModels(); // fallback to hardcoded

      const data = await res.json();
      const models: ModelDef[] = (data.data || [])
        .filter((m: any) => m.id && m.name)
        .map((m: any) => {
          const pricing = m.pricing || {};
          const costPer1kInput = parseFloat(pricing.prompt || '0') * 1000;
          const costPer1kOutput = parseFloat(pricing.completion || '0') * 1000;
          const contextWindow = m.context_length || 4096;
          const isFree = costPer1kInput === 0 && costPer1kOutput === 0;
          
          // Clean model name — remove provider prefix if in name
          let name = m.name || m.id;
          
          return {
            id: m.id,
            name,
            contextWindow,
            costPer1kInput,
            costPer1kOutput,
            description: isFree ? 'Free' : m.description?.slice(0, 60) || undefined,
          } as ModelDef;
        })
        // Sort: free first, then by name
        .sort((a: ModelDef, b: ModelDef) => {
          const aFree = a.costPer1kInput === 0 && a.costPer1kOutput === 0;
          const bFree = b.costPer1kInput === 0 && b.costPer1kOutput === 0;
          if (aFree !== bFree) return aFree ? -1 : 1;
          return a.name.localeCompare(b.name);
        });

      cachedModels = models;
      cacheTimestamp = Date.now();
      return models;
    } catch {
      return this.listModels(); // fallback to hardcoded
    }
  }
}
