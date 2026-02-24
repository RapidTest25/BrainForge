import type { FastifyInstance } from 'fastify';
import { sprintService } from './sprint.service.js';
import { createSprintSchema, updateSprintSchema } from '@brainforge/validators';
import { authGuard } from '../../middleware/auth.middleware.js';
import { teamGuard } from '../../middleware/team.middleware.js';

export async function sprintRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authGuard);

  app.get('/:teamId/sprints', { preHandler: [teamGuard()] }, async (request, reply) => {
    const { teamId } = request.params as { teamId: string };
    const sprints = await sprintService.findByTeam(teamId);
    return reply.send({ success: true, data: sprints });
  });

  app.post('/:teamId/sprints', { preHandler: [teamGuard()] }, async (request, reply) => {
    const { teamId } = request.params as { teamId: string };
    const body = createSprintSchema.parse(request.body);
    const sprint = await sprintService.create(teamId, request.user.id, { title: body.title, goal: body.goal, deadline: body.deadline, teamSize: body.teamSize });
    return reply.status(201).send({ success: true, data: sprint });
  });

  app.get('/:teamId/sprints/:sprintId', { preHandler: [teamGuard()] }, async (request, reply) => {
    const { sprintId } = request.params as { sprintId: string };
    const sprint = await sprintService.findById(sprintId);
    return reply.send({ success: true, data: sprint });
  });

  app.patch('/:teamId/sprints/:sprintId', { preHandler: [teamGuard()] }, async (request, reply) => {
    const { sprintId } = request.params as { sprintId: string };
    const body = updateSprintSchema.parse(request.body);
    const sprint = await sprintService.update(sprintId, body);
    return reply.send({ success: true, data: sprint });
  });

  app.delete('/:teamId/sprints/:sprintId', { preHandler: [teamGuard()] }, async (request, reply) => {
    const { sprintId } = request.params as { sprintId: string };
    await sprintService.delete(sprintId);
    return reply.send({ success: true, data: { message: 'Sprint deleted' } });
  });

  // AI Generate sprint plan
  app.post('/:teamId/sprints/ai-generate', { preHandler: [teamGuard()] }, async (request, reply) => {
    const { teamId } = request.params as { teamId: string };
    const body = createSprintSchema.parse(request.body);
    const sprint = await sprintService.generateAndSave(
      teamId, request.user.id, body.provider, body.model,
      body.title, body.goal, body.deadline, body.teamSize, body.context
    );
    return reply.status(201).send({ success: true, data: sprint });
  });

  // Convert sprint tasks to actual tasks
  app.post('/:teamId/sprints/:sprintId/convert', { preHandler: [teamGuard()] }, async (request, reply) => {
    const { teamId, sprintId } = request.params as { teamId: string; sprintId: string };
    const tasks = await sprintService.convertToTasks(sprintId, teamId, request.user.id);
    return reply.send({ success: true, data: tasks });
  });
}
