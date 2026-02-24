import { z } from 'zod';

const diagramTypeEnum = z.enum([
  'ERD', 'FLOWCHART', 'ARCHITECTURE', 'SEQUENCE', 'MINDMAP', 'USERFLOW', 'FREEFORM', 'COMPONENT',
]);

export const createDiagramSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  type: diagramTypeEnum,
  description: z.string().max(5000).optional(),
  data: z.object({
    nodes: z.array(z.any()).default([]),
    edges: z.array(z.any()).default([]),
  }).optional(),
});

export const updateDiagramSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  data: z.object({
    nodes: z.array(z.any()),
    edges: z.array(z.any()),
  }).optional(),
  thumbnail: z.string().optional(),
});

export const aiGenerateDiagramSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required').max(5000),
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).optional(),
  type: z.enum(['ERD', 'FLOWCHART', 'ARCHITECTURE', 'SEQUENCE', 'MINDMAP', 'USERFLOW', 'FREEFORM', 'COMPONENT']).optional(),
  model: z.string().optional(),
  provider: z.string().optional(),
});

export type CreateDiagramInput = z.infer<typeof createDiagramSchema>;
export type UpdateDiagramInput = z.infer<typeof updateDiagramSchema>;
