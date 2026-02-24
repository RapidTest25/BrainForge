import type { AIProviderInterface, ChatMsg, ChatOptions, ChatResult, ModelDef } from './base.js';

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
      { id: 'openai/gpt-4o', name: 'GPT-4o (via OpenRouter)', contextWindow: 128000, costPer1kInput: 0.005, costPer1kOutput: 0.015 },
      { id: 'anthropic/claude-sonnet-4', name: 'Claude Sonnet 4 (via OpenRouter)', contextWindow: 200000, costPer1kInput: 0.003, costPer1kOutput: 0.015 },
      { id: 'google/gemini-2.0-flash-exp:free', name: 'Gemini 2.0 Flash (Free)', contextWindow: 1048576, costPer1kInput: 0, costPer1kOutput: 0 },
      { id: 'meta-llama/llama-3.3-70b-instruct', name: 'Llama 3.3 70B', contextWindow: 131072, costPer1kInput: 0.0003, costPer1kOutput: 0.0004 },
      { id: 'deepseek/deepseek-chat', name: 'DeepSeek V3', contextWindow: 65536, costPer1kInput: 0.00014, costPer1kOutput: 0.00028 },
    ];
  }
}
