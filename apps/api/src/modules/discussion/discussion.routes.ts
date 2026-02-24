import type { FastifyInstance } from 'fastify';
import { discussionService } from './discussion.service.js';
import { createDiscussionSchema, updateDiscussionSchema, createDiscussionReplySchema } from '@brainforge/validators';
import { authGuard } from '../../middleware/auth.middleware.js';
import { teamGuard } from '../../middleware/team.middleware.js';

export async function discussionRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authGuard);

  // List discussions for a team
  app.get('/:teamId/discussions', { preHandler: [teamGuard()] }, async (request, reply) => {
    const { teamId } = request.params as { teamId: string };
    const { category } = request.query as { category?: string };
    const discussions = await discussionService.findByTeam(teamId, category);
    return reply.send({ success: true, data: discussions });
  });

  // Create a discussion
  app.post('/:teamId/discussions', { preHandler: [teamGuard()] }, async (request, reply) => {
    const { teamId } = request.params as { teamId: string };
    const body = createDiscussionSchema.parse(request.body);
    const discussion = await discussionService.create(teamId, request.user.id, body);
    return reply.status(201).send({ success: true, data: discussion });
  });

  // Get a single discussion with replies
  app.get('/:teamId/discussions/:discussionId', { preHandler: [teamGuard()] }, async (request, reply) => {
    const { discussionId } = request.params as { discussionId: string };
    const discussion = await discussionService.findById(discussionId);
    return reply.send({ success: true, data: discussion });
  });

  // Update a discussion
  app.patch('/:teamId/discussions/:discussionId', { preHandler: [teamGuard()] }, async (request, reply) => {
    const { discussionId } = request.params as { discussionId: string };
    const body = updateDiscussionSchema.parse(request.body);
    const discussion = await discussionService.update(discussionId, body);
    return reply.send({ success: true, data: discussion });
  });

  // Delete a discussion
  app.delete('/:teamId/discussions/:discussionId', { preHandler: [teamGuard()] }, async (request, reply) => {
    const { discussionId } = request.params as { discussionId: string };
    await discussionService.delete(discussionId);
    return reply.send({ success: true, data: { message: 'Discussion deleted' } });
  });

  // Add a reply to a discussion
  app.post('/:teamId/discussions/:discussionId/replies', { preHandler: [teamGuard()] }, async (request, reply) => {
    const { discussionId } = request.params as { discussionId: string };
    const body = createDiscussionReplySchema.parse(request.body);
    const replyData = await discussionService.addReply(discussionId, request.user.id, body);
    return reply.status(201).send({ success: true, data: replyData });
  });

  // Update a reply
  app.patch('/:teamId/discussions/:discussionId/replies/:replyId', { preHandler: [teamGuard()] }, async (request, reply) => {
    const { replyId } = request.params as { replyId: string };
    const body = createDiscussionReplySchema.parse(request.body);
    const replyData = await discussionService.updateReply(replyId, body);
    return reply.send({ success: true, data: replyData });
  });

  // Delete a reply
  app.delete('/:teamId/discussions/:discussionId/replies/:replyId', { preHandler: [teamGuard()] }, async (request, reply) => {
    const { replyId } = request.params as { replyId: string };
    await discussionService.deleteReply(replyId);
    return reply.send({ success: true, data: { message: 'Reply deleted' } });
  });
}
