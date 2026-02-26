import type { FastifyPluginAsync } from 'fastify';
import { notificationService } from './notification.service.js';
import { authGuard } from '../../middleware/auth.middleware.js';
import { teamGuard } from '../../middleware/team.middleware.js';

export const notificationRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', authGuard);

  // Get notifications
  app.get('/:teamId/notifications', { preHandler: [teamGuard()] }, async (request, reply) => {
    const { teamId } = request.params as { teamId: string };
    const notifications = await notificationService.findByUser(teamId, request.user.id);
    return reply.send({ success: true, data: notifications });
  });

  // Mark all as read (must be before :notificationId routes)
  app.patch('/:teamId/notifications/mark-all-read', { preHandler: [teamGuard()] }, async (request, reply) => {
    const { teamId } = request.params as { teamId: string };
    await notificationService.markAllRead(teamId, request.user.id);
    return reply.send({ success: true, data: { message: 'All marked as read' } });
  });

  // Mark single notification as read
  app.patch('/:teamId/notifications/:notificationId', { preHandler: [teamGuard()] }, async (request, reply) => {
    const { notificationId } = request.params as { notificationId: string };
    await notificationService.markRead(notificationId, request.user.id);
    return reply.send({ success: true, data: { message: 'Marked as read' } });
  });

  // Delete notification
  app.delete('/:teamId/notifications/:notificationId', { preHandler: [teamGuard()] }, async (request, reply) => {
    const { notificationId } = request.params as { notificationId: string };
    await notificationService.delete(notificationId, request.user.id);
    return reply.send({ success: true, data: { message: 'Notification deleted' } });
  });
};
