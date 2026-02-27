import { z } from 'zod';

const providerEnum = z.enum([
  'OPENAI', 'CLAUDE', 'GEMINI', 'GROQ', 'MISTRAL', 'DEEPSEEK', 'OPENROUTER', 'OLLAMA', 'COPILOT', 'CUSTOM',
]);

export const addAIKeySchema = z.object({
  provider: providerEnum,
  apiKey: z.string().min(1, 'API key is required'),
  label: z.string().max(50).optional(),
});

export const updateAIKeySchema = z.object({
  label: z.string().max(50).optional(),
  isActive: z.boolean().optional(),
});

export type AddAIKeyInput = z.infer<typeof addAIKeySchema>;
export type UpdateAIKeyInput = z.infer<typeof updateAIKeySchema>;
