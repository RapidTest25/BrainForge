import OpenAI from 'openai';
import type { AIProviderInterface, ChatMsg, ChatOptions, ChatResult, ModelDef, BalanceInfo } from './base.js';

const BASE_URL = 'https://models.inference.ai.azure.com';

// Cache for dynamically fetched models
let cachedModels: ModelDef[] | null = null;
let cacheExpiry = 0;
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

export class CopilotProvider implements AIProviderInterface {
  private getClient(apiKey: string) {
    return new OpenAI({
      apiKey,
      baseURL: BASE_URL,
    });
  }

  async chat(apiKey: string, model: string, messages: ChatMsg[], options?: ChatOptions): Promise<ChatResult> {
    const client = this.getClient(apiKey);
    // o-series reasoning models use max_completion_tokens instead of max_tokens
    const isReasoningModel = /^o[1-9]/.test(model);
    const params: any = {
      model,
      messages,
      ...(isReasoningModel
        ? { max_completion_tokens: options?.maxTokens ?? 4096 }
        : { temperature: options?.temperature ?? 0.7, max_tokens: options?.maxTokens ?? 4096, top_p: options?.topP }),
    };
    const response = await client.chat.completions.create(params);
    return {
      content: response.choices[0]?.message?.content || '',
      inputTokens: response.usage?.prompt_tokens || 0,
      outputTokens: response.usage?.completion_tokens || 0,
      model: response.model,
    };
  }

  async *stream(apiKey: string, model: string, messages: ChatMsg[], options?: ChatOptions): AsyncGenerator<string> {
    const client = this.getClient(apiKey);
    const isReasoningModel = /^o[1-9]/.test(model);
    const stream = await client.chat.completions.create({
      model,
      messages,
      ...(isReasoningModel
        ? { max_completion_tokens: options?.maxTokens ?? 4096 }
        : { temperature: options?.temperature ?? 0.7, max_tokens: options?.maxTokens ?? 4096 }),
      stream: true,
    } as any);
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) yield content;
    }
  }

  async validateKey(apiKey: string): Promise<boolean> {
    try {
      const client = this.getClient(apiKey);
      const response = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: 'hi' }],
        max_tokens: 1,
      });
      return !!response.choices[0];
    } catch (err: any) {
      const msg = err?.message || err?.error?.message || '';
      if (msg.includes('models') && msg.includes('permission')) {
        throw new Error('Token missing "Models" permission. Edit your token at github.com/settings/tokens and enable the Models (read & write) permission under Account permissions.');
      }
      return false;
    }
  }

  listModels(): ModelDef[] {
    // Return cached dynamic models if available
    if (cachedModels && Date.now() < cacheExpiry) return cachedModels;
    return this.getStaticModels();
  }

  /** Verified models known to work on GitHub Models (models.inference.ai.azure.com) */
  private getStaticModels(): ModelDef[] {
    return [
      // OpenAI — verified working
      { id: 'gpt-4o', name: 'GPT-4o', contextWindow: 128000, costPer1kInput: 0, costPer1kOutput: 0, description: 'OpenAI GPT-4o via GitHub — recommended' },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini', contextWindow: 128000, costPer1kInput: 0, costPer1kOutput: 0, description: 'Fast & efficient via GitHub' },
      { id: 'o3-mini', name: 'O3 Mini', contextWindow: 200000, costPer1kInput: 0, costPer1kOutput: 0, description: 'Reasoning model via GitHub' },
      { id: 'o4-mini', name: 'O4 Mini', contextWindow: 200000, costPer1kInput: 0, costPer1kOutput: 0, description: 'Latest reasoning model via GitHub' },

      // Meta Llama — verified in catalog
      { id: 'Meta-Llama-3.1-405B-Instruct', name: 'Llama 3.1 405B', contextWindow: 128000, costPer1kInput: 0, costPer1kOutput: 0, description: 'Meta Llama 3.1 405B via GitHub' },
      { id: 'Meta-Llama-3.1-70B-Instruct', name: 'Llama 3.1 70B', contextWindow: 128000, costPer1kInput: 0, costPer1kOutput: 0, description: 'Meta Llama 3.1 70B via GitHub' },
      { id: 'Meta-Llama-3.1-8B-Instruct', name: 'Llama 3.1 8B', contextWindow: 128000, costPer1kInput: 0, costPer1kOutput: 0, description: 'Fast Llama 3.1 8B via GitHub' },

      // Mistral — verified in catalog
      { id: 'Mistral-large-2407', name: 'Mistral Large', contextWindow: 128000, costPer1kInput: 0, costPer1kOutput: 0, description: 'Mistral Large via GitHub' },
      { id: 'Mistral-Nemo', name: 'Mistral Nemo', contextWindow: 128000, costPer1kInput: 0, costPer1kOutput: 0, description: 'Mistral Nemo via GitHub' },
    ];
  }

  /**
   * Dynamically fetch available models from the GitHub Models catalog.
   * Results are cached for 10 minutes.
   */
  async fetchModels(apiKey: string): Promise<ModelDef[]> {
    if (cachedModels && Date.now() < cacheExpiry) return cachedModels;
    try {
      const res = await fetch(`${BASE_URL}/models`, {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) return this.getStaticModels();
      const data: any[] = await res.json();
      const chatModels = (Array.isArray(data) ? data : []).filter(
        (m: any) => m.task === 'chat-completion'
      );
      if (chatModels.length === 0) return this.getStaticModels();

      const models: ModelDef[] = chatModels.map((m: any) => ({
        id: m.name,
        name: m.friendly_name || m.name,
        contextWindow: 128000,
        costPer1kInput: 0,
        costPer1kOutput: 0,
        description: `${m.publisher || 'GitHub Models'} — free with Copilot`,
      }));
      // Sort: gpt-4o first, then alphabetical
      models.sort((a, b) => {
        if (a.id.startsWith('gpt-4o')) return -1;
        if (b.id.startsWith('gpt-4o')) return 1;
        return a.name.localeCompare(b.name);
      });
      cachedModels = models;
      cacheExpiry = Date.now() + CACHE_TTL;
      return models;
    } catch {
      return this.getStaticModels();
    }
  }

  async getBalance(apiKey: string): Promise<BalanceInfo> {
    return { hasBalance: true, message: 'GitHub Copilot — included with subscription' };
  }
}
