import type { FastifyInstance } from 'fastify';
import { noteService } from './note.service.js';
import { createNoteSchema, updateNoteSchema } from '@brainforge/validators';
import { authGuard } from '../../middleware/auth.middleware.js';
import { teamGuard } from '../../middleware/team.middleware.js';

export async function noteRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authGuard);

  app.get('/:teamId/notes', { preHandler: [teamGuard()] }, async (request, reply) => {
    const { teamId } = request.params as { teamId: string };
    const { projectId } = request.query as { projectId?: string };
    const notes = await noteService.findByTeam(teamId, projectId);
    return reply.send({ success: true, data: notes });
  });

  app.post('/:teamId/notes', { preHandler: [teamGuard()] }, async (request, reply) => {
    const { teamId } = request.params as { teamId: string };
    const { projectId } = request.body as { projectId?: string };
    const body = createNoteSchema.parse(request.body);
    const note = await noteService.create(teamId, request.user.id, { ...body, projectId });
    return reply.status(201).send({ success: true, data: note });
  });

  app.get('/:teamId/notes/:noteId', { preHandler: [teamGuard()] }, async (request, reply) => {
    const { noteId } = request.params as { noteId: string };
    const note = await noteService.findById(noteId);
    return reply.send({ success: true, data: note });
  });

  app.patch('/:teamId/notes/:noteId', { preHandler: [teamGuard()] }, async (request, reply) => {
    const { noteId } = request.params as { noteId: string };
    const body = updateNoteSchema.parse(request.body);
    const note = await noteService.update(noteId, request.user.id, body);
    return reply.send({ success: true, data: note });
  });

  app.delete('/:teamId/notes/:noteId', { preHandler: [teamGuard()] }, async (request, reply) => {
    const { noteId } = request.params as { noteId: string };
    await noteService.delete(noteId);
    return reply.send({ success: true, data: { message: 'Note deleted' } });
  });

  app.get('/:teamId/notes/:noteId/history', { preHandler: [teamGuard()] }, async (request, reply) => {
    const { noteId } = request.params as { noteId: string };
    const history = await noteService.getHistory(noteId);
    return reply.send({ success: true, data: history });
  });

  app.post('/:teamId/notes/:noteId/restore/:historyId', { preHandler: [teamGuard()] }, async (request, reply) => {
    const { noteId, historyId } = request.params as { noteId: string; historyId: string };
    const note = await noteService.restoreVersion(noteId, historyId, request.user.id);
    return reply.send({ success: true, data: note });
  });

  // AI Assist
  app.post('/:teamId/notes/ai-assist', { preHandler: [teamGuard()] }, async (request, reply) => {
    const { content, action, provider, model } = request.body as {
      content: string; action: string; provider: string; model: string;
    };
    const result = await noteService.aiAssist(request.user.id, provider, model, content, action);
    return reply.send({ success: true, data: { content: result } });
  });
}
