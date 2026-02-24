import OpenAI from 'openai';
import type { AIProviderInterface, ChatMsg, ChatOptions, ChatResult, ModelDef } from './base.js';

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
      { id: 'gpt-4o', name: 'GPT-4o', contextWindow: 128000, costPer1kInput: 0.005, costPer1kOutput: 0.015 },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini', contextWindow: 128000, costPer1kInput: 0.00015, costPer1kOutput: 0.0006 },
      { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', contextWindow: 128000, costPer1kInput: 0.01, costPer1kOutput: 0.03 },
      { id: 'o1-preview', name: 'O1 Preview', contextWindow: 128000, costPer1kInput: 0.015, costPer1kOutput: 0.06 },
      { id: 'o1-mini', name: 'O1 Mini', contextWindow: 128000, costPer1kInput: 0.003, costPer1kOutput: 0.012 },
    ];
  }
}
