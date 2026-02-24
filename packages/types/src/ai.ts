// ═══════════════════════════════════════════
// AI Types
// ═══════════════════════════════════════════

export type AIProviderType =
  | 'OPENAI'
  | 'CLAUDE'
  | 'GEMINI'
  | 'GROQ'
  | 'MISTRAL'
  | 'DEEPSEEK'
  | 'OPENROUTER'
  | 'OLLAMA'
  | 'CUSTOM';

export interface AIProvider {
  id: string;
  name: string;
  chat(params: ChatParams): Promise<ChatResponse>;
  stream(params: ChatParams): AsyncIterable<StreamChunk>;
  validate(apiKey: string): Promise<boolean>;
  listModels?(apiKey: string): Promise<ModelInfo[]>;
}

export interface ChatParams {
  apiKey: string;
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  responseFormat?: 'text' | 'json';
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatResponse {
  content: string;
  usage: TokenUsage;
}

export interface StreamChunk {
  content: string;
  done: boolean;
  usage?: TokenUsage;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCost?: number;
}

export interface ModelInfo {
  id: string;
  name: string;
  provider: AIProviderType;
  maxTokens: number;
  supportsStreaming: boolean;
  supportsJson: boolean;
  costPer1kInput?: number;
  costPer1kOutput?: number;
}

export interface UserAIKey {
  id: string;
  provider: AIProviderType;
  label: string | null;
  isActive: boolean;
  lastUsedAt: string | null;
  createdAt: string;
  // Note: encryptedKey is NEVER sent to frontend
}

export interface AIUsageStats {
  provider: string;
  model: string;
  totalTokens: number;
  totalCost: number;
  requestCount: number;
}
