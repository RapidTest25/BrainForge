import type { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../lib/prisma.js';

export async function adminGuard(request: FastifyRequest, reply: FastifyReply) {
  try {
    const user = request.user;
    if (!user) {
      return reply.status(401).send({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { isAdmin: true },
    });

    if (!dbUser?.isAdmin) {
      return reply.status(403).send({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Admin access required' },
      });
    }
  } catch {
    return reply.status(403).send({
      success: false,
      error: { code: 'FORBIDDEN', message: 'Admin access required' },
    });
  }
}
