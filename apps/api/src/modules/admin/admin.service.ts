import { prisma } from '../../lib/prisma.js';
import { AppError, NotFoundError } from '../../lib/errors.js';

class AdminService {
  async getStats() {
    const [totalUsers, totalTeams, totalProjects, totalTasks, totalAiKeys, totalBrainstorms, totalDiagrams, totalNotes] =
      await Promise.all([
        prisma.user.count(),
        prisma.team.count(),
        prisma.project.count(),
        prisma.task.count(),
        prisma.userAIKey.count(),
        prisma.brainstormSession.count(),
        prisma.diagram.count(),
        prisma.note.count(),
      ]);

    // Recent user registrations (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const newUsersThisMonth = await prisma.user.count({
      where: { createdAt: { gte: thirtyDaysAgo } },
    });

    // AI usage logs (last 30 days)
    const aiUsageLogs = await prisma.aIUsageLog.aggregate({
      where: { createdAt: { gte: thirtyDaysAgo } },
      _sum: { promptTokens: true, completionTokens: true, estimatedCost: true },
      _count: true,
    });

    return {
      totalUsers,
      totalTeams,
      totalProjects,
      totalTasks,
      totalAiKeys,
      totalBrainstorms,
      totalDiagrams,
      totalNotes,
      newUsersThisMonth,
      aiUsage: {
        requests: aiUsageLogs._count,
        inputTokens: aiUsageLogs._sum.promptTokens || 0,
        outputTokens: aiUsageLogs._sum.completionTokens || 0,
        totalCost: Number(aiUsageLogs._sum.estimatedCost || 0),
      },
    };
  }

  async listUsers(page = 1, limit = 20, search?: string) {
    const where = search
      ? {
          OR: [
            { email: { contains: search, mode: 'insensitive' as const } },
            { name: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          avatarUrl: true,
          googleId: true,
          isAdmin: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              teamMemberships: true,
              createdTasks: true,
              brainstormSessions: true,
              aiKeys: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    return {
      users: users.map(u => ({
        ...u,
        hasPassword: undefined, // We don't expose this
        stats: u._count,
        _count: undefined,
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getUser(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        googleId: true,
        isAdmin: true,
        createdAt: true,
        updatedAt: true,
        teamMemberships: {
          select: {
            role: true,
            joinedAt: true,
            team: { select: { id: true, name: true } },
          },
        },
        _count: {
          select: {
            createdTasks: true,
            brainstormSessions: true,
            notes: true,
            diagrams: true,
            aiKeys: true,
            projects: true,
          },
        },
      },
    });

    if (!user) throw new NotFoundError('User not found');
    return user;
  }

  async toggleAdmin(userId: string, isAdmin: boolean) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundError('User not found');

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { isAdmin },
      select: { id: true, email: true, name: true, isAdmin: true },
    });

    return updated;
  }

  async deleteUser(userId: string, adminUserId: string) {
    if (userId === adminUserId) {
      throw new AppError(400, 'CANNOT_DELETE_SELF', 'You cannot delete your own account');
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundError('User not found');

    // Delete user and cascade
    await prisma.user.delete({ where: { id: userId } });

    return { deleted: true };
  }

  async listTeams(page = 1, limit = 20, search?: string) {
    const where = search
      ? { name: { contains: search, mode: 'insensitive' as const } }
      : {};

    const [teams, total] = await Promise.all([
      prisma.team.findMany({
        where,
        select: {
          id: true,
          name: true,
          description: true,
          createdAt: true,
          owner: { select: { id: true, name: true, email: true } },
          _count: {
            select: {
              members: true,
              tasks: true,
              projects: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.team.count({ where }),
    ]);

    return {
      teams: teams.map(t => ({
        ...t,
        stats: t._count,
        _count: undefined,
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getRecentActivity(limit = 20) {
    const [recentUsers, recentTasks, recentSessions] = await Promise.all([
      prisma.user.findMany({
        select: { id: true, name: true, email: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      prisma.task.findMany({
        select: { id: true, title: true, status: true, createdAt: true, creator: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      prisma.brainstormSession.findMany({
        select: { id: true, title: true, mode: true, createdAt: true, user: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
    ]);

    return { recentUsers, recentTasks, recentSessions };
  }
}

export const adminService = new AdminService();
