import Fastify from 'fastify';
import cors from '@fastify/cors';
import { authRoutes } from './modules/auth/auth.routes.js';
import { teamRoutes } from './modules/team/team.routes.js';
import { taskRoutes, myTasksRoute } from './modules/task/task.routes.js';
import { aiKeyRoutes } from './modules/ai-key/ai-key.routes.js';
import { brainstormRoutes } from './modules/brainstorm/brainstorm.routes.js';
import { diagramRoutes } from './modules/diagram/diagram.routes.js';
import { calendarRoutes } from './modules/calendar/calendar.routes.js';
import { sprintRoutes } from './modules/sprint/sprint.routes.js';
import { noteRoutes } from './modules/note/note.routes.js';
import { aiService } from './ai/ai.service.js';
import { AppError } from './lib/errors.js';

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || 'info',
      transport: process.env.NODE_ENV === 'development' ? { target: 'pino-pretty' } : undefined,
    },
  });

  // CORS
  await app.register(cors, {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  });

  // Global error handler
  app.setErrorHandler((error: any, request, reply) => {
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        success: false,
        error: { message: error.message, code: error.code },
      });
    }

    // Zod validation errors
    if (error.name === 'ZodError') {
      return reply.status(400).send({
        success: false,
        error: { message: 'Validation error', code: 'VALIDATION_ERROR', details: (error as any).issues },
      });
    }

    // Prisma errors
    if ((error as any).code === 'P2025') {
      return reply.status(404).send({
        success: false,
        error: { message: 'Resource not found', code: 'NOT_FOUND' },
      });
    }

    request.log.error(error);
    return reply.status(500).send({
      success: false,
      error: { message: 'Internal server error', code: 'INTERNAL_ERROR' },
    });
  });

  // Health check
  app.get('/api/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

  // AI models list (public — no auth needed)
  app.get('/api/ai/models', async (request, reply) => {
    const models = aiService.getAllModels();
    return reply.send({ success: true, data: models });
  });

  // Register routes
  app.register(authRoutes, { prefix: '/api/auth' });
  app.register(teamRoutes, { prefix: '/api/teams' });
  app.register(taskRoutes, { prefix: '/api/teams' });
  app.register(myTasksRoute, { prefix: '/api/users' });
  app.register(aiKeyRoutes, { prefix: '/api/ai' });
  app.register(brainstormRoutes, { prefix: '/api/teams' });
  app.register(diagramRoutes, { prefix: '/api/teams' });
  app.register(calendarRoutes, { prefix: '/api/teams' });
  app.register(sprintRoutes, { prefix: '/api/teams' });
  app.register(noteRoutes, { prefix: '/api/teams' });

  return app;
}
