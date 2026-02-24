export interface AIProviderInterface {
  chat(apiKey: string, model: string, messages: ChatMsg[], options?: ChatOptions): Promise<ChatResult>;
  stream(apiKey: string, model: string, messages: ChatMsg[], options?: ChatOptions): AsyncGenerator<string>;
  validateKey(apiKey: string): Promise<boolean>;
  listModels(): ModelDef[];
}

export interface ChatMsg {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatOptions {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
}

export interface ChatResult {
  content: string;
  inputTokens: number;
  outputTokens: number;
  model: string;
}

export interface ModelDef {
  id: string;
  name: string;
  contextWindow: number;
  costPer1kInput: number;
  costPer1kOutput: number;
  description?: string;
}
