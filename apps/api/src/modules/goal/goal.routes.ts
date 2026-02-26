import type { FastifyPluginAsync } from 'fastify';
import { goalService } from './goal.service.js';
import { authGuard } from '../../middleware/auth.middleware.js';
import { teamGuard } from '../../middleware/team.middleware.js';

export const goalRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', authGuard);

  // List goals
  app.get('/:teamId/goals', { preHandler: [teamGuard()] }, async (request, reply) => {
    const { teamId } = request.params as { teamId: string };
    const goals = await goalService.findByTeam(teamId);
    return reply.send({ success: true, data: goals });
  });

  // Create goal
  app.post('/:teamId/goals', { preHandler: [teamGuard()] }, async (request, reply) => {
    const { teamId } = request.params as { teamId: string };
    const body = request.body as { title: string; description?: string; dueDate?: string };
    if (!body.title) {
      return reply.status(400).send({ success: false, error: { message: 'Title is required' } });
    }
    const goal = await goalService.create(teamId, request.user.id, body);
    return reply.status(201).send({ success: true, data: goal });
  });

  // Get goal
  app.get('/:teamId/goals/:goalId', { preHandler: [teamGuard()] }, async (request, reply) => {
    const { goalId } = request.params as { goalId: string };
    const goal = await goalService.findById(goalId);
    return reply.send({ success: true, data: goal });
  });

  // Update goal
  app.patch('/:teamId/goals/:goalId', { preHandler: [teamGuard()] }, async (request, reply) => {
    const { goalId } = request.params as { goalId: string };
    const body = request.body as any;
    const goal = await goalService.update(goalId, body);
    return reply.send({ success: true, data: goal });
  });

  // Delete goal
  app.delete('/:teamId/goals/:goalId', { preHandler: [teamGuard()] }, async (request, reply) => {
    const { goalId } = request.params as { goalId: string };
    await goalService.delete(goalId);
    return reply.send({ success: true, data: { message: 'Goal deleted' } });
  });

  // AI Generate goals
  app.post('/:teamId/goals/ai-generate', { preHandler: [teamGuard()] }, async (request, reply) => {
    const { teamId } = request.params as { teamId: string };
    const { prompt, provider, model } = request.body as {
      prompt: string;
      provider: string;
      model: string;
    };

    if (!prompt || !provider || !model) {
      return reply.status(400).send({
        success: false,
        error: { message: 'prompt, provider, and model are required' },
      });
    }

    try {
      const goals = await goalService.generateWithAI(teamId, request.user.id, provider, model, prompt);
      return reply.send({ success: true, data: goals });
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        error: { message: error.message || 'AI generation failed' },
      });
    }
  });
};
