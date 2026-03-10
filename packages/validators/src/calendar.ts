import { z } from 'zod';

const eventTypeEnum = z.enum([
  'TASK_DEADLINE', 'SPRINT_MILESTONE', 'BRAINSTORM_SESSION', 'CUSTOM_EVENT', 'MEETING',
]);

// Map frontend event types to backend enum
const FRONTEND_TYPE_MAP: Record<string, string> = {
  'MEETING': 'MEETING',
  'DEADLINE': 'TASK_DEADLINE',
  'MILESTONE': 'SPRINT_MILESTONE',
  'REMINDER': 'CUSTOM_EVENT',
  'OTHER': 'CUSTOM_EVENT',
  // Also accept backend enums directly
  'TASK_DEADLINE': 'TASK_DEADLINE',
  'SPRINT_MILESTONE': 'SPRINT_MILESTONE',
  'BRAINSTORM_SESSION': 'BRAINSTORM_SESSION',
  'CUSTOM_EVENT': 'CUSTOM_EVENT',
};

// Accept both ISO datetime and plain date strings (YYYY-MM-DD)
const flexibleDatetime = z.string().transform((val) => {
  // If it's already an ISO datetime, pass through
  if (val.includes('T')) return val;
  // Convert plain date (YYYY-MM-DD) to ISO datetime
  return `${val}T00:00:00.000Z`;
});

export const createEventSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(2000).optional(),
  type: z.string().default('CUSTOM_EVENT').transform((val) => {
    return FRONTEND_TYPE_MAP[val] || 'CUSTOM_EVENT';
  }),
  startDate: flexibleDatetime,
  endDate: flexibleDatetime.optional(),
  allDay: z.boolean().default(false),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  location: z.string().max(500).optional(),
  meetingLink: z.string().max(1000).optional(),
});

export const updateEventSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  startDate: flexibleDatetime.optional(),
  endDate: flexibleDatetime.nullable().optional(),
  allDay: z.boolean().optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).nullable().optional(),
  location: z.string().max(500).nullable().optional(),
  meetingLink: z.string().max(1000).nullable().optional(),
});

export type CreateEventInput = z.infer<typeof createEventSchema>;
export type UpdateEventInput = z.infer<typeof updateEventSchema>;
