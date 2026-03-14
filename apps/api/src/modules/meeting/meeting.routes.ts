import type { FastifyPluginAsync } from 'fastify';
import { authGuard } from '../../middleware/auth.middleware.js';
import { teamGuard } from '../../middleware/team.middleware.js';
import { meetingService } from './meeting.service.js';

export const meetingRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', authGuard);

  // List meetings
  app.get('/:teamId/meetings', { preHandler: [teamGuard()] }, async (request, reply) => {
    const { teamId } = request.params as { teamId: string };
    const query = request.query as { projectId?: string; limit?: string; offset?: string };
    const meetings = await meetingService.getMeetings(teamId, {
      projectId: query.projectId,
      limit: query.limit ? parseInt(query.limit) : undefined,
      offset: query.offset ? parseInt(query.offset) : undefined,
    });
    return reply.send({ success: true, data: meetings });
  });

  // Get single meeting
  app.get('/:teamId/meetings/:meetingId', { preHandler: [teamGuard()] }, async (request, reply) => {
    const { meetingId } = request.params as { meetingId: string };
    const meeting = await meetingService.getMeeting(meetingId);
    if (!meeting) return reply.status(404).send({ success: false, error: { message: 'Meeting not found' } });
    return reply.send({ success: true, data: meeting });
  });

  // Create meeting
  app.post('/:teamId/meetings', { preHandler: [teamGuard()] }, async (request, reply) => {
    const { teamId } = request.params as { teamId: string };
    const body = request.body as {
      title: string;
      description?: string;
      meetLink?: string;
      startTime?: string;
      endTime?: string;
      projectId?: string;
      transcript?: string;
      status?: string;
    };

    if (!body.title) {
      return reply.status(400).send({ success: false, error: { message: 'title is required' } });
    }

    const meeting = await meetingService.createMeeting(teamId, request.user.id, body);
    return reply.send({ success: true, data: meeting });
  });

  // Update meeting
  app.patch('/:teamId/meetings/:meetingId', { preHandler: [teamGuard()] }, async (request, reply) => {
    const { meetingId } = request.params as { meetingId: string };
    const body = request.body as {
      title?: string;
      description?: string;
      meetLink?: string;
      startTime?: string;
      endTime?: string;
      status?: string;
      transcript?: string;
      projectId?: string | null;
    };

    try {
      const meeting = await meetingService.updateMeeting(meetingId, request.user.id, body);
      return reply.send({ success: true, data: meeting });
    } catch (err: any) {
      return reply.status(err.message === 'Unauthorized' ? 403 : 404).send({
        success: false,
        error: { message: err.message },
      });
    }
  });

  // Delete meeting
  app.delete('/:teamId/meetings/:meetingId', { preHandler: [teamGuard()] }, async (request, reply) => {
    const { meetingId } = request.params as { meetingId: string };
    try {
      await meetingService.deleteMeeting(meetingId, request.user.id);
      return reply.send({ success: true, data: { message: 'Meeting deleted' } });
    } catch (err: any) {
      return reply.status(err.message === 'Unauthorized' ? 403 : 404).send({
        success: false,
        error: { message: err.message },
      });
    }
  });

  // AI summarize transcript
  app.post('/:teamId/meetings/:meetingId/summarize', { preHandler: [teamGuard()] }, async (request, reply) => {
    const { meetingId } = request.params as { meetingId: string };
    const body = request.body as { provider: string; model: string };

    if (!body.provider || !body.model) {
      return reply.status(400).send({ success: false, error: { message: 'provider and model are required' } });
    }

    try {
      const meeting = await meetingService.summarizeTranscript(meetingId, request.user.id, body.provider, body.model);
      return reply.send({ success: true, data: meeting });
    } catch (err: any) {
      return reply.status(500).send({ success: false, error: { message: err.message || 'Failed to summarize' } });
    }
  });
};
