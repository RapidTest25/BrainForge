import { z } from 'zod';

const brainstormModeEnum = z.enum([
  'BRAINSTORM', 'DEBATE', 'ANALYSIS', 'FREEFORM',
]);

export const createSessionSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  mode: brainstormModeEnum,
  context: z.string().max(5000).optional(),
});

export const sendMessageSchema = z.object({
  content: z.string().min(1, 'Message cannot be empty').max(10000),
  model: z.string().optional(),
  provider: z.string().optional(),
});

export type CreateSessionInput = z.infer<typeof createSessionSchema>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
