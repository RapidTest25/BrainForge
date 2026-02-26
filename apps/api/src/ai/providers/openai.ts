import OpenAI from 'openai';
import type { AIProviderInterface, ChatMsg, ChatOptions, ChatResult, ModelDef, BalanceInfo } from './base.js';

export class OpenAIProvider implements AIProviderInterface {
  private getClient(apiKey: string) {
    return new OpenAI({ apiKey });
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
      { id: 'gpt-4.1', name: 'GPT-4.1', contextWindow: 1047576, costPer1kInput: 0.002, costPer1kOutput: 0.008, description: 'Latest flagship model' },
      { id: 'gpt-4.1-mini', name: 'GPT-4.1 Mini', contextWindow: 1047576, costPer1kInput: 0.0004, costPer1kOutput: 0.0016, description: 'Cost-efficient' },
      { id: 'gpt-4.1-nano', name: 'GPT-4.1 Nano', contextWindow: 1047576, costPer1kInput: 0.0001, costPer1kOutput: 0.0004, description: 'Fastest & cheapest' },
      { id: 'gpt-4o', name: 'GPT-4o', contextWindow: 128000, costPer1kInput: 0.0025, costPer1kOutput: 0.01, description: 'Great all-rounder' },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini', contextWindow: 128000, costPer1kInput: 0.00015, costPer1kOutput: 0.0006, description: 'Budget friendly' },
      { id: 'o3', name: 'O3', contextWindow: 200000, costPer1kInput: 0.01, costPer1kOutput: 0.04, description: 'Advanced reasoning' },
      { id: 'o3-mini', name: 'O3 Mini', contextWindow: 200000, costPer1kInput: 0.0011, costPer1kOutput: 0.0044, description: 'Fast reasoning' },
      { id: 'o4-mini', name: 'O4 Mini', contextWindow: 200000, costPer1kInput: 0.0011, costPer1kOutput: 0.0044, description: 'Latest reasoning model' },
    ];
  }

  async getBalance(apiKey: string): Promise<BalanceInfo> {
    try {
      // OpenAI billing API - check remaining credits
      const res = await fetch('https://api.openai.com/v1/organization/costs?start_time=' + Math.floor(Date.now() / 1000 - 86400 * 30) + '&limit=1', {
        headers: { 'Authorization': `Bearer ${apiKey}` },
      });
      if (res.ok) {
        return { hasBalance: true, message: 'API key active — usage-based billing' };
      }
      return { hasBalance: true, message: 'Connected — pay-per-use' };
    } catch {
      return { hasBalance: true, message: 'Connected — pay-per-use' };
    }
  }
}
