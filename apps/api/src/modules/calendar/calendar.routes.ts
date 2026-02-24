import type { FastifyInstance } from 'fastify';
import { calendarService } from './calendar.service.js';
import { createEventSchema, updateEventSchema } from '@brainforge/validators';
import { authGuard } from '../../middleware/auth.middleware.js';
import { teamGuard } from '../../middleware/team.middleware.js';

export async function calendarRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authGuard);

  app.get('/:teamId/calendar', { preHandler: [teamGuard()] }, async (request, reply) => {
    const { teamId } = request.params as { teamId: string };
    const { start, end } = request.query as { start?: string; end?: string };
    const events = await calendarService.findByTeam(teamId, start, end);
    return reply.send({ success: true, data: events });
  });

  app.get('/:teamId/calendar/feed', { preHandler: [teamGuard()] }, async (request, reply) => {
    const { teamId } = request.params as { teamId: string };
    const { start, end } = request.query as { start: string; end: string };
    const feed = await calendarService.getAggregatedFeed(teamId, start, end);
    return reply.send({ success: true, data: feed });
  });

  app.post('/:teamId/calendar', { preHandler: [teamGuard()] }, async (request, reply) => {
    const { teamId } = request.params as { teamId: string };
    const body = createEventSchema.parse(request.body);
    const event = await calendarService.create(teamId, request.user.id, body);
    return reply.status(201).send({ success: true, data: event });
  });

  app.get('/:teamId/calendar/:eventId', { preHandler: [teamGuard()] }, async (request, reply) => {
    const { eventId } = request.params as { eventId: string };
    const event = await calendarService.findById(eventId);
    return reply.send({ success: true, data: event });
  });

  app.patch('/:teamId/calendar/:eventId', { preHandler: [teamGuard()] }, async (request, reply) => {
    const { eventId } = request.params as { eventId: string };
    const body = updateEventSchema.parse(request.body);
    const event = await calendarService.update(eventId, body);
    return reply.send({ success: true, data: event });
  });

  app.delete('/:teamId/calendar/:eventId', { preHandler: [teamGuard()] }, async (request, reply) => {
    const { eventId } = request.params as { eventId: string };
    await calendarService.delete(eventId);
    return reply.send({ success: true, data: { message: 'Event deleted' } });
  });
}
