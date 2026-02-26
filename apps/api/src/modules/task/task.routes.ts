import type { FastifyInstance } from 'fastify';
import { taskService } from './task.service.js';
import {
  createTaskSchema, updateTaskSchema, taskFiltersSchema,
  createLabelSchema, createCommentSchema, reorderTasksSchema,
} from '@brainforge/validators';
import { authGuard } from '../../middleware/auth.middleware.js';
import { teamGuard } from '../../middleware/team.middleware.js';
import { prisma } from '../../lib/prisma.js';

export async function taskRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authGuard);

  // POST /api/teams/:teamId/tasks
  app.post('/:teamId/tasks', { preHandler: [teamGuard()] }, async (request, reply) => {
    const { teamId } = request.params as { teamId: string };
    const body = createTaskSchema.parse(request.body);
    const task = await taskService.create(teamId, body, request.user.id);
    return reply.status(201).send({ success: true, data: task });
  });

  // GET /api/teams/:teamId/tasks
  app.get('/:teamId/tasks', { preHandler: [teamGuard()] }, async (request, reply) => {
    const { teamId } = request.params as { teamId: string };
    const filters = taskFiltersSchema.parse(request.query);
    const tasks = await taskService.findByTeam(teamId, filters);
    return reply.send({ success: true, data: tasks });
  });

  // GET /api/teams/:teamId/tasks/:taskId
  app.get('/:teamId/tasks/:taskId', { preHandler: [teamGuard()] }, async (request, reply) => {
    const { taskId } = request.params as { taskId: string };
    const task = await taskService.findById(taskId);
    return reply.send({ success: true, data: task });
  });

  // PATCH /api/teams/:teamId/tasks/:taskId
  app.patch('/:teamId/tasks/:taskId', { preHandler: [teamGuard()] }, async (request, reply) => {
    const { taskId } = request.params as { taskId: string };
    const body = updateTaskSchema.parse(request.body);
    const task = await taskService.update(taskId, body, request.user.id);
    return reply.send({ success: true, data: task });
  });

  // DELETE /api/teams/:teamId/tasks/:taskId
  app.delete('/:teamId/tasks/:taskId', { preHandler: [teamGuard()] }, async (request, reply) => {
    const { taskId } = request.params as { taskId: string };
    await taskService.delete(taskId);
    return reply.send({ success: true, data: { message: 'Task deleted' } });
  });

  // PATCH /api/teams/:teamId/tasks/:taskId/assignees
  app.patch('/:teamId/tasks/:taskId/assignees', { preHandler: [teamGuard()] }, async (request, reply) => {
    const { taskId } = request.params as { taskId: string };
    const { assigneeIds } = request.body as { assigneeIds: string[] };
    const task = await taskService.updateAssignees(taskId, assigneeIds, request.user.id);
    return reply.send({ success: true, data: task });
  });

  // POST /api/teams/:teamId/tasks/:taskId/comments
  app.post('/:teamId/tasks/:taskId/comments', { preHandler: [teamGuard()] }, async (request, reply) => {
    const { taskId } = request.params as { taskId: string };
    const body = createCommentSchema.parse(request.body);
    const comment = await taskService.addComment(taskId, request.user.id, body.content);
    return reply.status(201).send({ success: true, data: comment });
  });

  // GET /api/teams/:teamId/tasks/:taskId/comments
  app.get('/:teamId/tasks/:taskId/comments', { preHandler: [teamGuard()] }, async (request, reply) => {
    const { taskId } = request.params as { taskId: string };
    const comments = await taskService.getComments(taskId);
    return reply.send({ success: true, data: comments });
  });

  // GET /api/teams/:teamId/tasks/:taskId/activities
  app.get('/:teamId/tasks/:taskId/activities', { preHandler: [teamGuard()] }, async (request, reply) => {
    const { taskId } = request.params as { taskId: string };
    const activities = await prisma.taskActivity.findMany({
      where: { taskId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    // Enrich with user names
    const userIds = [...new Set(activities.map((a) => a.userId))];
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, avatarUrl: true },
    });
    const userMap = Object.fromEntries(users.map((u) => [u.id, u]));
    const enriched = activities.map((a) => ({
      ...a,
      user: userMap[a.userId] || { id: a.userId, name: 'Unknown', avatarUrl: null },
    }));
    return reply.send({ success: true, data: enriched });
  });

  // PATCH /api/teams/:teamId/tasks/reorder
  app.patch('/:teamId/tasks/reorder', { preHandler: [teamGuard()] }, async (request, reply) => {
    const body = reorderTasksSchema.parse(request.body);
    await taskService.reorder(body.tasks);
    return reply.send({ success: true, data: { message: 'Tasks reordered' } });
  });

  // Labels
  app.post('/:teamId/labels', { preHandler: [teamGuard()] }, async (request, reply) => {
    const { teamId } = request.params as { teamId: string };
    const body = createLabelSchema.parse(request.body);
    const label = await taskService.createLabel(teamId, body.name, body.color);
    return reply.status(201).send({ success: true, data: label });
  });

  app.get('/:teamId/labels', { preHandler: [teamGuard()] }, async (request, reply) => {
    const { teamId } = request.params as { teamId: string };
    const labels = await taskService.getLabels(teamId);
    return reply.send({ success: true, data: labels });
  });
}

// Separate route for /api/users/my-tasks
export async function myTasksRoute(app: FastifyInstance) {
  app.addHook('preHandler', authGuard);

  app.get('/my-tasks', async (request, reply) => {
    const tasks = await taskService.findMyTasks(request.user.id);
    return reply.send({ success: true, data: tasks });
  });
}
