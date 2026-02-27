import { OpenAIProvider } from './providers/openai.js';
import { ClaudeProvider } from './providers/claude.js';
import { GeminiProvider } from './providers/gemini.js';
import { GroqProvider } from './providers/groq.js';
import { OpenRouterProvider } from './providers/openrouter.js';
import { CopilotProvider } from './providers/copilot.js';
import { aiKeyService } from '../modules/ai-key/ai-key.service.js';
import type { AIProviderInterface, ChatMsg, ChatOptions, ChatResult, ModelDef, BalanceInfo } from './providers/base.js';

const providers: Record<string, AIProviderInterface> = {
  OPENAI: new OpenAIProvider(),
  CLAUDE: new ClaudeProvider(),
  GEMINI: new GeminiProvider(),
  GROQ: new GroqProvider(),
  OPENROUTER: new OpenRouterProvider(),
  COPILOT: new CopilotProvider(),
};

class AIService {
  getProvider(providerName: string): AIProviderInterface {
    const provider = providers[providerName.toUpperCase()];
    if (!provider) throw new Error(`Unsupported AI provider: ${providerName}`);
    return provider;
  }

  async chat(userId: string, providerName: string, model: string, messages: ChatMsg[], options?: ChatOptions): Promise<ChatResult> {
    const provider = this.getProvider(providerName);
    const apiKey = await aiKeyService.getDecryptedKey(userId, providerName);
    try {
      const result = await provider.chat(apiKey, model, messages, options);
      const modelDef = provider.listModels().find(m => m.id === model);
      const cost = modelDef
        ? (result.inputTokens / 1000) * modelDef.costPer1kInput + (result.outputTokens / 1000) * modelDef.costPer1kOutput
        : 0;
      await aiKeyService.logUsage(userId, providerName, model, result.inputTokens, result.outputTokens, cost);
      return result;
    } catch (error: any) {
      if (error?.status === 401 || error?.message?.includes('Incorrect API key')) {
        await aiKeyService.markKeyInvalid(userId, providerName);
      }
      throw error;
    }
  }

  async *stream(userId: string, providerName: string, model: string, messages: ChatMsg[], options?: ChatOptions): AsyncGenerator<string> {
    const provider = this.getProvider(providerName);
    const apiKey = await aiKeyService.getDecryptedKey(userId, providerName);
    try {
      yield* provider.stream(apiKey, model, messages, options);
    } catch (error: any) {
      if (error?.status === 401 || error?.message?.includes('Incorrect API key')) {
        await aiKeyService.markKeyInvalid(userId, providerName);
      }
      throw error;
    }
  }

  getAllModels(): Record<string, ModelDef[]> {
    const result: Record<string, ModelDef[]> = {};
    for (const [name, provider] of Object.entries(providers)) {
      result[name] = provider.listModels();
    }
    return result;
  }

  async validateKey(providerName: string, apiKey: string): Promise<boolean> {
    const provider = this.getProvider(providerName);
    return provider.validateKey(apiKey);
  }

  async getBalance(providerName: string, apiKey: string): Promise<BalanceInfo | null> {
    const provider = this.getProvider(providerName);
    if (provider.getBalance) {
      return provider.getBalance(apiKey);
    }
    return null;
  }
}

export const aiService = new AIService();
