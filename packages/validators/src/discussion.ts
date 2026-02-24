import { z } from 'zod';

export const createDiscussionSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  content: z.string().min(1, 'Content is required').max(50000),
  category: z.string().max(50).default('general'),
});

export const updateDiscussionSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().min(1).max(50000).optional(),
  category: z.string().max(50).optional(),
  isPinned: z.boolean().optional(),
  isClosed: z.boolean().optional(),
});

export const createDiscussionReplySchema = z.object({
  content: z.string().min(1, 'Reply content is required').max(50000),
});

export type CreateDiscussionInput = z.infer<typeof createDiscussionSchema>;
export type UpdateDiscussionInput = z.infer<typeof updateDiscussionSchema>;
export type CreateDiscussionReplyInput = z.infer<typeof createDiscussionReplySchema>;
