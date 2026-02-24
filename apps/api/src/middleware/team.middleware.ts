import type { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../lib/prisma.js';
import type { TeamRole } from '@prisma/client';

declare module 'fastify' {
  interface FastifyRequest {
    teamMember: {
      teamId: string;
      role: TeamRole;
    };
  }
}

export function teamGuard(requiredRoles?: TeamRole[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const { teamId } = request.params as { teamId: string };
    if (!teamId) {
      return reply.status(400).send({
        success: false,
        error: { code: 'BAD_REQUEST', message: 'Team ID is required' },
      });
    }

    const membership = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId,
          userId: request.user.id,
        },
      },
    });

    if (!membership) {
      return reply.status(403).send({
        success: false,
        error: { code: 'FORBIDDEN', message: 'You are not a member of this team' },
      });
    }

    if (requiredRoles && !requiredRoles.includes(membership.role)) {
      return reply.status(403).send({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Insufficient permissions' },
      });
    }

    request.teamMember = {
      teamId: membership.teamId,
      role: membership.role,
    };
  };
}
