import type { FastifyPluginAsync } from 'fastify';
import { authGuard } from '../../middleware/auth.middleware.js';
import { teamGuard } from '../../middleware/team.middleware.js';
import { notulenService } from './notulen.service.js';

export const notulenRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', authGuard);

  // Get notulen config for current user
  app.get('/:teamId/notulen/config', { preHandler: [teamGuard()] }, async (request, reply) => {
    const { teamId } = request.params as { teamId: string };
    const config = await notulenService.getConfig(teamId, request.user.id);
    return reply.send({ success: true, data: config });
  });

  // Update notulen config
  app.patch('/:teamId/notulen/config', { preHandler: [teamGuard()] }, async (request, reply) => {
    const { teamId } = request.params as { teamId: string };
    const body = request.body as { isActive?: boolean; provider?: string; model?: string };
    const config = await notulenService.updateConfig(teamId, request.user.id, body);
    return reply.send({ success: true, data: config });
  });

  // Get notulen entries
  app.get('/:teamId/notulen', { preHandler: [teamGuard()] }, async (request, reply) => {
    const { teamId } = request.params as { teamId: string };
    const query = request.query as { projectId?: string; limit?: string; offset?: string };
    const entries = await notulenService.getEntries(teamId, {
      projectId: query.projectId,
      limit: query.limit ? parseInt(query.limit) : undefined,
      offset: query.offset ? parseInt(query.offset) : undefined,
    });
    return reply.send({ success: true, data: entries });
  });

  // Get single entry
  app.get('/:teamId/notulen/:entryId', { preHandler: [teamGuard()] }, async (request, reply) => {
    const { entryId } = request.params as { entryId: string };
    const entry = await notulenService.getEntry(entryId);
    if (!entry) return reply.status(404).send({ success: false, error: { message: 'Entry not found' } });
    return reply.send({ success: true, data: entry });
  });

  // Generate summary manually
  app.post('/:teamId/notulen/generate', { preHandler: [teamGuard()] }, async (request, reply) => {
    const { teamId } = request.params as { teamId: string };
    const body = request.body as { provider: string; model: string; projectId?: string; customPrompt?: string };

    if (!body.provider || !body.model) {
      return reply.status(400).send({
        success: false,
        error: { message: 'provider and model are required' },
      });
    }

    try {
      const entry = await notulenService.generateSummary(teamId, request.user.id, {
        provider: body.provider,
        model: body.model,
        projectId: body.projectId,
        customPrompt: body.customPrompt,
      });
      return reply.send({ success: true, data: entry });
    } catch (err: any) {
      return reply.status(500).send({
        success: false,
        error: { message: err.message || 'Failed to generate summary' },
      });
    }
  });

  // Delete entry
  app.delete('/:teamId/notulen/:entryId', { preHandler: [teamGuard()] }, async (request, reply) => {
    const { entryId } = request.params as { entryId: string };
    try {
      await notulenService.deleteEntry(entryId, request.user.id);
      return reply.send({ success: true, data: { message: 'Entry deleted' } });
    } catch (err: any) {
      return reply.status(err.message === 'Unauthorized' ? 403 : 404).send({
        success: false,
        error: { message: err.message },
      });
    }
  });

  // Trigger daily summary cron (for admin or manual trigger)
  app.post('/:teamId/notulen/cron', { preHandler: [teamGuard()] }, async (request, reply) => {
    const results = await notulenService.runDailySummaries();
    return reply.send({ success: true, data: results });
  });
};
