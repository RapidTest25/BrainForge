import Anthropic from '@anthropic-ai/sdk';
import type { AIProviderInterface, ChatMsg, ChatOptions, ChatResult, ModelDef } from './base.js';

export class ClaudeProvider implements AIProviderInterface {
  private getClient(apiKey: string) {
    return new Anthropic({ apiKey });
  }

  async chat(apiKey: string, model: string, messages: ChatMsg[], options?: ChatOptions): Promise<ChatResult> {
    const client = this.getClient(apiKey);
    const systemMsg = messages.find(m => m.role === 'system')?.content;
    const chatMsgs = messages.filter(m => m.role !== 'system').map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));
    const response = await client.messages.create({
      model,
      max_tokens: options?.maxTokens ?? 4096,
      temperature: options?.temperature ?? 0.7,
      ...(systemMsg ? { system: systemMsg } : {}),
      messages: chatMsgs,
    });
    const content = response.content.map(c => c.type === 'text' ? c.text : '').join('');
    return {
      content,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      model: response.model,
    };
  }

  async *stream(apiKey: string, model: string, messages: ChatMsg[], options?: ChatOptions): AsyncGenerator<string> {
    const client = this.getClient(apiKey);
    const systemMsg = messages.find(m => m.role === 'system')?.content;
    const chatMsgs = messages.filter(m => m.role !== 'system').map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));
    const stream = client.messages.stream({
      model,
      max_tokens: options?.maxTokens ?? 4096,
      temperature: options?.temperature ?? 0.7,
      ...(systemMsg ? { system: systemMsg } : {}),
      messages: chatMsgs,
    });
    for await (const event of stream) {
      if (event.type === 'content_block_delta' && (event.delta as any).type === 'text_delta') {
        yield (event.delta as any).text;
      }
    }
  }

  async validateKey(apiKey: string): Promise<boolean> {
    try {
      const client = this.getClient(apiKey);
      await client.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'hi' }],
      });
      return true;
    } catch { return false; }
  }

  listModels(): ModelDef[] {
    return [
      { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', contextWindow: 200000, costPer1kInput: 0.003, costPer1kOutput: 0.015 },
      { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', contextWindow: 200000, costPer1kInput: 0.003, costPer1kOutput: 0.015 },
      { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', contextWindow: 200000, costPer1kInput: 0.001, costPer1kOutput: 0.005 },
      { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', contextWindow: 200000, costPer1kInput: 0.015, costPer1kOutput: 0.075 },
    ];
  }
}
