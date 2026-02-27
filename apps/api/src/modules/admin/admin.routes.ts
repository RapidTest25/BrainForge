import type { FastifyInstance } from 'fastify';
import { authGuard } from '../../middleware/auth.middleware.js';
import { adminGuard } from '../../middleware/admin.middleware.js';
import { adminService } from './admin.service.js';

export async function adminRoutes(app: FastifyInstance) {
  // All admin routes require auth + admin
  app.addHook('preHandler', authGuard);
  app.addHook('preHandler', adminGuard);

  // Dashboard stats
  app.get('/stats', async (request, reply) => {
    const stats = await adminService.getStats();
    return reply.send({ success: true, data: stats });
  });

  // Recent activity
  app.get('/activity', async (request, reply) => {
    const query = request.query as { limit?: string };
    const activity = await adminService.getRecentActivity(Number(query.limit) || 20);
    return reply.send({ success: true, data: activity });
  });

  // List users
  app.get('/users', async (request, reply) => {
    const query = request.query as { page?: string; limit?: string; search?: string };
    const result = await adminService.listUsers(
      Number(query.page) || 1,
      Number(query.limit) || 20,
      query.search
    );
    return reply.send({ success: true, data: result });
  });

  // Get single user detail
  app.get('/users/:userId', async (request, reply) => {
    const { userId } = request.params as { userId: string };
    const user = await adminService.getUser(userId);
    return reply.send({ success: true, data: user });
  });

  // Toggle admin
  app.patch('/users/:userId/admin', async (request, reply) => {
    const { userId } = request.params as { userId: string };
    const { isAdmin } = request.body as { isAdmin: boolean };
    const user = await adminService.toggleAdmin(userId, isAdmin);
    return reply.send({ success: true, data: user });
  });

  // Delete user
  app.delete('/users/:userId', async (request, reply) => {
    const { userId } = request.params as { userId: string };
    const result = await adminService.deleteUser(userId, request.user.id);
    return reply.send({ success: true, data: result });
  });

  // List teams
  app.get('/teams', async (request, reply) => {
    const query = request.query as { page?: string; limit?: string; search?: string };
    const result = await adminService.listTeams(
      Number(query.page) || 1,
      Number(query.limit) || 20,
      query.search
    );
    return reply.send({ success: true, data: result });
  });

  // Get single team detail
  app.get('/teams/:teamId', async (request, reply) => {
    const { teamId } = request.params as { teamId: string };
    const team = await adminService.getTeam(teamId);
    return reply.send({ success: true, data: team });
  });

  // AI usage analytics (per-provider, per-model, top users)
  app.get('/ai-usage', async (request, reply) => {
    const analytics = await adminService.getAIUsageAnalytics();
    return reply.send({ success: true, data: analytics });
  });

  // AI usage logs (paginated)
  app.get('/ai-usage/logs', async (request, reply) => {
    const query = request.query as { page?: string; limit?: string; provider?: string; userId?: string; feature?: string };
    const result = await adminService.getAIUsageLogs(
      Number(query.page) || 1,
      Number(query.limit) || 50,
      { provider: query.provider, userId: query.userId, feature: query.feature }
    );
    return reply.send({ success: true, data: result });
  });

  // List all API keys (without actual key values)
  app.get('/api-keys', async (request, reply) => {
    const query = request.query as { page?: string; limit?: string; search?: string };
    const result = await adminService.listAPIKeys(
      Number(query.page) || 1,
      Number(query.limit) || 20,
      query.search
    );
    return reply.send({ success: true, data: result });
  });

  // Growth analytics
  app.get('/growth', async (request, reply) => {
    const growth = await adminService.getGrowthAnalytics();
    return reply.send({ success: true, data: growth });
  });
}
