import type { FastifyInstance } from 'fastify';
import { teamService } from './team.service.js';
import { createTeamSchema, updateTeamSchema, inviteMemberSchema, updateMemberRoleSchema } from '@brainforge/validators';
import { authGuard } from '../../middleware/auth.middleware.js';
import { teamGuard } from '../../middleware/team.middleware.js';
import { AppError } from '../../lib/errors.js';

export async function teamRoutes(app: FastifyInstance) {
  // All team routes require auth
  app.addHook('preHandler', authGuard);

  // POST /api/teams
  app.post('/', async (request, reply) => {
    const body = createTeamSchema.parse(request.body);
    const team = await teamService.create(body, request.user.id);
    return reply.status(201).send({ success: true, data: team });
  });

  // GET /api/teams
  app.get('/', async (request, reply) => {
    let teams = await teamService.findUserTeams(request.user.id);
    // Auto-create a personal team if user has none
    if (teams.length === 0) {
      const user = await teamService.autoCreatePersonalTeam(request.user.id);
      teams = await teamService.findUserTeams(request.user.id);
    }
    return reply.send({ success: true, data: teams });
  });

  // GET /api/teams/:teamId
  app.get('/:teamId', { preHandler: [teamGuard()] }, async (request, reply) => {
    const { teamId } = request.params as { teamId: string };
    const team = await teamService.findById(teamId);
    return reply.send({ success: true, data: team });
  });

  // PATCH /api/teams/:teamId
  app.patch('/:teamId', { preHandler: [teamGuard(['OWNER', 'ADMIN'])] }, async (request, reply) => {
    const { teamId } = request.params as { teamId: string };
    const body = updateTeamSchema.parse(request.body);
    const team = await teamService.update(teamId, body);
    return reply.send({ success: true, data: team });
  });

  // DELETE /api/teams/:teamId
  app.delete('/:teamId', { preHandler: [teamGuard(['OWNER'])] }, async (request, reply) => {
    const { teamId } = request.params as { teamId: string };
    await teamService.delete(teamId, request.user.id);
    return reply.send({ success: true, data: { message: 'Team deleted' } });
  });

  // POST /api/teams/:teamId/invitations
  app.post('/:teamId/invitations', { preHandler: [teamGuard(['OWNER', 'ADMIN'])] }, async (request, reply) => {
    const { teamId } = request.params as { teamId: string };
    const body = inviteMemberSchema.parse(request.body);
    const invitation = await teamService.invite(teamId, body, request.user.id);
    return reply.status(201).send({ success: true, data: invitation });
  });

  // POST /api/teams/:teamId/invite-link — generate a shareable invite link
  app.post('/:teamId/invite-link', { preHandler: [teamGuard(['OWNER', 'ADMIN'])] }, async (request, reply) => {
    const { teamId } = request.params as { teamId: string };
    const { role } = (request.body as any) || {};
    const result = await teamService.generateInviteLink(teamId, request.user.id, role || 'MEMBER');
    return reply.status(201).send({ success: true, data: result });
  });

  // GET /api/teams/invite/:token — get invite info for the join page
  app.get('/invite/:token', async (request, reply) => {
    const { token } = request.params as { token: string };
    try {
      const invitation = await (await import('../../lib/prisma.js')).prisma.teamInvitation.findUnique({
        where: { token },
        include: { team: { select: { id: true, name: true, description: true, _count: { select: { members: true } } } } },
      });
      if (!invitation) return reply.status(404).send({ success: false, error: 'Invitation not found' });
      if (invitation.expiresAt < new Date()) return reply.status(410).send({ success: false, error: 'Invitation expired' });
      if (invitation.status !== 'PENDING') return reply.status(410).send({ success: false, error: 'Invitation no longer valid' });
      return reply.send({ success: true, data: { teamName: invitation.team.name, teamDescription: invitation.team.description, memberCount: invitation.team._count.members, role: invitation.role, expiresAt: invitation.expiresAt } });
    } catch (e: any) {
      return reply.status(500).send({ success: false, error: e.message });
    }
  });

  // POST /api/teams/join/:token
  app.post('/join/:token', async (request, reply) => {
    const { token } = request.params as { token: string };
    const team = await teamService.acceptInvite(token, request.user.id);
    return reply.send({ success: true, data: team });
  });

  // GET /api/teams/:teamId/members
  app.get('/:teamId/members', { preHandler: [teamGuard()] }, async (request, reply) => {
    const { teamId } = request.params as { teamId: string };
    const team = await teamService.findById(teamId);
    return reply.send({ success: true, data: team.members });
  });

  // PATCH /api/teams/:teamId/members/:userId
  app.patch('/:teamId/members/:userId', { preHandler: [teamGuard(['OWNER', 'ADMIN'])] }, async (request, reply) => {
    const { teamId, userId } = request.params as { teamId: string; userId: string };
    const body = updateMemberRoleSchema.parse(request.body);
    const member = await teamService.updateMemberRole(teamId, userId, body.role);
    return reply.send({ success: true, data: member });
  });

  // DELETE /api/teams/:teamId/members/:userId
  app.delete('/:teamId/members/:userId', { preHandler: [teamGuard(['OWNER', 'ADMIN'])] }, async (request, reply) => {
    const { teamId, userId } = request.params as { teamId: string; userId: string };
    await teamService.removeMember(teamId, userId, request.user.id);
    return reply.send({ success: true, data: { message: 'Member removed' } });
  });
}
