import type { FastifyInstance } from 'fastify';
import { brainstormService } from './brainstorm.service.js';
import { createSessionSchema, sendMessageSchema } from '@brainforge/validators';
import { authGuard } from '../../middleware/auth.middleware.js';
import { teamGuard } from '../../middleware/team.middleware.js';

export async function brainstormRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authGuard);

  // GET /api/teams/:teamId/brainstorm
  app.get('/:teamId/brainstorm', { preHandler: [teamGuard()] }, async (request, reply) => {
    const { teamId } = request.params as { teamId: string };
    const sessions = await brainstormService.findByTeam(teamId);
    return reply.send({ success: true, data: sessions });
  });

  // POST /api/teams/:teamId/brainstorm
  app.post('/:teamId/brainstorm', { preHandler: [teamGuard()] }, async (request, reply) => {
    const { teamId } = request.params as { teamId: string };
    const body = createSessionSchema.parse(request.body);
    const session = await brainstormService.createSession(teamId, request.user.id, body);
    return reply.status(201).send({ success: true, data: session });
  });

  // GET /api/teams/:teamId/brainstorm/:sessionId
  app.get('/:teamId/brainstorm/:sessionId', { preHandler: [teamGuard()] }, async (request, reply) => {
    const { sessionId } = request.params as { sessionId: string };
    const session = await brainstormService.findById(sessionId);
    return reply.send({ success: true, data: session });
  });

  // POST /api/teams/:teamId/brainstorm/:sessionId/messages
  app.post('/:teamId/brainstorm/:sessionId/messages', { preHandler: [teamGuard()] }, async (request, reply) => {
    const { sessionId } = request.params as { sessionId: string };
    const body = sendMessageSchema.parse(request.body);
    const result = await brainstormService.sendMessage(sessionId, request.user.id, body.content, body.provider, body.model);
    return reply.send({ success: true, data: result });
  });

  // POST /api/teams/:teamId/brainstorm/:sessionId/stream — SSE streaming
  app.post('/:teamId/brainstorm/:sessionId/stream', { preHandler: [teamGuard()] }, async (request, reply) => {
    const { sessionId } = request.params as { sessionId: string };
    const body = sendMessageSchema.parse(request.body);

    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });

    try {
      for await (const chunk of brainstormService.streamMessage(sessionId, request.user.id, body.content, body.provider, body.model)) {
        reply.raw.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
      }
      reply.raw.write(`data: [DONE]\n\n`);
    } catch (error: any) {
      reply.raw.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    }
    reply.raw.end();
  });

  // PATCH /api/teams/:teamId/brainstorm/messages/:messageId/pin
  app.patch('/:teamId/brainstorm/messages/:messageId/pin', { preHandler: [teamGuard()] }, async (request, reply) => {
    const { messageId } = request.params as { messageId: string };
    const msg = await brainstormService.pinMessage(messageId);
    return reply.send({ success: true, data: msg });
  });

  // PATCH /api/teams/:teamId/brainstorm/messages/:messageId/unpin
  app.patch('/:teamId/brainstorm/messages/:messageId/unpin', { preHandler: [teamGuard()] }, async (request, reply) => {
    const { messageId } = request.params as { messageId: string };
    const msg = await brainstormService.unpinMessage(messageId);
    return reply.send({ success: true, data: msg });
  });

  // GET /api/teams/:teamId/brainstorm/:sessionId/pinned
  app.get('/:teamId/brainstorm/:sessionId/pinned', { preHandler: [teamGuard()] }, async (request, reply) => {
    const { sessionId } = request.params as { sessionId: string };
    const msgs = await brainstormService.getPinnedMessages(sessionId);
    return reply.send({ success: true, data: msgs });
  });

  // GET /api/teams/:teamId/brainstorm/:sessionId/export
  app.get('/:teamId/brainstorm/:sessionId/export', { preHandler: [teamGuard()] }, async (request, reply) => {
    const { sessionId } = request.params as { sessionId: string };
    const markdown = await brainstormService.exportSession(sessionId);
    return reply.header('Content-Type', 'text/markdown').send(markdown);
  });

  // DELETE /api/teams/:teamId/brainstorm/:sessionId
  app.delete('/:teamId/brainstorm/:sessionId', { preHandler: [teamGuard()] }, async (request, reply) => {
    const { sessionId } = request.params as { sessionId: string };
    await brainstormService.deleteSession(sessionId);
    return reply.send({ success: true, data: { message: 'Session deleted' } });
  });
}
