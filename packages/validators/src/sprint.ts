import { z } from 'zod';

// Accept both ISO datetime and plain date strings (YYYY-MM-DD)
const flexibleDatetime = z.string().transform((val) => {
  if (val.includes('T')) return val;
  return `${val}T00:00:00.000Z`;
});

export const createSprintSchema = z.object({
  title: z.string().min(1).max(200),
  goal: z.string().min(1, 'Project goal is required').max(5000),
  deadline: flexibleDatetime,
  teamSize: z.number().int().min(1).max(20),
  context: z.string().max(5000).optional(),
  model: z.string().optional(),
  provider: z.string().optional(),
});

export const updateSprintSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  goal: z.string().min(1).max(5000).optional(),
  deadline: flexibleDatetime.optional(),
  teamSize: z.number().int().min(1).max(20).optional(),
  status: z.enum(['DRAFT', 'ACTIVE', 'COMPLETED', 'ARCHIVED']).optional(),
});

export type CreateSprintInput = z.infer<typeof createSprintSchema>;
export type UpdateSprintInput = z.infer<typeof updateSprintSchema>;
