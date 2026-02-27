import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import { authRoutes } from './modules/auth/auth.routes.js';
import { teamRoutes } from './modules/team/team.routes.js';
import { taskRoutes, myTasksRoute } from './modules/task/task.routes.js';
import { aiKeyRoutes } from './modules/ai-key/ai-key.routes.js';
import { brainstormRoutes } from './modules/brainstorm/brainstorm.routes.js';
import { diagramRoutes } from './modules/diagram/diagram.routes.js';
import { calendarRoutes } from './modules/calendar/calendar.routes.js';
import { sprintRoutes } from './modules/sprint/sprint.routes.js';
import { noteRoutes } from './modules/note/note.routes.js';
import { discussionRoutes } from './modules/discussion/discussion.routes.js';
import { aiGenerateRoutes } from './modules/ai-generate/ai-generate.routes.js';
import { goalRoutes } from './modules/goal/goal.routes.js';
import { notificationRoutes } from './modules/notification/notification.routes.js';
import { aiChatRoutes } from './modules/ai-chat/ai-chat.routes.js';
import { projectRoutes } from './modules/project/project.routes.js';
import { adminRoutes } from './modules/admin/admin.routes.js';
import { settingsRoutes } from './modules/admin/settings.routes.js';
import { aiService } from './ai/ai.service.js';
import { prisma } from './lib/prisma.js';
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

  // Multipart file upload support
  await app.register(multipart, {
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  });

  // Serve uploaded files
  app.get('/uploads/:filename', async (request, reply) => {
    const { filename } = request.params as { filename: string };
    const query = request.query as { download?: string; name?: string };
    const path = await import('path');
    const fs = await import('fs');
    const filePath = path.join(process.cwd(), 'uploads', filename);
    if (!fs.existsSync(filePath)) {
      return reply.status(404).send({ success: false, error: { message: 'File not found' } });
    }
    const ext = path.extname(filename).toLowerCase();
    const mimeMap: Record<string, string> = {
      '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
      '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml',
      '.pdf': 'application/pdf', '.sql': 'text/plain',
      '.txt': 'text/plain', '.json': 'application/json',
      '.csv': 'text/csv', '.md': 'text/markdown',
      '.zip': 'application/zip', '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
    const contentType = mimeMap[ext] || 'application/octet-stream';
    // If ?download=true, force download with Content-Disposition
    if (query.download === 'true') {
      const downloadName = query.name || filename;
      reply.header('Content-Disposition', `attachment; filename="${downloadName}"`);
    }
    const stream = fs.createReadStream(filePath);
    return reply.type(contentType).send(stream);
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

    // Fastify empty JSON body (e.g. DELETE with Content-Type: application/json)
    if ((error as any).code === 'FST_ERR_CTP_EMPTY_JSON_BODY') {
      return reply.status(400).send({
        success: false,
        error: { message: 'Empty body with JSON content-type', code: 'EMPTY_BODY' },
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

  // Public app version info (no auth needed)
  app.get('/api/app/version', async (_request, reply) => {
    try {
      const setting = await prisma.systemSetting.findUnique({
        where: { category_key: { category: 'version', key: 'web_version' } },
      });
      return reply.send({
        success: true,
        data: { webVersion: setting?.value || '0.1.0' },
      });
    } catch {
      return reply.send({
        success: true,
        data: { webVersion: '0.1.0' },
      });
    }
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
  app.register(discussionRoutes, { prefix: '/api/teams' });
  app.register(aiGenerateRoutes, { prefix: '/api/teams' });
  app.register(goalRoutes, { prefix: '/api/teams' });
  app.register(notificationRoutes, { prefix: '/api/teams' });
  app.register(aiChatRoutes, { prefix: '/api/teams' });
  app.register(projectRoutes, { prefix: '/api/teams' });
  app.register(adminRoutes, { prefix: '/api/admin' });
  app.register(settingsRoutes, { prefix: '/api/admin/settings' });

  return app;
}
