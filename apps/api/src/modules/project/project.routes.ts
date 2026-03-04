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

  // ── Project Member Routes ──

  // GET /:teamId/projects/:projectId/members — list project members
  app.get('/:teamId/projects/:projectId/members', { preHandler: [teamGuard()] }, async (request, reply) => {
    const { projectId } = request.params as { projectId: string };
    const members = await projectService.getProjectMembers(projectId);
    return reply.send({ success: true, data: members });
  });

  // GET /:teamId/projects/:projectId/available-members — team members not yet in project
  app.get('/:teamId/projects/:projectId/available-members', { preHandler: [teamGuard()] }, async (request, reply) => {
    const { teamId, projectId } = request.params as { teamId: string; projectId: string };
    const available = await projectService.getAvailableTeamMembers(projectId, teamId);
    return reply.send({ success: true, data: available });
  });

  // POST /:teamId/projects/:projectId/members — add member to project
  app.post('/:teamId/projects/:projectId/members', { preHandler: [teamGuard('ADMIN')] }, async (request, reply) => {
    const { projectId } = request.params as { projectId: string };
    const { userId, role } = request.body as { userId: string; role?: 'OWNER' | 'ADMIN' | 'MEMBER' };
    if (!userId) {
      return reply.status(400).send({ success: false, error: { message: 'userId is required' } });
    }
    try {
      const member = await projectService.addProjectMember(projectId, userId, role || 'MEMBER');
      return reply.send({ success: true, data: member });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: { message: err.message } });
    }
  });

  // PATCH /:teamId/projects/:projectId/members/:userId — update member role
  app.patch('/:teamId/projects/:projectId/members/:userId', { preHandler: [teamGuard('ADMIN')] }, async (request, reply) => {
    const { projectId, userId } = request.params as { projectId: string; userId: string };
    const { role } = request.body as { role: 'OWNER' | 'ADMIN' | 'MEMBER' };
    const member = await projectService.updateProjectMemberRole(projectId, userId, role);
    return reply.send({ success: true, data: member });
  });

  // DELETE /:teamId/projects/:projectId/members/:userId — remove member from project
  app.delete('/:teamId/projects/:projectId/members/:userId', { preHandler: [teamGuard('ADMIN')] }, async (request, reply) => {
    const { projectId, userId } = request.params as { projectId: string; userId: string };
    try {
      await projectService.removeProjectMember(projectId, userId);
      return reply.send({ success: true });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: { message: err.message } });
    }
  });
}
