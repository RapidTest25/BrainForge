import { z } from 'zod';

const taskStatusEnum = z.enum(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'CANCELLED']);
const taskPriorityEnum = z.enum(['URGENT', 'HIGH', 'MEDIUM', 'LOW']);

export const createTaskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(5000).optional(),
  status: taskStatusEnum.default('TODO'),
  priority: taskPriorityEnum.default('MEDIUM'),
  startDate: z.string().datetime().optional(),
  dueDate: z.string().datetime().optional(),
  estimation: z.number().int().positive().optional(),
  sprintId: z.string().optional(),
  assigneeIds: z.array(z.string()).optional(),
  labelIds: z.array(z.string()).optional(),
});

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).nullable().optional(),
  status: taskStatusEnum.optional(),
  priority: taskPriorityEnum.optional(),
  startDate: z.string().datetime().nullable().optional(),
  dueDate: z.string().datetime().nullable().optional(),
  estimation: z.number().int().positive().nullable().optional(),
  sprintId: z.string().nullable().optional(),
  orderIndex: z.number().int().min(0).optional(),
});

export const taskFiltersSchema = z.object({
  status: z.array(taskStatusEnum).optional(),
  priority: z.array(taskPriorityEnum).optional(),
  assigneeId: z.string().optional(),
  labelId: z.string().optional(),
  sprintId: z.string().optional(),
  projectId: z.string().optional(),
  search: z.string().optional(),
  groupBy: z.enum(['status', 'priority', 'assignee', 'label', 'sprint']).optional(),
  sortBy: z.enum(['priority', 'dueDate', 'createdAt', 'title', 'status']).optional(),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

export const createLabelSchema = z.object({
  name: z.string().min(1).max(30),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Must be a valid hex color'),
});

export const createCommentSchema = z.object({
  content: z.string().min(1, 'Comment cannot be empty').max(2000),
});

export const reorderTasksSchema = z.object({
  tasks: z.array(
    z.object({
      id: z.string(),
      orderIndex: z.number().int().min(0),
      status: taskStatusEnum.optional(),
    }),
  ),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type TaskFiltersInput = z.infer<typeof taskFiltersSchema>;
