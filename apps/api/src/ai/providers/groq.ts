import Groq from 'groq-sdk';
import type { AIProviderInterface, ChatMsg, ChatOptions, ChatResult, ModelDef } from './base.js';

export class GroqProvider implements AIProviderInterface {
  private getClient(apiKey: string) {
    return new Groq({ apiKey });
  }

  async chat(apiKey: string, model: string, messages: ChatMsg[], options?: ChatOptions): Promise<ChatResult> {
    const client = this.getClient(apiKey);
    const response = await client.chat.completions.create({
      model,
      messages,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? 4096,
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
      { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B', contextWindow: 131072, costPer1kInput: 0.00059, costPer1kOutput: 0.00079, description: 'Fast inference' },
      { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B', contextWindow: 131072, costPer1kInput: 0.00005, costPer1kOutput: 0.00008, description: 'Ultra fast' },
      { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B', contextWindow: 32768, costPer1kInput: 0.00024, costPer1kOutput: 0.00024 },
      { id: 'gemma2-9b-it', name: 'Gemma 2 9B', contextWindow: 8192, costPer1kInput: 0.0002, costPer1kOutput: 0.0002 },
    ];
  }
}
