import type { FastifyInstance } from 'fastify';
import { aiChatService } from './ai-chat.service.js';
import { authGuard } from '../../middleware/auth.middleware.js';
import { teamGuard } from '../../middleware/team.middleware.js';

export async function aiChatRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authGuard);

  // GET /:teamId/ai-chat — list chats
  app.get('/:teamId/ai-chat', { preHandler: [teamGuard()] }, async (request, reply) => {
    const { teamId } = request.params as { teamId: string };
    const { projectId } = request.query as { projectId?: string };
    const chats = await aiChatService.listChats(teamId, request.user.id, projectId);
    return reply.send({ success: true, data: chats });
  });

  // POST /:teamId/ai-chat — create chat
  app.post('/:teamId/ai-chat', { preHandler: [teamGuard()] }, async (request, reply) => {
    const { teamId } = request.params as { teamId: string };
    const { title, projectId } = request.body as { title: string; projectId?: string };
    const chat = await aiChatService.createChat(teamId, request.user.id, title || 'New Chat', projectId);
    return reply.send({ success: true, data: chat });
  });

  // GET /:teamId/ai-chat/:chatId — get chat with messages
  app.get('/:teamId/ai-chat/:chatId', { preHandler: [teamGuard()] }, async (request, reply) => {
    const { chatId } = request.params as { chatId: string };
    const chat = await aiChatService.getChat(chatId);
    if (!chat) return reply.status(404).send({ success: false, error: { message: 'Chat not found' } });
    return reply.send({ success: true, data: chat });
  });

  // DELETE /:teamId/ai-chat/:chatId — delete chat
  app.delete('/:teamId/ai-chat/:chatId', { preHandler: [teamGuard()] }, async (request, reply) => {
    const { chatId } = request.params as { chatId: string };
    await aiChatService.deleteChat(chatId, request.user.id);
    return reply.send({ success: true });
  });

  // PATCH /:teamId/ai-chat/:chatId — update title
  app.patch('/:teamId/ai-chat/:chatId', { preHandler: [teamGuard()] }, async (request, reply) => {
    const { chatId } = request.params as { chatId: string };
    const { title } = request.body as { title: string };
    const chat = await aiChatService.updateTitle(chatId, request.user.id, title);
    return reply.send({ success: true, data: chat });
  });

  // POST /:teamId/ai-chat/:chatId/messages — send message & get AI response
  app.post('/:teamId/ai-chat/:chatId/messages', { preHandler: [teamGuard()] }, async (request, reply) => {
    const { chatId } = request.params as { chatId: string };
    const { content, provider, model } = request.body as { content: string; provider: string; model: string };

    if (!content?.trim()) {
      return reply.status(400).send({ success: false, error: { message: 'Message content is required' } });
    }
    if (!provider || !model) {
      return reply.status(400).send({ success: false, error: { message: 'Provider and model are required' } });
    }

    try {
      const aiMessage = await aiChatService.sendMessage(chatId, request.user.id, content, provider, model);
      return reply.send({ success: true, data: aiMessage });
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        error: { message: error.message || 'AI request failed' },
      });
    }
  });
}
