import type { FastifyInstance } from 'fastify';
import { projectService } from './project.service.js';
import { authGuard } from '../../middleware/auth.middleware.js';
import { teamGuard } from '../../middleware/team.middleware.js';

export async function projectRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authGuard);

  // GET /:teamId/projects — list projects
  app.get('/:teamId/projects', { preHandler: [teamGuard()] }, async (request, reply) => {
    const { teamId } = request.params as { teamId: string };
    const projects = await projectService.listProjects(teamId);
    return reply.send({ success: true, data: projects });
  });

  // POST /:teamId/projects — create project
  app.post('/:teamId/projects', { preHandler: [teamGuard()] }, async (request, reply) => {
    const { teamId } = request.params as { teamId: string };
    const { name, description, color, icon } = request.body as {
      name: string; description?: string; color?: string; icon?: string;
    };
    if (!name?.trim()) {
      return reply.status(400).send({ success: false, error: { message: 'Project name is required' } });
    }
    const project = await projectService.createProject(teamId, request.user.id, { name, description, color, icon });
    return reply.send({ success: true, data: project });
  });

  // GET /:teamId/projects/:projectId — get project
  app.get('/:teamId/projects/:projectId', { preHandler: [teamGuard()] }, async (request, reply) => {
    const { projectId } = request.params as { projectId: string };
    const project = await projectService.getProject(projectId);
    if (!project) return reply.status(404).send({ success: false, error: { message: 'Project not found' } });
    return reply.send({ success: true, data: project });
  });

  // PATCH /:teamId/projects/:projectId — update project
  app.patch('/:teamId/projects/:projectId', { preHandler: [teamGuard()] }, async (request, reply) => {
    const { projectId } = request.params as { projectId: string };
    const body = request.body as { name?: string; description?: string; color?: string; icon?: string };
    const project = await projectService.updateProject(projectId, request.user.id, body);
    return reply.send({ success: true, data: project });
  });

  // DELETE /:teamId/projects/:projectId — delete project
  app.delete('/:teamId/projects/:projectId', { preHandler: [teamGuard()] }, async (request, reply) => {
    const { projectId } = request.params as { projectId: string };
    await projectService.deleteProject(projectId);
    return reply.send({ success: true });
  });
}
