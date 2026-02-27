import OpenAI from 'openai';
import type { AIProviderInterface, ChatMsg, ChatOptions, ChatResult, ModelDef, BalanceInfo } from './base.js';

export class CopilotProvider implements AIProviderInterface {
  private getClient(apiKey: string) {
    return new OpenAI({
      apiKey,
      baseURL: 'https://models.inference.ai.azure.com',
    });
  }

  async chat(apiKey: string, model: string, messages: ChatMsg[], options?: ChatOptions): Promise<ChatResult> {
    const client = this.getClient(apiKey);
    const response = await client.chat.completions.create({
      model,
      messages,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? 4096,
      top_p: options?.topP,
    });
    return {
      content: response.choices[0]?.message?.content || '',
      inputTokens: response.usage?.prompt_tokens || 0,
      outputTokens: response.usage?.completion_tokens || 0,
      model: response.model,
    };
  }

  async *stream(apiKey: string, model: string, messages: ChatMsg[], options?: ChatOptions): AsyncGenerator<string> {
    const client = this.getClient(apiKey);
    const stream = await client.chat.completions.create({
      model,
      messages,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? 4096,
      stream: true,
    });
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
    return [
      // OpenAI GPT models
      { id: 'gpt-4.1', name: 'GPT-4.1', contextWindow: 1047576, costPer1kInput: 0, costPer1kOutput: 0, description: 'Latest GPT-4.1 via GitHub' },
      { id: 'gpt-4o', name: 'GPT-4o', contextWindow: 128000, costPer1kInput: 0, costPer1kOutput: 0, description: 'OpenAI GPT-4o via GitHub' },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini', contextWindow: 128000, costPer1kInput: 0, costPer1kOutput: 0, description: 'Fast & efficient via GitHub' },
      { id: 'gpt-5-mini', name: 'GPT-5 Mini', contextWindow: 1047576, costPer1kInput: 0, costPer1kOutput: 0, description: 'GPT-5 Mini via GitHub' },
      { id: 'gpt-5.1', name: 'GPT-5.1', contextWindow: 1047576, costPer1kInput: 0, costPer1kOutput: 0, description: 'GPT-5.1 via GitHub' },
      { id: 'gpt-5.1-codex', name: 'GPT-5.1 Codex', contextWindow: 1047576, costPer1kInput: 0, costPer1kOutput: 0, description: 'Codex coding model via GitHub' },
      { id: 'gpt-5.1-codex-max', name: 'GPT-5.1 Codex Max', contextWindow: 1047576, costPer1kInput: 0, costPer1kOutput: 0, description: 'Max codex model via GitHub' },
      { id: 'gpt-5.1-codex-mini', name: 'GPT-5.1 Codex Mini', contextWindow: 1047576, costPer1kInput: 0, costPer1kOutput: 0, description: 'Mini codex model via GitHub' },
      { id: 'gpt-5.2', name: 'GPT-5.2', contextWindow: 1047576, costPer1kInput: 0, costPer1kOutput: 0, description: 'GPT-5.2 via GitHub' },
      { id: 'gpt-5.2-codex', name: 'GPT-5.2 Codex', contextWindow: 1047576, costPer1kInput: 0, costPer1kOutput: 0, description: 'GPT-5.2 Codex via GitHub' },
      { id: 'gpt-5.3-codex', name: 'GPT-5.3 Codex', contextWindow: 1047576, costPer1kInput: 0, costPer1kOutput: 0, description: 'GPT-5.3 Codex via GitHub' },

      // OpenAI reasoning models
      { id: 'o3-mini', name: 'O3 Mini', contextWindow: 200000, costPer1kInput: 0, costPer1kOutput: 0, description: 'Fast reasoning via GitHub' },
      { id: 'o4-mini', name: 'O4 Mini', contextWindow: 200000, costPer1kInput: 0, costPer1kOutput: 0, description: 'Reasoning model via GitHub' },

      // Anthropic Claude models
      { id: 'claude-haiku-4.5', name: 'Claude Haiku 4.5', contextWindow: 200000, costPer1kInput: 0, costPer1kOutput: 0, description: 'Fast Claude Haiku via GitHub' },
      { id: 'claude-opus-4.5', name: 'Claude Opus 4.5', contextWindow: 200000, costPer1kInput: 0, costPer1kOutput: 0, description: 'Claude Opus 4.5 via GitHub' },
      { id: 'claude-opus-4.6', name: 'Claude Opus 4.6', contextWindow: 200000, costPer1kInput: 0, costPer1kOutput: 0, description: 'Latest Claude Opus via GitHub' },
      { id: 'claude-sonnet-4', name: 'Claude Sonnet 4', contextWindow: 200000, costPer1kInput: 0, costPer1kOutput: 0, description: 'Claude Sonnet 4 via GitHub' },
      { id: 'claude-sonnet-4.5', name: 'Claude Sonnet 4.5', contextWindow: 200000, costPer1kInput: 0, costPer1kOutput: 0, description: 'Claude Sonnet 4.5 via GitHub' },
      { id: 'claude-sonnet-4.6', name: 'Claude Sonnet 4.6', contextWindow: 200000, costPer1kInput: 0, costPer1kOutput: 0, description: 'Latest Claude Sonnet via GitHub' },

      // Google Gemini models
      { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', contextWindow: 1048576, costPer1kInput: 0, costPer1kOutput: 0, description: 'Google Gemini 2.5 Pro via GitHub' },
      { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash (Preview)', contextWindow: 1048576, costPer1kInput: 0, costPer1kOutput: 0, description: 'Fast Gemini 3 via GitHub' },
      { id: 'gemini-3-pro-preview', name: 'Gemini 3 Pro (Preview)', contextWindow: 1048576, costPer1kInput: 0, costPer1kOutput: 0, description: 'Gemini 3 Pro via GitHub' },
      { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro (Preview)', contextWindow: 1048576, costPer1kInput: 0, costPer1kOutput: 0, description: 'Latest Gemini via GitHub' },

      // xAI Grok
      { id: 'grok-code-fast-1', name: 'Grok Code Fast 1', contextWindow: 131072, costPer1kInput: 0, costPer1kOutput: 0, description: 'xAI Grok coding model via GitHub' },

      // Meta Llama (Raptor Mini is a Llama variant)
      { id: 'raptor-mini', name: 'Raptor Mini (Preview)', contextWindow: 128000, costPer1kInput: 0, costPer1kOutput: 0, description: 'Preview model via GitHub' },
    ];
  }

  async getBalance(apiKey: string): Promise<BalanceInfo> {
    return { hasBalance: true, message: 'GitHub Copilot — included with subscription' };
  }
}
