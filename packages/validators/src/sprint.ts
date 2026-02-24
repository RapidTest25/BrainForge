import { z } from 'zod';

export const createSprintSchema = z.object({
  title: z.string().min(1).max(200),
  goal: z.string().min(1, 'Project goal is required').max(5000),
  deadline: z.string().datetime(),
  teamSize: z.number().int().min(1).max(20),
  context: z.string().max(5000).optional(),
  model: z.string().optional(),
  provider: z.string().optional(),
});

export const updateSprintSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  status: z.enum(['DRAFT', 'ACTIVE', 'COMPLETED', 'ARCHIVED']).optional(),
});

export type CreateSprintInput = z.infer<typeof createSprintSchema>;
export type UpdateSprintInput = z.infer<typeof updateSprintSchema>;
