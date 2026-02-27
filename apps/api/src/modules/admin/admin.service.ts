import { prisma } from '../../lib/prisma.js';
import { AppError, NotFoundError } from '../../lib/errors.js';

class AdminService {
  async getStats() {
    const [
      totalUsers, totalTeams, totalProjects, totalTasks, totalAiKeys,
      totalBrainstorms, totalDiagrams, totalNotes, totalDiscussions,
      totalGoals, totalCalendarEvents, totalSprintPlans, totalAiChats,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.team.count(),
      prisma.project.count(),
      prisma.task.count(),
      prisma.userAIKey.count(),
      prisma.brainstormSession.count(),
      prisma.diagram.count(),
      prisma.note.count(),
      prisma.discussion.count(),
      prisma.goal.count(),
      prisma.calendarEvent.count(),
      prisma.sprintPlan.count(),
      prisma.aiChat.count(),
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

    // Task status breakdown
    const tasksByStatus = await prisma.task.groupBy({
      by: ['status'],
      _count: true,
    });

    // Tasks by priority
    const tasksByPriority = await prisma.task.groupBy({
      by: ['priority'],
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
      totalDiscussions,
      totalGoals,
      totalCalendarEvents,
      totalSprintPlans,
      totalAiChats,
      newUsersThisMonth,
      aiUsage: {
        requests: aiUsageLogs._count,
        inputTokens: aiUsageLogs._sum.promptTokens || 0,
        outputTokens: aiUsageLogs._sum.completionTokens || 0,
        totalCost: Number(aiUsageLogs._sum.estimatedCost || 0),
      },
      tasksByStatus: tasksByStatus.reduce((acc, t) => ({ ...acc, [t.status]: t._count }), {} as Record<string, number>),
      tasksByPriority: tasksByPriority.reduce((acc, t) => ({ ...acc, [t.priority]: t._count }), {} as Record<string, number>),
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

  async getTeam(teamId: string) {
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      select: {
        id: true,
        name: true,
        description: true,
        createdAt: true,
        updatedAt: true,
        owner: { select: { id: true, name: true, email: true, avatarUrl: true } },
        members: {
          select: {
            id: true,
            role: true,
            joinedAt: true,
            user: { select: { id: true, name: true, email: true, avatarUrl: true, isAdmin: true } },
          },
          orderBy: { joinedAt: 'asc' },
        },
        _count: {
          select: {
            members: true,
            tasks: true,
            projects: true,
            brainstormSessions: true,
            invitations: true,
          },
        },
      },
    });
    if (!team) throw new Error('Team not found');

    // Get projects list
    const projects = await prisma.project.findMany({
      where: { teamId },
      select: { id: true, name: true, description: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    return {
      ...team,
      stats: team._count,
      projects,
      _count: undefined,
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
        select: { id: true, title: true, mode: true, createdAt: true, creator: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
    ]);

    return { recentUsers, recentTasks, recentSessions };
  }

  // AI usage analytics with per-provider breakdown
  async getAIUsageAnalytics() {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Per-provider breakdown
    const byProvider = await prisma.aIUsageLog.groupBy({
      by: ['provider'],
      where: { createdAt: { gte: thirtyDaysAgo } },
      _sum: { promptTokens: true, completionTokens: true, estimatedCost: true },
      _count: { _all: true },
    });

    // Per-model breakdown 
    const byModel = await prisma.aIUsageLog.groupBy({
      by: ['provider', 'model'],
      where: { createdAt: { gte: thirtyDaysAgo } },
      _sum: { promptTokens: true, completionTokens: true, estimatedCost: true },
      _count: { _all: true },
      orderBy: { _sum: { promptTokens: 'desc' } },
      take: 20,
    });

    // Per-feature breakdown
    const byFeature = await prisma.aIUsageLog.groupBy({
      by: ['feature'],
      where: { createdAt: { gte: thirtyDaysAgo } },
      _sum: { promptTokens: true, completionTokens: true, estimatedCost: true },
      _count: { _all: true },
    });

    // Top users by usage
    const topUsers = await prisma.aIUsageLog.groupBy({
      by: ['userId'],
      where: { createdAt: { gte: thirtyDaysAgo } },
      _sum: { promptTokens: true, completionTokens: true, estimatedCost: true },
      _count: { _all: true },
      orderBy: { _sum: { promptTokens: 'desc' } },
      take: 10,
    });

    // Fetch user details for top users
    const userIds = topUsers.map(u => u.userId);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true, avatarUrl: true },
    });
    const userMap = new Map(users.map(u => [u.id, u]));

    // Daily usage (last 30 days)
    const dailyUsage = await prisma.$queryRaw<Array<{ date: string; count: number; tokens: number; cost: number }>>`
      SELECT 
        DATE("createdAt") as date,
        COUNT(*)::int as count,
        SUM("promptTokens" + "completionTokens")::int as tokens,
        SUM("estimatedCost")::float as cost
      FROM "AIUsageLog"
      WHERE "createdAt" >= ${thirtyDaysAgo}
      GROUP BY DATE("createdAt")
      ORDER BY date ASC
    `;

    return {
      byProvider: byProvider.map(p => ({
        provider: p.provider,
        requests: p._count._all,
        inputTokens: p._sum.promptTokens || 0,
        outputTokens: p._sum.completionTokens || 0,
        cost: Number(p._sum.estimatedCost || 0),
      })),
      byModel: byModel.map(m => ({
        provider: m.provider,
        model: m.model,
        requests: m._count._all,
        inputTokens: m._sum.promptTokens || 0,
        outputTokens: m._sum.completionTokens || 0,
        cost: Number(m._sum.estimatedCost || 0),
      })),
      byFeature: byFeature.map(f => ({
        feature: f.feature,
        requests: f._count._all,
        inputTokens: f._sum.promptTokens || 0,
        outputTokens: f._sum.completionTokens || 0,
        cost: Number(f._sum.estimatedCost || 0),
      })),
      topUsers: topUsers.map(u => ({
        user: userMap.get(u.userId) || { id: u.userId, name: 'Unknown', email: '', avatarUrl: null },
        requests: u._count._all,
        inputTokens: u._sum.promptTokens || 0,
        outputTokens: u._sum.completionTokens || 0,
        cost: Number(u._sum.estimatedCost || 0),
      })),
      dailyUsage: dailyUsage.map(d => ({
        date: String(d.date),
        requests: Number(d.count),
        tokens: Number(d.tokens),
        cost: Number(d.cost),
      })),
    };
  }

  // List all API keys (without actual key values)
  async listAPIKeys(page = 1, limit = 20, search?: string) {
    const where = search
      ? {
          OR: [
            { user: { name: { contains: search, mode: 'insensitive' as const } } },
            { user: { email: { contains: search, mode: 'insensitive' as const } } },
            { provider: { contains: search, mode: 'insensitive' as const } },
            { label: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [keys, total] = await Promise.all([
      prisma.userAIKey.findMany({
        where,
        select: {
          id: true,
          provider: true,
          label: true,
          isActive: true,
          lastUsedAt: true,
          createdAt: true,
          user: { select: { id: true, name: true, email: true, avatarUrl: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.userAIKey.count({ where }),
    ]);

    // Provider summary
    const providerSummary = await prisma.userAIKey.groupBy({
      by: ['provider'],
      _count: true,
      where: { isActive: true },
    });

    return {
      keys,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      providerSummary: providerSummary.map(p => ({
        provider: p.provider,
        count: p._count,
      })),
    };
  }

  // AI usage logs (paginated)
  async getAIUsageLogs(page = 1, limit = 50, filters?: { provider?: string; userId?: string; feature?: string }) {
    const where: any = {};
    if (filters?.provider) where.provider = filters.provider;
    if (filters?.userId) where.userId = filters.userId;
    if (filters?.feature) where.feature = filters.feature;

    const [logs, total] = await Promise.all([
      prisma.aIUsageLog.findMany({
        where,
        select: {
          id: true,
          provider: true,
          model: true,
          promptTokens: true,
          completionTokens: true,
          estimatedCost: true,
          feature: true,
          createdAt: true,
          user: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.aIUsageLog.count({ where }),
    ]);

    return { logs, total, page, totalPages: Math.ceil(total / limit) };
  }

  // Growth analytics
  async getGrowthAnalytics() {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);

    const calcPercent = (current: number, previous: number) =>
      previous === 0 ? (current > 0 ? 100 : 0) : Math.round(((current - previous) / previous) * 100);

    // User growth - current vs previous 30 days
    const [currentMonthUsers, prevMonthUsers] = await Promise.all([
      prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      prisma.user.count({ where: { createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } } }),
    ]);

    // Task growth
    const [currentMonthTasks, prevMonthTasks] = await Promise.all([
      prisma.task.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      prisma.task.count({ where: { createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } } }),
    ]);

    // Brainstorm growth
    const [currentMonthBrainstorms, prevMonthBrainstorms] = await Promise.all([
      prisma.brainstormSession.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      prisma.brainstormSession.count({ where: { createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } } }),
    ]);

    // AI usage growth
    const [currentMonthAI, prevMonthAI] = await Promise.all([
      prisma.aIUsageLog.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      prisma.aIUsageLog.count({ where: { createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } } }),
    ]);

    // Daily user registrations
    const dailyRegistrations = await prisma.$queryRaw<Array<{ date: string; count: number }>>`
      SELECT DATE("createdAt") as date, COUNT(*)::int as count
      FROM "User"
      WHERE "createdAt" >= ${thirtyDaysAgo}
      GROUP BY DATE("createdAt")
      ORDER BY date ASC
    `;

    return {
      users: { current: currentMonthUsers, previous: prevMonthUsers, changePercent: calcPercent(currentMonthUsers, prevMonthUsers) },
      tasks: { current: currentMonthTasks, previous: prevMonthTasks, changePercent: calcPercent(currentMonthTasks, prevMonthTasks) },
      brainstorms: { current: currentMonthBrainstorms, previous: prevMonthBrainstorms, changePercent: calcPercent(currentMonthBrainstorms, prevMonthBrainstorms) },
      aiRequests: { current: currentMonthAI, previous: prevMonthAI, changePercent: calcPercent(currentMonthAI, prevMonthAI) },
      dailyRegistrations: dailyRegistrations.map(d => ({ date: String(d.date), count: Number(d.count) })),
    };
  }
}

export const adminService = new AdminService();
