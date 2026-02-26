import { GoogleGenerativeAI } from '@google/generative-ai';
import type { AIProviderInterface, ChatMsg, ChatOptions, ChatResult, ModelDef } from './base.js';

export class GeminiProvider implements AIProviderInterface {
  async chat(apiKey: string, model: string, messages: ChatMsg[], options?: ChatOptions): Promise<ChatResult> {
    const genAI = new GoogleGenerativeAI(apiKey);
    const systemMsg = messages.find(m => m.role === 'system')?.content || '';
    const genModel = genAI.getGenerativeModel({
      model,
      ...(systemMsg ? { systemInstruction: { role: 'user', parts: [{ text: systemMsg }] } } : {}),
    });
    const history = messages
      .filter(m => m.role !== 'system')
      .slice(0, -1)
      .map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }));
    const lastMsg = messages[messages.length - 1];
    const chat = genModel.startChat({
      history: history as any,
      generationConfig: { temperature: options?.temperature ?? 0.7, maxOutputTokens: options?.maxTokens ?? 4096 },
    });
    const result = await chat.sendMessage(lastMsg.content);
    const response = result.response;
    return {
      content: response.text(),
      inputTokens: response.usageMetadata?.promptTokenCount || 0,
      outputTokens: response.usageMetadata?.candidatesTokenCount || 0,
      model,
    };
  }

  async *stream(apiKey: string, model: string, messages: ChatMsg[], options?: ChatOptions): AsyncGenerator<string> {
    const genAI = new GoogleGenerativeAI(apiKey);
    const systemMsg = messages.find(m => m.role === 'system')?.content || '';
    const genModel = genAI.getGenerativeModel({
      model,
      ...(systemMsg ? { systemInstruction: { role: 'user', parts: [{ text: systemMsg }] } } : {}),
    });
    const history = messages
      .filter(m => m.role !== 'system')
      .slice(0, -1)
      .map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }));
    const lastMsg = messages[messages.length - 1];
    const chat = genModel.startChat({
      history: history as any,
      generationConfig: { temperature: options?.temperature ?? 0.7, maxOutputTokens: options?.maxTokens ?? 4096 },
    });
    const result = await chat.sendMessageStream(lastMsg.content);
    for await (const chunk of result.stream) {
      yield chunk.text();
    }
  }

  async validateKey(apiKey: string): Promise<boolean> {
    try {
      // Use the lightweight ListModels endpoint — no quota consumed, just validates the key
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
      return res.ok;
    } catch { return false; }
  }

  listModels(): ModelDef[] {
    return [
      { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', contextWindow: 1048576, costPer1kInput: 0.0, costPer1kOutput: 0.0, description: 'Latest — thinking + free tier' },
      { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', contextWindow: 1048576, costPer1kInput: 0.00125, costPer1kOutput: 0.01, description: 'Most capable Gemini' },
      { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', contextWindow: 1048576, costPer1kInput: 0.0, costPer1kOutput: 0.0, description: 'Free tier available' },
    ];
  }
}
