import type { AIProviderInterface, ChatMsg, ChatOptions, ChatResult, ModelDef, BalanceInfo } from './base.js';

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
      { id: 'openai/gpt-4.1', name: 'GPT-4.1 (via OR)', contextWindow: 1047576, costPer1kInput: 0.002, costPer1kOutput: 0.008, description: 'OpenAI latest' },
      { id: 'openai/gpt-4o', name: 'GPT-4o (via OR)', contextWindow: 128000, costPer1kInput: 0.0025, costPer1kOutput: 0.01 },
      { id: 'anthropic/claude-sonnet-4', name: 'Claude Sonnet 4 (via OR)', contextWindow: 200000, costPer1kInput: 0.003, costPer1kOutput: 0.015 },
      { id: 'anthropic/claude-opus-4', name: 'Claude Opus 4 (via OR)', contextWindow: 200000, costPer1kInput: 0.015, costPer1kOutput: 0.075, description: 'Most capable' },
      { id: 'google/gemini-2.5-flash', name: 'Gemini 2.5 Flash (via OR)', contextWindow: 1048576, costPer1kInput: 0, costPer1kOutput: 0, description: 'Free' },
      { id: 'google/gemini-2.5-pro', name: 'Gemini 2.5 Pro (via OR)', contextWindow: 1048576, costPer1kInput: 0.00125, costPer1kOutput: 0.01 },
      { id: 'meta-llama/llama-4-scout', name: 'Llama 4 Scout (via OR)', contextWindow: 512000, costPer1kInput: 0.00015, costPer1kOutput: 0.0006, description: 'Latest Llama 4' },
      { id: 'meta-llama/llama-4-maverick', name: 'Llama 4 Maverick (via OR)', contextWindow: 512000, costPer1kInput: 0.0005, costPer1kOutput: 0.00077 },
      { id: 'deepseek/deepseek-chat-v3-0324', name: 'DeepSeek V3 (via OR)', contextWindow: 163840, costPer1kInput: 0.00014, costPer1kOutput: 0.00028 },
      { id: 'deepseek/deepseek-r1', name: 'DeepSeek R1 (via OR)', contextWindow: 163840, costPer1kInput: 0.0004, costPer1kOutput: 0.0022, description: 'Reasoning model' },
      { id: 'qwen/qwen3-235b-a22b', name: 'Qwen3 235B (via OR)', contextWindow: 131072, costPer1kInput: 0.0002, costPer1kOutput: 0.0008, description: 'Qwen flagship' },
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
}
