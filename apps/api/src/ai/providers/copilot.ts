import OpenAI from 'openai';
import type { AIProviderInterface, ChatMsg, ChatOptions, ChatResult, ModelDef, BalanceInfo } from './base.js';

export class CopilotProvider implements AIProviderInterface {
  private getClient(apiKey: string) {
    return new OpenAI({
      apiKey,
      baseURL: 'https://models.github.ai/inference',
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
      await client.models.list();
      return true;
    } catch { return false; }
  }

  listModels(): ModelDef[] {
    return [
      { id: 'gpt-4o', name: 'GPT-4o', contextWindow: 128000, costPer1kInput: 0, costPer1kOutput: 0, description: 'OpenAI GPT-4o via GitHub' },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini', contextWindow: 128000, costPer1kInput: 0, costPer1kOutput: 0, description: 'Fast & efficient via GitHub' },
      { id: 'o4-mini', name: 'O4 Mini', contextWindow: 200000, costPer1kInput: 0, costPer1kOutput: 0, description: 'Reasoning model via GitHub' },
      { id: 'o3-mini', name: 'O3 Mini', contextWindow: 200000, costPer1kInput: 0, costPer1kOutput: 0, description: 'Fast reasoning via GitHub' },
      { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', contextWindow: 200000, costPer1kInput: 0, costPer1kOutput: 0, description: 'Anthropic Claude via GitHub' },
      { id: 'claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', contextWindow: 200000, costPer1kInput: 0, costPer1kOutput: 0, description: 'Anthropic Claude 3.5 via GitHub' },
    ];
  }

  async getBalance(apiKey: string): Promise<BalanceInfo> {
    return { hasBalance: true, message: 'GitHub Copilot — included with subscription' };
  }
}
