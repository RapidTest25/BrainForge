import type { FastifyInstance } from 'fastify';
import { brainstormService } from './brainstorm.service.js';
import { createSessionSchema, sendMessageSchema } from '@brainforge/validators';
import { authGuard } from '../../middleware/auth.middleware.js';
import { teamGuard } from '../../middleware/team.middleware.js';
import { prisma } from '../../lib/prisma.js';
import { emitBrainstormChat, emitBrainstormAITyping } from '../../socket.js';
import path from 'path';
import fs from 'fs';
import { randomUUID } from 'crypto';

export async function brainstormRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authGuard);

  // GET /api/teams/:teamId/brainstorm
  app.get('/:teamId/brainstorm', { preHandler: [teamGuard()] }, async (request, reply) => {
    const { teamId } = request.params as { teamId: string };
    const { projectId } = request.query as { projectId?: string };
    const sessions = await brainstormService.findByTeam(teamId, projectId);
    return reply.send({ success: true, data: sessions });
  });

  // POST /api/teams/:teamId/brainstorm
  app.post('/:teamId/brainstorm', { preHandler: [teamGuard()] }, async (request, reply) => {
    const { teamId } = request.params as { teamId: string };
    const { projectId } = request.body as { projectId?: string };
    const body = createSessionSchema.parse(request.body);
    const session = await brainstormService.createSession(teamId, request.user.id, { ...body, projectId });
    return reply.status(201).send({ success: true, data: session });
  });

  // GET /api/teams/:teamId/brainstorm/members — get team members for @mention autocomplete
  // NOTE: Must be defined BEFORE /:teamId/brainstorm/:sessionId routes to avoid route collision
  app.get('/:teamId/brainstorm/members', { preHandler: [teamGuard()] }, async (request, reply) => {
    const { teamId } = request.params as { teamId: string };
    const members = await brainstormService.getTeamMembers(teamId);
    return reply.send({ success: true, data: members });
  });

  // GET /api/teams/:teamId/brainstorm/:sessionId
  app.get('/:teamId/brainstorm/:sessionId', { preHandler: [teamGuard()] }, async (request, reply) => {
    const { sessionId } = request.params as { sessionId: string };
    const session = await brainstormService.findById(sessionId);
    return reply.send({ success: true, data: session });
  });

  // POST /api/teams/:teamId/brainstorm/:sessionId/messages
  app.post('/:teamId/brainstorm/:sessionId/messages', { preHandler: [teamGuard()] }, async (request, reply) => {
    const { teamId, sessionId } = request.params as { teamId: string; sessionId: string };
    const body = sendMessageSchema.parse(request.body);
    const result = await brainstormService.sendMessage(sessionId, request.user.id, body.content);
    // Broadcast to all clients in the session room
    emitBrainstormChat(sessionId, 'chat:message', result);

    // Check if message mentions @ai — trigger AI response asynchronously
    if (/@ai\b/i.test(body.content)) {
      const { provider, model } = request.body as { provider?: string; model?: string };
      if (provider && model) {
        // Notify all clients that AI is thinking
        emitBrainstormAITyping(sessionId, true);

        // Fire-and-forget: generate AI reply in the background
        brainstormService.generateAIResponse(sessionId, request.user.id, provider, model, body.content)
          .then((aiMsg) => {
            emitBrainstormAITyping(sessionId, false);
            if (aiMsg && aiMsg.content) {
              emitBrainstormChat(sessionId, 'chat:message', aiMsg);
            }
          })
          .catch((err) => {
            emitBrainstormAITyping(sessionId, false);
            // Send error as a system-like AI message
            const errorContent = `Maaf, AI tidak dapat merespons saat ini. Error: ${err.message || 'Unknown error'}`;
            prisma.brainstormMessage.create({
              data: { sessionId, userId: null, role: 'ASSISTANT', content: errorContent },
              include: { user: { select: { id: true, name: true, avatarUrl: true } } },
            }).then(errMsg => {
              emitBrainstormChat(sessionId, 'chat:message', errMsg);
            }).catch(() => {});
          });
      }
    }

    return reply.send({ success: true, data: result });
  });

  // PATCH /api/teams/:teamId/brainstorm/messages/:messageId — edit message
  app.patch('/:teamId/brainstorm/messages/:messageId', { preHandler: [teamGuard()] }, async (request, reply) => {
    const { messageId } = request.params as { messageId: string };
    const { content } = request.body as { content: string };
    const msg = await brainstormService.editMessage(messageId, request.user.id, content);
    // Broadcast edit to all clients in the session room
    emitBrainstormChat(msg.sessionId, 'chat:edit', msg);
    return reply.send({ success: true, data: msg });
  });

  // DELETE /api/teams/:teamId/brainstorm/messages/:messageId — delete message
  app.delete('/:teamId/brainstorm/messages/:messageId', { preHandler: [teamGuard()] }, async (request, reply) => {
    const { messageId } = request.params as { messageId: string };
    // Look up the message to get sessionId before deleting
    const msg = await prisma.brainstormMessage.findUnique({ where: { id: messageId }, select: { sessionId: true } });
    await brainstormService.deleteMessage(messageId, request.user.id);
    // Broadcast delete to all clients in the session room
    if (msg) emitBrainstormChat(msg.sessionId, 'chat:delete', { messageId });
    return reply.send({ success: true, data: { message: 'Message deleted' } });
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

  // PATCH /api/teams/:teamId/brainstorm/:sessionId — update session (e.g. title)
  app.patch('/:teamId/brainstorm/:sessionId', { preHandler: [teamGuard()] }, async (request, reply) => {
    const { sessionId } = request.params as { sessionId: string };
    const { title } = request.body as { title?: string };
    const session = await brainstormService.updateSession(sessionId, { title });
    return reply.send({ success: true, data: session });
  });

  // PATCH /api/teams/:teamId/brainstorm/:sessionId/canvas — save whiteboard & flow data
  app.patch('/:teamId/brainstorm/:sessionId/canvas', { preHandler: [teamGuard()] }, async (request, reply) => {
    const { sessionId } = request.params as { sessionId: string };
    const { whiteboardData, flowData } = request.body as { whiteboardData?: any; flowData?: any };
    const session = await brainstormService.updateCanvasData(sessionId, whiteboardData, flowData);
    return reply.send({ success: true, data: session });
  });

  // POST /api/teams/:teamId/brainstorm/:sessionId/upload — file upload in discussion
  app.post('/:teamId/brainstorm/:sessionId/upload', { preHandler: [teamGuard()] }, async (request, reply) => {
    const { sessionId } = request.params as { sessionId: string };
    const data = await request.file();
    if (!data) {
      return reply.status(400).send({ success: false, error: { message: 'No file uploaded' } });
    }

    const uploadsDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

    const ext = path.extname(data.filename);
    const uniqueName = `${randomUUID()}${ext}`;
    const filePath = path.join(uploadsDir, uniqueName);

    const buffer = await data.toBuffer();
    fs.writeFileSync(filePath, buffer);

    const fileUrl = `/uploads/${uniqueName}`;

    // Create a message with the file
    const message = await prisma.brainstormMessage.create({
      data: {
        sessionId,
        userId: request.user.id,
        role: 'USER',
        content: data.filename,
        fileUrl,
        fileName: data.filename,
        fileType: data.mimetype,
      },
      include: { user: { select: { id: true, name: true, avatarUrl: true } } },
    });

    // Broadcast file message to all clients in the session room
    emitBrainstormChat(sessionId, 'chat:message', message);

    return reply.send({ success: true, data: message });
  });
}
